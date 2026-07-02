import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProduct } from "@/lib/catalog.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCart } from "@/lib/cart";
import { formatUSD } from "@/lib/format";
import { Package, ShoppingBag, Share2, ArrowLeft, Facebook, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/produit/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — CONETEC` },
      { name: "description", content: `Fiche produit ${params.slug} — commande en ligne à Goma.` },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => <div className="p-10 text-center">Produit introuvable</div>,
  errorComponent: ({ error }) => <div className="p-10 text-center text-destructive">{error.message}</div>,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const fGet = useServerFn(getProduct);
  const q = useQuery({ queryKey: ["product", slug], queryFn: () => fGet({ data: { slug } }) });
  const add = useCart((s) => s.add);
  const p = q.data;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/produit/${slug}` : "";

  async function share() {
    if (!p) return;
    const data = { title: p.name, text: `${p.name} — ${formatUSD(Number(p.price_usd))}`, url: shareUrl };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(shareUrl); toast.success("Lien copié"); }
    } catch {/* cancel */}
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Link to="/boutique" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Retour à la boutique
        </Link>

        {q.isLoading && <Card className="h-96 animate-pulse bg-muted/40" />}
        {!q.isLoading && !p && <Card className="p-10 text-center">Produit introuvable</Card>}
        {p && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden p-0">
              <div className="aspect-square bg-secondary">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground/40"><Package className="size-20" /></div>
                )}
              </div>
            </Card>
            <div className="flex flex-col">
              {p.categories && <Badge variant="secondary" className="mb-2 w-fit">{p.categories.name}</Badge>}
              <h1 className="text-3xl font-bold">{p.name}</h1>
              <div className="mt-3 text-3xl font-black text-brand">{formatUSD(Number(p.price_usd))}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {p.stock > 0 ? `${p.stock} en stock` : <span className="text-destructive">Rupture</span>}
              </div>
              {p.description && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.description}</p>}

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-brand text-brand-foreground"
                  disabled={p.stock <= 0}
                  onClick={() => {
                    add({ productId: p.id, name: p.name, slug: p.slug, unitPrice: Number(p.price_usd), imageUrl: p.image_url, stock: p.stock });
                    toast.success("Ajouté au panier");
                  }}
                >
                  <ShoppingBag className="mr-1.5 size-4" /> Ajouter au panier
                </Button>
                <Button size="lg" variant="outline" onClick={share}>
                  <Share2 className="mr-1.5 size-4" /> Partager
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <a href={`https://wa.me/?text=${encodeURIComponent(`${p.name} — ${shareUrl}`)}`} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 hover:bg-secondary"><MessageCircle className="size-3.5" /> WhatsApp</a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 hover:bg-secondary"><Facebook className="size-3.5" /> Facebook</a>
                <a href={`mailto:?subject=${encodeURIComponent(p.name)}&body=${encodeURIComponent(shareUrl)}`}
                   className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 hover:bg-secondary">Email</a>
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(shareUrl); toast.success("Lien copié"); }}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 hover:bg-secondary">Copier le lien</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
