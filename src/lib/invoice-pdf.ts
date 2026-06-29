// Client-side PDF invoice generator (jsPDF).
// Safe to import from React components only.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type InvoiceLine = {
  name_snapshot: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

export type InvoiceData = {
  invoiceNumber?: string | null;
  orderNumber: string;
  issuedAt: string | Date;
  customer: {
    name: string;
    phone?: string | null;
    email?: string | null;
    neighborhood?: string | null;
    address?: string | null;
  };
  items: InvoiceLine[];
  subtotal: number | string;
  deliveryFee?: number | string;
  total: number | string;
  currency: string;
  paymentMethod?: string | null;
  status?: string | null;
};

export type ShopInfo = {
  name: string;
  tagline?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
};

const NAVY: [number, number, number] = [12, 39, 93];
const TEAL: [number, number, number] = [0, 121, 111];
const MUTED: [number, number, number] = [110, 120, 140];

function fmt(n: number | string, currency: string) {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function generateInvoicePDF(inv: InvoiceData, shop: ShopInfo): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(shop.name, 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (shop.tagline) doc.text(shop.tagline, 14, 22);
  doc.setFontSize(9);
  const addrLine = [shop.address, [shop.city, shop.country].filter(Boolean).join(", ")]
    .filter(Boolean).join(" — ");
  if (addrLine) doc.text(addrLine, 14, 27);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FACTURE", W - 14, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (inv.invoiceNumber) doc.text(`N° ${inv.invoiceNumber}`, W - 14, 22, { align: "right" });
  doc.text(`Commande ${inv.orderNumber}`, W - 14, 27, { align: "right" });

  // Meta block
  let y = 44;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text("DATE D'ÉMISSION", 14, y);
  doc.text("CLIENT", 80, y);
  doc.text("LIVRAISON", W - 14, y, { align: "right" });

  y += 5;
  doc.setTextColor(20, 28, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(new Date(inv.issuedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }), 14, y);
  doc.text(inv.customer.name, 80, y);
  doc.text(inv.customer.neighborhood || "—", W - 14, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  if (inv.customer.phone) doc.text(inv.customer.phone, 80, y + 5);
  if (inv.customer.email) doc.text(inv.customer.email, 80, y + 10);
  if (inv.customer.address) {
    const lines = doc.splitTextToSize(inv.customer.address, 50);
    doc.text(lines, W - 14, y + 5, { align: "right" });
  }

  // Items
  const tableStartY = y + 20;
  autoTable(doc, {
    startY: tableStartY,
    head: [["Désignation", "Qté", "P.U.", "Total"]],
    body: inv.items.map((i) => [
      i.name_snapshot,
      String(i.quantity),
      fmt(i.unit_price, inv.currency),
      fmt(i.line_total, inv.currency),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 18 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 36 },
    },
    margin: { left: 14, right: 14 },
  });

  // Totals
  const afterTable = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  const totalsX = W - 14;
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Sous-total", totalsX - 50, afterTable);
  doc.setTextColor(20, 28, 50);
  doc.text(fmt(inv.subtotal, inv.currency), totalsX, afterTable, { align: "right" });

  doc.setTextColor(...MUTED);
  doc.text("Livraison", totalsX - 50, afterTable + 6);
  doc.setTextColor(20, 28, 50);
  doc.text(fmt(inv.deliveryFee ?? 0, inv.currency), totalsX, afterTable + 6, { align: "right" });

  doc.setFillColor(...TEAL);
  doc.rect(W - 80, afterTable + 11, 66, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL", W - 78, afterTable + 18);
  doc.text(fmt(inv.total, inv.currency), totalsX - 2, afterTable + 18, { align: "right" });

  // Payment + status
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  let footY = afterTable + 30;
  if (inv.paymentMethod) {
    doc.text(`Mode de paiement : ${inv.paymentMethod}`, 14, footY);
    footY += 5;
  }
  if (inv.status) {
    doc.text(`Statut : ${inv.status.toUpperCase()}`, 14, footY);
  }

  // Footer
  const fy = doc.internal.pageSize.getHeight() - 14;
  doc.setDrawColor(220);
  doc.line(14, fy - 6, W - 14, fy - 6);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const contactParts = [shop.phone, shop.email].filter(Boolean).join(" · ");
  doc.text(`${shop.name} — ${contactParts || "Goma, RDC"}`, 14, fy);
  doc.text("Merci pour votre confiance.", W - 14, fy, { align: "right" });

  return doc;
}

export function downloadInvoicePDF(inv: InvoiceData, shop: ShopInfo) {
  const doc = generateInvoicePDF(inv, shop);
  const name = inv.invoiceNumber || inv.orderNumber;
  doc.save(`Facture-${name}.pdf`);
}
