import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { submitContactMessage, submitProductSuggestion } from "@/lib/public-forms.functions";
import { getPublicSiteSettings } from "@/lib/site-settings.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, MessageCircle, Lightbulb, Send } from "lucide-react";
import { toast } from "sonner";

export function PublicForms() {
  const fContact = useServerFn(submitContactMessage);
  const fSuggest = useServerFn(submitProductSuggestion);
  const fSettings = useServerFn(getPublicSiteSettings);
  const settings = useQuery({ queryKey: ["public-settings"], queryFn: () => fSettings(), staleTime: 60_000 });

  const [c, setC] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [s, setS] = useState({ product_name: "", description: "", suggester_name: "", suggester_phone: "", suggester_email: "" });
  const [busy1, setBusy1] = useState(false);
  const [busy2, setBusy2] = useState(false);

  async function sendContact(e: React.FormEvent) {
    e.preventDefault();
    setBusy1(true);
    try {
      await fContact({ data: c });
      toast.success("Message envoyé — nous vous répondons vite.");
      setC({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setBusy1(false); }
  }
  async function sendSuggest(e: React.FormEvent) {
    e.preventDefault();
    setBusy2(true);
    try {
      await fSuggest({ data: s });
      toast.success("Merci pour la suggestion !");
      setS({ product_name: "", description: "", suggester_name: "", suggester_phone: "", suggester_email: "" });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setBusy2(false); }
  }

  const st = settings.data;

  return (
    <section id="contact" className="bg-secondary/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mb-10 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Contact & suggestions</span>
          <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl">Parlons de votre projet</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact info */}
          <Card className="space-y-4 p-6">
            <h3 className="text-lg font-semibold">Nos coordonnées</h3>
            {st?.contact_phone && (
              <a href={`tel:${st.contact_phone}`} className="flex items-start gap-3 text-sm hover:text-accent">
                <Phone className="mt-0.5 size-4 text-accent" /> <span>{st.contact_phone}</span>
              </a>
            )}
            {st?.whatsapp && (
              <a href={`https://wa.me/${st.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="flex items-start gap-3 text-sm hover:text-accent">
                <MessageCircle className="mt-0.5 size-4 text-accent" /> <span>WhatsApp : {st.whatsapp}</span>
              </a>
            )}
            {st?.contact_email && (
              <a href={`mailto:${st.contact_email}`} className="flex items-start gap-3 text-sm hover:text-accent">
                <Mail className="mt-0.5 size-4 text-accent" /> <span>{st.contact_email}</span>
              </a>
            )}
            {(st?.address_line || st?.city) && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="mt-0.5 size-4 text-accent" />
                <span>{[st?.address_line, st?.city, st?.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {st?.business_hours && <p className="text-xs text-muted-foreground">{st.business_hours}</p>}
          </Card>

          {/* Contact form */}
          <Card className="p-6 lg:col-span-1">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Send className="size-4 text-accent" /> Message rapide</h3>
            <form onSubmit={sendContact} className="space-y-3">
              <div><Label>Nom *</Label><Input required value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Email</Label><Input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></div>
                <div><Label>Téléphone</Label><Input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></div>
              </div>
              <div><Label>Sujet</Label><Input value={c.subject} onChange={(e) => setC({ ...c, subject: e.target.value })} /></div>
              <div><Label>Message *</Label><Textarea required rows={4} value={c.message} onChange={(e) => setC({ ...c, message: e.target.value })} /></div>
              <Button type="submit" disabled={busy1} className="w-full bg-gradient-brand text-brand-foreground">{busy1 ? "Envoi…" : "Envoyer"}</Button>
            </form>
          </Card>

          {/* Suggestion form */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Lightbulb className="size-4 text-accent" /> Suggérer un produit</h3>
            <p className="mb-3 text-xs text-muted-foreground">Un produit vous manque dans notre boutique ? Dites-le nous.</p>
            <form onSubmit={sendSuggest} className="space-y-3">
              <div><Label>Produit recherché *</Label><Input required value={s.product_name} onChange={(e) => setS({ ...s, product_name: e.target.value })} /></div>
              <div><Label>Détails</Label><Textarea rows={3} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Votre nom</Label><Input value={s.suggester_name} onChange={(e) => setS({ ...s, suggester_name: e.target.value })} /></div>
                <div><Label>Téléphone</Label><Input value={s.suggester_phone} onChange={(e) => setS({ ...s, suggester_phone: e.target.value })} /></div>
              </div>
              <Button type="submit" disabled={busy2} variant="outline" className="w-full">{busy2 ? "Envoi…" : "Suggérer"}</Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
}
