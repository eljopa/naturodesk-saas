"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAppointmentConfirmationEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppointmentErrorCode =
  | "invalid_input"
  | "end_before_start"
  | "patient_not_found"
  | "not_found"
  | "unauthorized"
  | "generic_error";

export type AppointmentFormState = {
  errorCode?: AppointmentErrorCode;
} | null;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const AppointmentSchema = z.object({
  patientId: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  type: z.enum(["BILAN", "SUIVI"]),
  notes: z
    .string()
    .max(2000)
    .trim()
    .optional()
    .transform((v) => v || null),
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const user = await requireUser();

  const parsed = AppointmentSchema.safeParse({
    patientId: formData.get("patientId"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    type: formData.get("type"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

  const startAt = new Date(parsed.data.startAt);
  const endAt = new Date(parsed.data.endAt);

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()))
    return { errorCode: "invalid_input" };
  if (endAt <= startAt) return { errorCode: "end_before_start" };

  // Verify patient belongs to user
  const patient = await db.patient.findUnique({
    where: { id: parsed.data.patientId },
  });
  if (!patient || patient.userId !== user.id)
    return { errorCode: "patient_not_found" };

  let appointment;
  try {
    appointment = await db.appointment.create({
      data: {
        userId: user.id,
        patientId: parsed.data.patientId,
        startAt,
        endAt,
        type: parsed.data.type,
        notes: parsed.data.notes,
      },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  // Send confirmation email to patient (fire-and-forget)
  if (patient.email) {
    const locale = (await getLocale()) as "fr" | "en";
    const durationMin = Math.round((endAt.getTime() - startAt.getTime()) / 60000);

    sendAppointmentConfirmationEmail({
      patientEmail: patient.email,
      patientFirstName: patient.firstName,
      practitionerName: user.name,
      cabinetName: user.cabinetName ?? null,
      appointmentDate: startAt.toLocaleDateString(
        locale === "fr" ? "fr-FR" : "en-GB",
        { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      ),
      appointmentTime: startAt.toLocaleTimeString(
        locale === "fr" ? "fr-FR" : "en-GB",
        { hour: "2-digit", minute: "2-digit" }
      ),
      appointmentDuration: durationMin,
      appointmentType: parsed.data.type,
      locale,
    }).catch((e) => console.error("[email] Appointment email failed:", e));
  }

  redirect(`/appointments/${appointment.id}/edit`);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateAppointmentAction(
  appointmentId: string,
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const user = await requireUser();

  const existing = await db.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!existing) return { errorCode: "not_found" };
  if (existing.userId !== user.id) return { errorCode: "unauthorized" };

  const parsed = AppointmentSchema.safeParse({
    patientId: formData.get("patientId"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    type: formData.get("type"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

  const startAt = new Date(parsed.data.startAt);
  const endAt = new Date(parsed.data.endAt);

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()))
    return { errorCode: "invalid_input" };
  if (endAt <= startAt) return { errorCode: "end_before_start" };

  // Verify patient belongs to user
  const patient = await db.patient.findUnique({
    where: { id: parsed.data.patientId },
  });
  if (!patient || patient.userId !== user.id)
    return { errorCode: "patient_not_found" };

  try {
    await db.appointment.update({
      where: { id: appointmentId },
      data: {
        patientId: parsed.data.patientId,
        startAt,
        endAt,
        type: parsed.data.type,
        notes: parsed.data.notes,
      },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  redirect("/appointments");
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

export async function cancelAppointmentAction(
  appointmentId: string
): Promise<void> {
  const user = await requireUser();

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment || appointment.userId !== user.id) return;

  await db.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
  });

  redirect("/appointments");
}
