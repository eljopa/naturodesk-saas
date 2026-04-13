import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

const TEAL       = rgb(0.059, 0.463, 0.431);
const SLATE_900  = rgb(0.059, 0.086, 0.122);
const SLATE_600  = rgb(0.278, 0.337, 0.416);
const SLATE_400  = rgb(0.576, 0.635, 0.718);
const SLATE_100  = rgb(0.937, 0.949, 0.965);
const WHITE      = rgb(1, 1, 1);
const RED_600    = rgb(0.859, 0.149, 0.149);  // CRITICAL
const ORANGE_600 = rgb(0.851, 0.329, 0.024);  // HIGH
const AMBER_600  = rgb(0.792, 0.529, 0.016);  // MEDIUM

export interface KnowledgeFindingPdfItem {
  title:            string;
  riskLevel:        string | null;  // CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL | null
  description:      string;
  practitionerNote: string | null;
}

export interface ConsultationPdfData {
  practitionerName: string;
  cabinetName: string | null;
  patientFirstName: string;
  patientLastName: string;
  consultationDate: Date;
  context: string | null;
  appointmentType: string | null;
  symptoms: Array<{ label: string; intensity: number | null; duration: string | null; category: string | null }>;
  medications: Array<{ name: string; dosage: string | null; frequency: string | null; duration: string | null }>;
  supplements: Array<{ name: string; dosage: string | null; duration: string | null }>;
  findings: Array<{ category: string; title: string; description: string }>;
  /**
   * Findings knowledge validés par le praticien (validated = true).
   * Déjà triés par criticité décroissante.
   * undefined ou [] → section omise.
   */
  knowledgeFindings?: KnowledgeFindingPdfItem[];
  locale: "fr" | "en";
}

export async function generateConsultationPdf(data: ConsultationPdfData): Promise<Uint8Array> {
  const isFr = data.locale === "fr";
  const doc = await PDFDocument.create();
  doc.setTitle(isFr ? "Résumé de consultation" : "Consultation summary");
  doc.setAuthor("NaturoDesk");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;

  // Helper to add a new page and return its context
  const addPage = () => {
    const p = doc.addPage(PageSizes.A4);
    const { width, height } = p.getSize();

    // Header
    p.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: TEAL });
    p.drawText("NaturoDesk", { x: margin, y: height - 32, size: 16, font: bold, color: WHITE });
    const cabinet = data.cabinetName ?? data.practitionerName;
    p.drawText(cabinet, { x: margin, y: height - 50, size: 10, font, color: rgb(0.6, 0.95, 0.92) });
    const title = isFr ? "Résumé de consultation" : "Consultation summary";
    const tW = bold.widthOfTextAtSize(title, 11);
    p.drawText(title, { x: width - margin - tW, y: height - 38, size: 11, font: bold, color: WHITE });

    // Footer
    const footer = isFr
      ? "NaturoDesk — Logiciel de gestion de cabinet naturopathique"
      : "NaturoDesk — Naturopathic practice management software";
    p.drawLine({ start: { x: margin, y: 40 }, end: { x: width - margin, y: 40 }, thickness: 0.5, color: SLATE_100 });
    p.drawText(footer, { x: margin, y: 26, size: 8, font, color: SLATE_400 });

    return { p, width, height, startY: height - 100 };
  };

  let { p: page, width, startY: y } = addPage();

  const writeSectionTitle = (title: string) => {
    if (y < 80) {
      ({ p: page, width, startY: y } = addPage());
    }
    y -= 16;
    page.drawRectangle({ x: margin - 4, y: y - 4, width: width - margin * 2 + 8, height: 20, color: SLATE_100 });
    page.drawText(title, { x: margin, y: y + 2, size: 10, font: bold, color: TEAL });
    y -= 20;
  };

  const writeRow = (label: string, value: string) => {
    if (y < 80) {
      ({ p: page, width, startY: y } = addPage());
    }
    page.drawText(label, { x: margin, y, size: 9, font, color: SLATE_600 });
    page.drawText(value, { x: margin + 120, y, size: 9, font, color: SLATE_900 });
    y -= 15;
  };

  const writeText = (text: string, indented = false) => {
    // Simple word wrap
    const x = indented ? margin + 12 : margin;
    const maxWidth = width - margin * 2 - (indented ? 12 : 0);
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testW = font.widthOfTextAtSize(testLine, 9);
      if (testW > maxWidth && line) {
        if (y < 80) ({ p: page, width, startY: y } = addPage());
        page.drawText(line, { x, y, size: 9, font, color: SLATE_900 });
        y -= 13;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      if (y < 80) ({ p: page, width, startY: y } = addPage());
      page.drawText(line, { x, y, size: 9, font, color: SLATE_900 });
      y -= 13;
    }
  };

  // Word-wrap à taille 8 pour les notes praticien (teal, indentation +16)
  const writeNoteText = (text: string) => {
    const x = margin + 16;
    const maxWidth = width - margin - x;
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, 8) > maxWidth && line) {
        if (y < 80) ({ p: page, width, startY: y } = addPage());
        page.drawText(line, { x, y, size: 8, font, color: TEAL });
        y -= 12;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      if (y < 80) ({ p: page, width, startY: y } = addPage());
      page.drawText(line, { x, y, size: 8, font, color: TEAL });
      y -= 12;
    }
  };

  // ── Patient + meta ──────────────────────────────────────────────────────────
  y -= 8;
  const dateStr = data.consultationDate.toLocaleDateString(isFr ? "fr-FR" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  writeRow(isFr ? "Patient" : "Patient", `${data.patientLastName} ${data.patientFirstName}`);
  writeRow(isFr ? "Date" : "Date", dateStr);
  writeRow(isFr ? "Praticien" : "Practitioner", data.practitionerName);
  if (data.appointmentType) {
    const typeLabel = isFr
      ? data.appointmentType === "BILAN" ? "Bilan de vitalité" : "Consultation de suivi"
      : data.appointmentType === "BILAN" ? "Vitality assessment" : "Follow-up consultation";
    writeRow(isFr ? "Type" : "Type", typeLabel);
  }

  // ── Context ────────────────────────────────────────────────────────────────
  if (data.context) {
    y -= 8;
    writeSectionTitle(isFr ? "Contexte général" : "General context");
    writeText(data.context);
  }

  // ── Symptoms ───────────────────────────────────────────────────────────────
  if (data.symptoms.length > 0) {
    y -= 8;
    writeSectionTitle(isFr ? "Symptômes" : "Symptoms");
    for (const s of data.symptoms) {
      const parts: string[] = [s.label];
      if (s.intensity !== null) parts.push(`(${s.intensity}/10)`);
      if (s.duration) parts.push(s.duration);
      if (s.category) parts.push(`[${s.category}]`);
      writeText("• " + parts.join(" — "), true);
    }
  }

  // ── Medications ────────────────────────────────────────────────────────────
  if (data.medications.length > 0) {
    y -= 8;
    writeSectionTitle(isFr ? "Médicaments" : "Medications");
    for (const m of data.medications) {
      const parts: string[] = [m.name];
      if (m.dosage) parts.push(m.dosage);
      if (m.frequency) parts.push(m.frequency);
      if (m.duration) parts.push(m.duration);
      writeText("• " + parts.join(" — "), true);
    }
  }

  // ── Supplements ────────────────────────────────────────────────────────────
  if (data.supplements.length > 0) {
    y -= 8;
    writeSectionTitle(isFr ? "Compléments alimentaires" : "Dietary supplements");
    for (const s of data.supplements) {
      const parts: string[] = [s.name];
      if (s.dosage) parts.push(s.dosage);
      if (s.duration) parts.push(s.duration);
      writeText("• " + parts.join(" — "), true);
    }
  }

  // ── Findings (observations praticien) ─────────────────────────────────────
  if (data.findings.length > 0) {
    y -= 8;
    writeSectionTitle(isFr ? "Observations" : "Observations");
    for (const f of data.findings) {
      if (y < 80) ({ p: page, width, startY: y } = addPage());
      page.drawText(`• ${f.title}`, { x: margin, y, size: 9, font: bold, color: SLATE_900 });
      y -= 13;
      page.drawText(`  [${f.category}]`, { x: margin, y, size: 8, font, color: SLATE_600 });
      y -= 12;
      writeText(f.description, true);
      y -= 2;
    }
  }

  // ── Analyse documentaire (knowledge findings validés) ──────────────────────
  if (data.knowledgeFindings && data.knowledgeFindings.length > 0) {
    y -= 8;
    writeSectionTitle(isFr ? "Analyse documentaire" : "Documentary analysis");

    // Synthèse déterministe courte
    const kf = data.knowledgeFindings;
    const criticalCount = kf.filter(
      (f) => f.riskLevel === "CRITICAL" || f.riskLevel === "HIGH"
    ).length;
    const hasCritical = kf.some((f) => f.riskLevel === "CRITICAL");
    let synthLine: string;
    if (hasCritical) {
      synthLine = isFr
        ? `${kf.length} finding${kf.length > 1 ? "s" : ""} documenté${kf.length > 1 ? "s" : ""}, dont ${criticalCount} alerte${criticalCount > 1 ? "s" : ""} critique${criticalCount > 1 ? "s" : ""}.`
        : `${kf.length} documented finding${kf.length > 1 ? "s" : ""}, including ${criticalCount} critical alert${criticalCount > 1 ? "s" : ""}.`;
    } else {
      synthLine = isFr
        ? `${kf.length} finding${kf.length > 1 ? "s" : ""} documenté${kf.length > 1 ? "s" : ""} et validé${kf.length > 1 ? "s" : ""} par le praticien.`
        : `${kf.length} documented finding${kf.length > 1 ? "s" : ""} validated by the practitioner.`;
    }

    if (y < 80) ({ p: page, width, startY: y } = addPage());
    page.drawText(synthLine, { x: margin, y, size: 8, font, color: SLATE_600 });
    y -= 18;

    // Risk level → label + color
    const RISK_LABEL_FR: Record<string, string> = {
      CRITICAL:      "CRITIQUE",
      HIGH:          "ÉLEVÉ",
      MEDIUM:        "MODÉRÉ",
      LOW:           "FAIBLE",
      INFORMATIONAL: "INFO",
    };
    const RISK_LABEL_EN: Record<string, string> = {
      CRITICAL:      "CRITICAL",
      HIGH:          "HIGH",
      MEDIUM:        "MEDIUM",
      LOW:           "LOW",
      INFORMATIONAL: "INFO",
    };
    const RISK_COLOR: Record<string, ReturnType<typeof rgb>> = {
      CRITICAL:      RED_600,
      HIGH:          ORANGE_600,
      MEDIUM:        AMBER_600,
      LOW:           SLATE_600,
      INFORMATIONAL: SLATE_400,
    };
    const riskLabels = isFr ? RISK_LABEL_FR : RISK_LABEL_EN;

    for (const f of kf) {
      if (y < 80) ({ p: page, width, startY: y } = addPage());

      // Risk label + title on the same line
      const riskLabel = f.riskLevel ? `[${riskLabels[f.riskLevel] ?? f.riskLevel}]` : "";
      const riskColor = f.riskLevel ? (RISK_COLOR[f.riskLevel] ?? SLATE_600) : SLATE_600;

      if (riskLabel) {
        page.drawText(riskLabel, { x: margin, y, size: 8, font: bold, color: riskColor });
        const labelW = bold.widthOfTextAtSize(riskLabel, 8);
        page.drawText(` ${f.title}`, { x: margin + labelW, y, size: 9, font: bold, color: SLATE_900 });
      } else {
        page.drawText(f.title, { x: margin, y, size: 9, font: bold, color: SLATE_900 });
      }
      y -= 14;

      // Description
      writeText(f.description, true);

      // Note praticien — word-wrap multi-pages
      if (f.practitionerNote) {
        if (y < 80) ({ p: page, width, startY: y } = addPage());
        page.drawText(isFr ? "Note praticien :" : "Practitioner note:", {
          x: margin + 12, y, size: 7, font: bold, color: TEAL,
        });
        y -= 11;
        writeNoteText(f.practitionerNote);
      }

      y -= 6; // gap between findings
    }
  }

  return doc.save();
}
