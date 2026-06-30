// Client-side PDF invoice generator (jsPDF) with full branding customization.
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

export type InvoiceStyle = {
  primaryColor?: string | null;
  accentColor?: string | null;
  logoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  signatoryName?: string | null;
  headerText?: string | null;
  footerText?: string | null;
  layout?: "classic" | "modern" | "minimal" | null;
  showSignature?: boolean | null;
};

type RGB = [number, number, number];

function hexToRgb(hex: string | null | undefined, fallback: RGB): RGB {
  if (!hex) return fallback;
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const DEFAULT_PRIMARY: RGB = [12, 39, 93];
const DEFAULT_ACCENT: RGB = [0, 121, 111];
const MUTED: RGB = [110, 120, 140];

function fmt(n: number | string, currency: string) {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function generateInvoicePDF(inv: InvoiceData, shop: ShopInfo, style: InvoiceStyle = {}): jsPDF {
  const PRIMARY = hexToRgb(style.primaryColor, DEFAULT_PRIMARY);
  const ACCENT = hexToRgb(style.accentColor, DEFAULT_ACCENT);
  const layout = style.layout ?? "classic";

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ===== HEADER =====
  if (layout === "minimal") {
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.8);
    doc.line(14, 22, W - 14, 22);
    doc.setTextColor(...PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(shop.name, 14, 18);
  } else {
    // classic + modern share a colored band
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, W, 32, "F");

    let textX = 14;
    if (style.logoDataUrl) {
      try {
        doc.addImage(style.logoDataUrl, "PNG", 12, 6, 20, 20, undefined, "FAST");
        textX = 36;
      } catch {/* ignore bad logo */}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(shop.name, textX, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (shop.tagline) doc.text(shop.tagline, textX, 22);
    doc.setFontSize(9);
    const addrLine = [shop.address, [shop.city, shop.country].filter(Boolean).join(", ")]
      .filter(Boolean).join(" — ");
    if (addrLine) doc.text(addrLine, textX, 27);
  }

  const titleY = layout === "minimal" ? 18 : 16;
  doc.setTextColor(layout === "minimal" ? PRIMARY[0] : 255, layout === "minimal" ? PRIMARY[1] : 255, layout === "minimal" ? PRIMARY[2] : 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FACTURE", W - 14, titleY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (inv.invoiceNumber) doc.text(`N° ${inv.invoiceNumber}`, W - 14, titleY + 6, { align: "right" });
  doc.text(`Commande ${inv.orderNumber}`, W - 14, titleY + 11, { align: "right" });

  // Optional custom header note
  let y = layout === "minimal" ? 32 : 44;
  if (style.headerText) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(style.headerText, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  // ===== META =====
  doc.setFont("helvetica", "normal");
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

  // ===== ITEMS =====
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
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: layout === "modern" ? { fillColor: [245, 247, 251] } : undefined,
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 18 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 36 },
    },
    margin: { left: 14, right: 14 },
  });

  // ===== TOTALS =====
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

  doc.setFillColor(...ACCENT);
  doc.rect(W - 80, afterTable + 11, 66, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL", W - 78, afterTable + 18);
  doc.text(fmt(inv.total, inv.currency), totalsX - 2, afterTable + 18, { align: "right" });

  // ===== PAYMENT INFO =====
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  let footY = afterTable + 30;
  if (inv.paymentMethod) { doc.text(`Mode de paiement : ${inv.paymentMethod}`, 14, footY); footY += 5; }
  if (inv.status) { doc.text(`Statut : ${inv.status.toUpperCase()}`, 14, footY); footY += 5; }

  // ===== SIGNATURE =====
  if (style.showSignature) {
    const sigY = Math.min(footY + 8, H - 50);
    doc.setDrawColor(...MUTED);
    doc.line(W - 80, sigY + 18, W - 14, sigY + 18);
    if (style.signatureDataUrl) {
      try { doc.addImage(style.signatureDataUrl, "PNG", W - 70, sigY, 50, 18, undefined, "FAST"); }
      catch {/* ignore */}
    }
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Signature & cachet", W - 47, sigY + 22, { align: "center" });
    if (style.signatoryName) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 28, 50);
      doc.text(style.signatoryName, W - 47, sigY + 27, { align: "center" });
    }
  }

  // ===== FOOTER =====
  const fy = H - 14;
  doc.setDrawColor(220);
  doc.line(14, fy - 6, W - 14, fy - 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const contactParts = [shop.phone, shop.email].filter(Boolean).join(" · ");
  doc.text(`${shop.name} — ${contactParts || ""}`.trim(), 14, fy);
  doc.text(style.footerText || "Merci pour votre confiance.", W - 14, fy, { align: "right" });

  return doc;
}

export function downloadInvoicePDF(inv: InvoiceData, shop: ShopInfo, style: InvoiceStyle = {}) {
  const doc = generateInvoicePDF(inv, shop, style);
  const name = inv.invoiceNumber || inv.orderNumber;
  doc.save(`Facture-${name}.pdf`);
}

export function printInvoicePDF(inv: InvoiceData, shop: ShopInfo, style: InvoiceStyle = {}) {
  const doc = generateInvoicePDF(inv, shop, style);
  doc.autoPrint();
  const url = doc.output("bloburl");
  const w = window.open(url.toString(), "_blank");
  if (!w) {
    // popup blocked — fallback to download
    downloadInvoicePDF(inv, shop, style);
  }
}

// Convert PublicSiteSettings (or similar) into InvoiceStyle
export function styleFromSettings(s: {
  invoice_logo_url?: string | null;
  invoice_signature_url?: string | null;
  invoice_signatory_name?: string | null;
  invoice_primary_color?: string | null;
  invoice_accent_color?: string | null;
  invoice_header_text?: string | null;
  invoice_footer_text?: string | null;
  invoice_layout?: string | null;
  invoice_show_signature?: boolean | null;
} | null | undefined): InvoiceStyle {
  if (!s) return {};
  const layout = (s.invoice_layout as InvoiceStyle["layout"]) ?? "classic";
  return {
    logoDataUrl: s.invoice_logo_url ?? null,
    signatureDataUrl: s.invoice_signature_url ?? null,
    signatoryName: s.invoice_signatory_name ?? null,
    primaryColor: s.invoice_primary_color ?? null,
    accentColor: s.invoice_accent_color ?? null,
    headerText: s.invoice_header_text ?? null,
    footerText: s.invoice_footer_text ?? null,
    layout,
    showSignature: Boolean(s.invoice_show_signature),
  };
}
