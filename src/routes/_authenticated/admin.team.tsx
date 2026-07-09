import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/tanstack-start-compat";
import { useState } from "react";
import { listTeam, assignRole, removeRole, createUserWithPassword, resetUserPassword } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, ShieldCheck, X, Copy, KeyRound } from "lucide-react";
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
  const fCreate = useServerFn(createUserWithPassword);
  const fReset = useServerFn(resetUserPassword);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["team"], queryFn: () => fList() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "staff" as Role });
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

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

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await fCreate({ data: form });
      toast.success(`Utilisateur créé — partagez le lien : ${window.location.origin}/auth`);
      setOpen(false); setForm({ email: "", password: "", full_name: "", role: "staff" });
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setCreating(false); }
  }
  async function resetPw() {
    if (!resetFor || newPw.length < 6) return;
    try { await fReset({ data: { user_id: resetFor, password: newPw } }); toast.success("Mot de passe mis à jour"); setResetFor(null); setNewPw(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }
  function copyLink() { navigator.clipboard.writeText(`${window.location.origin}/auth`); toast.success("Lien de connexion copié"); }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Créez des comptes, attribuez les rôles, réinitialisez les mots de passe.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyLink}><Copy className="mr-1.5 size-4" /> Lien de connexion</Button>
          <Button onClick={() => setOpen(true)} className="bg-gradient-brand text-brand-foreground"><UserPlus className="mr-1.5 size-4" /> Nouvel utilisateur</Button>
        </div>
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
                      <Button size="sm" variant="ghost" onClick={() => setResetFor(u.id)}><KeyRound className="mr-1 size-3" /> mdp</Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvel utilisateur</DialogTitle></DialogHeader>
          <form onSubmit={createUser} className="space-y-3">
            <div><Label>Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Mot de passe *</Label><Input type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="≥ 6 caractères" /></div>
            <div>
              <Label>Rôle *</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">Après création, partagez avec la personne : <code>{typeof window !== "undefined" ? window.location.origin : ""}/auth</code></p>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={creating} className="bg-gradient-brand text-brand-foreground">{creating ? "…" : "Créer"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Réinitialiser le mot de passe</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="text" minLength={6} placeholder="Nouveau mot de passe" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setResetFor(null)}>Annuler</Button><Button onClick={resetPw} className="bg-gradient-brand text-brand-foreground">Enregistrer</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
