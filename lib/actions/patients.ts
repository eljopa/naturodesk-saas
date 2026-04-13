"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatientErrorCode =
  | "invalid_input"
  | "not_found"
  | "unauthorized"
  | "generic_error";

export type PatientFormState = {
  errorCode?: PatientErrorCode;
} | null;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const PatientSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  birthDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  phone: z
    .string()
    .max(50)
    .trim()
    .optional()
    .transform((v) => v || null),
  email: z
    .union([z.string().email(), z.literal("")])
    .optional()
    .transform((v) => v || null),
  address: z
    .string()
    .max(500)
    .trim()
    .optional()
    .transform((v) => v || null),
  profession: z
    .string()
    .max(200)
    .trim()
    .optional()
    .transform((v) => v || null),
  notes: z
    .string()
    .max(5000)
    .trim()
    .optional()
    .transform((v) => v || null),
  medicalHistory: z
    .string()
    .max(10000)
    .trim()
    .optional()
    .transform((v) => v || null),
  allergies: z
    .string()
    .max(2000)
    .trim()
    .optional()
    .transform((v) => v || null),
});

function extractPatientData(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    profession: formData.get("profession") || undefined,
    notes: formData.get("notes") || undefined,
    medicalHistory: formData.get("medicalHistory") || undefined,
    allergies: formData.get("allergies") || undefined,
  };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createPatientAction(
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const user = await requireUser();

  const parsed = PatientSchema.safeParse(extractPatientData(formData));
  if (!parsed.success) return { errorCode: "invalid_input" };

  let patient;
  try {
    patient = await db.patient.create({
      data: {
        userId: user.id,
        ...parsed.data,
      },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  redirect(`/patients/${patient.id}`);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updatePatientAction(
  patientId: string,
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const user = await requireUser();

  const existing = await db.patient.findUnique({ where: { id: patientId } });
  if (!existing) return { errorCode: "not_found" };
  if (existing.userId !== user.id) return { errorCode: "unauthorized" };

  const parsed = PatientSchema.safeParse(extractPatientData(formData));
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.patient.update({
      where: { id: patientId },
      data: parsed.data,
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  redirect(`/patients/${patientId}`);
}

// ---------------------------------------------------------------------------
// Archive / Unarchive
// ---------------------------------------------------------------------------

export async function archivePatientAction(patientId: string): Promise<void> {
  const user = await requireUser();

  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.userId !== user.id) return;

  await db.patient.update({
    where: { id: patientId },
    data: { isArchived: true },
  });

  redirect("/patients");
}

export async function unarchivePatientAction(patientId: string): Promise<void> {
  const user = await requireUser();

  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.userId !== user.id) return;

  await db.patient.update({
    where: { id: patientId },
    data: { isArchived: false },
  });

  redirect(`/patients/${patientId}`);
}
