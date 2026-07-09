import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/tanstack-start-compat";
import { useMemo, useState } from "react";
import { listExpenseCategories, listExpenses, upsertExpense, deleteExpense } from "@/lib/expenses.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Receipt, TrendingDown } from "lucide-react";
import { formatUSD, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/expenses")({
  component: AdminExpenses,
});

type FormState = {
  id?: string;
  category_id: string;
  label: string;
  amount: number;
  currency: "USD" | "CDF";
  expense_date: string;
  status: "paid" | "pending";
  payment_method: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const empty: FormState = { category_id: "", label: "", amount: 0, currency: "USD", expense_date: today(), status: "paid", payment_method: "cash", notes: "" };

function AdminExpenses() {
  const qc = useQueryClient();
  const fCats = useServerFn(listExpenseCategories);
  const fList = useServerFn(listExpenses);
  const fSave = useServerFn(upsertExpense);
  const fDel = useServerFn(deleteExpense);

  const cats = useQuery({ queryKey: ["expense-cats"], queryFn: () => fCats() });
  const list = useQuery({ queryKey: ["expenses"], queryFn: () => fList({ data: {} }) });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const rows = list.data ?? [];
    const month = new Date().toISOString().slice(0, 7);
    const thisMonth = rows.filter((r: any) => r.expense_date.startsWith(month));
    const sum = thisMonth.reduce((s: number, r: any) => s + Number(r.amount), 0);
    const pending = rows.filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + Number(r.amount), 0);
    return { month: sum, pending, count: rows.length };
  }, [list.data]);

  function openNew() { setForm(empty); setOpen(true); }
  function openEdit(r: any) {
    setForm({
      id: r.id, category_id: r.category_id ?? "", label: r.label, amount: Number(r.amount),
      currency: r.currency, expense_date: r.expense_date, status: r.status,
      payment_method: r.payment_method ?? "", notes: r.notes ?? "",
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fSave({ data: { ...form, category_id: form.category_id || null, amount: Number(form.amount) } });
      toast.success("Dépense enregistrée");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Supprimer cette dépense ?")) return;
    try { await fDel({ data: { id } }); toast.success("Supprimée"); qc.invalidateQueries({ queryKey: ["expenses"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dépenses & charges</h1>
          <p className="text-sm text-muted-foreground">Loyer, électricité, transport, fournitures…</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-brand text-brand-foreground"><Plus className="mr-1.5 size-4" /> Nouvelle dépense</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><div className="flex items-center gap-3"><TrendingDown className="size-7 text-destructive" /><div><div className="text-xs text-muted-foreground">Ce mois-ci</div><div className="text-xl font-bold">{formatUSD(totals.month)}</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><Receipt className="size-7 text-orange-500" /><div><div className="text-xs text-muted-foreground">En attente</div><div className="text-xl font-bold">{formatUSD(totals.pending)}</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><Receipt className="size-7 text-accent" /><div><div className="text-xs text-muted-foreground">Total enregistrées</div><div className="text-xl font-bold">{totals.count}</div></div></div></Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Libellé</th>
                <th className="px-3 py-2.5">Catégorie</th>
                <th className="px-3 py-2.5 text-right">Montant</th>
                <th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.data?.map((r: any) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <td className="px-3 py-2.5 text-xs">{formatDate(r.expense_date)}</td>
                  <td className="px-3 py-2.5 font-medium">{r.label}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.expense_categories?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{Number(r.amount).toFixed(2)} {r.currency}</td>
                  <td className="px-3 py-2.5"><Badge variant={r.status === "paid" ? "default" : "secondary"} className={r.status === "paid" ? "bg-accent" : "bg-orange-500/20 text-orange-700"}>{r.status === "paid" ? "Payé" : "En attente"}</Badge></td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.data && list.data.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">Aucune dépense enregistrée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Modifier" : "Nouvelle"} dépense</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Libellé *</Label><Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Loyer mensuel boutique" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Catégorie</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">—</option>
                  {cats.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Date *</Label><Input type="date" required value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Montant *</Label><Input type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
              <div>
                <Label>Devise</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "USD" | "CDF" })}>
                  <option>USD</option><option>CDF</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mode de paiement</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  <option value="cash">Espèces</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="card">Carte</option>
                  <option value="bank">Virement</option>
                </select>
              </div>
              <div>
                <Label>Statut</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "paid" | "pending" })}>
                  <option value="paid">Payé</option><option value="pending">En attente</option>
                </select>
              </div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optionnel" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="bg-gradient-brand text-brand-foreground">{saving ? "…" : "Enregistrer"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
