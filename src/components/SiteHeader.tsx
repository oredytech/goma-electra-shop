import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Trash2, Plus, Minus, LogOut, ShieldCheck, Menu, X, Phone, Mail, MapPin, Home, Store, Wrench, MessageCircle } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatUSD } from "@/lib/format";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import logoAsset from "@/assets/conetec-logo.png.asset.json";
import { toast } from "sonner";
import { getPublicSiteSettings } from "@/lib/site-settings.functions";

const NAV = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/boutique", label: "Boutique", icon: Store },
  { to: "/", hash: "services", label: "Services", icon: Wrench },
  { to: "/", hash: "contact", label: "Contact", icon: MessageCircle },
] as const;

export function SiteHeader() {
  const count = useCart((s) => s.count());
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const nav = useNavigate();

  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const fSettings = useServerFn(getPublicSiteSettings);
  const settings = useQuery({ queryKey: ["public-settings"], queryFn: () => fSettings(), staleTime: 60_000 });

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

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:px-6">
        {/* Mobile menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden" aria-label="Ouvrir le menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-xs bg-background p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle className="flex items-center gap-2">
                <img src={logoAsset.url} alt="CONETEC" className="h-9 w-auto" />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-3">
              {NAV.map((n) => (
                <Link
                  key={n.label}
                  to={n.to}
                  hash={"hash" in n ? n.hash : undefined}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary"
                >
                  <n.icon className="size-4 text-accent" /> {n.label}
                </Link>
              ))}
              <div className="my-2 border-t" />
              {user ? (
                <>
                  <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">
                    <ShieldCheck className="size-4 text-accent" /> Administration
                  </Link>
                  <button onClick={() => { setMenuOpen(false); signOut(); }} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10">
                    <LogOut className="size-4" /> Déconnexion
                  </button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg bg-gradient-brand px-3 py-3 text-sm font-medium text-brand-foreground">
                  Se connecter / Créer un compte
                </Link>
              )}
              {settings.data && (
                <div className="mt-4 space-y-2 border-t pt-3 text-xs text-muted-foreground">
                  {settings.data.contact_phone && <div className="flex items-center gap-2"><Phone className="size-3" /> {settings.data.contact_phone}</div>}
                  {settings.data.contact_email && <div className="flex items-center gap-2"><Mail className="size-3" /> {settings.data.contact_email}</div>}
                  {settings.data.address_line && <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-3" /> <span>{settings.data.address_line}, {settings.data.city}</span></div>}
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logoAsset.url} alt="CONETEC" className="h-9 w-auto sm:h-11" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 text-sm font-medium md:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              hash={"hash" in n ? n.hash : undefined}
              className="text-foreground/70 transition hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Cart */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative px-2.5">
                <ShoppingCart className="size-4" />
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                    {count}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col bg-background sm:max-w-md">
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
                        {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="size-16 rounded object-cover" /> : <div className="size-16 rounded bg-secondary" />}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium leading-tight">{i.name}</div>
                          <div className="text-xs text-muted-foreground">{formatUSD(i.unitPrice)}</div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Button size="icon" variant="outline" className="size-7" onClick={() => setQty(i.productId, i.quantity - 1)}><Minus className="size-3" /></Button>
                            <span className="w-6 text-center text-sm">{i.quantity}</span>
                            <Button size="icon" variant="outline" className="size-7" onClick={() => setQty(i.productId, i.quantity + 1)}><Plus className="size-3" /></Button>
                            <Button size="icon" variant="ghost" className="ml-auto size-7 text-destructive" onClick={() => remove(i.productId)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{formatUSD(i.unitPrice * i.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex justify-between font-semibold"><span>Sous-total</span><span>{formatUSD(subtotal)}</span></div>
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
              <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex" title="Administration">
                <Link to="/admin"><ShieldCheck className="mr-1.5 size-4" /> Admin</Link>
              </Button>
              <div
                title={user.email ?? "Connecté"}
                className="hidden h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-brand-foreground sm:flex"
              >
                {initials}
              </div>
              <Button variant="ghost" size="sm" onClick={signOut} className="hidden sm:inline-flex" title="Déconnexion">
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground">
              <Link to="/auth">Se connecter</Link>
            </Button>
          )}
        </div>
      </div>
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </header>
  );
}
