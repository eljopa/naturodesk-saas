"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateAdviceSheetSchema, UpdateAdviceSheetSchema } from "@/lib/validators/advice-sheet";
import { generateAdviceSheetDraft } from "@/lib/advice-sheets/ai-draft";
import type { AdviceSheetDraft } from "@/lib/advice-sheets/ai-draft";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdviceSheetErrorCode =
  | "invalid_input"
  | "patient_not_found"
  | "not_found"
  | "unauthorized"
  | "generic_error";

export type AdviceSheetFormState = { errorCode?: AdviceSheetErrorCode } | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function revalidateRelated(userId: string, patientId: string, consultationId?: string | null) {
  revalidatePath("/advice-sheets");
  revalidatePath(`/patients/${patientId}`);
  if (consultationId) revalidatePath(`/consultations/${consultationId}`);
}

function parseFormSections(formData: FormData) {
  const get = (key: string) => (formData.get(key) as string | null) ?? undefined;
  return {
    title:               get("title"),
    consultationSummary: get("consultationSummary"),
    objectives:          get("objectives"),
    dietaryAdvice:       get("dietaryAdvice"),
    supplements:         get("supplements"),
    phytotherapy:        get("phytotherapy"),
    aromatherapy:        get("aromatherapy"),
    micronutrition:      get("micronutrition"),
    gemmotherapy:        get("gemmotherapy"),
    bachFlowers:         get("bachFlowers"),
    lifestyle:           get("lifestyle"),
    physicalActivity:    get("physicalActivity"),
    additionalNotes:     get("additionalNotes"),
    precautions:         get("precautions"),
  };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createAdviceSheetAction(
  _prevState: AdviceSheetFormState,
  formData: FormData
): Promise<AdviceSheetFormState> {
  const user = await requireUser();

  const parsed = CreateAdviceSheetSchema.safeParse({
    patientId:      formData.get("patientId"),
    consultationId: formData.get("consultationId") || null,
    parentId:       formData.get("parentId") || null,
    versionMajor:   formData.get("versionMajor") || 1,
    versionMinor:   formData.get("versionMinor") || 0,
    ...parseFormSections(formData),
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

  const patient = await db.patient.findUnique({
    where: { id: parsed.data.patientId },
    select: { userId: true },
  });
  if (!patient || patient.userId !== user.id) return { errorCode: "patient_not_found" };

  let sheet;
  try {
    sheet = await db.adviceSheet.create({
      data: {
        userId:    user.id,
        patientId: parsed.data.patientId,
        ...(parsed.data.consultationId ? { consultationId: parsed.data.consultationId } : {}),
        ...(parsed.data.parentId       ? { parentId:       parsed.data.parentId }       : {}),
        versionMajor: parsed.data.versionMajor,
        versionMinor: parsed.data.versionMinor,
        status: "DRAFT",
        title:               parsed.data.title,
        consultationSummary: parsed.data.consultationSummary,
        objectives:          parsed.data.objectives,
        dietaryAdvice:       parsed.data.dietaryAdvice,
        supplements:         parsed.data.supplements,
        phytotherapy:        parsed.data.phytotherapy,
        aromatherapy:        parsed.data.aromatherapy,
        micronutrition:      parsed.data.micronutrition,
        gemmotherapy:        parsed.data.gemmotherapy,
        bachFlowers:         parsed.data.bachFlowers,
        lifestyle:           parsed.data.lifestyle,
        physicalActivity:    parsed.data.physicalActivity,
        additionalNotes:     parsed.data.additionalNotes,
        precautions:         parsed.data.precautions,
      },
      select: { id: true, patientId: true, consultationId: true },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidateRelated(user.id, sheet.patientId, sheet.consultationId);
  redirect(`/advice-sheets/${sheet.id}`);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateAdviceSheetAction(
  adviceSheetId: string,
  _prevState: AdviceSheetFormState,
  formData: FormData
): Promise<AdviceSheetFormState> {
  const user = await requireUser();

  const sheet = await db.adviceSheet.findUnique({
    where: { id: adviceSheetId },
    select: { userId: true, patientId: true, consultationId: true },
  });
  if (!sheet || sheet.userId !== user.id) return { errorCode: "unauthorized" };

  const parsed = UpdateAdviceSheetSchema.safeParse(parseFormSections(formData));
  if (!parsed.success) return { errorCode: "invalid_input" };

  try {
    await db.adviceSheet.update({
      where: { id: adviceSheetId },
      data: parsed.data,
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath(`/advice-sheets/${adviceSheetId}`);
  revalidateRelated(user.id, sheet.patientId, sheet.consultationId);
  return null;
}

// ---------------------------------------------------------------------------
// Finalize (DRAFT → FINAL) — signedAt renseigné automatiquement
// ---------------------------------------------------------------------------

export async function finalizeAdviceSheetAction(adviceSheetId: string): Promise<void> {
  const user = await requireUser();

  const sheet = await db.adviceSheet.findUnique({
    where: { id: adviceSheetId },
    select: { userId: true, patientId: true, consultationId: true, status: true },
  });
  if (!sheet || sheet.userId !== user.id) return;
  if (sheet.status === "FINAL") return;

  await db.adviceSheet.update({
    where: { id: adviceSheetId },
    data: { status: "FINAL", signedAt: new Date() },
  });

  revalidatePath(`/advice-sheets/${adviceSheetId}`);
  revalidateRelated(user.id, sheet.patientId, sheet.consultationId);
}

// ---------------------------------------------------------------------------
// Revert to draft
// ---------------------------------------------------------------------------

export async function revertToDraftAction(adviceSheetId: string): Promise<void> {
  const user = await requireUser();

  const sheet = await db.adviceSheet.findUnique({
    where: { id: adviceSheetId },
    select: { userId: true, patientId: true, consultationId: true },
  });
  if (!sheet || sheet.userId !== user.id) return;

  await db.adviceSheet.update({
    where: { id: adviceSheetId },
    data: { status: "DRAFT", signedAt: null },
  });

  revalidatePath(`/advice-sheets/${adviceSheetId}`);
  revalidateRelated(user.id, sheet.patientId, sheet.consultationId);
}

// ---------------------------------------------------------------------------
// New minor version  (V1.0 → V1.1)
// ---------------------------------------------------------------------------

export async function newMinorVersionAction(adviceSheetId: string): Promise<void> {
  const user = await requireUser();

  const source = await db.adviceSheet.findUnique({
    where: { id: adviceSheetId },
    select: {
      userId: true, patientId: true, consultationId: true,
      parentId: true, versionMajor: true, versionMinor: true,
      title: true, consultationSummary: true,
      objectives: true, dietaryAdvice: true, supplements: true,
      phytotherapy: true, aromatherapy: true, micronutrition: true,
      gemmotherapy: true, bachFlowers: true, lifestyle: true,
      physicalActivity: true, additionalNotes: true, precautions: true,
    },
  });
  if (!source || source.userId !== user.id) return;

  // La racine de la famille est parentId si défini, sinon la fiche courante
  const rootId = source.parentId ?? adviceSheetId;

  // Calculer le versionMinor max dans cette famille pour ce major
  const siblings = await db.adviceSheet.findMany({
    where: {
      OR: [{ id: rootId }, { parentId: rootId }],
      versionMajor: source.versionMajor,
    },
    select: { versionMinor: true },
  });
  const nextMinor = Math.max(...siblings.map((s) => s.versionMinor)) + 1;

  const newSheet = await db.adviceSheet.create({
    data: {
      userId:    user.id,
      patientId: source.patientId,
      ...(source.consultationId ? { consultationId: source.consultationId } : {}),
      parentId:     rootId,
      versionMajor: source.versionMajor,
      versionMinor: nextMinor,
      status: "DRAFT",
      title:               source.title,
      consultationSummary: source.consultationSummary,
      objectives:          source.objectives,
      dietaryAdvice:       source.dietaryAdvice,
      supplements:         source.supplements,
      phytotherapy:        source.phytotherapy,
      aromatherapy:        source.aromatherapy,
      micronutrition:      source.micronutrition,
      gemmotherapy:        source.gemmotherapy,
      bachFlowers:         source.bachFlowers,
      lifestyle:           source.lifestyle,
      physicalActivity:    source.physicalActivity,
      additionalNotes:     source.additionalNotes,
      precautions:         source.precautions,
    },
    select: { id: true },
  });

  revalidateRelated(user.id, source.patientId, source.consultationId);
  redirect(`/advice-sheets/${newSheet.id}/edit`);
}

// ---------------------------------------------------------------------------
// New major version  (V1.x → V2.0)
// ---------------------------------------------------------------------------

export async function newMajorVersionAction(adviceSheetId: string): Promise<void> {
  const user = await requireUser();

  const source = await db.adviceSheet.findUnique({
    where: { id: adviceSheetId },
    select: {
      userId: true, patientId: true, consultationId: true,
      parentId: true, versionMajor: true,
      title: true, consultationSummary: true,
      objectives: true, dietaryAdvice: true, supplements: true,
      phytotherapy: true, aromatherapy: true, micronutrition: true,
      gemmotherapy: true, bachFlowers: true, lifestyle: true,
      physicalActivity: true, additionalNotes: true, precautions: true,
    },
  });
  if (!source || source.userId !== user.id) return;

  const rootId = source.parentId ?? adviceSheetId;

  // Calculer le versionMajor max dans cette famille
  const siblings = await db.adviceSheet.findMany({
    where: { OR: [{ id: rootId }, { parentId: rootId }] },
    select: { versionMajor: true },
  });
  const nextMajor = Math.max(...siblings.map((s) => s.versionMajor)) + 1;

  const newSheet = await db.adviceSheet.create({
    data: {
      userId:    user.id,
      patientId: source.patientId,
      ...(source.consultationId ? { consultationId: source.consultationId } : {}),
      parentId:     rootId,
      versionMajor: nextMajor,
      versionMinor: 0,
      status: "DRAFT",
      title:               source.title,
      consultationSummary: source.consultationSummary,
      objectives:          source.objectives,
      dietaryAdvice:       source.dietaryAdvice,
      supplements:         source.supplements,
      phytotherapy:        source.phytotherapy,
      aromatherapy:        source.aromatherapy,
      micronutrition:      source.micronutrition,
      gemmotherapy:        source.gemmotherapy,
      bachFlowers:         source.bachFlowers,
      lifestyle:           source.lifestyle,
      physicalActivity:    source.physicalActivity,
      additionalNotes:     source.additionalNotes,
      precautions:         source.precautions,
    },
    select: { id: true },
  });

  revalidateRelated(user.id, source.patientId, source.consultationId);
  redirect(`/advice-sheets/${newSheet.id}/edit`);
}

// ---------------------------------------------------------------------------
// Duplicate (nouvelle famille indépendante)
// ---------------------------------------------------------------------------

export async function duplicateAdviceSheetAction(adviceSheetId: string): Promise<void> {
  const user = await requireUser();

  const source = await db.adviceSheet.findUnique({
    where: { id: adviceSheetId },
    select: {
      userId: true, patientId: true,
      title: true, consultationSummary: true,
      objectives: true, dietaryAdvice: true, supplements: true,
      phytotherapy: true, aromatherapy: true, micronutrition: true,
      gemmotherapy: true, bachFlowers: true, lifestyle: true,
      physicalActivity: true, additionalNotes: true, precautions: true,
    },
  });
  if (!source || source.userId !== user.id) return;

  const newSheet = await db.adviceSheet.create({
    data: {
      userId:    user.id,
      patientId: source.patientId,
      // parentId null → nouvelle famille V1.0
      versionMajor: 1,
      versionMinor: 0,
      status: "DRAFT",
      title:               source.title ? `${source.title} (copie)` : null,
      consultationSummary: source.consultationSummary,
      objectives:          source.objectives,
      dietaryAdvice:       source.dietaryAdvice,
      supplements:         source.supplements,
      phytotherapy:        source.phytotherapy,
      aromatherapy:        source.aromatherapy,
      micronutrition:      source.micronutrition,
      gemmotherapy:        source.gemmotherapy,
      bachFlowers:         source.bachFlowers,
      lifestyle:           source.lifestyle,
      physicalActivity:    source.physicalActivity,
      additionalNotes:     source.additionalNotes,
      precautions:         source.precautions,
    },
    select: { id: true },
  });

  revalidatePath("/advice-sheets");
  redirect(`/advice-sheets/${newSheet.id}/edit`);
}

// ---------------------------------------------------------------------------
// Generate AI draft
// ---------------------------------------------------------------------------

export async function generateAdviceSheetDraftAction(
  consultationId: string
): Promise<AdviceSheetDraft | { error: string }> {
  const user = await requireUser();

  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
    include: {
      patient:     { select: { userId: true, firstName: true, lastName: true, birthDate: true, allergies: true, medicalHistory: true } },
      symptoms:    { select: { label: true, intensity: true }, orderBy: { createdAt: "asc" } },
      medications: { select: { name: true, dosage: true }, orderBy: { createdAt: "asc" } },
      supplements: { select: { name: true, dosage: true }, orderBy: { createdAt: "asc" } },
      findings:    { where: { validated: true }, select: { category: true, title: true, description: true } },
      clinicalAnalyses: {
        where:   { status: "DONE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          items: {
            where:   { explanation: { not: null } },
            select:  { explanation: true },
            orderBy: { confidenceScore: "desc" },
            take: 8,
          },
        },
      },
    },
  });

  if (!consultation || consultation.patient.userId !== user.id) {
    return { error: "not_found" };
  }

  const age = consultation.patient.birthDate
    ? Math.floor((Date.now() - consultation.patient.birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const clinicalExplanations = (consultation.clinicalAnalyses[0]?.items ?? [])
    .map((i) => i.explanation)
    .filter((e): e is string => e !== null);

  try {
    return await generateAdviceSheetDraft({
      patientFirstName:  consultation.patient.firstName,
      patientLastName:   consultation.patient.lastName,
      patientAge:        age,
      patientAllergies:  consultation.patient.allergies,
      patientHistory:    consultation.patient.medicalHistory,
      consultationDate:  consultation.createdAt,
      context:           consultation.context,
      terrainSummary:    consultation.terrainSummary,
      symptoms:          consultation.symptoms,
      medications:       consultation.medications,
      supplements:       consultation.supplements,
      validatedFindings: consultation.findings.map((f) => ({
        category:    f.category,
        title:       f.title,
        description: f.description,
      })),
      clinicalExplanations,
    });
  } catch (err) {
    console.error("[advice-sheet/ai-draft] Error:", err);
    return { error: "generation_failed" };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteAdviceSheetAction(adviceSheetId: string): Promise<void> {
  const user = await requireUser();

  const sheet = await db.adviceSheet.findUnique({
    where: { id: adviceSheetId },
    select: { userId: true, patientId: true, consultationId: true },
  });
  if (!sheet || sheet.userId !== user.id) return;

  await db.adviceSheet.delete({ where: { id: adviceSheetId } });

  revalidateRelated(user.id, sheet.patientId, sheet.consultationId);
  redirect("/advice-sheets");
}
