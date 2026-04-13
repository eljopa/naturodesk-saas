/**
 * Orchestrateur d'import batch.
 *
 * Importe séquentiellement tous les documents du dataset mock.
 * L'import séquentiel (et non concurrent) est intentionnel :
 * - évite de saturer la connexion Prisma
 * - facilite le debugging
 * - prépare un pattern réutilisable pour les imports BDPM réels
 *
 * Usage :
 *   import { importMockKnowledgeBatch } from "@/lib/knowledge/import/batch";
 *   const result = await importMockKnowledgeBatch();
 */

import { MOCK_DATASET } from "./mock/dataset";
import { importDocument } from "./services/import";
import type { BatchImportResult, ImportError } from "./types";

/**
 * Importe l'ensemble du dataset mock dans la knowledge base.
 * Collecte les erreurs sans s'arrêter — chaque document est traité indépendamment.
 */
export async function importMockKnowledgeBatch(): Promise<BatchImportResult> {
  const startedAt = Date.now();

  console.log(
    `[knowledge:batch] ▶ Démarrage import mock — ${MOCK_DATASET.length} documents`
  );

  const errors: ImportError[] = [];
  let imported = 0;
  let skipped = 0;

  for (const input of MOCK_DATASET) {
    try {
      const result = await importDocument(input);

      if (result.skipped) {
        skipped++;
      } else {
        imported++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        drugKey: input.drugKey,
        sourceType: input.sourceType,
        stage: "create_document",
        error: message,
      });
    }
  }

  const durationMs = Date.now() - startedAt;

  console.log(
    `[knowledge:batch] ✓ Terminé — importés=${imported} skippés=${skipped} erreurs=${errors.length} durée=${durationMs}ms`
  );

  if (errors.length > 0) {
    console.error(
      `[knowledge:batch] Erreurs détaillées:`,
      errors.map((e) => `${e.drugKey}: ${e.error}`).join(" | ")
    );
  }

  return {
    total: MOCK_DATASET.length,
    imported,
    skipped,
    errors,
    durationMs,
  };
}
