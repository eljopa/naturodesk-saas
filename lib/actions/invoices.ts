"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvoiceEmail } from "@/lib/email";
import type { InvoiceStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvoiceErrorCode =
  | "invalid_input"
  | "patient_not_found"
  | "not_found"
  | "unauthorized"
  | "cannot_delete_non_draft"
  | "generic_error";

export type InvoiceFormState = { errorCode?: InvoiceErrorCode } | null;

// ---------------------------------------------------------------------------
// Invoice number generation  (FAC-YYYY-XXXX, sequential per user per year)
// ---------------------------------------------------------------------------

async function generateInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;

  const last = await db.invoice.findFirst({
    where: { userId, number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const seq = last
    ? parseInt(last.number.replace(prefix, ""), 10) + 1
    : 1;

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Validation schemas (inline, derived from existing validator)
// ---------------------------------------------------------------------------

const LineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

const CreateSchema = z.object({
  patientId: z.string().uuid(),
  lines: z.array(LineSchema).min(1),
  paymentMethod: z
    .enum(["CASH", "CARD", "TRANSFER", "CHECK"])
    .nullable()
    .optional(),
  issuedAt: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createInvoiceAction(
  _prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const user = await requireUser();

  // Lines are encoded as JSON in a hidden field
  let lines: unknown;
  try {
    const raw = formData.get("linesJson");
    lines = JSON.parse(typeof raw === "string" ? raw : "[]");
  } catch {
    return { errorCode: "invalid_input" };
  }

  const rawIssuedAt = formData.get("issuedAt");
  const rawPaymentMethod = formData.get("paymentMethod");

  const parsed = CreateSchema.safeParse({
    patientId: formData.get("patientId"),
    lines,
    paymentMethod: rawPaymentMethod || null,
    issuedAt: rawIssuedAt || null,
  });

  if (!parsed.success) return { errorCode: "invalid_input" };
  const data = parsed.data;

  const patient = await db.patient.findUnique({
    where: { id: data.patientId },
    select: { userId: true },
  });
  if (!patient || patient.userId !== user.id) {
    return { errorCode: "patient_not_found" };
  }

  const totalAmount = data.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice,
    0
  );

  const number = await generateInvoiceNumber(user.id);

  const invoice = await db.invoice.create({
    data: {
      userId: user.id,
      patientId: data.patientId,
      number,
      status: "DRAFT",
      totalAmount,
      paymentMethod: data.paymentMethod ?? null,
      issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
      lines: {
        create: data.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.quantity * l.unitPrice,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/invoices");
  revalidatePath(`/patients/${data.patientId}`);
  redirect(`/invoices/${invoice.id}`);
}

// ---------------------------------------------------------------------------
// Update status  (used as <form action> via .bind — must return void)
// ---------------------------------------------------------------------------

export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: InvoiceStatus
): Promise<void> {
  const user = await requireUser();

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      patient: {
        select: { firstName: true, lastName: true, email: true },
      },
      lines: {
        select: { description: true, quantity: true, unitPrice: true, total: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!invoice || invoice.userId !== user.id) return;

  const issuedAt = status === "ISSUED" && !invoice.issuedAt ? new Date() : invoice.issuedAt;

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      ...(status === "ISSUED" && !invoice.issuedAt ? { issuedAt } : {}),
    },
  });

  // Send invoice email when emitting
  if (status === "ISSUED" && invoice.patient.email) {
    const locale = (await getLocale()) as "fr" | "en";
    const fmt = (n: number) =>
      new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
        style: "currency",
        currency: "EUR",
      }).format(n);

    sendInvoiceEmail({
      patientEmail: invoice.patient.email,
      patientFirstName: invoice.patient.firstName,
      practitionerName: user.name,
      cabinetName: user.cabinetName,
      invoiceNumber: invoice.number,
      invoiceDate: (issuedAt ?? new Date()).toLocaleDateString(
        locale === "fr" ? "fr-FR" : "en-GB",
        { day: "numeric", month: "long", year: "numeric" }
      ),
      invoiceTotal: fmt(invoice.totalAmount),
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: fmt(l.unitPrice),
        total: fmt(l.total),
      })),
      locale,
    }).catch((e) => console.error("[email] Invoice email failed:", e));
  }

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath(`/patients/${invoice.patientId}`);
}

// ---------------------------------------------------------------------------
// Delete (DRAFT only — used as <form action> via .bind — must return void)
// ---------------------------------------------------------------------------

export async function deleteInvoiceAction(invoiceId: string): Promise<void> {
  const user = await requireUser();

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { userId: true, status: true, patientId: true },
  });
  if (!invoice || invoice.userId !== user.id) return;
  if (invoice.status !== "DRAFT") return;

  const patientId = invoice.patientId;

  await db.invoiceLine.deleteMany({ where: { invoiceId } });
  await db.invoice.delete({ where: { id: invoiceId } });

  revalidatePath("/invoices");
  revalidatePath(`/patients/${patientId}`);
  redirect("/invoices");
}
