import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTeam, assignRole, removeRole } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: AdminTeam,
});

const ROLES = ["admin", "manager", "staff", "customer"] as const;
type Role = (typeof ROLES)[number];

const roleColors: Record<Role, string> = {
  admin: "bg-gradient-brand text-brand-foreground",
  manager: "bg-accent/15 text-accent",
  staff: "bg-secondary text-foreground",
  customer: "bg-muted text-muted-foreground",
};

function AdminTeam() {
  const fList = useServerFn(listTeam);
  const fAssign = useServerFn(assignRole);
  const fRemove = useServerFn(removeRole);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["team"], queryFn: () => fList() });

  async function add(user_id: string, role: Role) {
    try {
      await fAssign({ data: { user_id, role } });
      toast.success(`Rôle « ${role} » attribué`);
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function rm(user_id: string, role: Role) {
    if (!confirm(`Retirer le rôle « ${role} » ?`)) return;
    try {
      await fRemove({ data: { user_id, role } });
      toast.success("Rôle retiré");
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Équipe & rôles</h1>
        <p className="text-sm text-muted-foreground">
          Attribuez des rôles aux personnes inscrites sur le site. Pour ajouter un nouvel
          employé, demandez-lui d'abord de créer un compte sur <code>/auth</code>.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôles actuels</th>
                <th className="px-4 py-3">Inscription</th>
                <th className="px-4 py-3 text-right">Attribuer</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {q.isLoading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Chargement…</td></tr>
              )}
              {q.isError && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-destructive">{(q.error as Error).message}</td></tr>
              )}
              {q.data?.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.email || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">aucun</span>}
                      {u.roles.map((r) => (
                        <Badge key={r} className={`${roleColors[r as Role] ?? "bg-secondary"} gap-1`}>
                          {r === "admin" && <ShieldCheck className="size-3" />}
                          {r}
                          <button
                            onClick={() => rm(u.id, r as Role)}
                            className="ml-1 rounded-full hover:bg-black/10"
                            aria-label="Retirer"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                        <Button key={r} size="sm" variant="outline" onClick={() => add(u.id, r)}>
                          <UserPlus className="mr-1 size-3" /> {r}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {q.data?.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucun utilisateur inscrit.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
