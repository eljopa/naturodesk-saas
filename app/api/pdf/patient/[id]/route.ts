import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePatientPdf } from "@/lib/pdf/patient";
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

    const patient = await db.patient.findUnique({
      where: { id },
    });

    if (!patient || patient.userId !== user.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const pdfLocale = (locale === "en" ? "en" : "fr") as "fr" | "en";

    const pdfBytes = await generatePatientPdf({
      practitionerName: user.name,
      cabinetName: user.cabinetName ?? null,
      firstName: patient.firstName,
      lastName: patient.lastName,
      birthDate: patient.birthDate,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      profession: patient.profession,
      allergies: patient.allergies,
      medicalHistory: patient.medicalHistory,
      notes: patient.notes,
      locale: pdfLocale,
    });

    const filename = `patient-${patient.lastName.toLowerCase().replace(/\s+/g, "-")}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("[pdf/patient] Error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
