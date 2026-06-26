import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listProductsAdmin, listInventoryMovements, recordStockMovement } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Settings2, Plus } from "lucide-react";
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
  const [form, setForm] = useState({ product_id: "", type: "in" as "in" | "out" | "adjust", quantity: 1, reason: "", reference: "" });

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock</h1>
          <p className="text-sm text-muted-foreground">Entrées, sorties et ajustements</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-brand text-brand-foreground">
          <Plus className="mr-1.5 size-4" /> Nouveau mouvement
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-0">
          <div className="border-b p-4"><h3 className="font-semibold">Stock actuel</h3></div>
          <div className="max-h-[500px] overflow-y-auto divide-y text-sm">
            {prods.data?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <div className="font-medium">{p.name}</div>
                  {p.sku && <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>}
                </div>
                <Badge variant={p.stock <= p.min_stock ? "destructive" : "secondary"} className="font-mono">
                  {p.stock} unités
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b p-4"><h3 className="font-semibold">Derniers mouvements</h3></div>
          <div className="max-h-[500px] overflow-y-auto divide-y text-sm">
            {moves.data?.map((m: any) => (
              <div key={m.id} className="flex items-start gap-3 px-4 py-2.5">
                <div className={`grid size-8 shrink-0 place-items-center rounded-full ${m.type === "in" ? "bg-accent/10 text-accent" : m.type === "out" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                  {m.type === "in" ? <ArrowDown className="size-4" /> : m.type === "out" ? <ArrowUp className="size-4" /> : <Settings2 className="size-4" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{m.products?.name} <span className="font-mono text-xs text-muted-foreground">{m.type} {m.quantity}</span></div>
                  {m.reason && <div className="text-xs text-muted-foreground">{m.reason}</div>}
                  <div className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</div>
                </div>
              </div>
            ))}
            {moves.data && moves.data.length === 0 && <p className="p-6 text-center text-muted-foreground">Aucun mouvement</p>}
          </div>
        </Card>
      </div>

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
