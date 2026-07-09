import { createServerFn } from "@/lib/tanstack-start-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertManager(ctx: { supabase: any; userId: string }) {
  const { data: a } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: m } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "manager" });
  if (!a && !m) throw new Error("Réservé aux admin/manager.");
}

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("employees")
      .select("*")
      .order("is_active", { ascending: false })
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const employeeInput = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2).max(120),
  role: z.string().max(80).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().max(160).optional().or(z.literal("")),
  monthly_salary: z.number().min(0).default(0),
  currency: z.enum(["USD", "CDF"]).default("USD"),
  hire_date: z.string().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const upsertEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => employeeInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const payload = { ...data, role: data.role || null, phone: data.phone || null, email: data.email || null, notes: data.notes || null };
    const q = data.id
      ? context.supabase.from("employees").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("employees").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { error } = await context.supabase.from("employees").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSalaryPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("salary_payments")
      .select("id, employee_id, period_month, amount, currency, payment_method, status, paid_at, notes, employees(full_name, role)")
      .order("period_month", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const payInput = z.object({
  employee_id: z.string().uuid(),
  period_month: z.string(), // YYYY-MM-01
  amount: z.number().min(0),
  currency: z.enum(["USD", "CDF"]).default("USD"),
  payment_method: z.string().max(40).default("cash"),
  status: z.enum(["paid", "pending"]).default("paid"),
  notes: z.string().max(300).optional().or(z.literal("")),
});

export const paySalary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => payInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const payload = {
      ...data,
      notes: data.notes || null,
      paid_at: data.status === "paid" ? new Date().toISOString() : null,
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("salary_payments")
      .upsert(payload, { onConflict: "employee_id,period_month" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
