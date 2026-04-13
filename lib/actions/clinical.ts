"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type ClinicalErrorCode =
  | "invalid_input"
  | "unauthorized"
  | "not_found"
  | "generic_error";

export type ClinicalFormState = {
  errorCode?: ClinicalErrorCode;
} | null;

// ---------------------------------------------------------------------------
// Security: ensure consultation belongs to the authenticated user
// ---------------------------------------------------------------------------

async function assertOwnsConsultation(
  consultationId: string,
  userId: string
): Promise<boolean> {
  const c = await db.consultation.findFirst({
    where: { id: consultationId, patient: { userId } },
  });
  return c !== null;
}

// ---------------------------------------------------------------------------
// SYMPTOMS
// ---------------------------------------------------------------------------

const SymptomSchema = z.object({
  label: z.string().min(1).max(500).trim(),
  intensity: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .nullable()
    .catch(null),
  duration: z
    .string()
    .max(200)
    .trim()
    .optional()
    .transform((v) => v || null),
  category: z
    .string()
    .max(100)
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function addSymptomAction(
  consultationId: string,
  _prevState: ClinicalFormState,
  formData: FormData
): Promise<ClinicalFormState> {
  const user = await requireUser();
  if (!(await assertOwnsConsultation(consultationId, user.id)))
    return { errorCode: "unauthorized" };

  const parsed = SymptomSchema.safeParse({
    label: formData.get("label"),
    intensity: formData.get("intensity") || undefined,
    duration: formData.get("duration") || undefined,
    category: formData.get("category") || undefined,
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.symptom.create({ data: { consultationId, ...parsed.data } });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath(`/consultations/${consultationId}`);
  return null;
}

export async function deleteSymptomAction(
  consultationId: string,
  _prevState: null,
  formData: FormData
): Promise<null> {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) return null;

  const item = await db.symptom.findFirst({
    where: {
      id,
      consultation: { id: consultationId, patient: { userId: user.id } },
    },
  });
  if (!item) return null;

  await db.symptom.delete({ where: { id } });
  revalidatePath(`/consultations/${consultationId}`);
  return null;
}

// ---------------------------------------------------------------------------
// MEDICATIONS
// ---------------------------------------------------------------------------

const MedicationSchema = z.object({
  name: z.string().min(1).max(500).trim(),
  dosage: z
    .string()
    .max(200)
    .trim()
    .optional()
    .transform((v) => v || null),
  frequency: z
    .string()
    .max(200)
    .trim()
    .optional()
    .transform((v) => v || null),
  duration: z
    .string()
    .max(200)
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function addMedicationAction(
  consultationId: string,
  _prevState: ClinicalFormState,
  formData: FormData
): Promise<ClinicalFormState> {
  const user = await requireUser();
  if (!(await assertOwnsConsultation(consultationId, user.id)))
    return { errorCode: "unauthorized" };

  const parsed = MedicationSchema.safeParse({
    name: formData.get("name"),
    dosage: formData.get("dosage") || undefined,
    frequency: formData.get("frequency") || undefined,
    duration: formData.get("duration") || undefined,
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.medication.create({ data: { consultationId, ...parsed.data } });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath(`/consultations/${consultationId}`);
  return null;
}

export async function deleteMedicationAction(
  consultationId: string,
  _prevState: null,
  formData: FormData
): Promise<null> {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) return null;

  const item = await db.medication.findFirst({
    where: {
      id,
      consultation: { id: consultationId, patient: { userId: user.id } },
    },
  });
  if (!item) return null;

  await db.medication.delete({ where: { id } });
  revalidatePath(`/consultations/${consultationId}`);
  return null;
}

// ---------------------------------------------------------------------------
// SUPPLEMENTS
// ---------------------------------------------------------------------------

const SupplementSchema = z.object({
  name: z.string().min(1).max(500).trim(),
  dosage: z
    .string()
    .max(200)
    .trim()
    .optional()
    .transform((v) => v || null),
  duration: z
    .string()
    .max(200)
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function addSupplementAction(
  consultationId: string,
  _prevState: ClinicalFormState,
  formData: FormData
): Promise<ClinicalFormState> {
  const user = await requireUser();
  if (!(await assertOwnsConsultation(consultationId, user.id)))
    return { errorCode: "unauthorized" };

  const parsed = SupplementSchema.safeParse({
    name: formData.get("name"),
    dosage: formData.get("dosage") || undefined,
    duration: formData.get("duration") || undefined,
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.supplement.create({ data: { consultationId, ...parsed.data } });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath(`/consultations/${consultationId}`);
  return null;
}

export async function deleteSupplementAction(
  consultationId: string,
  _prevState: null,
  formData: FormData
): Promise<null> {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) return null;

  const item = await db.supplement.findFirst({
    where: {
      id,
      consultation: { id: consultationId, patient: { userId: user.id } },
    },
  });
  if (!item) return null;

  await db.supplement.delete({ where: { id } });
  revalidatePath(`/consultations/${consultationId}`);
  return null;
}

// ---------------------------------------------------------------------------
// FINDINGS (manual practitioner observations)
// ---------------------------------------------------------------------------

const FINDING_CATEGORIES = [
  "SIDE_EFFECT",
  "INTERACTION",
  "DEPLETION",
  "RED_FLAG",
  "TERRAIN",
  "PROTOCOL",
  "QUESTION",
] as const;

const FindingSchema = z.object({
  category: z.enum(FINDING_CATEGORIES),
  title: z.string().min(1).max(500).trim(),
  description: z.string().min(1).max(5000).trim(),
});

export async function addFindingAction(
  consultationId: string,
  _prevState: ClinicalFormState,
  formData: FormData
): Promise<ClinicalFormState> {
  const user = await requireUser();
  if (!(await assertOwnsConsultation(consultationId, user.id)))
    return { errorCode: "unauthorized" };

  const parsed = FindingSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.finding.create({
      data: {
        consultationId,
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        confidence: 1.0,
        sourceType: "MANUAL",
        validated: true,
      },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath(`/consultations/${consultationId}`);
  return null;
}

export async function deleteFindingAction(
  consultationId: string,
  _prevState: null,
  formData: FormData
): Promise<null> {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) return null;

  const item = await db.finding.findFirst({
    where: {
      id,
      consultationId,
      sourceType: "MANUAL", // only manual findings can be deleted by practitioner
      consultation: { patient: { userId: user.id } },
    },
  });
  if (!item) return null;

  await db.finding.delete({ where: { id } });
  revalidatePath(`/consultations/${consultationId}`);
  return null;
}
