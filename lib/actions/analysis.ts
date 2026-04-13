"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAnalysis } from "@/lib/analysis/runner";

export async function triggerAnalysisAction(consultationId: string): Promise<void> {
  const user = await requireUser();

  // Load consultation and verify ownership
  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
    include: { patient: { select: { userId: true } } },
  });

  if (!consultation || consultation.patient.userId !== user.id) {
    throw new Error("Consultation introuvable ou accès non autorisé.");
  }

  if (consultation.status !== "READY") {
    throw new Error("La consultation doit être à l'état « Prêt » pour lancer l'analyse.");
  }

  // Create AnalysisRun
  const idempotencyKey = `${consultationId}-${Date.now()}`;
  const run = await db.analysisRun.create({
    data: {
      consultationId,
      idempotencyKey,
      status: "PENDING",
    },
  });

  // Set consultation to ANALYSIS_PENDING immediately
  await db.consultation.update({
    where: { id: consultationId },
    data: { status: "ANALYSIS_PENDING" },
  });

  // Run analysis synchronously (GPT-4o-mini is fast enough for Server Actions)
  await runAnalysis(consultationId, run.id);

  redirect(`/consultations/${consultationId}?tab=findings`);
}

export async function retryAnalysisAction(consultationId: string): Promise<void> {
  const user = await requireUser();

  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
    include: { patient: { select: { userId: true } } },
  });

  if (!consultation || consultation.patient.userId !== user.id) {
    throw new Error("Consultation introuvable ou accès non autorisé.");
  }

  if (consultation.status !== "ANALYSIS_ERROR") {
    throw new Error("Le retry n'est disponible que pour les analyses en erreur.");
  }

  // Reset to READY then re-trigger
  await db.consultation.update({
    where: { id: consultationId },
    data: { status: "READY" },
  });

  const idempotencyKey = `${consultationId}-retry-${Date.now()}`;
  const run = await db.analysisRun.create({
    data: {
      consultationId,
      idempotencyKey,
      status: "PENDING",
    },
  });

  await db.consultation.update({
    where: { id: consultationId },
    data: { status: "ANALYSIS_PENDING" },
  });

  await runAnalysis(consultationId, run.id);

  redirect(`/consultations/${consultationId}?tab=findings`);
}
