import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

// ---------------------------------------------------------------------------
// Palette (cohérente avec invoice.ts et consultation.ts)
// ---------------------------------------------------------------------------

const TEAL      = rgb(0.059, 0.463, 0.431);
const SLATE_900 = rgb(0.059, 0.086, 0.122);
const SLATE_600 = rgb(0.278, 0.337, 0.416);
const SLATE_400 = rgb(0.576, 0.635, 0.718);
const SLATE_100 = rgb(0.937, 0.949, 0.965);
const WHITE     = rgb(1, 1, 1);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdviceSheetPdfData {
  practitionerName: string;
  cabinetName:      string | null;
  patientFirstName: string;
  patientLastName:  string;
  patientBirthDate: Date | null;
  consultationDate: Date;
  sheetTitle:       string | null;
  versionMajor:     number;
  versionMinor:     number;
  signedAt:         Date | null;
  aiDraftGenerated: boolean;
  // Sections
  consultationSummary?: string | null;
  objectives?:          string | null;
  dietaryAdvice?:       string | null;
  supplements?:         string | null;
  phytotherapy?:        string | null;
  aromatherapy?:        string | null;
  micronutrition?:      string | null;
  gemmotherapy?:        string | null;
  bachFlowers?:         string | null;
  lifestyle?:           string | null;
  physicalActivity?:    string | null;
  additionalNotes?:     string | null;
  precautions?:         string | null;
  locale: "fr" | "en";
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export async function generateAdviceSheetPdf(data: AdviceSheetPdfData): Promise<Uint8Array> {
  const isFr = data.locale === "fr";
  const doc = await PDFDocument.create();
  doc.setTitle(data.sheetTitle ?? (isFr ? "Fiche conseil" : "Advice sheet"));
  doc.setAuthor("NaturoDesk");
  doc.setCreator("NaturoDesk");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  const versionLabel = `V${data.versionMajor}.${data.versionMinor}`;

  // ── Pagination helpers ────────────────────────────────────────────────────

  let pageNumber = 0;

  const addPage = () => {
    pageNumber++;
    const p = doc.addPage(PageSizes.A4);
    const { width, height } = p.getSize();

    // Header teal
    p.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: TEAL });
    p.drawText("NaturoDesk", { x: margin, y: height - 30, size: 16, font: bold, color: WHITE });
    const cabinet = data.cabinetName ?? data.practitionerName;
    p.drawText(cabinet, { x: margin, y: height - 48, size: 10, font, color: rgb(0.6, 0.95, 0.92) });

    const rightLabel = isFr ? "Fiche conseil" : "Advice sheet";
    const rightW = bold.widthOfTextAtSize(rightLabel, 11);
    p.drawText(rightLabel, { x: width - margin - rightW, y: height - 36, size: 11, font: bold, color: WHITE });
    const vW = font.widthOfTextAtSize(versionLabel, 9);
    p.drawText(versionLabel, { x: width - margin - vW, y: height - 52, size: 9, font, color: rgb(0.7, 0.96, 0.93) });

    // Footer
    p.drawLine({ start: { x: margin, y: 42 }, end: { x: width - margin, y: 42 }, thickness: 0.5, color: SLATE_100 });
    const footerParts: string[] = [
      isFr ? "Document confidentiel — usage exclusif du patient" : "Confidential — for patient use only",
    ];
    if (data.aiDraftGenerated) {
      footerParts.push(isFr ? "Rédigé avec assistance IA — validé par le praticien" : "AI-assisted draft — validated by the practitioner");
    }
    footerParts.push(`NaturoDesk · ${isFr ? "Logiciel de gestion naturopathique" : "Naturopathic practice software"}`);
    p.drawText(footerParts.join("  ·  "), { x: margin, y: 28, size: 7, font, color: SLATE_400 });

    // Page number
    const pgLabel = `${pageNumber}`;
    const pgW = font.widthOfTextAtSize(pgLabel, 7);
    p.drawText(pgLabel, { x: width - margin - pgW, y: 28, size: 7, font, color: SLATE_400 });

    return { p, width, height, startY: height - 92 };
  };

  let { p: page, width, startY: y } = addPage();

  // ── Text helpers ─────────────────────────────────────────────────────────

  const ensureSpace = (needed = 80) => {
    if (y < needed) {
      ({ p: page, width, startY: y } = addPage());
    }
  };

  const writeSectionTitle = (title: string) => {
    ensureSpace(60);
    y -= 12;
    page.drawRectangle({ x: margin - 4, y: y - 4, width: width - margin * 2 + 8, height: 20, color: SLATE_100 });
    page.drawText(title.toUpperCase(), { x: margin, y: y + 2, size: 9, font: bold, color: TEAL });
    y -= 20;
  };

  const writeText = (text: string) => {
    const maxWidth = width - margin * 2;
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, 9) > maxWidth && line) {
        ensureSpace();
        page.drawText(line, { x: margin, y, size: 9, font, color: SLATE_900 });
        y -= 13;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      ensureSpace();
      page.drawText(line, { x: margin, y, size: 9, font, color: SLATE_900 });
      y -= 13;
    }
    y -= 4;
  };

  const writeRow = (label: string, value: string) => {
    ensureSpace();
    page.drawText(label, { x: margin, y, size: 9, font, color: SLATE_600 });
    page.drawText(value, { x: margin + 130, y, size: 9, font, color: SLATE_900 });
    y -= 15;
  };

  // ── En-tête patient ───────────────────────────────────────────────────────

  y -= 6;
  writeRow(
    isFr ? "Patient" : "Patient",
    `${data.patientLastName.toUpperCase()} ${data.patientFirstName}`
  );

  if (data.patientBirthDate) {
    writeRow(
      isFr ? "Né(e) le" : "Date of birth",
      data.patientBirthDate.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
    );
  }

  writeRow(
    isFr ? "Date du bilan" : "Consultation date",
    data.consultationDate.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
  );

  writeRow(isFr ? "Praticien" : "Practitioner", data.practitionerName);

  if (data.signedAt) {
    writeRow(
      isFr ? "Validée le" : "Finalized on",
      data.signedAt.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
    );
  }

  if (data.sheetTitle) {
    y -= 4;
    ensureSpace();
    page.drawText(data.sheetTitle, { x: margin, y, size: 12, font: bold, color: TEAL });
    y -= 18;
  }

  // ── Sections (affichées uniquement si non vides) ───────────────────────────

  const SECTION_LABELS_FR: Record<string, string> = {
    consultationSummary: "Synthèse de la consultation",
    objectives:          "Objectifs du protocole",
    dietaryAdvice:       "Conseils alimentaires",
    supplements:         "Compléments alimentaires",
    phytotherapy:        "Phytothérapie",
    aromatherapy:        "Aromathérapie",
    micronutrition:      "Micronutrition",
    gemmotherapy:        "Gemmothérapie",
    bachFlowers:         "Fleurs de Bach",
    lifestyle:           "Hygiène de vie",
    physicalActivity:    "Activité physique",
    additionalNotes:     "Remarques complémentaires",
    precautions:         "Précautions éventuelles",
  };

  const SECTION_LABELS_EN: Record<string, string> = {
    consultationSummary: "Consultation summary",
    objectives:          "Protocol objectives",
    dietaryAdvice:       "Dietary advice",
    supplements:         "Dietary supplements",
    phytotherapy:        "Phytotherapy",
    aromatherapy:        "Aromatherapy",
    micronutrition:      "Micronutrition",
    gemmotherapy:        "Gemmotherapy",
    bachFlowers:         "Bach flowers",
    lifestyle:           "Lifestyle advice",
    physicalActivity:    "Physical activity",
    additionalNotes:     "Additional notes",
    precautions:         "Precautions",
  };

  const labels = isFr ? SECTION_LABELS_FR : SECTION_LABELS_EN;

  // Ordre de rendu dans le PDF
  const SECTION_ORDER = [
    "consultationSummary",
    "objectives",
    "dietaryAdvice",
    "supplements",
    "phytotherapy",
    "aromatherapy",
    "micronutrition",
    "gemmotherapy",
    "bachFlowers",
    "lifestyle",
    "physicalActivity",
    "additionalNotes",
    "precautions",
  ] as const;

  for (const key of SECTION_ORDER) {
    const value: string | null | undefined = data[key];
    if (!value || value.trim() === "") continue;
    y -= 6;
    writeSectionTitle(labels[key] ?? key);
    writeText(value.trim());
  }

  return doc.save();
}
