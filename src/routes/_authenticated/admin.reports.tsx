import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { salesReport } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUSD, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

function toIso(d: Date) { return d.toISOString(); }
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function AdminReports() {
  const today = new Date();
  const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);

  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const fReport = useServerFn(salesReport);
  const report = useQuery({
    queryKey: ["report", from, to],
    queryFn: () => fReport({ data: { from: toIso(startOfDay(new Date(from))), to: toIso(endOfDay(new Date(to))) } }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Rapports</h1>
        <p className="text-sm text-muted-foreground">Sélectionnez une période pour voir les ventes.</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button onClick={() => report.refetch()} className="bg-gradient-brand text-brand-foreground">Actualiser</Button>
        </div>
      </Card>

      {report.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="p-4"><div className="text-sm text-muted-foreground">Revenus encaissés</div><div className="mt-1 text-2xl font-bold text-accent">{formatUSD(report.data.totalRevenue)}</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Commandes total</div><div className="mt-1 text-2xl font-bold">{report.data.ordersCount}</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Payées / livrées</div><div className="mt-1 text-2xl font-bold text-brand">{report.data.paidCount}</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">En attente</div><div className="mt-1 text-2xl font-bold text-orange-600">{report.data.pendingCount}</div></Card>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="border-b p-4"><h3 className="font-semibold">Commandes de la période</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-xs uppercase">
                  <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Canal</th><th className="px-4 py-3 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y">
                  {report.data.orders.map((o: any) => (
                    <tr key={o.id}>
                      <td className="px-4 py-2.5">{formatDateTime(o.created_at)}</td>
                      <td className="px-4 py-2.5">{o.status}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{o.channel}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatUSD(o.total)}</td>
                    </tr>
                  ))}
                  {report.data.orders.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucune commande sur cette période</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
