import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateConsultationPdf } from "@/lib/pdf/consultation";
import type { KnowledgeFindingPdfItem } from "@/lib/pdf/consultation";
import { getLocale } from "next-intl/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [user, locale, { id }] = await Promise.all([
      requireUser(),
      getLocale(),
      params,
    ]);

    const consultation = await db.consultation.findUnique({
      where: { id },
      include: {
        patient: { select: { userId: true, firstName: true, lastName: true } },
        appointment: { select: { type: true } },
        symptoms: { orderBy: { createdAt: "asc" } },
        medications: { orderBy: { createdAt: "asc" } },
        supplements: { orderBy: { createdAt: "asc" } },
        findings: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!consultation || consultation.patient.userId !== user.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // --- Knowledge findings validés (validated = true, sourceType = KNOWLEDGE) ---
    const RISK_ORDER: Record<string, number> = {
      CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFORMATIONAL: 1,
    };

    const knowledgeRun = await db.analysisRun.findFirst({
      where: { consultationId: id, stage: "KNOWLEDGE", status: "DONE" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const knowledgeFindings: KnowledgeFindingPdfItem[] = knowledgeRun
      ? (
          await db.finding.findMany({
            where: {
              analysisRunId: knowledgeRun.id,
              sourceType: "KNOWLEDGE",
              validated: true,
            },
            select: {
              title: true,
              riskLevel: true,
              description: true,
              practitionerNote: true,
            },
          })
        )
          .sort(
            (a, b) =>
              (RISK_ORDER[b.riskLevel ?? ""] ?? 0) -
              (RISK_ORDER[a.riskLevel ?? ""] ?? 0)
          )
      : [];

    const pdfLocale = (locale === "en" ? "en" : "fr") as "fr" | "en";

    const pdfBytes = await generateConsultationPdf({
      practitionerName: user.name,
      cabinetName: user.cabinetName ?? null,
      patientFirstName: consultation.patient.firstName,
      patientLastName: consultation.patient.lastName,
      consultationDate: consultation.createdAt,
      context: consultation.context,
      appointmentType: consultation.appointment?.type ?? null,
      symptoms: consultation.symptoms.map((s) => ({
        label: s.label,
        intensity: s.intensity,
        duration: s.duration,
        category: s.category,
      })),
      medications: consultation.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
      })),
      supplements: consultation.supplements.map((s) => ({
        name: s.name,
        dosage: s.dosage,
        duration: s.duration,
      })),
      findings: consultation.findings.map((f) => ({
        category: f.category,
        title: f.title,
        description: f.description,
      })),
      knowledgeFindings,
      locale: pdfLocale,
    });

    const filename = `consultation-${consultation.patient.lastName}-${id.slice(0, 8)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("[pdf/consultation] Error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
