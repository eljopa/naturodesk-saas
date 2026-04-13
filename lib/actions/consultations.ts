"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsultationErrorCode =
  | "invalid_input"
  | "patient_not_found"
  | "appointment_not_found"
  | "already_has_consultation"
  | "not_found"
  | "unauthorized"
  | "generic_error";

export type ConsultationFormState = {
  errorCode?: ConsultationErrorCode;
} | null;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const CreateConsultationSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z
    .string()
    .optional()
    .transform((v) => v || null),
  context: z
    .string()
    .max(5000)
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function createConsultationAction(
  _prevState: ConsultationFormState,
  formData: FormData
): Promise<ConsultationFormState> {
  const user = await requireUser();

  const parsed = CreateConsultationSchema.safeParse({
    patientId: formData.get("patientId"),
    appointmentId: formData.get("appointmentId") || undefined,
    context: formData.get("context") || undefined,
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

  // Verify patient belongs to user
  const patient = await db.patient.findUnique({
    where: { id: parsed.data.patientId },
  });
  if (!patient || patient.userId !== user.id)
    return { errorCode: "patient_not_found" };

  // Verify appointment if provided
  if (parsed.data.appointmentId) {
    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
    });
    if (!appointment || appointment.userId !== user.id)
      return { errorCode: "appointment_not_found" };

    // Idempotency: one consultation per appointment
    const existing = await db.consultation.findUnique({
      where: { appointmentId: parsed.data.appointmentId },
    });
    if (existing) return { errorCode: "already_has_consultation" };
  }

  let consultation;
  try {
    consultation = await db.consultation.create({
      data: {
        patientId: parsed.data.patientId,
        appointmentId: parsed.data.appointmentId,
        context: parsed.data.context,
        status: "DRAFT",
      },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  redirect(`/consultations/${consultation.id}`);
}

// ---------------------------------------------------------------------------
// Update context (inline edit on detail page)
// ---------------------------------------------------------------------------

export async function updateConsultationContextAction(
  consultationId: string,
  _prevState: ConsultationFormState,
  formData: FormData
): Promise<ConsultationFormState> {
  const user = await requireUser();

  const consultation = await db.consultation.findFirst({
    where: { id: consultationId, patient: { userId: user.id } },
  });
  if (!consultation) return { errorCode: "unauthorized" };

  const context =
    (formData.get("context") as string | null)?.trim() || null;

  try {
    await db.consultation.update({
      where: { id: consultationId },
      data: { context },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath(`/consultations/${consultationId}`);
  return null;
}

// ---------------------------------------------------------------------------
// Update status: DRAFT ↔ READY (manual transitions only)
// ---------------------------------------------------------------------------

export async function setConsultationStatusAction(
  consultationId: string,
  status: "DRAFT" | "READY"
): Promise<void> {
  const user = await requireUser();

  const consultation = await db.consultation.findFirst({
    where: { id: consultationId, patient: { userId: user.id } },
  });
  if (!consultation) return;

  // Guard: only allow manual DRAFT ↔ READY
  if (status !== "DRAFT" && status !== "READY") return;

  await db.consultation.update({
    where: { id: consultationId },
    data: { status },
  });

  revalidatePath(`/consultations/${consultationId}`);
}
