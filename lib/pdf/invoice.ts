import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

// ---------------------------------------------------------------------------
// Color palette (matching teal-700 brand)
// ---------------------------------------------------------------------------

const TEAL = rgb(0.059, 0.463, 0.431); // ~teal-700 #0f766e
const SLATE_900 = rgb(0.059, 0.086, 0.122);
const SLATE_600 = rgb(0.278, 0.337, 0.416);
const SLATE_400 = rgb(0.576, 0.635, 0.718);
const SLATE_100 = rgb(0.937, 0.949, 0.965);
const WHITE = rgb(1, 1, 1);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoicePdfData {
  invoiceNumber: string;
  issuedAt: Date | null;
  practitionerName: string;
  cabinetName: string | null;
  patientFirstName: string;
  patientLastName: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
  paymentMethod: string | null;
  totalAmount: number;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  locale: "fr" | "en";
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const isFr = data.locale === "fr";
  const doc = await PDFDocument.create();
  doc.setTitle(`${data.invoiceNumber}`);
  doc.setAuthor("NaturoDesk");
  doc.setCreator("NaturoDesk");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  const margin = 48;
  const contentWidth = width - margin * 2;

  let y = height;

  // ── Header background ──────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: height - 100,
    width, height: 100,
    color: TEAL,
  });

  // App name
  page.drawText("NaturoDesk", {
    x: margin, y: height - 40,
    size: 20, font: bold, color: WHITE,
  });

  // Cabinet name or practitioner
  const cabinetLine = data.cabinetName ?? data.practitionerName;
  page.drawText(cabinetLine, {
    x: margin, y: height - 62,
    size: 11, font, color: rgb(0.6, 0.95, 0.92),
  });

  // Invoice label on the right
  const invoiceLabel = isFr ? "FACTURE" : "INVOICE";
  const labelWidth = bold.widthOfTextAtSize(invoiceLabel, 14);
  page.drawText(invoiceLabel, {
    x: width - margin - labelWidth,
    y: height - 40,
    size: 14, font: bold, color: WHITE,
  });
  const numWidth = font.widthOfTextAtSize(data.invoiceNumber, 11);
  page.drawText(data.invoiceNumber, {
    x: width - margin - numWidth,
    y: height - 62,
    size: 11, font, color: rgb(0.6, 0.95, 0.92),
  });

  y = height - 120;

  // ── Invoice meta ───────────────────────────────────────────────────────────
  const dateStr = data.issuedAt
    ? data.issuedAt.toLocaleDateString(isFr ? "fr-FR" : "en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })
    : isFr ? "Non émise" : "Not issued";

  const paymentLabel = data.paymentMethod
    ? formatPaymentMethod(data.paymentMethod, isFr)
    : (isFr ? "—" : "—");

  const statusLabel = formatStatus(data.status, isFr);

  const metaRows: [string, string][] = [
    [isFr ? "Date" : "Date", dateStr],
    [isFr ? "Statut" : "Status", statusLabel],
    [isFr ? "Mode de paiement" : "Payment method", paymentLabel],
    [isFr ? "Praticien" : "Practitioner", data.practitionerName],
    [isFr ? "Patient" : "Patient", `${data.patientLastName} ${data.patientFirstName}`],
  ];

  for (const [label, value] of metaRows) {
    page.drawText(label, { x: margin, y, size: 10, font, color: SLATE_600 });
    page.drawText(value, { x: margin + 130, y, size: 10, font: bold, color: SLATE_900 });
    y -= 18;
  }

  y -= 16;

  // ── Divider ────────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: margin, y }, end: { x: width - margin, y },
    thickness: 0.5, color: SLATE_100,
  });

  y -= 20;

  // ── Lines table ─────────────────────────────────────────────────────────────
  // Column X positions
  const colDesc = margin;
  const colQty = margin + contentWidth * 0.55;
  const colPrice = margin + contentWidth * 0.70;
  const colTotal = margin + contentWidth * 0.85;

  // Table header background
  page.drawRectangle({
    x: margin - 4, y: y - 4,
    width: contentWidth + 8, height: 22,
    color: SLATE_100,
  });

  const headers: [string, number, "left" | "right" | "center"][] = [
    [isFr ? "Désignation" : "Description", colDesc, "left"],
    [isFr ? "Qté" : "Qty", colQty, "center"],
    [isFr ? "P.U." : "Unit price", colPrice, "right"],
    ["Total", colTotal, "right"],
  ];

  for (const [label, x, align] of headers) {
    const textWidth = font.widthOfTextAtSize(label, 9);
    const colWidth = getColWidth(align, x, contentWidth, margin);
    const textX = getTextX(align, x, textWidth, colWidth);
    page.drawText(label, { x: textX, y: y + 2, size: 9, font, color: SLATE_600 });
  }

  y -= 22;

  // Table rows
  for (const line of data.lines) {
    const rowHeight = 20;

    // Truncate description if too long
    const maxDescChars = 50;
    const descText =
      line.description.length > maxDescChars
        ? line.description.slice(0, maxDescChars) + "…"
        : line.description;

    page.drawText(descText, { x: colDesc, y: y + 4, size: 9.5, font, color: SLATE_900 });

    const qtyStr = String(line.quantity);
    const qtyW = font.widthOfTextAtSize(qtyStr, 9.5);
    page.drawText(qtyStr, { x: colQty + 12 - qtyW / 2, y: y + 4, size: 9.5, font, color: SLATE_600 });

    const priceStr = formatCurrency(line.unitPrice, isFr);
    const priceW = font.widthOfTextAtSize(priceStr, 9.5);
    const colPriceW = colTotal - colPrice;
    page.drawText(priceStr, { x: colPrice + colPriceW - priceW - 4, y: y + 4, size: 9.5, font, color: SLATE_600 });

    const totalStr = formatCurrency(line.total, isFr);
    const totalW = bold.widthOfTextAtSize(totalStr, 9.5);
    const remainingW = width - margin - colTotal;
    page.drawText(totalStr, { x: colTotal + remainingW - totalW - 4, y: y + 4, size: 9.5, font: bold, color: SLATE_900 });

    y -= rowHeight;

    // Subtle row divider
    page.drawLine({
      start: { x: margin - 4, y: y + 2 }, end: { x: width - margin + 4, y: y + 2 },
      thickness: 0.3, color: SLATE_100,
    });
  }

  y -= 12;

  // ── Total ──────────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: margin, y: y + 6 }, end: { x: width - margin, y: y + 6 },
    thickness: 1, color: TEAL,
  });

  y -= 4;

  const totalLabel = isFr ? "Total TTC" : "Total";
  const totalStr = formatCurrency(data.totalAmount, isFr);
  page.drawText(totalLabel, {
    x: width - margin - 140,
    y,
    size: 11, font, color: SLATE_600,
  });
  const totalW = bold.widthOfTextAtSize(totalStr, 14);
  page.drawText(totalStr, {
    x: width - margin - totalW,
    y,
    size: 14, font: bold, color: TEAL,
  });

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerText = isFr
    ? "NaturoDesk — Logiciel de gestion de cabinet naturopathique"
    : "NaturoDesk — Naturopathic practice management software";

  page.drawLine({
    start: { x: margin, y: 48 }, end: { x: width - margin, y: 48 },
    thickness: 0.5, color: SLATE_100,
  });
  page.drawText(footerText, {
    x: margin, y: 32,
    size: 8, font, color: SLATE_400,
  });

  return doc.save();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, isFr: boolean): string {
  return new Intl.NumberFormat(isFr ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatPaymentMethod(method: string, isFr: boolean): string {
  const map: Record<string, [string, string]> = {
    CASH: ["Espèces", "Cash"],
    CARD: ["Carte bancaire", "Card"],
    TRANSFER: ["Virement", "Bank transfer"],
    CHECK: ["Chèque", "Cheque"],
  };
  const pair = map[method];
  if (!pair) return method;
  return isFr ? pair[0] : pair[1];
}

function formatStatus(status: string, isFr: boolean): string {
  const map: Record<string, [string, string]> = {
    DRAFT: ["Brouillon", "Draft"],
    ISSUED: ["Émise", "Issued"],
    PAID: ["Payée", "Paid"],
    CANCELLED: ["Annulée", "Cancelled"],
  };
  const pair = map[status];
  if (!pair) return status;
  return isFr ? pair[0] : pair[1];
}

function getColWidth(
  align: "left" | "right" | "center",
  x: number,
  contentWidth: number,
  margin: number
): number {
  void align;
  void contentWidth;
  void margin;
  return 60; // approximate
}

function getTextX(
  align: "left" | "right" | "center",
  x: number,
  textWidth: number,
  colWidth: number
): number {
  if (align === "left") return x;
  if (align === "right") return x + colWidth - textWidth;
  return x + (colWidth - textWidth) / 2;
}
