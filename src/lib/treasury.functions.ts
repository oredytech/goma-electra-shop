import { createServerFn } from "@/lib/tanstack-start-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Réservé à l'équipe.");
}

export type TreasuryPoint = {
  day: string;
  revenue: number;
  expenses: number;
  salaries: number;
  net: number;
};

export type TreasuryReport = {
  from: string;
  to: string;
  currency: string;
  totals: { revenue: number; expenses: number; salaries: number; net: number; ordersPaid: number };
  byDay: TreasuryPoint[];
  expensesByCategory: { name: string; total: number }[];
};

export const treasuryReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ from: z.string(), to: z.string() }).parse(d))
  .handler(async ({ data, context }): Promise<TreasuryReport> => {
    await assertStaff(context);

    const [{ data: orders }, { data: expenses }, { data: salaries }] = await Promise.all([
      context.supabase
        .from("orders")
        .select("total, currency, paid_at, status, created_at")
        .eq("status", "paid")
        .gte("created_at", data.from)
        .lte("created_at", data.to),
      context.supabase
        .from("expenses")
        .select("amount, currency, expense_date, status, expense_categories(name)")
        .eq("status", "paid")
        .gte("expense_date", data.from.slice(0, 10))
        .lte("expense_date", data.to.slice(0, 10)),
      context.supabase
        .from("salary_payments")
        .select("amount, currency, paid_at, status, period_month")
        .eq("status", "paid")
        .gte("period_month", data.from.slice(0, 10))
        .lte("period_month", data.to.slice(0, 10)),
    ]);

    const byDay = new Map<string, TreasuryPoint>();
    function bucket(day: string): TreasuryPoint {
      let p = byDay.get(day);
      if (!p) { p = { day, revenue: 0, expenses: 0, salaries: 0, net: 0 }; byDay.set(day, p); }
      return p;
    }

    let totalRev = 0, totalExp = 0, totalSal = 0;
    for (const o of orders ?? []) {
      const day = (o.paid_at ?? o.created_at).slice(0, 10);
      const amt = Number(o.total ?? 0);
      bucket(day).revenue += amt;
      totalRev += amt;
    }
    for (const e of expenses ?? []) {
      const day = (e.expense_date as string).slice(0, 10);
      const amt = Number(e.amount ?? 0);
      bucket(day).expenses += amt;
      totalExp += amt;
    }
    for (const s of salaries ?? []) {
      const day = ((s.paid_at as string) ?? (s.period_month as string)).slice(0, 10);
      const amt = Number(s.amount ?? 0);
      bucket(day).salaries += amt;
      totalSal += amt;
    }

    for (const p of byDay.values()) p.net = p.revenue - p.expenses - p.salaries;

    const expensesByCat = new Map<string, number>();
    for (const e of expenses ?? []) {
      const name = (e as any).expense_categories?.name ?? "Autre";
      expensesByCat.set(name, (expensesByCat.get(name) ?? 0) + Number(e.amount ?? 0));
    }

    return {
      from: data.from, to: data.to, currency: "USD",
      totals: {
        revenue: totalRev,
        expenses: totalExp,
        salaries: totalSal,
        net: totalRev - totalExp - totalSal,
        ordersPaid: (orders ?? []).length,
      },
      byDay: Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)),
      expensesByCategory: Array.from(expensesByCat.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total),
    };
  });
