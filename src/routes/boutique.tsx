import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { listCategories, listProducts } from "@/lib/catalog.functions";
import { ShopHeader } from "@/components/ShopHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart";
import { formatUSD } from "@/lib/format";
import { Search, ShoppingBag, Package, Plus } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  cat: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/boutique")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Boutique — Équipements électroniques · CONETEC" },
      { name: "description", content: "Catalogue d'équipements électroniques à Goma : câblage, disjoncteurs, antennes, réseau, outils, éclairage LED. Paiement Mobile Money." },
      { property: "og:title", content: "Boutique CONETEC" },
      { property: "og:description", content: "Achetez vos équipements électroniques en ligne à Goma, RDC." },
    ],
  }),
  component: BoutiquePage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-destructive">Erreur : {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Introuvable</div>,
});

function BoutiquePage() {
  const { cat, q } = useSearch({ from: "/boutique" });
  const nav = useNavigate({ from: "/boutique" });
  const [search, setSearch] = useState(q ?? "");

  const fetchCats = useServerFn(listCategories);
  const fetchProds = useServerFn(listProducts);

  const cats = useQuery({ queryKey: ["categories"], queryFn: () => fetchCats() });
  const prods = useQuery({
    queryKey: ["products", cat ?? "all", q ?? ""],
    queryFn: () => fetchProds({ data: { categorySlug: cat, search: q, limit: 60 } }),
  });

  const add = useCart((s) => s.add);

  function applySearch() {
    nav({ search: (s) => ({ ...s, q: search || undefined }) });
  }

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader />

      <section className="border-b bg-gradient-hero text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-bold sm:text-4xl">Boutique CONETEC</h1>
          <p className="mt-1 text-white/80">Équipements électroniques — livraison à Goma</p>
          <div className="mt-6 flex max-w-2xl gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Rechercher un produit (câble, disjoncteur, routeur...)"
                className="border-white/30 bg-white/95 pl-9 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button onClick={applySearch} className="bg-white text-brand hover:bg-white/90">Rechercher</Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar categories */}
        <aside>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Catégories</h3>
          <div className="space-y-1">
            <button
              onClick={() => nav({ search: (s) => ({ ...s, cat: undefined }) })}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${!cat ? "bg-gradient-brand text-brand-foreground" : "hover:bg-secondary"}`}
            >
              Toutes ({cats.data?.length ?? 0})
            </button>
            {cats.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => nav({ search: (s) => ({ ...s, cat: c.slug }) })}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${cat === c.slug ? "bg-gradient-brand text-brand-foreground" : "hover:bg-secondary"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Products grid */}
        <div>
          {prods.isLoading && <div className="py-20 text-center text-muted-foreground">Chargement…</div>}
          {prods.data && prods.data.length === 0 && (
            <Card className="p-10 text-center">
              <Package className="mx-auto size-12 text-muted-foreground/40" />
              <h3 className="mt-3 text-lg font-semibold">Aucun produit</h3>
              <p className="text-sm text-muted-foreground">
                {q ? "Aucun résultat. Essayez d'autres mots-clés." : "Le catalogue sera bientôt rempli. L'admin peut ajouter des produits depuis /admin/products."}
              </p>
            </Card>
          )}
          {prods.data && prods.data.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {prods.data.map((p) => (
                <Card key={p.id} className="group flex flex-col overflow-hidden p-0 transition hover:shadow-brand">
                  <div className="aspect-square overflow-hidden bg-secondary">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="size-full object-cover transition group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="grid size-full place-items-center text-muted-foreground/30">
                        <Package className="size-12" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    {p.categories && <Badge variant="secondary" className="mb-1.5 w-fit text-[10px]">{(p.categories as any).name}</Badge>}
                    <h3 className="line-clamp-2 text-sm font-semibold">{p.name}</h3>
                    <div className="mt-1 text-base font-bold text-brand">{formatUSD(p.price_usd)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {p.stock > 0 ? `${p.stock} en stock` : <span className="text-destructive">Rupture</span>}
                    </div>
                    <Button
                      size="sm"
                      className="mt-2 w-full bg-gradient-brand text-brand-foreground"
                      disabled={p.stock <= 0}
                      onClick={() => {
                        add({
                          productId: p.id, name: p.name, slug: p.slug,
                          unitPrice: Number(p.price_usd), imageUrl: p.image_url, stock: p.stock,
                        });
                        toast.success(`${p.name} ajouté au panier`);
                      }}
                    >
                      <ShoppingBag className="mr-1.5 size-3.5" /> Acheter
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
