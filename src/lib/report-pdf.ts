import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ReportSection = { head: string[]; body: (string | number)[][]; title?: string; color?: [number, number, number] };

export function buildReportPDF(opts: {
  title: string;
  subtitle?: string;
  filename: string;
  summary?: { label: string; value: string; bold?: boolean }[];
  sections: ReportSection[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(12, 39, 93);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(opts.title, 14, 16);
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(opts.subtitle, W - 14, 16, { align: "right" });
  }
  doc.setTextColor(20, 28, 50);
  let y = 36;
  if (opts.summary?.length) {
    doc.setFontSize(11);
    opts.summary.forEach((s) => {
      doc.setFont("helvetica", s.bold ? "bold" : "normal");
      doc.text(`${s.label} : ${s.value}`, 14, y);
      y += 6;
    });
    y += 4;
  }
  opts.sections.forEach((sec) => {
    if (sec.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(sec.title, 14, y);
      y += 4;
    }
    autoTable(doc, {
      startY: y,
      head: [sec.head],
      body: sec.body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: sec.color ?? [12, 39, 93] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  });
  doc.save(opts.filename);
}
