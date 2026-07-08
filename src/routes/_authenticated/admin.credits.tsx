import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCustomers, upsertCustomer } from "@/lib/customers.functions";
import { listCredits, upsertCredit, deleteCredit, addCreditPayment } from "@/lib/customers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, HandCoins, AlertTriangle, UserPlus, FileDown } from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { buildReportPDF } from "@/lib/report-pdf";

export const Route = createFileRoute("/_authenticated/admin/credits")({
  component: AdminCredits,
});

const statusColor: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-700",
  partial: "bg-orange-500/15 text-orange-700",
  paid: "bg-emerald-500/15 text-emerald-700",
  overdue: "bg-red-500/15 text-red-700",
};

function AdminCredits() {
  const qc = useQueryClient();
  const fList = useServerFn(listCredits);
  const fCust = useServerFn(listCustomers);
  const fSave = useServerFn(upsertCredit);
  const fDel = useServerFn(deleteCredit);
  const fPay = useServerFn(addCreditPayment);
  const fNewCust = useServerFn(upsertCustomer);

  const list = useQuery({ queryKey: ["credits"], queryFn: () => fList() });
  const cust = useQuery({ queryKey: ["customers"], queryFn: () => fCust() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: "", label: "", amount: 0, currency: "USD" as "USD" | "CDF", due_date: "", notes: "" });
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [newCust, setNewCust] = useState<{ open: boolean; full_name: string; phone: string; email: string }>({ open: false, full_name: "", phone: "", email: "" });

  const overdue = (list.data ?? []).filter((c: any) => c.status === "overdue");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fSave({ data: { ...form, amount: Number(form.amount), due_date: form.due_date || null } });
      toast.success("Crédit enregistré"); setOpen(false);
      qc.invalidateQueries({ queryKey: ["credits"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erreur"); }
  }
  async function del(id: string) {
    if (!confirm("Supprimer ce crédit ?")) return;
    try { await fDel({ data: { id } }); toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["credits"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }
  async function pay() {
    if (!payOpen || payAmount <= 0) return;
    try {
      await fPay({ data: { credit_id: payOpen, amount: payAmount } });
      toast.success("Paiement enregistré");
      setPayOpen(null); setPayAmount(0);
      qc.invalidateQueries({ queryKey: ["credits"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  async function createNewCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCust.full_name.trim()) return;
    try {
      const created = await fNewCust({ data: { full_name: newCust.full_name.trim(), phone: newCust.phone, email: newCust.email } });
      toast.success("Client ajouté au répertoire");
      await qc.invalidateQueries({ queryKey: ["customers"] });
      setForm((f) => ({ ...f, customer_id: (created as any).id }));
      setNewCust({ open: false, full_name: "", phone: "", email: "" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><HandCoins className="size-6 text-accent" /> Crédits & dettes</h1>
          <p className="text-sm text-muted-foreground">Suivi des crédits accordés, rappels & paiements partiels.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-brand text-brand-foreground"><Plus className="mr-1.5 size-4" /> Nouveau crédit</Button>
      </div>

      {overdue.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" /> {overdue.length} crédit(s) en retard de paiement</div>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Libellé</th>
                <th className="px-3 py-2.5 text-right">Montant</th>
                <th className="px-3 py-2.5 text-right">Solde</th>
                <th className="px-3 py-2.5">Échéance</th>
                <th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(list.data ?? []).map((c: any) => (
                <tr key={c.id} className="hover:bg-secondary/40">
                  <td className="px-3 py-2.5 font-medium">{c.customers?.full_name ?? "—"}</td>
                  <td className="px-3 py-2.5">{c.label}</td>
                  <td className="px-3 py-2.5 text-right">{Number(c.amount).toFixed(2)} {c.currency}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{Number(c.balance).toFixed(2)} {c.currency}</td>
                  <td className="px-3 py-2.5 text-xs">{c.due_date ? formatDate(c.due_date) : "—"}</td>
                  <td className="px-3 py-2.5"><Badge className={statusColor[c.status] ?? ""}>{c.status}</Badge></td>
                  <td className="px-3 py-2.5 text-right">
                    <Button size="sm" variant="outline" onClick={() => { setPayOpen(c.id); setPayAmount(Number(c.balance)); }}>Encaisser</Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
              {list.data?.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">Aucun crédit enregistré.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau crédit client</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Client *</Label>
              <select required className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">— Choisir —</option>
                {(cust.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `— ${c.phone}` : ""}</option>)}
              </select>
            </div>
            <div><Label>Libellé *</Label><Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Achat frigo à crédit" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Montant *</Label><Input type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
              <div><Label>Devise</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "USD" | "CDF" })}>
                  <option>USD</option><option>CDF</option>
                </select>
              </div>
            </div>
            <div><Label>Échéance</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" className="bg-gradient-brand text-brand-foreground">Enregistrer</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Montant reçu</Label><Input type="number" step="0.01" min="0" value={payAmount} onChange={(e) => setPayAmount(+e.target.value)} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPayOpen(null)}>Annuler</Button><Button onClick={pay} className="bg-gradient-brand text-brand-foreground">Encaisser</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
