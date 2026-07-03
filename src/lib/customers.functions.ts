import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Réservé au staff.");
}

// ---------- CUSTOMERS ----------
export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("customers")
      .select("id, full_name, phone, email, neighborhood, address, notes, total_spent, orders_count, last_order_at, created_at")
      .order("last_order_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const customerInput = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(160).optional().or(z.literal("")),
  neighborhood: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const upsertCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => customerInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      full_name: data.full_name,
      phone: data.phone || null,
      email: data.email || null,
      neighborhood: data.neighborhood || null,
      address: data.address || null,
      notes: data.notes || null,
    };
    const q = data.id
      ? context.supabase.from("customers").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("customers").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- CREDITS (dettes) ----------
export const listCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    // Ensure overdue statuses are refreshed
    await context.supabase.rpc("refresh_credit_overdue");
    const { data, error } = await context.supabase
      .from("customer_credits")
      .select("id, customer_id, order_id, label, amount, currency, balance, due_date, status, notes, created_at, customers(full_name, phone)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const creditInput = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  order_id: z.string().uuid().optional().nullable(),
  label: z.string().trim().min(2).max(200),
  amount: z.number().min(0),
  currency: z.enum(["USD", "CDF"]).default("USD"),
  due_date: z.string().optional().nullable(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const upsertCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => creditInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload: any = {
      customer_id: data.customer_id,
      order_id: data.order_id || null,
      label: data.label,
      amount: data.amount,
      currency: data.currency,
      due_date: data.due_date || null,
      notes: data.notes || null,
      created_by: context.userId,
    };
    if (!data.id) payload.balance = data.amount;
    const q = data.id
      ? context.supabase.from("customer_credits").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("customer_credits").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("customer_credits").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const paymentInput = z.object({
  credit_id: z.string().uuid(),
  amount: z.number().min(0.01),
  payment_date: z.string().optional(),
  payment_method: z.string().max(40).default("cash"),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const addCreditPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paymentInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("credit_payments").insert({
      credit_id: data.credit_id,
      amount: data.amount,
      payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
      payment_method: data.payment_method,
      notes: data.notes || null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCreditPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ credit_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("credit_payments")
      .select("id, amount, payment_date, payment_method, notes, created_at")
      .eq("credit_id", data.credit_id)
      .order("payment_date", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
