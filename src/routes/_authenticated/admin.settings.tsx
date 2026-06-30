import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, KeyRound, Store, MapPin, MessageCircle, FileText, Image as ImageIcon, PenTool } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

type Form = {
  shwary_merchant_id: string; shwary_api_key: string; shwary_webhook_secret: string;
  contact_email: string; contact_phone: string;
  whatsapp: string; facebook_url: string;
  address_line: string; city: string; country: string; business_hours: string;
  shop_name: string; shop_tagline: string;
  delivery_fee: number; default_currency: "USD" | "CDF";
  invoice_logo_url: string | null;
  invoice_signature_url: string | null;
  invoice_signatory_name: string;
  invoice_primary_color: string;
  invoice_accent_color: string;
  invoice_header_text: string;
  invoice_footer_text: string;
  invoice_layout: "classic" | "modern" | "minimal";
  invoice_show_signature: boolean;
};

function AdminSettings() {
  const fGet = useServerFn(getSettings);
  const fSave = useServerFn(saveSettings);
  const q = useQuery({ queryKey: ["settings"], queryFn: () => fGet(), retry: false });

  const [form, setForm] = useState<Form>({
    shwary_merchant_id: "", shwary_api_key: "", shwary_webhook_secret: "",
    contact_email: "", contact_phone: "", whatsapp: "", facebook_url: "",
    address_line: "", city: "Goma", country: "RDC", business_hours: "",
    shop_name: "CONETEC", shop_tagline: "",
    delivery_fee: 0, default_currency: "USD",
    invoice_logo_url: null, invoice_signature_url: null, invoice_signatory_name: "",
    invoice_primary_color: "#0c275d", invoice_accent_color: "#00796f",
    invoice_header_text: "", invoice_footer_text: "",
    invoice_layout: "classic", invoice_show_signature: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data) {
      const d = q.data as any;
      setForm({
        shwary_merchant_id: d.shwary_merchant_id ?? "",
        shwary_api_key: d.shwary_api_key ?? "",
        shwary_webhook_secret: d.shwary_webhook_secret ?? "",
        contact_email: d.contact_email ?? "",
        contact_phone: d.contact_phone ?? "",
        whatsapp: d.whatsapp ?? "",
        facebook_url: d.facebook_url ?? "",
        address_line: d.address_line ?? "",
        city: d.city ?? "Goma",
        country: d.country ?? "RDC",
        business_hours: d.business_hours ?? "",
        shop_name: d.shop_name ?? "CONETEC",
        shop_tagline: d.shop_tagline ?? "",
        delivery_fee: Number(d.delivery_fee ?? 0),
        default_currency: (d.default_currency ?? "USD") as "USD" | "CDF",
        invoice_logo_url: d.invoice_logo_url ?? null,
        invoice_signature_url: d.invoice_signature_url ?? null,
        invoice_signatory_name: d.invoice_signatory_name ?? "",
        invoice_primary_color: d.invoice_primary_color ?? "#0c275d",
        invoice_accent_color: d.invoice_accent_color ?? "#00796f",
        invoice_header_text: d.invoice_header_text ?? "",
        invoice_footer_text: d.invoice_footer_text ?? "",
        invoice_layout: (d.invoice_layout as Form["invoice_layout"]) ?? "classic",
        invoice_show_signature: Boolean(d.invoice_show_signature),
      });
    }
  }, [q.data]);

  if (q.isError) {
    return <div className="rounded-lg border bg-destructive/5 p-6 text-destructive">{(q.error as Error).message}</div>;
  }

  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await fSave({ data: form }); toast.success("Paramètres enregistrés"); q.refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Identité boutique, contacts publics et configuration paiement.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><Store className="size-4 text-accent" /> Identité de la boutique</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><Label>Nom de la boutique</Label><Input value={form.shop_name} onChange={(e) => set("shop_name", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Slogan / Description courte</Label><Input value={form.shop_tagline} onChange={(e) => set("shop_tagline", e.target.value)} placeholder="Company of New Technology — équipements & services" /></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-accent" /> Adresse & contacts (publics)</h3>
          <p className="mt-1 text-xs text-muted-foreground">Visibles dans le pied de page du site.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Adresse (rue & quartier)</Label><Input value={form.address_line} onChange={(e) => set("address_line", e.target.value)} placeholder="Quartier Virunga, Av. OSSO N°18" /></div>
            <div><Label>Ville</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div><Label>Pays</Label><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></div>
            <div><Label>Téléphone</Label><Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="+243 …" /></div>
            <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></div>
            <div><Label>WhatsApp (numéro)</Label><Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+243 …" /></div>
            <div><Label>Facebook (URL)</Label><Input value={form.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} placeholder="https://facebook.com/…" /></div>
            <div className="sm:col-span-2"><Label>Horaires d'ouverture</Label><Input value={form.business_hours} onChange={(e) => set("business_hours", e.target.value)} placeholder="Lun–Sam : 08h–18h" /></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><Smartphone className="size-4 text-accent" /> Mobile Money — Shwary</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Doc :
            <a href="https://github.com/shwary-co/shwary-doc/blob/main/merchant-fr.md" target="_blank" rel="noreferrer" className="ml-1 underline">merchant-fr.md</a>
          </p>
          <div className="mt-4 space-y-3">
            <div><Label className="flex items-center gap-1"><KeyRound className="size-3.5" /> Merchant ID</Label><Input value={form.shwary_merchant_id} onChange={(e) => set("shwary_merchant_id", e.target.value)} /></div>
            <div><Label className="flex items-center gap-1"><KeyRound className="size-3.5" /> API Key</Label><Input type="password" value={form.shwary_api_key} onChange={(e) => set("shwary_api_key", e.target.value)} placeholder={q.data?.shwary_api_key ? "Inchangé" : "Saisir la clé"} /></div>
            <div>
              <Label>Webhook Secret (HMAC)</Label>
              <Input type="password" value={form.shwary_webhook_secret} onChange={(e) => set("shwary_webhook_secret", e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">URL webhook : <code className="rounded bg-muted px-1">/api/public/webhooks/shwary</code></p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><MessageCircle className="size-4 text-accent" /> Boutique en ligne</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><Label>Frais de livraison (Goma)</Label><Input type="number" step="0.01" value={form.delivery_fee} onChange={(e) => set("delivery_fee", +e.target.value)} /></div>
            <div>
              <Label>Devise par défaut</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.default_currency} onChange={(e) => set("default_currency", e.target.value as "USD" | "CDF")}>
                <option value="USD">USD</option><option value="CDF">CDF</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><FileText className="size-4 text-accent" /> Personnalisation de la facture</h3>
          <p className="mt-1 text-xs text-muted-foreground">Logo, signature, couleurs, en-tête, pied de page — appliqués à toutes les factures PDF.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-1"><ImageIcon className="size-3.5" /> Logo de facture</Label>
              <input type="file" accept="image/png,image/jpeg" className="mt-1 text-sm"
                onChange={async (e) => { const f = e.target.files?.[0]; if (f) set("invoice_logo_url", await fileToDataUrl(f, 320)); }} />
              {form.invoice_logo_url && <div className="mt-2 flex items-center gap-2"><img src={form.invoice_logo_url} alt="logo" className="h-12 rounded border bg-white p-1" /><Button type="button" size="sm" variant="ghost" onClick={() => set("invoice_logo_url", null)}>Retirer</Button></div>}
            </div>

            <div>
              <Label className="flex items-center gap-1"><PenTool className="size-3.5" /> Signature</Label>
              <input type="file" accept="image/png,image/jpeg" className="mt-1 text-sm"
                onChange={async (e) => { const f = e.target.files?.[0]; if (f) set("invoice_signature_url", await fileToDataUrl(f, 360)); }} />
              {form.invoice_signature_url && <div className="mt-2 flex items-center gap-2"><img src={form.invoice_signature_url} alt="signature" className="h-12 rounded border bg-white p-1" /><Button type="button" size="sm" variant="ghost" onClick={() => set("invoice_signature_url", null)}>Retirer</Button></div>}
            </div>

            <div>
              <Label>Nom du signataire</Label>
              <Input value={form.invoice_signatory_name} onChange={(e) => set("invoice_signatory_name", e.target.value)} placeholder="Ex. Direction CONETEC" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="showsig" type="checkbox" checked={form.invoice_show_signature} onChange={(e) => set("invoice_show_signature", e.target.checked)} className="size-4" />
              <Label htmlFor="showsig" className="cursor-pointer">Afficher la zone signature sur la facture</Label>
            </div>

            <div>
              <Label>Couleur principale (en-tête)</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.invoice_primary_color} onChange={(e) => set("invoice_primary_color", e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <Input value={form.invoice_primary_color} onChange={(e) => set("invoice_primary_color", e.target.value)} placeholder="#0c275d" />
              </div>
            </div>
            <div>
              <Label>Couleur accent (total)</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.invoice_accent_color} onChange={(e) => set("invoice_accent_color", e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <Input value={form.invoice_accent_color} onChange={(e) => set("invoice_accent_color", e.target.value)} placeholder="#00796f" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label>Mise en page</Label>
              <div className="mt-1 flex gap-2">
                {(["classic", "modern", "minimal"] as const).map((l) => (
                  <Button key={l} type="button" size="sm" variant={form.invoice_layout === l ? "default" : "outline"}
                    onClick={() => set("invoice_layout", l)}
                    className={form.invoice_layout === l ? "bg-gradient-brand text-brand-foreground" : ""}>
                    {l === "classic" ? "Classique" : l === "modern" ? "Moderne (bandes alternées)" : "Minimal (sobre)"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2"><Label>Mention d'en-tête (optionnel)</Label><Input value={form.invoice_header_text} onChange={(e) => set("invoice_header_text", e.target.value)} placeholder="Ex. RCCM : XXX — Id. Nat : YYY" /></div>
            <div className="sm:col-span-2"><Label>Mention de pied (optionnel)</Label><Input value={form.invoice_footer_text} onChange={(e) => set("invoice_footer_text", e.target.value)} placeholder="Merci pour votre confiance." /></div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-gradient-brand text-brand-foreground">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </div>
      </form>
    </div>
  );
}

async function fileToDataUrl(file: File, maxWidth = 360): Promise<string> {
  // Resize via canvas to keep payload small
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png", 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
