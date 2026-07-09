import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/tanstack-start-compat";
import { useState } from "react";
import { listOrders, getOrderDetail, updateOrderStatus } from "@/lib/admin.functions";
import { getPublicSiteSettings } from "@/lib/site-settings.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatUSD, formatDateTime } from "@/lib/format";
import { downloadInvoicePDF, printInvoicePDF, styleFromSettings } from "@/lib/invoice-pdf";
import { toast } from "sonner";
import { Eye, FileDown, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const statusColor: Record<string, string> = {
  pending: "bg-orange-500", paid: "bg-accent", delivered: "bg-brand",
  failed: "bg-destructive", cancelled: "bg-muted-foreground",
};

function AdminOrders() {
  const qc = useQueryClient();
  const fList = useServerFn(listOrders);
  const fDetail = useServerFn(getOrderDetail);
  const fStatus = useServerFn(updateOrderStatus);
  const fSettings = useServerFn(getPublicSiteSettings);

  const list = useQuery({ queryKey: ["admin-orders"], queryFn: () => fList() });
  const settings = useQuery({ queryKey: ["public-settings"], queryFn: () => fSettings(), staleTime: 60_000 });
  const [openId, setOpenId] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["admin-order", openId],
    queryFn: () => fDetail({ data: { id: openId! } }),
    enabled: !!openId,
  });

  function buildInvoiceArgs() {
    const d = detail.data;
    if (!d?.order) return null;
    const s = settings.data;
    const inv = {
      invoiceNumber: d.invoice?.invoice_number ?? null,
      orderNumber: d.order.order_number,
      issuedAt: d.invoice?.issued_at ?? d.order.created_at,
      customer: {
        name: d.order.customer_name, phone: d.order.customer_phone,
        email: d.order.customer_email, neighborhood: d.order.neighborhood,
        address: d.order.delivery_address,
      },
      items: d.items as never,
      subtotal: d.order.subtotal, deliveryFee: d.order.delivery_fee,
      total: d.order.total, currency: d.order.currency,
      paymentMethod: d.order.payment_method, status: d.order.status,
    };
    const shop = { name: s?.shop_name ?? "CONETEC", tagline: s?.shop_tagline, address: s?.address_line, city: s?.city, country: s?.country, phone: s?.contact_phone, email: s?.contact_email };
    return { inv, shop, style: styleFromSettings(s) };
  }
  function downloadPdf() { const r = buildInvoiceArgs(); if (r) downloadInvoicePDF(r.inv, r.shop, r.style); }
  function printPdf() { const r = buildInvoiceArgs(); if (r) printInvoicePDF(r.inv, r.shop, r.style); }

  async function setStatus(id: string, status: string) {
    try {
      await fStatus({ data: { id, status: status as any } });
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Commandes</h1>
        <p className="text-sm text-muted-foreground">{list.data?.length ?? 0} commande(s)</p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Quartier</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.data?.map((o: any) => (
                <tr key={o.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.neighborhood}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatUSD(o.total)}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusColor[o.status]}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <Button size="icon" variant="ghost" onClick={() => setOpenId(o.id)}><Eye className="size-4" /></Button>
                  </td>
                </tr>
              ))}
              {list.data && list.data.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Aucune commande pour l'instant</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Commande {detail.data?.order?.order_number}</DialogTitle></DialogHeader>
          {detail.data?.order && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Client</div>
                  <div className="mt-1">{detail.data.order.customer_name}</div>
                  <div>{detail.data.order.customer_phone}</div>
                  {detail.data.order.customer_email && <div>{detail.data.order.customer_email}</div>}
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Livraison</div>
                  <div className="mt-1">{detail.data.order.neighborhood}</div>
                  <div>{detail.data.order.delivery_address}</div>
                </div>
              </div>

              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="bg-secondary text-left text-xs uppercase">
                    <tr><th className="p-2">Produit</th><th className="p-2 text-right">Qté</th><th className="p-2 text-right">Prix</th><th className="p-2 text-right">Total</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.data.items.map((i: any) => (
                      <tr key={i.id}>
                        <td className="p-2">{i.name_snapshot}</td>
                        <td className="p-2 text-right">{i.quantity}</td>
                        <td className="p-2 text-right">{formatUSD(i.unit_price)}</td>
                        <td className="p-2 text-right font-semibold">{formatUSD(i.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={3} className="p-2 text-right">Sous-total</td><td className="p-2 text-right">{formatUSD(detail.data.order.subtotal)}</td></tr>
                    <tr><td colSpan={3} className="p-2 text-right">Livraison</td><td className="p-2 text-right">{formatUSD(detail.data.order.delivery_fee)}</td></tr>
                    <tr className="bg-secondary font-bold"><td colSpan={3} className="p-2 text-right">Total</td><td className="p-2 text-right">{formatUSD(detail.data.order.total)}</td></tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Marquer comme :</span>
                {["pending", "paid", "delivered", "failed", "cancelled"].map((s) => {
                  const order = detail.data!.order!;
                  return (
                    <Button key={s} size="sm" variant={order.status === s ? "default" : "outline"}
                      onClick={() => setStatus(order.id, s)}>
                      {s}
                    </Button>
                  );
                })}
                <Button size="sm" onClick={downloadPdf} className="ml-auto bg-gradient-brand text-brand-foreground">
                  <FileDown className="mr-1.5 size-4" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={printPdf}>
                  <Printer className="mr-1.5 size-4" /> Imprimer
                </Button>
              </div>

              {detail.data.invoice && (
                <div className="rounded-lg border bg-accent/5 p-3 text-xs">
                  Facture <strong>{detail.data.invoice.invoice_number}</strong> émise le {formatDateTime(detail.data.invoice.issued_at)}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
