import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProductsAdmin, createDirectSale, getOrderDetail } from "@/lib/admin.functions";
import { getPublicSiteSettings } from "@/lib/site-settings.functions";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Trash2, Search, ShoppingBag, FileDown } from "lucide-react";
import { formatUSD } from "@/lib/format";
import { toast } from "sonner";

export function DirectSaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const fList = useServerFn(listProductsAdmin);
  const fSell = useServerFn(createDirectSale);
  const fDetail = useServerFn(getOrderDetail);
  const fSettings = useServerFn(getPublicSiteSettings);
  const prods = useQuery({ queryKey: ["admin-products"], queryFn: () => fList(), enabled: open });
  const settings = useQuery({ queryKey: ["public-settings"], queryFn: () => fSettings(), staleTime: 60_000 });
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [method, setMethod] = useState<"cash" | "mobile_money" | "card">("cash");
  const [saving, setSaving] = useState(false);
  const [lastSale, setLastSale] = useState<{ id: string; number: string; total: number } | null>(null);

  const filtered = useMemo(() => {
    const list = (prods.data ?? []).filter((p: any) => p.is_active);
    if (!q.trim()) return list.slice(0, 30);
    const s = q.trim().toLowerCase();
    return list.filter((p: any) => p.name.toLowerCase().includes(s) || (p.sku ?? "").toLowerCase().includes(s)).slice(0, 30);
  }, [prods.data, q]);

  const cartLines = Object.entries(cart)
    .map(([pid, qty]) => {
      const p = prods.data?.find((x: any) => x.id === pid);
      return p ? { id: pid, name: p.name, unit: Number(p.price_usd), qty, stock: p.stock, total: Number(p.price_usd) * qty } : null;
    })
    .filter(Boolean) as { id: string; name: string; unit: number; qty: number; stock: number; total: number }[];
  const total = cartLines.reduce((s, l) => s + l.total, 0);

  function add(p: any) {
    setCart((c) => ({ ...c, [p.id]: Math.min(p.stock, (c[p.id] ?? 0) + 1) }));
  }
  function setQty(id: string, qty: number, stock: number) {
    if (qty <= 0) { setCart((c) => { const n = { ...c }; delete n[id]; return n; }); return; }
    setCart((c) => ({ ...c, [id]: Math.min(stock, qty) }));
  }

  async function submit() {
    if (cartLines.length === 0) return toast.error("Ajoutez au moins un produit");
    setSaving(true);
    try {
      const res = await fSell({
        data: {
          customer_name: customer.name, customer_phone: customer.phone, payment_method: method,
          items: cartLines.map((l) => ({ product_id: l.id, quantity: l.qty })),
        },
      });
      toast.success(`Vente ${res.orderNumber} enregistrée — ${formatUSD(res.total)}`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["inventory-moves"] });
      setLastSale({ id: res.orderId, number: res.orderNumber, total: Number(res.total) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setSaving(false); }
  }

  async function downloadLastInvoice() {
    if (!lastSale) return;
    try {
      const d = await fDetail({ data: { id: lastSale.id } });
      const s = settings.data;
      downloadInvoicePDF(
        {
          invoiceNumber: d.invoice?.invoice_number ?? null,
          orderNumber: d.order!.order_number,
          issuedAt: d.invoice?.issued_at ?? d.order!.created_at,
          customer: {
            name: d.order!.customer_name, phone: d.order!.customer_phone,
            email: d.order!.customer_email, neighborhood: d.order!.neighborhood,
            address: d.order!.delivery_address,
          },
          items: d.items as never,
          subtotal: d.order!.subtotal, deliveryFee: d.order!.delivery_fee,
          total: d.order!.total, currency: d.order!.currency,
          paymentMethod: d.order!.payment_method, status: d.order!.status,
        },
        { name: s?.shop_name ?? "CONETEC", tagline: s?.shop_tagline, address: s?.address_line, city: s?.city, country: s?.country, phone: s?.contact_phone, email: s?.contact_email },
      );
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur PDF"); }
  }

  function closeAndReset() {
    setCart({}); setCustomer({ name: "", phone: "" }); setLastSale(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeAndReset(); else onOpenChange(true); }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingBag className="size-5" /> Vente directe (comptoir)</DialogTitle>
        </DialogHeader>
        {lastSale ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
              <ShoppingBag className="size-7" />
            </div>
            <div>
              <div className="text-xl font-bold">Vente {lastSale.number}</div>
              <div className="text-sm text-muted-foreground">Total encaissé : <strong>{formatUSD(lastSale.total)}</strong></div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={downloadLastInvoice} className="bg-gradient-brand text-brand-foreground">
                <FileDown className="mr-1.5 size-4" /> Télécharger la facture PDF
              </Button>
              <Button variant="outline" onClick={() => { setLastSale(null); }}>Nouvelle vente</Button>
              <Button variant="ghost" onClick={closeAndReset}>Fermer</Button>
            </div>
          </div>
        ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Rechercher un produit…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-md border divide-y">
              {filtered.map((p: any) => (
                <button key={p.id} type="button" onClick={() => add(p)} disabled={p.stock <= 0}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary/60 disabled:opacity-40">
                  {p.image_url ? <img src={p.image_url} alt="" className="size-9 rounded object-cover" /> : <div className="size-9 rounded bg-secondary" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">Stock: {p.stock}</div>
                  </div>
                  <div className="font-semibold">{formatUSD(p.price_usd)}</div>
                </button>
              ))}
              {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Aucun produit</div>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border p-3">
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Panier</div>
              {cartLines.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">Vide</div>}
              <div className="space-y-2">
                {cartLines.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 text-sm">
                    <div className="min-w-0 flex-1 truncate">{l.name}</div>
                    <Button size="icon" variant="outline" className="size-7" onClick={() => setQty(l.id, l.qty - 1, l.stock)}><Minus className="size-3" /></Button>
                    <span className="w-6 text-center font-mono">{l.qty}</span>
                    <Button size="icon" variant="outline" className="size-7" onClick={() => setQty(l.id, l.qty + 1, l.stock)}><Plus className="size-3" /></Button>
                    <span className="w-20 text-right font-semibold">{formatUSD(l.total)}</span>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setQty(l.id, 0, l.stock)}><Trash2 className="size-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-2 font-bold">
                <span>Total</span><span>{formatUSD(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><Label>Nom client</Label><Input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="Optionnel" /></div>
              <div><Label>Téléphone</Label><Input value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} placeholder="Optionnel" /></div>
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <div className="mt-1 flex gap-2">
                {(["cash", "mobile_money", "card"] as const).map((m) => (
                  <Badge key={m} onClick={() => setMethod(m)}
                    className={`cursor-pointer ${method === m ? "bg-gradient-brand" : "bg-secondary text-foreground hover:bg-secondary/70"}`}>
                    {m === "cash" ? "Espèces" : m === "mobile_money" ? "Mobile Money" : "Carte"}
                  </Badge>
                ))}
              </div>
            </div>
            <Button onClick={submit} disabled={saving || cartLines.length === 0}
              className="w-full bg-gradient-brand text-brand-foreground">
              {saving ? "Enregistrement…" : `Encaisser ${formatUSD(total)}`}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
