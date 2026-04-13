/**
 * Persistance des ConsultationSupplementIntake en base.
 *
 * Stratégie :
 *   - Un intake à la fois pour traçabilité fine des erreurs
 *   - Pas de déduplication : chaque saisie est une occurrence clinique distincte
 *   - Les erreurs sur un intake isolé n'arrêtent pas les suivants
 */

import { db } from "@/lib/db";
import type { IntakeWithResolution } from "../types";

export interface PersistIntakesResult {
  created: number;
  errors:  Array<{ context: string; error: string }>;
}

/**
 * Persiste une liste d'IntakeWithResolution en ConsultationSupplementIntake.
 *
 * @param consultationId  ID de la consultation — même valeur pour tous les intakes.
 * @param intakes         Résultats du parsing + résolution variante.
 */
export async function persistSupplementIntakes(
  consultationId: string,
  intakes:        IntakeWithResolution[]
): Promise<PersistIntakesResult> {
  let created = 0;
  const errors: Array<{ context: string; error: string }> = [];

  for (const intake of intakes) {
    // Si le terme parent n'a pas été résolu → UNRESOLVED
    const parseStatus =
      intake.knowledgeTermId === null ? "UNRESOLVED" as const
      : intake.parseStatus;

    try {
      await db.consultationSupplementIntake.create({
        data: {
          consultationId,
          rawText:                 intake.rawText,
          parsedLabel:             intake.parsedLabel           ?? null,
          normalizedKey:           intake.normalizedKey         ?? null,
          knowledgeTermId:         intake.knowledgeTermId       ?? null,
          knowledgeTermVariantId:  intake.knowledgeTermVariantId ?? null,
          dosePerUnitValue:        intake.dosePerUnitValue      ?? null,
          dosePerUnitUnit:         intake.dosePerUnitUnit       ?? null,
          unitsPerIntake:          intake.unitsPerIntake        ?? null,
          intakesPerDay:           intake.intakesPerDay         ?? null,
          declaredDailyDoseValue:  intake.declaredDailyDoseValue ?? null,
          declaredDailyDoseUnit:   intake.declaredDailyDoseUnit  ?? null,
          estimatedDailyDoseValue: intake.estimatedDailyDoseValue ?? null,
          estimatedDailyDoseUnit:  intake.estimatedDailyDoseUnit  ?? null,
          timingText:              intake.timingText   ?? null,
          frequencyText:           intake.frequencyText ?? null,
          durationText:            intake.durationText  ?? null,
          parseStatus,
          parseConfidence:         intake.parseConfidence,
          resolutionConfidence:    intake.resolutionConfidence,
          sourceType:              "PARSED",
        },
      });

      created++;
      console.log(
        `[intakes] ✓ "${intake.rawText.slice(0, 50)}" ` +
        `label="${intake.parsedLabel ?? "?"}" ` +
        `term=${intake.knowledgeTermId ? "✓" : "—"} ` +
        `variant=${intake.variantLabel ?? "—"} ` +
        `status=${parseStatus} parseConf=${intake.parseConfidence} resolConf=${intake.resolutionConfidence}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ context: `intake: "${intake.rawText.slice(0, 40)}"`, error: msg });
      console.error(`[intakes] ✗ "${intake.rawText.slice(0, 40)}" : ${msg}`);
    }
  }

  return { created, errors };
}
