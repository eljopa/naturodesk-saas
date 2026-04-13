/**
 * Récupération du dernier AnalysisRun knowledge d'une consultation.
 *
 * Critères de sélection :
 *   - consultationId correspondant
 *   - stage = "KNOWLEDGE"  (distingue des runs LLM)
 *   - status = "DONE"      (seuls les runs terminés avec succès)
 *   - Tri DESC par createdAt → le plus récent
 *
 * Retourne null si aucun run ne correspond (état initial normal).
 */

import { db } from "@/lib/db";
import type { AnalysisRun } from "@prisma/client";

/**
 * Retourne le dernier AnalysisRun knowledge terminé avec succès,
 * ou null si aucun n'existe pour cette consultation.
 */
export async function getLatestKnowledgeRunForConsultation(
  consultationId: string
): Promise<AnalysisRun | null> {
  return db.analysisRun.findFirst({
    where: {
      consultationId,
      stage:  "KNOWLEDGE",
      status: "DONE",
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retourne un AnalysisRun knowledge en cours (RUNNING) pour cette consultation,
 * ou null si aucun run n'est actuellement actif.
 *
 * Utilisé pour l'indicateur de polling UI : si ce run existe, l'UI
 * sait qu'elle doit se rafraîchir automatiquement.
 */
export async function getActiveKnowledgeRun(
  consultationId: string
): Promise<Pick<AnalysisRun, "id" | "createdAt"> | null> {
  return db.analysisRun.findFirst({
    where: {
      consultationId,
      stage:  "KNOWLEDGE",
      status: "RUNNING",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
}
