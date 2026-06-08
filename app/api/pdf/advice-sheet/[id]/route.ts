import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAdviceSheetPdf } from "@/lib/pdf/advice-sheet";
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

    const sheet = await db.adviceSheet.findUnique({
      where: { id },
      include: {
        patient:      { select: { userId: true, firstName: true, lastName: true, birthDate: true } },
        consultation: { select: { createdAt: true } },
      },
    });

    if (!sheet || sheet.userId !== user.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const pdfLocale = (locale === "en" ? "en" : "fr") as "fr" | "en";
    const consultationDate = sheet.consultation?.createdAt ?? sheet.createdAt;

    const pdfBytes = await generateAdviceSheetPdf({
      practitionerName: user.name,
      cabinetName:      user.cabinetName ?? null,
      patientFirstName: sheet.patient.firstName,
      patientLastName:  sheet.patient.lastName,
      patientBirthDate: sheet.patient.birthDate,
      consultationDate,
      sheetTitle:       sheet.title,
      versionMajor:     sheet.versionMajor,
      versionMinor:     sheet.versionMinor,
      signedAt:         sheet.signedAt,
      aiDraftGenerated: sheet.aiDraftGenerated,
      consultationSummary: sheet.consultationSummary,
      objectives:          sheet.objectives,
      dietaryAdvice:       sheet.dietaryAdvice,
      supplements:         sheet.supplements,
      phytotherapy:        sheet.phytotherapy,
      aromatherapy:        sheet.aromatherapy,
      micronutrition:      sheet.micronutrition,
      gemmotherapy:        sheet.gemmotherapy,
      bachFlowers:         sheet.bachFlowers,
      lifestyle:           sheet.lifestyle,
      physicalActivity:    sheet.physicalActivity,
      additionalNotes:     sheet.additionalNotes,
      precautions:         sheet.precautions,
      locale: pdfLocale,
    });

    const safeName = sheet.patient.lastName.replace(/[^a-zA-Z0-9\-]/g, "_");
    const filename = `fiche-conseil-${safeName}-V${sheet.versionMajor}.${sheet.versionMinor}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control":       "private, no-cache",
      },
    });
  } catch (err) {
    console.error("[pdf/advice-sheet] Error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
