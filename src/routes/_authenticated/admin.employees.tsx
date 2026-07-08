import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listEmployees, upsertEmployee, deleteEmployee, listSalaryPayments, paySalary } from "@/lib/employees.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Edit, DollarSign, Users, FileDown } from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { buildReportPDF } from "@/lib/report-pdf";

export const Route = createFileRoute("/_authenticated/admin/employees")({
  component: AdminEmployees,
});

type EForm = {
  id?: string; full_name: string; role: string; phone: string; email: string;
  monthly_salary: number; currency: "USD" | "CDF"; hire_date: string; is_active: boolean; notes: string;
};
const emptyE: EForm = { full_name: "", role: "", phone: "", email: "", monthly_salary: 0, currency: "USD", hire_date: new Date().toISOString().slice(0, 10), is_active: true, notes: "" };

function AdminEmployees() {
  const qc = useQueryClient();
  const fList = useServerFn(listEmployees);
  const fSave = useServerFn(upsertEmployee);
  const fDel = useServerFn(deleteEmployee);
  const fPays = useServerFn(listSalaryPayments);
  const fPay = useServerFn(paySalary);

  const emp = useQuery({ queryKey: ["employees"], queryFn: () => fList() });
  const pays = useQuery({ queryKey: ["salary-payments"], queryFn: () => fPays() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EForm>(emptyE);
  const [saving, setSaving] = useState(false);
  const [payDlg, setPayDlg] = useState<{ open: boolean; emp?: any }>({ open: false });
  const [payForm, setPayForm] = useState({ period_month: new Date().toISOString().slice(0, 7) + "-01", amount: 0, payment_method: "cash" });

  function openNew() { setForm(emptyE); setOpen(true); }
  function openEdit(e: any) {
    setForm({ ...emptyE, ...e, email: e.email ?? "", phone: e.phone ?? "", role: e.role ?? "", notes: e.notes ?? "", monthly_salary: Number(e.monthly_salary), hire_date: e.hire_date ?? emptyE.hire_date });
    setOpen(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    try {
      await fSave({ data: { ...form, monthly_salary: Number(form.monthly_salary) } });
      toast.success("Employé enregistré");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Supprimer cet employé ?")) return;
    try { await fDel({ data: { id } }); toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["employees"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  function openPay(e: any) {
    setPayDlg({ open: true, emp: e });
    setPayForm({ period_month: new Date().toISOString().slice(0, 7) + "-01", amount: Number(e.monthly_salary), payment_method: "cash" });
  }

  async function submitPay() {
    if (!payDlg.emp) return;
    try {
      await fPay({ data: { employee_id: payDlg.emp.id, period_month: payForm.period_month, amount: Number(payForm.amount), currency: payDlg.emp.currency, payment_method: payForm.payment_method, status: "paid" } });
      toast.success(`Salaire payé à ${payDlg.emp.full_name}`);
      qc.invalidateQueries({ queryKey: ["salary-payments"] });
      setPayDlg({ open: false });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employés & salaires</h1>
          <p className="text-sm text-muted-foreground">Gérez l'équipe et les paiements de salaire.</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-brand text-brand-foreground"><Plus className="mr-1.5 size-4" /> Nouvel employé</Button>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff"><Users className="mr-1.5 size-4" /> Équipe</TabsTrigger>
          <TabsTrigger value="pays"><DollarSign className="mr-1.5 size-4" /> Historique salaires</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">Nom</th>
                    <th className="px-3 py-2.5">Poste</th>
                    <th className="px-3 py-2.5">Contact</th>
                    <th className="px-3 py-2.5 text-right">Salaire</th>
                    <th className="px-3 py-2.5">État</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {emp.data?.map((e: any) => (
                    <tr key={e.id} className="hover:bg-secondary/40">
                      <td className="px-3 py-2.5 font-medium">{e.full_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{e.role ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.phone ?? "—"}<br />{e.email ?? ""}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{Number(e.monthly_salary).toFixed(2)} {e.currency}</td>
                      <td className="px-3 py-2.5"><Badge className={e.is_active ? "bg-accent" : "bg-muted-foreground"}>{e.is_active ? "Actif" : "Inactif"}</Badge></td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => openPay(e)}><DollarSign className="mr-1 size-3.5" /> Payer</Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Edit className="size-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => del(e.id)} className="text-destructive"><Trash2 className="size-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {emp.data && emp.data.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">Aucun employé.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pays">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">Période</th>
                    <th className="px-3 py-2.5">Employé</th>
                    <th className="px-3 py-2.5 text-right">Montant</th>
                    <th className="px-3 py-2.5">Mode</th>
                    <th className="px-3 py-2.5">Payé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pays.data?.map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2.5 font-mono text-xs">{p.period_month?.slice(0, 7)}</td>
                      <td className="px-3 py-2.5 font-medium">{p.employees?.full_name}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{Number(p.amount).toFixed(2)} {p.currency}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.payment_method}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.paid_at ? formatDate(p.paid_at) : "—"}</td>
                    </tr>
                  ))}
                  {pays.data && pays.data.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">Aucun paiement enregistré.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Modifier" : "Nouvel"} employé</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nom complet *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Poste</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Ex: Technicien" /></div>
              <div><Label>Date d'embauche</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Salaire mensuel *</Label><Input type="number" step="0.01" min="0" required value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: +e.target.value })} /></div>
              <div>
                <Label>Devise</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "USD" | "CDF" })}><option>USD</option><option>CDF</option></select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Employé actif</label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="bg-gradient-brand text-brand-foreground">{saving ? "…" : "Enregistrer"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={payDlg.open} onOpenChange={(o) => setPayDlg({ open: o, emp: payDlg.emp })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payer le salaire — {payDlg.emp?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Mois (période)</Label><Input type="month" value={payForm.period_month.slice(0, 7)} onChange={(e) => setPayForm({ ...payForm, period_month: e.target.value + "-01" })} /></div>
            <div><Label>Montant ({payDlg.emp?.currency})</Label><Input type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: +e.target.value })} /></div>
            <div>
              <Label>Mode</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
                <option value="cash">Espèces</option><option value="mobile_money">Mobile Money</option><option value="bank">Virement</option>
              </select>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPayDlg({ open: false })}>Annuler</Button><Button onClick={submitPay} className="bg-gradient-brand text-brand-foreground">Confirmer le paiement</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
