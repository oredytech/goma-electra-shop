import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, AtSign, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const fGet = useServerFn(getSettings);
  const fSave = useServerFn(saveSettings);

  const q = useQuery({ queryKey: ["settings"], queryFn: () => fGet(), retry: false });

  const [form, setForm] = useState({
    shwary_merchant_id: "", shwary_api_key: "", shwary_webhook_secret: "",
    contact_email: "", contact_phone: "",
    delivery_fee: 0, default_currency: "USD" as "USD" | "CDF",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data) {
      setForm({
        shwary_merchant_id: q.data.shwary_merchant_id ?? "",
        shwary_api_key: q.data.shwary_api_key ?? "",
        shwary_webhook_secret: q.data.shwary_webhook_secret ?? "",
        contact_email: q.data.contact_email ?? "",
        contact_phone: q.data.contact_phone ?? "",
        delivery_fee: Number(q.data.delivery_fee ?? 0),
        default_currency: (q.data.default_currency ?? "USD") as "USD" | "CDF",
      });
    }
  }, [q.data]);

  if (q.isError) {
    return <div className="rounded-lg border bg-destructive/5 p-6 text-destructive">{(q.error as Error).message}</div>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fSave({ data: form });
      toast.success("Paramètres enregistrés");
      q.refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Identifiants de paiement et configuration boutique.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><Smartphone className="size-4 text-accent" /> Paiement Mobile Money — Shwary</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Documentation Shwary :
            <a href="https://github.com/shwary-co/shwary-doc/blob/main/merchant-fr.md" target="_blank" rel="noreferrer" className="ml-1 underline">merchant-fr.md</a>
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <Label className="flex items-center gap-1"><KeyRound className="size-3.5" /> Merchant ID</Label>
              <Input value={form.shwary_merchant_id} onChange={(e) => setForm((f) => ({ ...f, shwary_merchant_id: e.target.value }))} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><KeyRound className="size-3.5" /> API Key</Label>
              <Input type="password" value={form.shwary_api_key} onChange={(e) => setForm((f) => ({ ...f, shwary_api_key: e.target.value }))}
                placeholder={q.data?.shwary_api_key ? "Inchangé" : "Saisir la clé"} />
            </div>
            <div>
              <Label>Webhook Secret (HMAC)</Label>
              <Input type="password" value={form.shwary_webhook_secret} onChange={(e) => setForm((f) => ({ ...f, shwary_webhook_secret: e.target.value }))} />
              <p className="mt-1 text-xs text-muted-foreground">
                URL webhook à configurer chez Shwary : <code className="rounded bg-muted px-1">/api/public/webhooks/shwary</code>
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><AtSign className="size-4 text-accent" /> Boutique</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Email contact</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
            </div>
            <div>
              <Label>Téléphone contact</Label>
              <Input value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
            </div>
            <div>
              <Label>Frais de livraison (Goma)</Label>
              <Input type="number" step="0.01" value={form.delivery_fee} onChange={(e) => setForm((f) => ({ ...f, delivery_fee: +e.target.value }))} />
            </div>
            <div>
              <Label>Devise par défaut</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.default_currency} onChange={(e) => setForm((f) => ({ ...f, default_currency: e.target.value as any }))}>
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-gradient-brand text-brand-foreground">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
