import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Wrench, Zap, Wifi, Antenna, ShieldCheck, Truck, Package,
  Search, ArrowRight,
} from "lucide-react";
import heroImg from "@/assets/hero-electrician.jpg";
import { listProducts, listCategories } from "@/lib/catalog.functions";
import { formatUSD } from "@/lib/format";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CONETEC — Équipements & Services électroniques à Goma" },
      { name: "description", content: "Boutique d'équipements électroniques + techniciens à domicile à Goma : installation électrique, antennes, internet, maintenance. Paiement Mobile Money." },
      { property: "og:title", content: "CONETEC — Company of New Technology" },
      { property: "og:description", content: "Achat en ligne d'équipements électroniques et services techniques à Goma, RDC." },
    ],
  }),
  component: HomePage,
});

const services = [
  { icon: Zap, title: "Installation électrique", desc: "Domestique & industrielle, aux normes." },
  { icon: Wrench, title: "Maintenance & dépannage", desc: "Électrique et électronique, intervention rapide." },
  { icon: Antenna, title: "Installation d'antennes", desc: "TV, satellite, parabole." },
  { icon: Wifi, title: "Connexion Internet", desc: "Installation & configuration réseau / Wi-Fi." },
];

const popularTags = ["câble électrique", "disjoncteur", "antenne TV", "routeur Wi-Fi", "ampoule LED"];

const steps = [
  { n: "1", t: "Choisissez", d: "Parcourez le catalogue et cliquez sur « Acheter »." },
  { n: "2", t: "Livraison", d: "Nom, téléphone, quartier à Goma." },
  { n: "3", t: "Mobile Money", d: "Paiement sécurisé via Shwary." },
  { n: "4", t: "Recevez", d: "Livraison à Goma + facture par email." },
];

function HomePage() {
  const fProducts = useServerFn(listProducts);
  const fCats = useServerFn(listCategories);
  const products = useQuery({ queryKey: ["home-products"], queryFn: () => fProducts({ data: { limit: 8 } }) });
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => fCats() });
  const items = products.data ?? [];
  const [q, setQ] = useState("");

  // ==== Hero services slider ====
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % services.length), 4200);
    return () => clearInterval(t);
  }, []);

  function go(e?: React.FormEvent) {
    e?.preventDefault();
    const search = q.trim();
    if (search) window.location.href = `/boutique?q=${encodeURIComponent(search)}`;
    else window.location.href = "/boutique";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO — épuré, sous-titre = slider de services */}
      <section className="relative isolate overflow-hidden bg-[oklch(0.18_0.06_264)] text-white">
        <img
          src={heroImg}
          alt="Équipe technique CONETEC"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[oklch(0.16_0.06_264)] via-[oklch(0.16_0.06_264)/0.85] to-[oklch(0.16_0.06_264)/0.3]" />

        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
              <Zap className="size-3.5 text-accent" /> Goma · RDC
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              L'ÉLECTRONIQUE,<br />
              <span className="text-accent">à portée de clic.</span>
            </h1>

            {/* Sous-titre : slider de services */}
            <div className="relative mt-5 h-14 max-w-lg overflow-hidden">
              {services.map((s, i) => (
                <div
                  key={s.title}
                  className={`absolute inset-0 flex items-center gap-3 transition-all duration-700 ${i === slide ? "translate-y-0 opacity-100" : i === (slide - 1 + services.length) % services.length ? "-translate-y-full opacity-0" : "translate-y-full opacity-0"}`}
                  aria-hidden={i !== slide}
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/25 backdrop-blur">
                    <s.icon className="size-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold sm:text-lg">{s.title}</div>
                    <div className="truncate text-xs text-white/70 sm:text-sm">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              {services.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Service ${i + 1}`}
                  onClick={() => setSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${i === slide ? "w-6 bg-accent" : "w-1.5 bg-white/30"}`}
                />
              ))}
            </div>

            {/* Search bar */}
            <form onSubmit={go} className="mt-7 flex w-full max-w-xl flex-wrap gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher : câble, disjoncteur, antenne…"
                  className="h-12 rounded-full border-0 bg-white pl-12 pr-4 text-base text-foreground shadow-lg placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 shrink-0 rounded-full bg-accent px-6 text-base font-semibold text-accent-foreground hover:bg-accent/90">
                Rechercher
              </Button>
            </form>

            {/* Popular tags */}
            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs sm:text-sm">
              <span className="text-white/60">Populaires :</span>
              {popularTags.map((t) => (
                <Link
                  key={t}
                  to="/boutique"
                  search={{ q: t }}
                  className="rounded-full border border-white/30 bg-white/5 px-3 py-1 text-white/90 transition hover:border-accent hover:bg-accent/20"
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Boutique</span>
            <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl">Nos catégories</h2>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/boutique">Tout voir <ArrowRight className="ml-1.5 size-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(cats.data ?? []).slice(0, 6).map((c) => (
            <Link
              key={c.id}
              to="/boutique"
              search={{ cat: c.slug }}
              className="group rounded-xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-accent"
            >
              <div className="mb-2 grid size-10 place-items-center rounded-lg bg-secondary text-brand group-hover:bg-gradient-brand group-hover:text-brand-foreground">
                <Package className="size-4" />
              </div>
              <div className="text-sm font-semibold leading-tight">{c.name}</div>
            </Link>
          ))}
          {(cats.data ?? []).length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucune catégorie. Ajoutez-en depuis l'<Link to="/admin" className="font-semibold text-accent">administration</Link>.
            </div>
          )}
        </div>
      </section>

      {/* PRODUITS */}
      <section className="bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">Produits</span>
              <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl">Derniers articles</h2>
            </div>
            <Button asChild variant="ghost" size="sm"><Link to="/boutique">Voir la boutique <ArrowRight className="ml-1.5 size-4" /></Link></Button>
          </div>

          {products.isLoading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Card key={i} className="h-64 animate-pulse border-border bg-muted/40" />)}
            </div>
          )}

          {!products.isLoading && items.length === 0 && (
            <Card className="border-dashed border-border p-10 text-center text-muted-foreground">
              Aucun produit pour le moment. Ajoutez vos premiers articles depuis l'espace
              <Link to="/admin" className="ml-1 font-medium text-accent hover:underline">administration</Link>.
            </Card>
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <Link
                  key={p.id}
                  to="/boutique"
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-accent hover:shadow-accent"
                >
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="grid size-full place-items-center text-muted-foreground"><Package className="size-10" /></div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    {p.categories?.name && <div className="text-[11px] font-medium uppercase tracking-wider text-accent">{p.categories.name}</div>}
                    <div className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{p.name}</div>
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div className="text-base font-bold text-brand">{formatUSD(p.price_usd)}</div>
                      <span className="text-xs text-muted-foreground">{p.stock > 0 ? "En stock" : "Rupture"}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mb-10 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Nos services</span>
            <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl">Techniciens qualifiés à votre porte</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Card key={s.title} className="border-border p-5 transition hover:shadow-brand">
                <div className="mb-3 grid size-11 place-items-center rounded-xl bg-gradient-brand text-brand-foreground">
                  <s.icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT */}
      <section id="comment" className="bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mb-10 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Comment ça marche</span>
            <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl">Acheter en 4 étapes</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <Card key={s.n} className="border-border p-5">
                <div className="text-4xl font-bold text-gradient-brand">{s.n}</div>
                <h3 className="mt-2 text-base font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
