import { createServerFn } from "@/lib/tanstack-start-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertManager(ctx: { supabase: any; userId: string }) {
  const { data: a } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: m } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "manager" });
  if (!a && !m) throw new Error("Réservé aux admin/manager.");
}

export const listExpenseCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("expense_categories").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ from: z.string().optional(), to: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("expenses")
      .select("id, label, amount, currency, expense_date, status, payment_method, notes, category_id, expense_categories(name, color)")
      .order("expense_date", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("expense_date", data.from);
    if (data.to) q = q.lte("expense_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const expenseInput = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  label: z.string().trim().min(2).max(200),
  amount: z.number().min(0),
  currency: z.enum(["USD", "CDF"]).default("USD"),
  expense_date: z.string(),
  status: z.enum(["paid", "pending"]).default("paid"),
  payment_method: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const upsertExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => expenseInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const payload = {
      ...data,
      category_id: data.category_id || null,
      payment_method: data.payment_method || null,
      notes: data.notes || null,
      created_by: context.userId,
    };
    const q = data.id
      ? context.supabase.from("expenses").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("expenses").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { error } = await context.supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
