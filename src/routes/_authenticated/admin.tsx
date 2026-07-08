import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyRole, claimFirstAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Package, ShoppingCart, Warehouse, BarChart3, Settings,
  LogOut, Home, Users, ShieldCheck, Zap, Receipt, UserCog, Menu, Wallet, Activity,
  HandCoins, Building2, UsersRound, MessageSquare, TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { DirectSaleDialog } from "@/components/DirectSaleDialog";

import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/conetec-logo.png.asset.json";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

// Role-based visibility
type Role = "admin" | "manager" | "staff";
type NavItem = { to: string; label: string; icon: any; exact?: boolean; roles: Role[] };

const navGestion: NavItem[] = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true, roles: ["admin", "manager", "staff"] },
  { to: "/admin/products", label: "Produits", icon: Package, roles: ["admin", "manager", "staff"] },
  { to: "/admin/orders", label: "Commandes", icon: ShoppingCart, roles: ["admin", "manager", "staff"] },
  { to: "/admin/stock", label: "Stock", icon: Warehouse, roles: ["admin", "manager", "staff"] },
];
const navClients: NavItem[] = [
  { to: "/admin/customers", label: "Répertoire clients", icon: UsersRound, roles: ["admin", "manager", "staff"] },
  { to: "/admin/credits", label: "Crédits & dettes", icon: HandCoins, roles: ["admin", "manager", "staff"] },
  { to: "/admin/messages", label: "Messages & suggestions", icon: MessageSquare, roles: ["admin", "manager", "staff"] },
];
const navFinance: NavItem[] = [
  { to: "/admin/sales", label: "Rapport des ventes", icon: TrendingUp, roles: ["admin", "manager"] },
  { to: "/admin/expenses", label: "Dépenses", icon: Receipt, roles: ["admin", "manager"] },
  { to: "/admin/rent", label: "Loyer", icon: Building2, roles: ["admin", "manager"] },
  { to: "/admin/employees", label: "Employés & salaires", icon: UserCog, roles: ["admin", "manager"] },
  { to: "/admin/treasury", label: "Caisse", icon: Wallet, roles: ["admin", "manager"] },
  { to: "/admin/reports", label: "Rapports", icon: BarChart3, roles: ["admin", "manager"] },
  { to: "/admin/activity", label: "Historique", icon: Activity, roles: ["admin", "manager"] },
];
const navConfig: NavItem[] = [
  { to: "/admin/team", label: "Utilisateurs", icon: Users, roles: ["admin"] },
  { to: "/admin/settings", label: "Paramètres", icon: Settings, roles: ["admin"] },
];

function filterByRoles(items: NavItem[], roles: string[]): NavItem[] {
  return items.filter((i) => i.roles.some((r) => roles.includes(r)));
}

function AdminLayout() {
  const navigate = useNavigate();
  const fetchRole = useServerFn(getMyRole);
  const fClaim = useServerFn(claimFirstAdmin);
  const role = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  async function claim() {
    try {
      await fClaim();
      toast.success("Bravo ! Vous êtes administrateur.");
      role.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (role.isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Chargement…</div>;
  if (role.isError) return (
    <div className="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <h2 className="text-xl font-semibold">Accès impossible</h2>
        <p className="mt-1 text-muted-foreground">{(role.error as Error).message}</p>
        <Button asChild className="mt-4"><Link to="/">Retour</Link></Button>
      </div>
    </div>
  );

  if (!role.data?.isStaff) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30 p-8">
        <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-brand">
          <div className="mx-auto grid size-14 place-items-center rounded-xl bg-gradient-brand text-brand-foreground">
            <ShieldCheck className="size-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold">Accès administrateur</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun rôle ne vous est attribué. Si vous êtes le propriétaire de la boutique
            et qu'aucun administrateur n'existe encore, cliquez ci-dessous pour devenir
            le premier administrateur.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={claim} className="bg-gradient-brand text-brand-foreground">
              <ShieldCheck className="mr-2 size-4" /> Devenir le premier admin
            </Button>
            <Button asChild variant="outline"><Link to="/">Retour au site</Link></Button>
            <Button onClick={signOut} variant="ghost"><LogOut className="mr-2 size-4" /> Déconnexion</Button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell signOut={signOut} roles={role.data.roles} />;
}

function AdminShell({ signOut, roles }: { signOut: () => void; roles: string[] }) {
  const [saleOpen, setSaleOpen] = useState(false);
  const canSell = roles.some((r) => ["admin", "manager", "staff"].includes(r));
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/30">
        <AdminSidebar signOut={signOut} roles={roles} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/95 px-3 py-2 backdrop-blur sm:px-4">
            <SidebarTrigger className="size-9 shrink-0 border border-border bg-background shadow-sm hover:bg-secondary">
              <Menu className="size-5" />
            </SidebarTrigger>
            <Link to="/admin" className="flex min-w-0 items-center gap-2">
              <img src={logoAsset.url} alt="CONETEC" className="h-10 w-auto sm:h-11" />
              <span className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:inline">Admin</span>
            </Link>
            <div className="ml-auto flex items-center gap-1">
              {roles.length > 0 && (
                <span className="hidden rounded-full bg-gradient-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-foreground sm:inline">
                  {roles[0]}
                </span>
              )}
              {canSell && (
                <Button onClick={() => setSaleOpen(true)} size="sm" className="bg-gradient-brand text-brand-foreground shadow-brand">
                  <Zap className="size-4 sm:mr-1.5" /> <span className="hidden sm:inline">Vente directe</span>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/"><Home className="mr-1.5 size-4" /> Site</Link>
              </Button>
              <Button onClick={signOut} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <LogOut className="size-4 sm:mr-1.5" /> <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-5 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      {canSell && <DirectSaleDialog open={saleOpen} onOpenChange={setSaleOpen} />}
    </SidebarProvider>
  );
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((n) => (
            <SidebarMenuItem key={n.to}>
              <SidebarMenuButton asChild tooltip={n.label}>
                <Link
                  to={n.to}
                  activeOptions={{ exact: n.exact }}
                  activeProps={{ className: "bg-gradient-brand text-brand-foreground hover:!bg-gradient-brand hover:!text-brand-foreground" }}
                >
                  <n.icon className="size-4" />
                  <span>{n.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function AdminSidebar({ signOut, roles }: { signOut: () => void; roles: string[] }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const g = filterByRoles(navGestion, roles);
  const cl = filterByRoles(navClients, roles);
  const f = filterByRoles(navFinance, roles);
  const c = filterByRoles(navConfig, roles);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="CONETEC" className="h-10 w-auto shrink-0" />
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavSection label="Gestion" items={g} />
        <NavSection label="Clientèle & crédits" items={cl} />
        <NavSection label="Finances & RH" items={f} />
        <NavSection label="Configuration" items={c} />
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Voir le site">
              <Link to="/"><Home className="size-4" /><span>Voir le site</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Déconnexion" className="text-destructive hover:text-destructive">
              <LogOut className="size-4" /><span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
