import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/tanstack-start-compat";
import { listCustomers } from "@/lib/customers.functions";
import { Card } from "@/components/ui/card";
import { formatUSD, formatDate } from "@/lib/format";
import { UsersRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const f = useServerFn(listCustomers);
  const q = useQuery({ queryKey: ["customers"], queryFn: () => f() });
  const rows = q.data ?? [];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><UsersRound className="size-6 text-accent" /> Répertoire clients</h1>
        <p className="text-sm text-muted-foreground">Ajout automatique à chaque commande passée en ligne ou vente directe.</p>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Nom</th>
                <th className="px-3 py-2.5">Téléphone</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Quartier</th>
                <th className="px-3 py-2.5 text-right">Commandes</th>
                <th className="px-3 py-2.5 text-right">Total dépensé</th>
                <th className="px-3 py-2.5">Dernière</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((c: any) => (
                <tr key={c.id} className="hover:bg-secondary/40">
                  <td className="px-3 py-2.5 font-medium">{c.full_name}</td>
                  <td className="px-3 py-2.5">{c.phone ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-3 py-2.5">{c.neighborhood ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right">{c.orders_count}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{formatUSD(Number(c.total_spent))}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.last_order_at ? formatDate(c.last_order_at) : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">Aucun client enregistré pour le moment.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
