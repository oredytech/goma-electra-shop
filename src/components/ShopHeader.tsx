import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Trash2, Plus, Minus, LogOut, UserCircle, ShieldCheck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatUSD } from "@/lib/format";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import logoAsset from "@/assets/conetec-logo.png.asset.json";
import { toast } from "sonner";

export function ShopHeader() {
  const count = useCart((s) => s.count());
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const nav = useNavigate();

  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ? { email: data.user.email } : null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ? { email: s.user.email } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    nav({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="CONETEC" className="h-10 w-auto" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link to="/" className="text-foreground/70 hover:text-foreground">Accueil</Link>
          <Link to="/boutique" className="text-foreground/70 hover:text-foreground">Boutique</Link>
          <Link to="/" hash="services" className="text-foreground/70 hover:text-foreground">Services</Link>
          <Link to="/" hash="contact" className="text-foreground/70 hover:text-foreground">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <ShoppingCart className="size-4" />
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {count}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader><SheetTitle>Mon panier</SheetTitle></SheetHeader>
              {items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
                  <ShoppingCart className="size-12 opacity-30" />
                  <p className="mt-2">Votre panier est vide</p>
                  <Button asChild className="mt-4" onClick={() => setCartOpen(false)}>
                    <Link to="/boutique">Parcourir la boutique</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-3 overflow-y-auto py-3">
                    {items.map((i) => (
                      <div key={i.productId} className="flex gap-3 rounded-lg border p-2">
                        {i.imageUrl ? (
                          <img src={i.imageUrl} alt={i.name} className="size-16 rounded object-cover" />
                        ) : (
                          <div className="size-16 rounded bg-secondary" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium leading-tight">{i.name}</div>
                          <div className="text-xs text-muted-foreground">{formatUSD(i.unitPrice)}</div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Button size="icon" variant="outline" className="size-7" onClick={() => setQty(i.productId, i.quantity - 1)}>
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{i.quantity}</span>
                            <Button size="icon" variant="outline" className="size-7" onClick={() => setQty(i.productId, i.quantity + 1)}>
                              <Plus className="size-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="ml-auto size-7 text-destructive" onClick={() => remove(i.productId)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{formatUSD(i.unitPrice * i.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Sous-total</span><span>{formatUSD(subtotal)}</span>
                    </div>
                    <Button className="w-full bg-gradient-brand text-brand-foreground" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
                      Passer au paiement
                    </Button>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>

          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex" title="Administration">
                <Link to="/admin"><ShieldCheck className="mr-1.5 size-4" /> Admin</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} title="Déconnexion">
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/auth"><UserCircle className="mr-1.5 size-4" /> Compte</Link>
            </Button>
          )}
        </div>
      </div>
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </header>
  );
}
