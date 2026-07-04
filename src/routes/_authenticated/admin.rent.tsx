import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listExpenses } from "@/lib/expenses.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowUpRight } from "lucide-react";
import { formatUSD, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/rent")({
  component: RentHistory,
});

function RentHistory() {
  const fList = useServerFn(listExpenses);
  const q = useQuery({ queryKey: ["expenses-all"], queryFn: () => fList({ data: {} }) });

  const rows = useMemo(
    () => (q.data ?? []).filter((r: any) => (r.expense_categories?.name ?? "").toLowerCase().includes("loyer")),
    [q.data],
  );
  const total = rows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Building2 className="size-6 text-accent" /> Loyer</h1>
          <p className="text-sm text-muted-foreground">Historique des paiements de loyer — enregistrés comme dépenses de catégorie « Loyer ».</p>
        </div>
        <Button asChild className="bg-gradient-brand text-brand-foreground">
          <Link to="/admin/expenses">Ajouter un paiement <ArrowUpRight className="ml-1 size-3.5" /></Link>
        </Button>
      </div>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-600 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-white/80">Total payé (période cumulée)</div>
          <div className="mt-1 text-3xl font-black tabular-nums">{formatUSD(total)}</div>
          <div className="mt-1 text-xs text-white/80">{rows.length} paiement(s) enregistré(s)</div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Libellé</th>
                <th className="px-3 py-2.5">Mode</th>
                <th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <td className="px-3 py-2.5">{formatDate(r.expense_date)}</td>
                  <td className="px-3 py-2.5 font-medium">{r.label}</td>
                  <td className="px-3 py-2.5 text-xs">{r.payment_method ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={r.status === "paid" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{Number(r.amount).toFixed(2)} {r.currency}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">Aucun paiement de loyer enregistré.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
