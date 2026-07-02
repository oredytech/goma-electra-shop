import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listProductsAdmin, listInventoryMovements, recordStockMovement } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, Settings2, Plus, Search } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/stock")({
  component: AdminStock,
});

function AdminStock() {
  const qc = useQueryClient();
  const fProds = useServerFn(listProductsAdmin);
  const fMoves = useServerFn(listInventoryMovements);
  const fSave = useServerFn(recordStockMovement);

  const prods = useQuery({ queryKey: ["admin-products"], queryFn: () => fProds() });
  const moves = useQuery({ queryKey: ["inventory-moves"], queryFn: () => fMoves() });

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ product_id: "", type: "in" as "in" | "out" | "adjust", quantity: 1, reason: "", reference: "" });

  const filtered = useMemo(() => {
    const list = (prods.data ?? []) as any[];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) =>
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term),
    );
  }, [prods.data, q]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id) return toast.error("Sélectionnez un produit");
    try {
      await fSave({ data: form });
      toast.success("Mouvement enregistré");
      setOpen(false);
      setForm({ product_id: "", type: "in", quantity: 1, reason: "", reference: "" });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["inventory-moves"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  function openFor(productId: string, type: "in" | "out" | "adjust") {
    setForm({ product_id: productId, type, quantity: 1, reason: "", reference: "" });
    setOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Stock</h1>
          <p className="text-sm text-muted-foreground">Entrées, sorties et ajustements — vue tableau</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-brand text-brand-foreground">
          <Plus className="mr-1.5 size-4" /> Nouveau mouvement
        </Button>
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h3 className="font-semibold">Articles en stock</h3>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, SKU)" className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Seuil min.</TableHead>
                <TableHead className="text-center">État</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => {
                const low = p.stock <= p.min_stock;
                const out = p.stock === 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{p.stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.min_stock}</TableCell>
                    <TableCell className="text-center">
                      {out ? <Badge variant="destructive">Rupture</Badge>
                        : low ? <Badge className="bg-amber-100 text-amber-800 border-amber-200" variant="outline">Faible</Badge>
                        : <Badge variant="secondary">OK</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openFor(p.id, "in")}>
                          <ArrowDown className="size-3.5 text-emerald-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openFor(p.id, "out")}>
                          <ArrowUp className="size-3.5 text-rose-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openFor(p.id, "adjust")}>
                          <Settings2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Aucun produit</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b p-4"><h3 className="font-semibold">Derniers mouvements</h3></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Motif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(moves.data ?? []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</TableCell>
                  <TableCell className="font-medium">{m.products?.name ?? "—"}</TableCell>
                  <TableCell>
                    {m.type === "in" && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200" variant="outline">Entrée</Badge>}
                    {m.type === "out" && <Badge className="bg-rose-100 text-rose-800 border-rose-200" variant="outline">Sortie</Badge>}
                    {m.type === "adjust" && <Badge variant="secondary">Ajustement</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{m.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">{m.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
              {moves.data && moves.data.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Aucun mouvement</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau mouvement de stock</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>Produit *</Label>
              <select required className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.product_id} onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}>
                <option value="">— Choisir —</option>
                {prods.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}>
                  <option value="in">Entrée (+)</option>
                  <option value="out">Sortie (−)</option>
                  <option value="adjust">Ajustement (=)</option>
                </select>
              </div>
              <div>
                <Label>{form.type === "adjust" ? "Nouveau stock *" : "Quantité *"}</Label>
                <Input type="number" min={1} required value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: +e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Motif</Label>
              <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Achat fournisseur, vente boutique, casse..." />
            </div>
            <div>
              <Label>Référence (facture, bon...)</Label>
              <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-gradient-brand text-brand-foreground">Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
