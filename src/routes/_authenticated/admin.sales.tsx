import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { salesReport } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { formatUSD } from "@/lib/format";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/sales")({
  component: SalesReportPage,
});

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function SalesReportPage() {
  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const [from, setFrom] = useState(isoDay(monthAgo));
  const [to, setTo] = useState(isoDay(today));
  const f = useServerFn(salesReport);
  const q = useQuery({
    queryKey: ["sales-report", from, to],
    queryFn: () => f({ data: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` } }),
  });
  const d = q.data;
  const online = (d?.orders ?? []).filter((o: any) => o.channel === "online").length;
  const offline = (d?.orders ?? []).filter((o: any) => o.channel === "offline").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><TrendingUp className="size-6 text-accent" /> Rapport des ventes</h1>
        <p className="text-sm text-muted-foreground">Ventes directes (comptoir) + commandes en ligne, sur la période choisie.</p>
      </div>
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div><label className="text-xs text-muted-foreground">Du</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Au</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Chiffre d'affaires</div><div className="mt-1 text-xl font-bold">{formatUSD(d?.totalRevenue ?? 0)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Commandes payées</div><div className="mt-1 text-xl font-bold">{d?.paidCount ?? 0}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">En ligne</div><div className="mt-1 text-xl font-bold">{online}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Ventes directes</div><div className="mt-1 text-xl font-bold">{offline}</div></Card>
      </div>
    </div>
  );
}
