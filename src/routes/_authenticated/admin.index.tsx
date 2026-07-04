import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrders, listProductsAdmin } from "@/lib/admin.functions";
import { listCredits } from "@/lib/customers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package, ShoppingCart, AlertTriangle, DollarSign, TrendingUp,
  ArrowUpRight, Bell, Sparkles,
} from "lucide-react";
import { formatUSD } from "@/lib/format";
import { useMemo, useEffect, useRef } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fOrders = useServerFn(listOrders);
  const fProds = useServerFn(listProductsAdmin);
  const fCredits = useServerFn(listCredits);
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => fOrders() });
  const prods = useQuery({ queryKey: ["admin-products"], queryFn: () => fProds() });
  const credits = useQuery({ queryKey: ["credits"], queryFn: () => fCredits(), retry: false });

  const all = orders.data ?? [];
  const paid = all.filter((o: any) => o.status === "paid" || o.status === "delivered");
  const pending = all.filter((o: any) => o.status === "pending");
  const revenue = paid.reduce((s: number, o: any) => s + Number(o.total), 0);
  const lowStock = (prods.data ?? []).filter((p: any) => p.stock <= p.min_stock);
  const outOfStock = (prods.data ?? []).filter((p: any) => p.stock === 0);
  const overdueCredits = (credits.data ?? []).filter((c: any) => c.status === "overdue");
  const overdueTotal = overdueCredits.reduce((s: number, c: any) => s + Number(c.balance), 0);

  // Sales over last 14 days
  const series = useMemo(() => {
    const days: { date: string; label: string; revenue: number; orders: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ date: iso, label: iso.slice(5), revenue: 0, orders: 0 });
    }
    paid.forEach((o: any) => {
      const iso = new Date(o.created_at).toISOString().slice(0, 10);
      const row = days.find((d) => d.date === iso);
      if (row) { row.revenue += Number(o.total); row.orders += 1; }
    });
    return days;
  }, [paid]);

  // Notification toasts for low stock + ruptures — once per session
  const notified = useRef(false);
  useEffect(() => {
    if (notified.current || prods.isLoading) return;
    if (outOfStock.length > 0) {
      toast.error(`🚨 ${outOfStock.length} produit(s) en RUPTURE`, {
        description: outOfStock.slice(0, 3).map((p: any) => p.name).join(", ") + (outOfStock.length > 3 ? "…" : ""),
        duration: 8000,
      });
    }
    if (lowStock.length > 0) {
      toast.warning(`${lowStock.length} produit(s) à ravitailler`, {
        description: lowStock.slice(0, 3).map((p: any) => p.name).join(", ") + (lowStock.length > 3 ? "…" : ""),
        duration: 6000,
      });
    }
    if (outOfStock.length > 0 || lowStock.length > 0) notified.current = true;
  }, [lowStock, outOfStock, prods.isLoading]);

  const kpis = [
    { label: "Revenus totaux", value: formatUSD(revenue), icon: DollarSign, gradient: "from-emerald-500 via-emerald-600 to-teal-700", shape: "circle" },
    { label: "Commandes", value: all.length, icon: ShoppingCart, gradient: "from-blue-600 via-indigo-600 to-violet-700", shape: "square" },
    { label: "En attente", value: pending.length, icon: AlertTriangle, gradient: "from-amber-500 via-orange-500 to-red-500", shape: "diamond" },
    { label: "Produits actifs", value: prods.data?.filter((p: any) => p.is_active).length ?? 0, icon: Package, gradient: "from-fuchsia-500 via-purple-600 to-indigo-700", shape: "wave" },
  ];

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c275d] via-[#123a7a] to-[#00796f] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 size-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/70">
              <Sparkles className="size-3.5" /> Tableau de bord CONETEC
            </div>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Bienvenue 👋</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">Vue temps réel de vos ventes, stock, commandes et alertes.</p>
          </div>
          {lowStock.length > 0 && (
            <Link to="/admin/stock" className="group flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
              <Bell className="size-4 animate-pulse" />
              {lowStock.length} à ravitailler
              <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>

      {/* KPIs — gradient cards with decorative shapes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className={`relative overflow-hidden border-0 bg-gradient-to-br ${k.gradient} p-5 text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl`}>
            {/* decorative shape */}
            <div className="pointer-events-none absolute -right-6 -top-6 opacity-20">
              {k.shape === "circle" && <div className="size-28 rounded-full border-8 border-white" />}
              {k.shape === "square" && <div className="size-24 rotate-12 border-8 border-white" />}
              {k.shape === "diamond" && <div className="size-24 rotate-45 border-8 border-white" />}
              {k.shape === "wave" && <div className="size-28 rounded-tl-full rounded-br-full border-8 border-white" />}
            </div>
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-white/80">{k.label}</div>
                <div className="mt-1 text-3xl font-black tabular-nums">{k.value}</div>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-white/20 backdrop-blur">
                <k.icon className="size-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart + stock alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-bold"><TrendingUp className="size-4 text-brand" /> Revenus — 14 derniers jours</h3>
              <p className="text-xs text-muted-foreground">Encaissements par jour</p>
            </div>
            <Button asChild size="sm" variant="ghost"><Link to="/admin/reports">Voir plus <ArrowUpRight className="ml-1 size-3.5" /></Link></Button>
          </div>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00796f" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#0c275d" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => formatUSD(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#0c275d" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-5">
          <div className="absolute -right-10 top-6 size-32 rounded-full bg-rose-100/60 blur-2xl" />
          <div className="relative">
            <h3 className="flex items-center gap-2 font-bold"><AlertTriangle className="size-4 text-rose-600" /> Alertes de stock</h3>
            <p className="text-xs text-muted-foreground">Produits sous le seuil défini</p>
            <div className="mt-3 space-y-2">
              {outOfStock.length > 0 && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-900">
                  <strong>{outOfStock.length}</strong> produit(s) en rupture totale
                </div>
              )}
              {lowStock.slice(0, 6).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-dashed border-rose-200 bg-white/60 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">Seuil : {p.min_stock}</div>
                  </div>
                  <Badge variant={p.stock === 0 ? "destructive" : "outline"} className="font-mono">
                    {p.stock}
                  </Badge>
                </div>
              ))}
              {lowStock.length === 0 && (
                <div className="rounded-md bg-emerald-50 p-4 text-center text-sm text-emerald-800">
                  ✅ Tous les produits sont bien approvisionnés
                </div>
              )}
              {lowStock.length > 6 && (
                <Button asChild variant="ghost" size="sm" className="w-full"><Link to="/admin/stock">Voir tout ({lowStock.length})</Link></Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {overdueCredits.length > 0 && (
        <Card className="relative overflow-hidden border-destructive/40 bg-gradient-to-br from-rose-50 via-red-50 to-orange-50 p-5">
          <div className="absolute -right-8 -top-8 size-36 rounded-full bg-red-200/50 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-bold text-rose-800"><AlertTriangle className="size-4" /> Crédits en retard</h3>
              <p className="text-xs text-rose-700/80">{overdueCredits.length} crédit(s) — solde total {formatUSD(overdueTotal)}</p>
            </div>
            <Button asChild size="sm" className="bg-rose-600 text-white hover:bg-rose-700"><Link to="/admin/credits">Relancer <ArrowUpRight className="ml-1 size-3.5" /></Link></Button>
          </div>
        </Card>
      )}



      {/* Recent orders */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold"><ShoppingCart className="size-4 text-brand" /> Dernières commandes</h3>
          <Button asChild size="sm" variant="ghost"><Link to="/admin/orders">Toutes <ArrowUpRight className="ml-1 size-3.5" /></Link></Button>
        </div>
        <div className="mt-3 divide-y text-sm">
          {all.slice(0, 6).map((o: any) => (
            <div key={o.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate font-medium">{o.order_number} — {o.customer_name}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")} · {o.channel}</div>
              </div>
              <Badge className={
                o.status === "paid" || o.status === "delivered" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : o.status === "pending" ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-rose-100 text-rose-800 border-rose-200"
              } variant="outline">{o.status}</Badge>
              <div className="w-24 text-right font-semibold tabular-nums">{formatUSD(o.total)}</div>
            </div>
          ))}
          {all.length === 0 && <p className="py-6 text-center text-muted-foreground">Aucune commande pour le moment</p>}
        </div>
      </Card>
    </div>
  );
}
