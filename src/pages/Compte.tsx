import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyOrders, getMyProfile } from "@/lib/account.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUSD, formatDateTime } from "@/lib/format";
import { User, LogOut, Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function ComptePage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() as Promise<any>, enabled: ready });
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: () => getMyOrders() as Promise<any[]>, enabled: ready });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth", { replace: true });
      else setReady(true);
    });
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate("/", { replace: true });
  }

  const list = orders.data ?? [];
  const totalSpent = list.filter((o: any) => o.status === "paid" || o.status === "delivered").reduce((s: number, o: any) => s + Number(o.total), 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c275d] via-[#123a7a] to-[#00796f] p-6 text-white shadow-lg">
          <div className="absolute -right-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest text-white/70">Espace client</div>
              <h1 className="mt-1 truncate text-2xl font-black sm:text-3xl">Bonjour {profile.data?.full_name?.split(" ")[0] ?? "👋"}</h1>
              <p className="mt-1 text-sm text-white/80">{profile.data?.email}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm"><Link to="/boutique"><ShoppingBag className="mr-1.5 size-3.5" /> Boutique</Link></Button>
              <Button onClick={signOut} variant="ghost" size="sm" className="text-white hover:bg-white/10"><LogOut className="mr-1.5 size-3.5" /> Déconnexion</Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total commandes</div>
            <div className="text-2xl font-bold">{list.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total dépensé</div>
            <div className="text-2xl font-bold text-brand">{formatUSD(totalSpent)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Dernière commande</div>
            <div className="text-lg font-semibold">{list[0] ? formatDateTime(list[0].created_at) : "—"}</div>
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><User className="size-4 text-accent" /> Informations</h3>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Nom :</span> {profile.data?.full_name ?? "—"}</div>
            <div><span className="text-muted-foreground">Email :</span> {profile.data?.email ?? "—"}</div>
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b p-4"><h3 className="flex items-center gap-2 font-semibold"><Package className="size-4 text-accent" /> Mes commandes</h3></div>
          {list.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Aucune commande pour le moment. <Link to="/boutique" className="font-semibold text-accent hover:underline">Voir la boutique</Link></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</TableCell>
                      <TableCell className="text-xs">{o.order_items?.length ?? 0} article(s)</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={o.status === "paid" || o.status === "delivered" ? "border-emerald-200 bg-emerald-100 text-emerald-800" : o.status === "pending" ? "border-amber-200 bg-amber-100 text-amber-800" : "border-rose-200 bg-rose-100 text-rose-800"}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatUSD(o.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}
