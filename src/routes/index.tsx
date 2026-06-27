import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Wrench, Zap, Wifi, Antenna, ShieldCheck, Truck, Phone, MapPin,
  Mail, ShoppingBag, ArrowRight, CheckCircle2, Package
} from "lucide-react";
import logoAsset from "@/assets/conetec-logo.png.asset.json";
import heroImg from "@/assets/hero-electrician.jpg";
import { listProducts } from "@/lib/catalog.functions";
import { formatUSD } from "@/lib/format";


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
  { icon: Antenna, title: "Installation d'antennes", desc: "TV, satellite, parabole — réglages compris." },
  { icon: Wifi, title: "Connexion Internet", desc: "Installation & configuration réseau / Wi-Fi." },
];

const categories = [
  { name: "Câblage & accessoires", count: "120+ produits" },
  { name: "Disjoncteurs & tableaux", count: "80+ produits" },
  { name: "Antennes & récepteurs", count: "45+ produits" },
  { name: "Routeurs & réseau", count: "60+ produits" },
  { name: "Outils d'électricien", count: "90+ produits" },
  { name: "Éclairage LED", count: "150+ produits" },
];

const steps = [
  { n: "1", t: "Choisissez", d: "Parcourez le catalogue et cliquez sur « Acheter »." },
  { n: "2", t: "Renseignez la livraison", d: "Nom, téléphone, quartier à Goma." },
  { n: "3", t: "Payez par Mobile Money", d: "Paiement sécurisé via Shwary." },
  { n: "4", t: "Recevez chez vous", d: "Livraison à Goma + facture par email." },
];

function HomePage() {
  const fProducts = useServerFn(listProducts);
  const products = useQuery({
    queryKey: ["home-products"],
    queryFn: () => fProducts({ data: { limit: 8 } }),
  });
  const items = products.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="CONETEC" className="h-10 w-auto" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link to="/boutique" className="text-foreground/70 hover:text-foreground">Boutique</Link>
            <a href="#services" className="text-foreground/70 hover:text-foreground">Services</a>
            <a href="#comment" className="text-foreground/70 hover:text-foreground">Comment ça marche</a>
            <a href="#contact" className="text-foreground/70 hover:text-foreground">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Se connecter</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground shadow-accent hover:opacity-95">
              <Link to="/boutique"><ShoppingBag className="mr-1.5 size-4" /> Boutique</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero text-white">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider">
              <Zap className="size-3.5" /> Goma · RDC / Nord-Kivu
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
              Équipements électroniques <br />
              <span className="text-[oklch(0.85_0.08_188)]">& techniciens à domicile.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              Achetez en ligne vos fournitures électroniques et faites appel à nos techniciens
              pour l'installation, la maintenance, les antennes et la connexion internet.
              Paiement <strong>Mobile Money</strong>, livraison partout à Goma.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-brand hover:bg-white/90">
                <Link to="/boutique"><ShoppingBag className="mr-2 size-5" /> Voir la boutique</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/0 text-white hover:bg-white/10">
                <a href="#services">Demander un technicien <ArrowRight className="ml-2 size-5" /></a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-[oklch(0.85_0.08_188)]" /> Paiement Mobile Money</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-[oklch(0.85_0.08_188)]" /> Livraison à Goma</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-[oklch(0.85_0.08_188)]" /> Facture par email</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-white/10 blur-2xl" />
            <img
              src={heroImg}
              alt="Technicien CONETEC installant un tableau électrique"
              width={1600}
              height={1200}
              className="relative aspect-[4/3] w-full rounded-2xl object-cover shadow-brand ring-1 ring-white/20"
            />
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-6 sm:px-6 md:grid-cols-4">
          {[
            { i: Truck, t: "Livraison Goma", s: "Sous 24–48h" },
            { i: ShieldCheck, t: "Produits garantis", s: "Qualité contrôlée" },
            { i: Phone, t: "Support 7j/7", s: "+243 …" },
            { i: Package, t: "Retrait boutique", s: "Av. OSSO N°18, Virunga" },
          ].map((b) => (
            <div key={b.t} className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-gradient-brand text-brand-foreground">
                <b.i className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{b.t}</div>
                <div className="text-xs text-muted-foreground">{b.s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BOUTIQUE — catégories */}
      <section id="boutique" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">Boutique en ligne</span>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Toutes nos catégories</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Parcourez nos rayons. Le catalogue complet sera ouvert à la mise en ligne du backend.
            </p>
          </div>
          <Button variant="ghost" className="hidden sm:inline-flex" disabled>
            Tout voir <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Card key={c.name} className="group cursor-pointer border-border p-4 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-accent">
              <div className="mb-3 grid size-11 place-items-center rounded-lg bg-secondary text-brand group-hover:bg-gradient-brand group-hover:text-brand-foreground">
                <Package className="size-5" />
              </div>
              <div className="text-sm font-semibold leading-tight">{c.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.count}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-10 text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">Nos services</span>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Des techniciens qualifiés à votre porte</h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Notre équipe intervient à Goma pour vos installations et dépannages.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Card key={s.title} className="border-border p-6 transition hover:shadow-brand">
                <div className="mb-4 grid size-12 place-items-center rounded-xl bg-gradient-brand text-brand-foreground">
                  <s.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="comment" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Comment ça marche</span>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Acheter en 4 étapes simples</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <Card className="h-full border-border p-6">
                <div className="text-5xl font-bold text-gradient-brand">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
              </Card>
              {i < steps.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden size-6 -translate-y-1/2 text-accent md:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-brand text-brand-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Besoin d'un devis ou d'un technicien ?</h2>
            <p className="mt-1 text-white/80">Contactez-nous, on intervient partout à Goma.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-brand hover:bg-white/90">
              <a href="#contact"><Phone className="mr-2 size-5" /> Nous appeler</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
              <Link to="/boutique">Voir la boutique</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <footer id="contact" className="border-t border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <img src={logoAsset.url} alt="CONETEC" className="h-12 w-auto" />
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              CONETEC — Company of New Technology. Vente d'équipements électroniques
              et services techniques à Goma, RDC.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Adresse</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-accent" /> Quartier Virunga, Av. OSSO N°18, Goma, Nord-Kivu, RDC</li>
              <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-accent" /> +243 — à configurer</li>
              <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-accent" /> contact@conetec.cd</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Liens</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/boutique" className="hover:text-foreground">Boutique</Link></li>
              <li><a href="#services" className="hover:text-foreground">Services</a></li>
              <li><a href="#comment" className="hover:text-foreground">Comment commander</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CONETEC. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
