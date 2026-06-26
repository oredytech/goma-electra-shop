import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrders, listProductsAdmin } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Package, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react";
import { formatUSD } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fOrders = useServerFn(listOrders);
  const fProds = useServerFn(listProductsAdmin);
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => fOrders() });
  const prods = useQuery({ queryKey: ["admin-products"], queryFn: () => fProds() });

  const all = orders.data ?? [];
  const paid = all.filter((o: any) => o.status === "paid" || o.status === "delivered");
  const pending = all.filter((o: any) => o.status === "pending");
  const revenue = paid.reduce((s: number, o: any) => s + Number(o.total), 0);
  const lowStock = (prods.data ?? []).filter((p: any) => p.stock <= p.min_stock);

  const stats = [
    { label: "Revenus", value: formatUSD(revenue), icon: DollarSign, color: "text-accent" },
    { label: "Commandes", value: all.length, icon: ShoppingCart, color: "text-brand" },
    { label: "En attente", value: pending.length, icon: AlertTriangle, color: "text-orange-600" },
    { label: "Produits", value: prods.data?.length ?? 0, icon: Package, color: "text-brand" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité CONETEC.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-2xl font-bold">{s.value}</div>
              </div>
              <s.icon className={`size-8 ${s.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Dernières commandes</h3>
          <div className="mt-3 divide-y text-sm">
            {all.slice(0, 5).map((o: any) => (
              <div key={o.id} className="flex justify-between py-2">
                <div>
                  <div className="font-medium">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{o.customer_name} · {o.status}</div>
                </div>
                <div className="font-semibold">{formatUSD(o.total)}</div>
              </div>
            ))}
            {all.length === 0 && <p className="py-4 text-center text-muted-foreground">Aucune commande</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Stock faible</h3>
          <div className="mt-3 divide-y text-sm">
            {lowStock.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex justify-between py-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-destructive">{p.stock} restant(s)</span>
              </div>
            ))}
            {lowStock.length === 0 && <p className="py-4 text-center text-muted-foreground">Tous les produits ont du stock</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
