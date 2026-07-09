import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { listCategories, listProducts } from "@/lib/catalog.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { formatUSD } from "@/lib/format";
import { Search, ShoppingBag, Package, SlidersHorizontal, X, Share2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  cat: z.string().optional(),
  q: z.string().optional(),
});

export default function BoutiquePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = searchSchema.parse(location.state ?? {});
  const [search, setSearch] = useState(params.q ?? new URLSearchParams(location.search).get("q") ?? "");
  const [cat, setCat] = useState<string | undefined>(params.cat ?? new URLSearchParams(location.search).get("cat") ?? undefined);
  const [catDrawer, setCatDrawer] = useState(false);

  const cats = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() as Promise<any[]> });
  const prods = useQuery({
    queryKey: ["products", cat ?? "all", search],
    queryFn: () => listProducts({ data: { categorySlug: cat, search, limit: 60 } }) as Promise<any[]>,
  });

  const add = useCart((s) => s.add);

  function applySearch() {
    const next = new URLSearchParams();
    if (cat) next.set("cat", cat);
    if (search) next.set("q", search);
    navigate(`/boutique${next.toString() ? `?${next.toString()}` : ""}`);
  }

  function pickCat(slug?: string) {
    setCat(slug);
    setCatDrawer(false);
  }

  const activeCatName = cat ? (cats.data?.find((c) => c.slug === cat)?.name ?? cat) : "Toutes catégories";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b bg-gradient-hero text-white lg:hidden">
        <div className="px-4 py-5">
          <h1 className="text-xl font-bold">Boutique</h1>
          <form onSubmit={(e) => { e.preventDefault(); applySearch(); }} className="mt-3 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="h-10 border-white/30 bg-white pl-9 text-foreground" />
            </div>
            <Sheet open={catDrawer} onOpenChange={setCatDrawer}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="shrink-0 border-white/40 bg-white/10 text-white hover:bg-white/20">
                  <SlidersHorizontal className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-xs bg-background">
                <SheetHeader><SheetTitle>Catégories</SheetTitle></SheetHeader>
                <div className="mt-4 space-y-1">
                  <button onClick={() => pickCat(undefined)} className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition ${!cat ? "bg-gradient-brand text-brand-foreground" : "hover:bg-secondary"}`}>
                    Toutes ({cats.data?.length ?? 0})
                  </button>
                  {cats.data?.map((c) => (
                    <button key={c.id} onClick={() => pickCat(c.slug)} className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition ${cat === c.slug ? "bg-gradient-brand text-brand-foreground" : "hover:bg-secondary"}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </form>
          {cat && (
            <div className="mt-3">
              <button onClick={() => pickCat(undefined)} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white">
                {activeCatName} <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="hidden border-b bg-gradient-hero text-white lg:block">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h1 className="text-3xl font-bold sm:text-4xl">Boutique CONETEC</h1>
          <p className="mt-1 text-white/80">Équipements électroniques — livraison à Goma</p>
          <div className="mt-6 flex max-w-2xl gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applySearch()} placeholder="Rechercher un produit (câble, disjoncteur, routeur...)" className="border-white/30 bg-white/95 pl-9 text-foreground placeholder:text-muted-foreground" />
            </div>
            <Button onClick={applySearch} className="bg-white text-brand hover:bg-white/90">Rechercher</Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-3 py-6 sm:px-6 sm:py-10 lg:grid-cols-[240px_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Catégories</h3>
          <div className="space-y-1">
            <button onClick={() => pickCat(undefined)} className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${!cat ? "bg-gradient-brand text-brand-foreground" : "hover:bg-secondary"}`}>
              Toutes ({cats.data?.length ?? 0})
            </button>
            {cats.data?.map((c) => (
              <button key={c.id} onClick={() => pickCat(c.slug)} className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${cat === c.slug ? "bg-gradient-brand text-brand-foreground" : "hover:bg-secondary"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          {prods.isLoading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Card key={i} className="h-64 animate-pulse bg-muted/40" />)}
            </div>
          )}
          {prods.data && prods.data.length === 0 && (
            <Card className="p-10 text-center">
              <Package className="mx-auto size-12 text-muted-foreground/40" />
              <h3 className="mt-3 text-lg font-semibold">Aucun produit</h3>
              <p className="text-sm text-muted-foreground">{search ? "Aucun résultat. Essayez d'autres mots-clés." : "Le catalogue sera bientôt rempli."}</p>
            </Card>
          )}
          {prods.data && prods.data.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {prods.data.map((p) => (
                <Card key={p.id} className="group flex flex-col overflow-hidden p-0 transition hover:shadow-brand">
                  <div className="aspect-square overflow-hidden bg-secondary">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="size-full object-cover transition group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="grid size-full place-items-center text-muted-foreground/30"><Package className="size-12" /></div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                    {p.categories && <Badge variant="secondary" className="mb-1.5 w-fit text-[10px]">{p.categories.name}</Badge>}
                    <h3 className="line-clamp-2 text-sm font-semibold">{p.name}</h3>
                    <div className="mt-1 text-base font-bold text-brand">{formatUSD(p.price_usd)}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{p.stock > 0 ? `${p.stock} en stock` : <span className="text-destructive">Rupture</span>}</div>
                    <div className="mt-2 flex gap-1.5">
                      <Button size="sm" className="flex-1 bg-gradient-brand text-brand-foreground" disabled={p.stock <= 0} onClick={() => { add({ productId: p.id, name: p.name, slug: p.slug, unitPrice: Number(p.price_usd), imageUrl: p.image_url, stock: p.stock }); toast.success(`${p.name} ajouté au panier`); }}>
                        <ShoppingBag className="mr-1 size-3.5" /> Acheter
                      </Button>
                      <Button size="sm" variant="outline" aria-label="Partager" onClick={async () => { const url = `${window.location.origin}/produit/${p.slug}`; const shareData = { title: p.name, text: `${p.name} — ${formatUSD(p.price_usd)}`, url }; try { if (navigator.share) await navigator.share(shareData); else { await navigator.clipboard.writeText(url); toast.success("Lien copié"); } } catch { /* user cancelled */ } }}>
                        <Share2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
