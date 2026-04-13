"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FollowUpErrorCode =
  | "invalid_input"
  | "patient_not_found"
  | "not_found"
  | "unauthorized"
  | "generic_error";

export type FollowUpFormState = { errorCode?: FollowUpErrorCode } | null;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const FollowUpSchema = z
  .object({
    appointmentId: z
      .string()
      .uuid()
      .optional()
      .nullable()
      .transform((v) => v || null),
    symptomEvolution: z
      .string()
      .max(3000)
      .trim()
      .optional()
      .transform((v) => v || null),
    protocolAdjustment: z
      .string()
      .max(3000)
      .trim()
      .optional()
      .transform((v) => v || null),
    observations: z
      .string()
      .max(3000)
      .trim()
      .optional()
      .transform((v) => v || null),
    nextSteps: z
      .string()
      .max(3000)
      .trim()
      .optional()
      .transform((v) => v || null),
  })
  .refine(
    (d) =>
      d.symptomEvolution ||
      d.protocolAdjustment ||
      d.observations ||
      d.nextSteps,
    { message: "At least one field required" }
  );

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createFollowUpAction(
  patientId: string,
  _prevState: FollowUpFormState,
  formData: FormData
): Promise<FollowUpFormState> {
  const user = await requireUser();

  const patient = await db.patient.findUnique({
    where: { id: patientId },
    select: { userId: true },
  });
  if (!patient || patient.userId !== user.id) {
    return { errorCode: "patient_not_found" };
  }

  const parsed = FollowUpSchema.safeParse({
    appointmentId: formData.get("appointmentId") || null,
    symptomEvolution: formData.get("symptomEvolution") || undefined,
    protocolAdjustment: formData.get("protocolAdjustment") || undefined,
    observations: formData.get("observations") || undefined,
    nextSteps: formData.get("nextSteps") || undefined,
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

  await db.followUp.create({
    data: {
      patientId,
      ...parsed.data,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?tab=followups`);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateFollowUpAction(
  followUpId: string,
  patientId: string,
  _prevState: FollowUpFormState,
  formData: FormData
): Promise<FollowUpFormState> {
  const user = await requireUser();

  const followUp = await db.followUp.findUnique({
    where: { id: followUpId },
    include: { patient: { select: { userId: true } } },
  });
  if (!followUp || followUp.patient.userId !== user.id) {
    return { errorCode: "not_found" };
  }

  const parsed = FollowUpSchema.safeParse({
    appointmentId: formData.get("appointmentId") || null,
    symptomEvolution: formData.get("symptomEvolution") || undefined,
    protocolAdjustment: formData.get("protocolAdjustment") || undefined,
    observations: formData.get("observations") || undefined,
    nextSteps: formData.get("nextSteps") || undefined,
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

  await db.followUp.update({
    where: { id: followUpId },
    data: parsed.data,
  });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?tab=followups`);
}

// ---------------------------------------------------------------------------
// Delete  (form action via .bind — must return void)
// ---------------------------------------------------------------------------

export async function deleteFollowUpAction(
  followUpId: string,
  patientId: string
): Promise<void> {
  const user = await requireUser();

  const followUp = await db.followUp.findUnique({
    where: { id: followUpId },
    include: { patient: { select: { userId: true } } },
  });
  if (!followUp || followUp.patient.userId !== user.id) return;

  await db.followUp.delete({ where: { id: followUpId } });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?tab=followups`);
}
