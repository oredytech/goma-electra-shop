import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyRole, claimFirstAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, ShoppingCart, Warehouse, BarChart3, Settings, LogOut, Home, Users, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/conetec-logo.png.asset.json";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Produits", icon: Package },
  { to: "/admin/orders", label: "Commandes", icon: ShoppingCart },
  { to: "/admin/stock", label: "Stock", icon: Warehouse },
  { to: "/admin/team", label: "Équipe & rôles", icon: Users },
  { to: "/admin/reports", label: "Rapports", icon: BarChart3 },
  { to: "/admin/settings", label: "Paramètres", icon: Settings },
];


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
            le premier administrateur. Sinon, contactez l'administrateur de la boutique
            pour qu'il vous attribue un rôle depuis « Équipe & rôles ».
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


  return <AdminShell signOut={signOut} />;
}

function AdminShell({ signOut }: { signOut: () => void }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/30">
        <AdminSidebar signOut={signOut} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/95 px-3 py-2 backdrop-blur sm:px-4">
            <SidebarTrigger />
            <Link to="/admin" className="flex items-center gap-2">
              <img src={logoAsset.url} alt="CONETEC" className="h-11 w-auto" />
              <span className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:inline">Admin</span>
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/"><Home className="mr-1.5 size-4" /> Site</Link>
              </Button>
              <Button onClick={signOut} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <LogOut className="size-4 sm:mr-1.5" /> <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminSidebar({ signOut }: { signOut: () => void }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
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
        <SidebarGroup>
          <SidebarGroupLabel>Gestion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((n) => (
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

