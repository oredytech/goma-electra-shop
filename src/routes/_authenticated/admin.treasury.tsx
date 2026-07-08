import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { treasuryReport, type TreasuryReport } from "@/lib/treasury.functions";
import { listProductsAdmin } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUSD } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, FileDown, AlertTriangle, PackageX } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/admin/treasury")({
  component: AdminTreasury,
});

const PALETTE = ["#0c275d", "#00796f", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#22c55e"];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function AdminTreasury() {
  const today = new Date();
  const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const fRep = useServerFn(treasuryReport);
  const fProds = useServerFn(listProductsAdmin);
  const q = useQuery({
    queryKey: ["treasury", from, to],
    queryFn: () => fRep({ data: { from: startOfDay(new Date(from)).toISOString(), to: endOfDay(new Date(to)).toISOString() } }),
  });
  const prods = useQuery({ queryKey: ["admin-products"], queryFn: () => fProds() });

  const r = q.data;
  const series = useMemo(() => r?.byDay ?? [], [r]);

  const lowStock = useMemo(() => (prods.data ?? []).filter((p: any) => p.is_active && p.stock <= (p.min_stock ?? 0)), [prods.data]);
  const outOfStock = useMemo(() => lowStock.filter((p: any) => p.stock <= 0), [lowStock]);

  function exportPdf() {
    if (!r) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(12, 39, 93);
    doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Rapport de caisse", 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Période : ${from} → ${to}`, W - 14, 16, { align: "right" });

    doc.setTextColor(20, 28, 50);
    doc.setFontSize(11);
    doc.text(`Revenus encaissés : ${formatUSD(r.totals.revenue)}`, 14, 36);
    doc.text(`Dépenses : ${formatUSD(r.totals.expenses)}`, 14, 42);
    doc.text(`Salaires : ${formatUSD(r.totals.salaries)}`, 14, 48);
    doc.setFont("helvetica", "bold");
    doc.text(`Résultat net : ${formatUSD(r.totals.net)}`, 14, 56);
    doc.setFont("helvetica", "normal");

    autoTable(doc, {
      startY: 64,
      head: [["Date", "Revenus", "Dépenses", "Salaires", "Net"]],
      body: r.byDay.map((d) => [d.day, formatUSD(d.revenue), formatUSD(d.expenses), formatUSD(d.salaries), formatUSD(d.net)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [12, 39, 93] },
    });

    if (r.expensesByCategory.length) {
      const afterY = (doc as any).lastAutoTable.finalY + 8;
      autoTable(doc, {
        startY: afterY,
        head: [["Catégorie de dépense", "Total"]],
        body: r.expensesByCategory.map((c) => [c.name, formatUSD(c.total)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 121, 111] },
      });
    }
    doc.save(`Tresorerie-${from}_${to}.pdf`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Wallet className="size-6 text-accent" /> Caisse</h1>
          <p className="text-sm text-muted-foreground">Situation financière consolidée : revenus, dépenses, salaires & alertes de stock.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/admin/stock">Voir le stock</Link></Button>
          <Button onClick={exportPdf} disabled={!r} className="bg-gradient-brand text-brand-foreground">
            <FileDown className="mr-1.5 size-4" /> Télécharger le rapport PDF
          </Button>
        </div>
      </div>

      {(outOfStock.length > 0 || lowStock.length > 0) && (
        <Card className={`p-4 ${outOfStock.length ? "border-destructive/40 bg-destructive/5" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex items-start gap-3">
            {outOfStock.length > 0 ? <PackageX className="mt-0.5 size-5 text-destructive" /> : <AlertTriangle className="mt-0.5 size-5 text-amber-600" />}
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-semibold ${outOfStock.length ? "text-destructive" : "text-amber-800"}`}>
                {outOfStock.length > 0 && <>{outOfStock.length} produit(s) en rupture de stock · </>}
                {lowStock.length - outOfStock.length > 0 && <>{lowStock.length - outOfStock.length} produit(s) sous le seuil minimum</>}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {lowStock.slice(0, 10).map((p: any) => (
                  <span key={p.id} className={`rounded-full border px-2 py-0.5 text-xs ${p.stock <= 0 ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-amber-300 bg-white text-amber-800"}`}>
                    {p.name} — stock {p.stock}
                  </span>
                ))}
                {lowStock.length > 10 && <span className="text-xs text-muted-foreground">+{lowStock.length - 10} autres…</span>}
              </div>
            </div>
            <Button asChild size="sm" variant="outline"><Link to="/admin/stock">Réapprovisionner</Link></Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button variant="outline" onClick={() => q.refetch()}>Actualiser</Button>
        </div>
      </Card>

      {r && <Cards r={r} />}

      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Cashflow journalier</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00796f" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#00796f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => formatUSD(v)} />
              <Legend />
              <Area name="Revenus" type="monotone" dataKey="revenue" stroke="#00796f" fill="url(#rev)" />
              <Area name="Dépenses" type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#exp)" />
              <Area name="Salaires" type="monotone" dataKey="salaries" stroke="#f59e0b" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Résultat net par jour</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatUSD(v)} />
                <Bar dataKey="net" fill="#0c275d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Dépenses par catégorie</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={r?.expensesByCategory ?? []} dataKey="total" nameKey="name" outerRadius={90} label>
                  {(r?.expensesByCategory ?? []).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatUSD(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Cards({ r }: { r: TreasuryReport }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <div className="flex items-center justify-between"><div className="text-xs uppercase text-muted-foreground">Revenus</div><TrendingUp className="size-4 text-accent" /></div>
        <div className="mt-1 text-2xl font-bold text-accent">{formatUSD(r.totals.revenue)}</div>
        <div className="text-xs text-muted-foreground">{r.totals.ordersPaid} commandes payées</div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between"><div className="text-xs uppercase text-muted-foreground">Dépenses</div><TrendingDown className="size-4 text-destructive" /></div>
        <div className="mt-1 text-2xl font-bold text-destructive">- {formatUSD(r.totals.expenses)}</div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between"><div className="text-xs uppercase text-muted-foreground">Salaires</div><TrendingDown className="size-4 text-orange-500" /></div>
        <div className="mt-1 text-2xl font-bold text-orange-600">- {formatUSD(r.totals.salaries)}</div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between"><div className="text-xs uppercase text-muted-foreground">Résultat net</div><Wallet className="size-4 text-brand" /></div>
        <div className={`mt-1 text-2xl font-bold ${r.totals.net >= 0 ? "text-brand" : "text-destructive"}`}>{formatUSD(r.totals.net)}</div>
      </Card>
    </div>
  );
}
