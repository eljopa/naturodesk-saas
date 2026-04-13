/**
 * Persistance des ConsultationMedicationIntake.
 *
 * Idempotent : supprime les intakes existants pour la consultation avant
 * de les recréer. Garantit un état propre après re-run.
 */

import { db } from "@/lib/db";
import type { MedicationIntakeWithResolution } from "../types";

interface PersistResult {
  created: number;
  errors:  Array<{ context: string; error: string }>;
}

export async function persistMedicationIntakes(
  consultationId: string,
  intakes:         MedicationIntakeWithResolution[],
): Promise<PersistResult> {
  const errors: Array<{ context: string; error: string }> = [];
  let created = 0;

  // Nettoyage préalable — idempotence sur re-run
  await db.consultationMedicationIntake.deleteMany({
    where: { consultationId },
  });

  for (const intake of intakes) {
    try {
      await db.consultationMedicationIntake.create({
        data: {
          consultationId,
          rawText:              intake.rawText,
          parsedLabel:          intake.parsedLabel,
          parsedBrandName:      intake.parsedBrandName,
          normalizedKey:        intake.normalizedKey,
          knowledgeTermId:      intake.knowledgeTermId,
          doseValue:            intake.doseValue,
          doseUnit:             intake.doseUnit,
          frequencyText:        intake.frequencyText,
          durationText:         intake.durationText,
          galenicForm:          intake.galenicForm,
          parseStatus:          intake.parseStatus,
          parseConfidence:      intake.parseConfidence,
          resolutionConfidence: intake.resolutionConfidence,
          drugProductId:        intake.drugProductId,
          drugSubstanceId:      intake.drugSubstanceId,
        },
      });
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({
        context: `persistMedicationIntakes[${intake.rawText.slice(0, 40)}]`,
        error:   msg,
      });
    }
  }

  return { created, errors };
}
