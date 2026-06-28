import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCategories } from "@/lib/catalog.functions";
import { listProductsAdmin, upsertProduct, deleteProduct, uploadProductImage } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import { formatUSD } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

type FormState = {
  id?: string; name: string; slug: string; sku: string; description: string;
  category_id: string; price_usd: number; price_cdf: number;
  stock: number; min_stock: number; image_url: string; is_active: boolean;
};
const emptyForm: FormState = {
  name: "", slug: "", sku: "", description: "", category_id: "",
  price_usd: 0, price_cdf: 0, stock: 0, min_stock: 0, image_url: "", is_active: true,
};

function slugify(s: string) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function AdminProducts() {
  const qc = useQueryClient();
  const fList = useServerFn(listProductsAdmin);
  const fCats = useServerFn(listCategories);
  const fSave = useServerFn(upsertProduct);
  const fDel = useServerFn(deleteProduct);

  const prods = useQuery({ queryKey: ["admin-products"], queryFn: () => fList() });
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => fCats() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() { setForm(emptyForm); setOpen(true); }
  function openEdit(p: any) {
    setForm({
      id: p.id, name: p.name, slug: p.slug, sku: p.sku ?? "",
      description: p.description ?? "", category_id: p.category_id ?? "",
      price_usd: Number(p.price_usd), price_cdf: Number(p.price_cdf ?? 0),
      stock: p.stock, min_stock: p.min_stock,
      image_url: p.image_url ?? "", is_active: p.is_active,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fSave({ data: { ...form, category_id: form.category_id || null } });
      toast.success("Produit enregistré");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await fDel({ data: { id } });
      toast.success("Supprimé");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-sm text-muted-foreground">{prods.data?.length ?? 0} produit(s)</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-brand text-brand-foreground">
          <Plus className="mr-1.5 size-4" /> Nouveau produit
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3 text-right">Prix</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {prods.data?.map((p: any) => (
                <tr key={p.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? <img src={p.image_url} alt="" className="size-10 rounded object-cover" /> : <div className="size-10 rounded bg-secondary" />}
                      <div>
                        <div className="font-medium">{p.name}</div>
                        {p.sku && <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.categories?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatUSD(p.price_usd)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.stock <= p.min_stock ? "text-destructive font-semibold" : ""}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.is_active ? <Badge variant="default" className="bg-accent">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(p.id)}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
              {prods.data && prods.data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Aucun produit. Cliquez sur "Nouveau produit".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Modifier" : "Nouveau"} produit</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nom *</Label>
                <Input required value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} />
              </div>
              <div>
                <Label>Slug (URL) *</Label>
                <Input required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </div>
              <div>
                <Label>Catégorie</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                  <option value="">— Aucune —</option>
                  {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div><Label>Prix (USD) *</Label><Input type="number" step="0.01" required value={form.price_usd} onChange={(e) => setForm((f) => ({ ...f, price_usd: +e.target.value }))} /></div>
              <div><Label>Prix (CDF)</Label><Input type="number" step="1" value={form.price_cdf} onChange={(e) => setForm((f) => ({ ...f, price_cdf: +e.target.value }))} /></div>
              <div><Label>Stock *</Label><Input type="number" required value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: +e.target.value }))} /></div>
              <div><Label>Stock min</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm((f) => ({ ...f, min_stock: +e.target.value }))} /></div>
            </div>
            <div>
              <Label>URL de l'image</Label>
              <Input type="url" placeholder="https://..." value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>Produit actif (visible en boutique)</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="bg-gradient-brand text-brand-foreground">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
