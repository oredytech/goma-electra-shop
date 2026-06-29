import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Phone, Mail, Clock, Facebook, MessageCircle } from "lucide-react";
import logoAsset from "@/assets/conetec-logo.png.asset.json";
import { getPublicSiteSettings } from "@/lib/site-settings.functions";

export function SiteFooter() {
  const f = useServerFn(getPublicSiteSettings);
  const s = useQuery({ queryKey: ["public-settings"], queryFn: () => f(), staleTime: 60_000 });
  const d = s.data;
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-[oklch(0.16_0.05_264)] text-white/85">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/95 p-1.5">
              <img src={logoAsset.url} alt={d?.shop_name ?? "CONETEC"} className="h-9 w-auto" />
            </div>
            <span className="text-lg font-bold text-white">{d?.shop_name ?? "CONETEC"}</span>
          </div>
          <p className="mt-4 max-w-md text-sm text-white/70">
            {d?.shop_tagline ?? "Company of New Technology — Vente d'équipements électroniques et services techniques à Goma, RDC."}
          </p>
          <div className="mt-5 flex gap-3">
            {d?.facebook_url && (
              <a href={d.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook" className="grid size-9 place-items-center rounded-lg bg-white/10 transition hover:bg-accent">
                <Facebook className="size-4" />
              </a>
            )}
            {d?.whatsapp && (
              <a href={`https://wa.me/${d.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid size-9 place-items-center rounded-lg bg-white/10 transition hover:bg-accent">
                <MessageCircle className="size-4" />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>{d?.address_line ?? "Quartier Virunga, Av. OSSO N°18"}, {d?.city ?? "Goma"}, {d?.country ?? "RDC"}</span>
            </li>
            {d?.contact_phone && <li className="flex gap-2.5"><Phone className="mt-0.5 size-4 shrink-0 text-accent" /> <a href={`tel:${d.contact_phone}`} className="hover:text-white">{d.contact_phone}</a></li>}
            {d?.contact_email && <li className="flex gap-2.5"><Mail className="mt-0.5 size-4 shrink-0 text-accent" /> <a href={`mailto:${d.contact_email}`} className="hover:text-white">{d.contact_email}</a></li>}
            {d?.business_hours && <li className="flex gap-2.5"><Clock className="mt-0.5 size-4 shrink-0 text-accent" /> {d.business_hours}</li>}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">Navigation</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/" className="text-white/70 transition hover:text-white">Accueil</Link></li>
            <li><Link to="/boutique" className="text-white/70 transition hover:text-white">Boutique</Link></li>
            <li><Link to="/" hash="services" className="text-white/70 transition hover:text-white">Services</Link></li>
            <li><Link to="/" hash="comment" className="text-white/70 transition hover:text-white">Comment commander</Link></li>
            <li><Link to="/auth" className="text-white/70 transition hover:text-white">Espace client</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {year} {d?.shop_name ?? "CONETEC"}. Tous droits réservés.
      </div>
    </footer>
  );
}
