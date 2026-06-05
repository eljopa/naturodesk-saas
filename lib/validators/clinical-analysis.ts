/**
 * lib/validators/clinical-analysis.ts
 *
 * Schéma Zod pour POST /api/analysis/clinical.
 *
 * Contrat d'entrée :
 *   rawSymptoms     — texte brut des symptômes (obligatoire, non vide)
 *   drugs           — tableau de médicaments (au moins 1)
 *     name          — nom déclaré (DCI, marque, ou abréviation)
 *     dosage        — posologie déclarée (libre)
 *     startedAt     — date de début (ISO 8601 optionnel)
 *     stoppedAt     — date d'arrêt (ISO 8601 optionnel — null = traitement en cours)
 *     resolvedSubstanceId — ID DrugSubstance si déjà résolu côté client
 *   consultationId  — ID Consultation si l'analyse est rattachée à une consultation
 *   assessedAt      — date d'évaluation (ISO 8601 optionnel, défaut: now())
 */

import { z } from "zod";

const DrugInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom du médicament ne peut pas être vide")
    .max(200, "Nom de médicament trop long (max 200 caractères)"),
  dosage: z.string().trim().max(100).optional(),
  startedAt: z
    .string()
    .datetime({ message: "startedAt doit être une date ISO 8601 valide" })
    .optional(),
  stoppedAt: z
    .string()
    .datetime({ message: "stoppedAt doit être une date ISO 8601 valide" })
    .optional(),
  resolvedSubstanceId: z.string().uuid("resolvedSubstanceId doit être un UUID valide").optional(),
});

export const ClinicalAnalysisRequestSchema = z.object({
  rawSymptoms: z
    .string()
    .trim()
    .min(2, "rawSymptoms doit contenir au moins 2 caractères")
    .max(2000, "rawSymptoms trop long (max 2000 caractères)"),

  drugs: z
    .array(DrugInputSchema)
    .min(1, "Au moins un médicament est requis")
    .max(20, "Maximum 20 médicaments par analyse"),

  consultationId: z.string().uuid("consultationId doit être un UUID valide").optional(),

  assessedAt: z
    .string()
    .datetime({ message: "assessedAt doit être une date ISO 8601 valide" })
    .optional(),
});

export type ClinicalAnalysisRequest = z.infer<typeof ClinicalAnalysisRequestSchema>;
