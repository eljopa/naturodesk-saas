/**
 * Création d'un AnalysisRun pour une analyse knowledge.
 *
 * Chaque appel au moteur knowledge crée un nouveau run (snapshot historique).
 * Le run est créé en état RUNNING dès le début et mis à jour à la fin.
 *
 * idempotencyKey format : "knowledge:{consultationId}:{timestamp}"
 * Garantit l'unicité de chaque run (@unique en base).
 *
 * Le champ `stage` est utilisé pour identifier le type de run :
 *   "KNOWLEDGE" — distingue des runs LLM classiques
 */

import { db } from "@/lib/db";
import type { AnalysisRun, AnalysisStatus } from "@prisma/client";

/**
 * Crée un nouvel AnalysisRun en état RUNNING pour une analyse knowledge.
 */
export async function createKnowledgeAnalysisRun(
  consultationId: string
): Promise<AnalysisRun> {
  const idempotencyKey = `knowledge:${consultationId}:${Date.now()}`;

  const run = await db.analysisRun.create({
    data: {
      consultationId,
      idempotencyKey,
      status:    "RUNNING",
      stage:     "KNOWLEDGE",
      startedAt: new Date(),
    },
  });

  console.log(`[persistence] AnalysisRun créé : ${run.id} (consultation=${consultationId})`);
  return run;
}

/**
 * Finalise un AnalysisRun après persistance des findings.
 */
export async function finalizeAnalysisRun(
  runId:  string,
  status: AnalysisStatus,
  errorMessage?: string
): Promise<void> {
  await db.analysisRun.update({
    where: { id: runId },
    data:  {
      status,
      finishedAt:   new Date(),
      errorMessage: errorMessage?.slice(0, 500) ?? null,
    },
  });
}
