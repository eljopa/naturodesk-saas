import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/pdf/invoice";
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

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        user: { select: { name: true, cabinetName: true } },
        lines: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!invoice || invoice.userId !== user.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const pdfBytes = await generateInvoicePdf({
      invoiceNumber: invoice.number,
      issuedAt: invoice.issuedAt,
      practitionerName: invoice.user.name,
      cabinetName: invoice.user.cabinetName,
      patientFirstName: invoice.patient.firstName,
      patientLastName: invoice.patient.lastName,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod,
      totalAmount: invoice.totalAmount,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.total,
      })),
      locale: (locale === "en" ? "en" : "fr") as "fr" | "en",
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("[pdf/invoice] Error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
