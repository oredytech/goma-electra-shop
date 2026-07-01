import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listActivity } from "@/lib/activity.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, Printer, Filter, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: ActivityPage,
});

const ENTITY_LABEL: Record<string, string> = {
  orders: "Commandes", expenses: "Dépenses", salary_payments: "Salaires",
  products: "Produits", user_roles: "Rôles", shop_settings: "Paramètres",
  employees: "Employés", inventory_movements: "Mouvements de stock",
};
const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  create: { label: "Création", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  update: { label: "Modification", color: "bg-amber-100 text-amber-800 border-amber-200" },
  delete: { label: "Suppression", color: "bg-rose-100 text-rose-800 border-rose-200" },
};

function todayISO(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10);
}

function ActivityPage() {
  const fList = useServerFn(listActivity);
  const [from, setFrom] = useState(todayISO(-30));
  const [to, setTo] = useState(todayISO());
  const [entity, setEntity] = useState<string>("all");
  const [action, setAction] = useState<string>("all");

  const query = useQuery({
    queryKey: ["activity-log", from, to, entity, action],
    queryFn: () => fList({
      data: {
        from: new Date(from + "T00:00:00").toISOString(),
        to: new Date(to + "T23:59:59").toISOString(),
        entity: entity === "all" ? undefined : entity,
        action: action === "all" ? undefined : (action as any),
        limit: 1000,
      },
    }),
  });

  const rows = query.data ?? [];

  const perDay = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r: any) => {
      const k = new Date(r.created_at).toISOString().slice(0, 10);
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [rows]);

  const perEntity = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r: any) => map.set(r.entity, (map.get(r.entity) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({
      name: ENTITY_LABEL[name] ?? name, value,
    }));
  }, [rows]);

  const kpis = useMemo(() => ({
    total: rows.length,
    creates: rows.filter((r: any) => r.action === "create").length,
    updates: rows.filter((r: any) => r.action === "update").length,
    deletes: rows.filter((r: any) => r.action === "delete").length,
  }), [rows]);

  const PIE_COLORS = ["#0c275d", "#00796f", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899"];

  function exportCSV() {
    const header = ["Date", "Utilisateur", "Action", "Rubrique", "ID", "Détails"];
    const lines = rows.map((r: any) => [
      new Date(r.created_at).toLocaleString("fr-FR"),
      r.user_email, r.action, r.entity, r.entity_id ?? "",
      JSON.stringify(r.details ?? {}).replace(/"/g, '""').slice(0, 500),
    ]);
    const csv = [header, ...lines].map((row) =>
      row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `activite-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  }

  function exportPDF(printMode = false) {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(12, 39, 93);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Rapport d'activité — CONETEC", 14, 14);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Période : ${from} → ${to}   •   ${rows.length} entrée(s)`, 14, 19);

    doc.setTextColor(20, 20, 20); doc.setFontSize(10);
    doc.text(`Créations : ${kpis.creates}   Modifications : ${kpis.updates}   Suppressions : ${kpis.deletes}`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [["Date", "Utilisateur", "Action", "Rubrique", "ID"]],
      body: rows.map((r: any) => [
        new Date(r.created_at).toLocaleString("fr-FR"),
        r.user_email, ACTION_LABEL[r.action]?.label ?? r.action,
        ENTITY_LABEL[r.entity] ?? r.entity,
        (r.entity_id ?? "").toString().slice(0, 12),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 121, 111], textColor: 255 },
      alternateRowStyles: { fillColor: [246, 250, 252] },
      margin: { left: 10, right: 10 },
    });

    if (printMode) { doc.autoPrint(); window.open(doc.output("bloburl"), "_blank"); }
    else doc.save(`activite-${from}-${to}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Activity className="size-6 text-brand" /> Historique d'activité</h1>
          <p className="text-sm text-muted-foreground">Toutes les actions du staff sur la base de données.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => query.refetch()}><RefreshCw className="mr-1.5 size-4" /> Actualiser</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><FileDown className="mr-1.5 size-4" /> CSV</Button>
          <Button size="sm" onClick={() => exportPDF(false)} className="bg-gradient-brand text-brand-foreground"><FileDown className="mr-1.5 size-4" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF(true)}><Printer className="mr-1.5 size-4" /> Imprimer</Button>
        </div>
      </div>

      {/* KPIs gradients */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total actions", value: kpis.total, from: "from-slate-600", to: "to-slate-800" },
          { label: "Créations", value: kpis.creates, from: "from-emerald-500", to: "to-emerald-700" },
          { label: "Modifications", value: kpis.updates, from: "from-amber-500", to: "to-amber-700" },
          { label: "Suppressions", value: kpis.deletes, from: "from-rose-500", to: "to-rose-700" },
        ].map((k) => (
          <Card key={k.label} className={`overflow-hidden bg-gradient-to-br ${k.from} ${k.to} p-5 text-white shadow-lg`}>
            <div className="text-xs uppercase tracking-wider opacity-80">{k.label}</div>
            <div className="mt-1 text-3xl font-bold tabular-nums">{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Filter className="size-4" /> Filtres</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label>Rubrique</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {Object.entries(ENTITY_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Type</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="create">Création</SelectItem>
                <SelectItem value="update">Modification</SelectItem>
                <SelectItem value="delete">Suppression</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Actions par jour</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={perDay}>
                <defs>
                  <linearGradient id="barA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0c275d" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#00796f" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="url(#barA)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Répartition par rubrique</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={perEntity} dataKey="value" nameKey="name" outerRadius={80} label>
                  {perEntity.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Rubrique</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Chargement…</TableCell></TableRow>}
            {!query.isLoading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Aucune activité</TableCell></TableRow>}
            {rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-sm">{r.user_email}</TableCell>
                <TableCell><Badge variant="outline" className={ACTION_LABEL[r.action]?.color}>{ACTION_LABEL[r.action]?.label ?? r.action}</Badge></TableCell>
                <TableCell className="text-sm font-medium">{ENTITY_LABEL[r.entity] ?? r.entity}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{(r.entity_id ?? "").toString().slice(0, 8)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
