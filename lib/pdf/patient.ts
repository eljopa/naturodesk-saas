import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

const TEAL = rgb(0.059, 0.463, 0.431);
const SLATE_900 = rgb(0.059, 0.086, 0.122);
const SLATE_600 = rgb(0.278, 0.337, 0.416);
const SLATE_400 = rgb(0.576, 0.635, 0.718);
const SLATE_100 = rgb(0.937, 0.949, 0.965);
const WHITE = rgb(1, 1, 1);

export interface PatientPdfData {
  practitionerName: string;
  cabinetName: string | null;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  profession: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  notes: string | null;
  locale: "fr" | "en";
}

export async function generatePatientPdf(data: PatientPdfData): Promise<Uint8Array> {
  const isFr = data.locale === "fr";
  const doc = await PDFDocument.create();
  const fullName = `${data.lastName} ${data.firstName}`;
  doc.setTitle(isFr ? `Fiche patient — ${fullName}` : `Patient file — ${fullName}`);
  doc.setAuthor("NaturoDesk");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  const margin = 48;

  let y = height;

  // ── Header ──────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: TEAL });
  page.drawText("NaturoDesk", { x: margin, y: height - 32, size: 16, font: bold, color: WHITE });
  const cabinet = data.cabinetName ?? data.practitionerName;
  page.drawText(cabinet, { x: margin, y: height - 50, size: 10, font, color: rgb(0.6, 0.95, 0.92) });
  const pageTitle = isFr ? "Fiche patient" : "Patient file";
  const tW = bold.widthOfTextAtSize(pageTitle, 11);
  page.drawText(pageTitle, { x: width - margin - tW, y: height - 38, size: 11, font: bold, color: WHITE });

  y = height - 100;

  // ── Patient name ─────────────────────────────────────────────────────────────
  y -= 8;
  page.drawText(fullName, { x: margin, y, size: 18, font: bold, color: TEAL });
  y -= 28;

  const row = (label: string, value: string | null | undefined, skipIfEmpty = true) => {
    if (skipIfEmpty && !value) return;
    page.drawText(label + " :", { x: margin, y, size: 9.5, font, color: SLATE_600 });
    page.drawText(value ?? "—", { x: margin + 130, y, size: 9.5, font: bold, color: SLATE_900 });
    y -= 17;
  };

  const section = (title: string) => {
    y -= 10;
    page.drawRectangle({ x: margin - 4, y: y - 4, width: width - margin * 2 + 8, height: 20, color: SLATE_100 });
    page.drawText(title, { x: margin, y: y + 2, size: 10, font: bold, color: TEAL });
    y -= 20;
  };

  const multiline = (text: string) => {
    const words = text.split(" ");
    const maxWidth = width - margin * 2 - 130;
    let line = "";
    let firstLine = true;
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, 9.5) > maxWidth && line) {
        page.drawText(line, { x: firstLine ? margin + 130 : margin + 130, y, size: 9.5, font, color: SLATE_900 });
        y -= 14;
        line = word;
        firstLine = false;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x: margin + 130, y, size: 9.5, font, color: SLATE_900 });
      y -= 14;
    }
  };

  // ── Identity ─────────────────────────────────────────────────────────────────
  section(isFr ? "Identité" : "Identity");

  row(isFr ? "Date de naissance" : "Date of birth",
    data.birthDate
      ? data.birthDate.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
      : null
  );
  row(isFr ? "Profession" : "Profession", data.profession);

  // ── Contact ───────────────────────────────────────────────────────────────────
  if (data.phone || data.email || data.address) {
    section(isFr ? "Coordonnées" : "Contact details");
    row(isFr ? "Téléphone" : "Phone", data.phone);
    row("Email", data.email);
    if (data.address) {
      page.drawText((isFr ? "Adresse" : "Address") + " :", { x: margin, y, size: 9.5, font, color: SLATE_600 });
      y -= 14;
      multiline(data.address);
    }
  }

  // ── Clinical ──────────────────────────────────────────────────────────────────
  if (data.allergies || data.medicalHistory) {
    section(isFr ? "Données cliniques" : "Clinical data");
    if (data.allergies) {
      page.drawText((isFr ? "Allergies / Intolérances" : "Allergies / Intolerances") + " :", {
        x: margin, y, size: 9.5, font, color: SLATE_600,
      });
      y -= 14;
      multiline(data.allergies);
      y -= 4;
    }
    if (data.medicalHistory) {
      page.drawText((isFr ? "Antécédents médicaux" : "Medical history") + " :", {
        x: margin, y, size: 9.5, font, color: SLATE_600,
      });
      y -= 14;
      multiline(data.medicalHistory);
    }
  }

  // ── Notes ─────────────────────────────────────────────────────────────────────
  if (data.notes) {
    section(isFr ? "Notes internes" : "Internal notes");
    multiline(data.notes);
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footer = isFr
    ? "NaturoDesk — Logiciel de gestion de cabinet naturopathique"
    : "NaturoDesk — Naturopathic practice management software";
  page.drawLine({ start: { x: margin, y: 40 }, end: { x: width - margin, y: 40 }, thickness: 0.5, color: SLATE_100 });
  page.drawText(footer, { x: margin, y: 26, size: 8, font, color: SLATE_400 });

  return doc.save();
}
