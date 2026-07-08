import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listExpenses, listExpenseCategories, upsertExpense } from "@/lib/expenses.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, FileDown } from "lucide-react";
import { formatUSD, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { buildReportPDF } from "@/lib/report-pdf";

export const Route = createFileRoute("/_authenticated/admin/rent")({
  component: RentHistory,
});

function RentHistory() {
  const qc = useQueryClient();
  const fList = useServerFn(listExpenses);
  const fCats = useServerFn(listExpenseCategories);
  const fSave = useServerFn(upsertExpense);
  const q = useQuery({ queryKey: ["expenses-all"], queryFn: () => fList({ data: {} }) });
  const cats = useQuery({ queryKey: ["expense-categories"], queryFn: () => fCats() });

  const rows = useMemo(
    () => (q.data ?? []).filter((r: any) => (r.expense_categories?.name ?? "").toLowerCase().includes("loyer")),
    [q.data],
  );
  const total = rows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.amount), 0);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: "Loyer " + new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    amount: 0,
    currency: "USD" as "USD" | "CDF",
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: "cash",
    status: "paid" as "paid" | "pending",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loyerCat = (cats.data ?? []).find((c: any) => (c.name ?? "").toLowerCase().includes("loyer"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!loyerCat) return toast.error("Créez d'abord une catégorie de dépenses « Loyer » dans Dépenses.");
    setSaving(true);
    try {
      await fSave({ data: { ...form, amount: Number(form.amount), category_id: loyerCat.id } });
      toast.success("Paiement de loyer enregistré");
      qc.invalidateQueries({ queryKey: ["expenses-all"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  }

  function exportPdf() {
    buildReportPDF({
      title: "Rapport — Paiements de loyer",
      subtitle: `Édité le ${new Date().toLocaleDateString("fr-FR")}`,
      filename: `Loyer-${new Date().toISOString().slice(0, 10)}.pdf`,
      summary: [
        { label: "Nombre de paiements", value: String(rows.length) },
        { label: "Total payé", value: formatUSD(total), bold: true },
      ],
      sections: [{
        head: ["Date", "Libellé", "Mode", "Statut", "Montant"],
        body: rows.map((r: any) => [
          formatDate(r.expense_date),
          r.label,
          r.payment_method ?? "—",
          r.status,
          `${Number(r.amount).toFixed(2)} ${r.currency}`,
        ]),
      }],
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Building2 className="size-6 text-accent" /> Loyer</h1>
          <p className="text-sm text-muted-foreground">Historique des paiements de loyer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportPdf} disabled={rows.length === 0}>
            <FileDown className="mr-1.5 size-4" /> Rapport PDF
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-gradient-brand text-brand-foreground">
            <Plus className="mr-1.5 size-4" /> Ajouter un paiement
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-600 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-white/80">Total payé (période cumulée)</div>
          <div className="mt-1 text-3xl font-black tabular-nums">{formatUSD(total)}</div>
          <div className="mt-1 text-xs text-white/80">{rows.length} paiement(s) enregistré(s)</div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Libellé</th>
                <th className="px-3 py-2.5">Mode</th>
                <th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <td className="px-3 py-2.5">{formatDate(r.expense_date)}</td>
                  <td className="px-3 py-2.5 font-medium">{r.label}</td>
                  <td className="px-3 py-2.5 text-xs">{r.payment_method ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={r.status === "paid" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{Number(r.amount).toFixed(2)} {r.currency}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">Aucun paiement de loyer enregistré.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau paiement de loyer</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Libellé *</Label><Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Montant *</Label><Input type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
              <div><Label>Devise</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "USD" | "CDF" })}>
                  <option>USD</option><option>CDF</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date de paiement</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div><Label>Mode</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  <option value="cash">Espèces</option><option value="mobile_money">Mobile Money</option><option value="bank">Virement</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Statut</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "paid" | "pending" })}>
                <option value="paid">Payé</option><option value="pending">En attente</option>
              </select>
            </div>
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
