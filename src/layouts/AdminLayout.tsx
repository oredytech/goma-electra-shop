import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard, Package, ReceiptText, Users, BadgeDollarSign, Wallet, BarChart3, Settings, ShieldCheck, Wrench, Boxes, TrendingUp, MessageSquareText, HandCoins, ArrowLeft, LogOut } from "lucide-react";
import logoAsset from "@/assets/conetec-logo.png.asset.json";
import { toast } from "sonner";

const links = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/products", label: "Produits", icon: Package },
  { to: "/admin/orders", label: "Commandes", icon: ReceiptText },
  { to: "/admin/customers", label: "Clients", icon: Users },
  { to: "/admin/credits", label: "Crédits", icon: BadgeDollarSign },
  { to: "/admin/treasury", label: "Trésorerie", icon: Wallet },
  { to: "/admin/reports", label: "Rapports", icon: BarChart3 },
  { to: "/admin/settings", label: "Paramètres", icon: Settings },
  { to: "/admin/team", label: "Équipe", icon: ShieldCheck },
  { to: "/admin/stock", label: "Stock", icon: Boxes },
  { to: "/admin/sales", label: "Ventes", icon: TrendingUp },
  { to: "/admin/rent", label: "Location", icon: Wrench },
  { to: "/admin/messages", label: "Messages", icon: MessageSquareText },
  { to: "/admin/expenses", label: "Dépenses", icon: HandCoins },
  { to: "/admin/employees", label: "Employés", icon: Users },
] as const;

export function AdminLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activePath, setActivePath] = useState(window.location.pathname);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const initials = useMemo(() => userEmail?.slice(0, 2).toUpperCase() ?? "AD", [userEmail]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate("/auth", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-slate-950 text-white lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-4 py-4 lg:px-6">
            <Link to="/admin" className="flex items-center gap-3">
              <img src={logoAsset.url} alt="CONETEC" className="h-8 w-auto" />
              <div>
                <div className="text-sm font-semibold">Administration</div>
                <div className="text-xs text-white/60">CONETEC</div>
              </div>
            </Link>
            <Button asChild variant="ghost" size="sm" className="hidden text-white hover:bg-white/10 lg:inline-flex">
              <Link to="/">
                <Home className="mr-1.5 size-4" /> Site
              </Link>
            </Button>
          </div>

          <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-white/10 p-3 lg:mx-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{userEmail ?? "Administration"}</div>
                <div className="truncate text-xs text-white/60">Connexion sécurisée</div>
              </div>
            </div>
          </div>

          <nav className="space-y-1 px-3 pb-4 lg:px-4">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setActivePath(to)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${activePath === to ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/10 p-4">
            <Button variant="outline" className="w-full justify-start bg-transparent text-white hover:bg-white/10" onClick={signOut}>
              <LogOut className="mr-2 size-4" /> Déconnexion
            </Button>
          </div>
        </aside>

        <main className="flex-1">
          <div className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Panneau d'administration</div>
                <div className="text-xs text-slate-500">Gestion du shop CONETEC</div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/">
                  <ArrowLeft className="mr-1.5 size-4" /> Retour au site
                </Link>
              </Button>
            </div>
          </div>
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
