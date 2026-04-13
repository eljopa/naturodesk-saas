/**
 * Persistance des findings en base.
 *
 * persistFindings() :
 *   Crée chaque Finding + ses Citations dans une transaction Prisma.
 *   Déduplication : si un finding avec même (analysisRunId, title) existe déjà,
 *   il est ignoré (idempotence intra-run).
 *
 * Stratégie de persistance :
 *   - Un finding à la fois (loop) pour traçabilité fine des erreurs
 *   - Transaction par finding (finding + ses citations atomiques)
 *   - Les erreurs sur un finding isolé ne bloquent pas les suivants
 *
 * Historique :
 *   Les findings d'un run précédent ne sont JAMAIS supprimés.
 *   Le dashboard filtrera par analysisRunId du dernier run DONE.
 */

import { db } from "@/lib/db";
import type { FindingInput, PersistenceError } from "../types";

export interface PersistFindingsResult {
  findingsCreated:  number;
  findingsSkipped:  number;
  citationsCreated: number;
  errors:           PersistenceError[];
}

/**
 * Persiste une liste de FindingInput (findings + citations) en base.
 * Retourne le résumé de l'opération.
 */
export async function persistFindings(
  findings: FindingInput[]
): Promise<PersistFindingsResult> {
  let findingsCreated  = 0;
  let findingsSkipped  = 0;
  let citationsCreated = 0;
  const errors: PersistenceError[] = [];

  for (const input of findings) {
    // --- Déduplication intra-run ---
    const existing = await db.finding.findFirst({
      where: {
        analysisRunId: input.analysisRunId,
        title:         input.title,
      },
      select: { id: true },
    });

    if (existing) {
      findingsSkipped++;
      console.log(`[persistence] ↩ Ignoré (doublon) : "${input.title.slice(0, 60)}"`);
      continue;
    }

    // --- Création atomique finding + citations ---
    try {
      await db.$transaction(async (tx) => {
        const finding = await tx.finding.create({
          data: {
            consultationId:  input.consultationId,
            analysisRunId:   input.analysisRunId,
            category:        input.category,
            title:           input.title,
            description:     input.description,
            confidence:      input.confidence,
            riskLevel:       input.riskLevel,
            evidenceLevel:   input.evidenceLevel ?? null,
            sourceType:      input.sourceType,
            validated:       null,
            practitionerNote: null,
          },
        });

        if (input.citations.length > 0) {
          await tx.citation.createMany({
            data: input.citations.map((c) => ({
              findingId:        finding.id,
              reference:        c.reference,
              excerpt:          c.excerpt ?? null,
              url:              c.url ?? null,
              knowledgeFactId:  c.knowledgeFactId ?? null,
              knowledgeChunkId: c.knowledgeChunkId ?? null,
            })),
          });
          citationsCreated += input.citations.length;
        }

        findingsCreated++;
        console.log(
          `[persistence] ✓ Finding créé : [${input.category}] "${input.title.slice(0, 60)}" ` +
            `(${input.citations.length} citation(s))`
        );
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ context: `finding: "${input.title.slice(0, 60)}"`, error: msg });
      console.error(`[persistence] ✗ Erreur finding "${input.title.slice(0, 40)}" : ${msg}`);
    }
  }

  return { findingsCreated, findingsSkipped, citationsCreated, errors };
}
