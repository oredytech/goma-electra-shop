import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { formatUSD } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder } from "@/lib/orders.functions";
import { toast } from "sonner";
import { Loader2, MapPin, Phone, CheckCircle2, Smartphone } from "lucide-react";

const GOMA_NEIGHBORHOODS = [
  "Virunga", "Himbi", "Katindo", "Mabanga", "Mapendo", "Murara",
  "Ndosho", "Keshero", "Les Volcans", "Office", "Kasika", "Majengo", "Autre",
];

export function CheckoutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const place = useServerFn(placeOrder);

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<null | { orderNumber: string; total: number; paymentUrl: string | null }>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", neighborhood: "Virunga", notes: "" });

  function up<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return toast.error("Votre panier est vide");
    setLoading(true);
    try {
      const r = await place({
        data: {
          customer: form,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });
      setConfirmed({ orderNumber: r.orderNumber, total: r.total, paymentUrl: r.paymentUrl });
      clear();
      if (r.paymentUrl) {
        toast.success("Commande créée ! Redirection vers Mobile Money...");
        setTimeout(() => { window.location.href = r.paymentUrl!; }, 1500);
      } else {
        toast.success("Commande enregistrée");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setConfirmed(null); onOpenChange(o); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        {confirmed ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto size-14 text-accent" />
            <h2 className="mt-4 text-2xl font-bold">Commande confirmée</h2>
            <p className="mt-1 text-muted-foreground">N° <strong>{confirmed.orderNumber}</strong></p>
            <p className="mt-1 text-lg font-semibold">Total : {formatUSD(confirmed.total)}</p>
            {confirmed.paymentUrl ? (
              <p className="mt-3 text-sm text-muted-foreground">Redirection vers le paiement Mobile Money...</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Notre équipe vous contactera au numéro fourni pour finaliser le paiement.
              </p>
            )}
            <Button onClick={() => onOpenChange(false)} className="mt-6 bg-gradient-brand text-brand-foreground">Fermer</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Smartphone className="size-5 text-accent" /> Finaliser la commande</DialogTitle>
              <DialogDescription>Paiement Mobile Money via Shwary. Livraison à Goma uniquement.</DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Récap */}
              <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
                <div className="mb-2 font-semibold">Votre panier ({items.length})</div>
                <ul className="space-y-1">
                  {items.map((i) => (
                    <li key={i.productId} className="flex justify-between">
                      <span className="truncate">{i.quantity}× {i.name}</span>
                      <span className="font-medium">{formatUSD(i.unitPrice * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                  <span>Sous-total</span><span>{formatUSD(subtotal)}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nom complet *</Label>
                  <Input required value={form.name} onChange={(e) => up("name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Phone className="size-3.5" /> Téléphone Mobile Money *</Label>
                  <Input required placeholder="+243 …" value={form.phone} onChange={(e) => up("phone", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email (pour recevoir la facture)</Label>
                <Input type="email" value={form.email} onChange={(e) => up("email", e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><MapPin className="size-3.5" /> Quartier (Goma) *</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.neighborhood} onChange={(e) => up("neighborhood", e.target.value)}>
                    {GOMA_NEIGHBORHOODS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse précise *</Label>
                  <Input required placeholder="Av., n°…" value={form.address} onChange={(e) => up("address", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (facultatif)</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => up("notes", e.target.value)} />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-brand-foreground" size="lg">
                {loading ? <><Loader2 className="mr-2 size-4 animate-spin" /> Traitement...</> : <>Payer {formatUSD(subtotal)} via Mobile Money</>}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Livraison uniquement à Goma · Paiement sécurisé via Shwary</p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
