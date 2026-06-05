/**
 * lib/clinical/resolve-drugs.ts
 *
 * Étape 2 du pipeline : résout chaque DrugInput en DrugSubstance,
 * puis charge les sideEffects et depletions actifs avec leurs sources.
 *
 * Stratégie de résolution (par ordre de priorité) :
 *   1. resolvedSubstanceId — fourni par l'appelant (ex: depuis ConsultationMedicationIntake)
 *   2. DrugSubstance.normalizedKey — slug exact du nom déclaré
 *   3. DrugAlias.key — alias DCI ou marque (ex: "glucophage" → metformine)
 *
 * Retourne UnresolvedDrug si aucune résolution n'aboutit.
 * Les entrées non résolues ne bloquent pas le pipeline — elles sont tracées.
 */

import { db } from "@/lib/db";
import type {
  DrugInput,
  DrugResolution,
  LoadedSideEffect,
  LoadedDepletion,
} from "./types";

function toDrugSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Résolution d'un médicament unique
// ---------------------------------------------------------------------------

async function resolveSingle(drug: DrugInput): Promise<DrugResolution> {
  let substanceId: string | null = drug.resolvedSubstanceId ?? null;

  if (!substanceId) {
    const slug = toDrugSlug(drug.name);

    // 2. Par normalizedKey exact
    const byKey = await db.drugSubstance.findFirst({
      where: { normalizedKey: slug, isActive: true },
      select: { id: true },
    });
    if (byKey) substanceId = byKey.id;

    // 3. Par alias
    if (!substanceId) {
      const alias = await db.drugAlias.findFirst({
        where: { key: slug, substanceId: { not: null } },
        select: { substanceId: true },
      });
      if (alias?.substanceId) substanceId = alias.substanceId;
    }

    // 4. Par KnowledgeTerm.normalizedKey — couvre les DCI dont le slug BDPM
    //    est différent du nom DCI (ex: "atorvastatine" → "atorvastatine-calcique")
    if (!substanceId) {
      const viaKT = await db.drugSubstance.findFirst({
        where: {
          isActive:      true,
          knowledgeTerm: { normalizedKey: slug },
        },
        select: { id: true },
      });
      if (viaKT) substanceId = viaKT.id;
    }
  }

  if (!substanceId) {
    return {
      input: drug,
      unresolved: true,
      reason: `Substance "${drug.name}" non trouvée (clé: ${toDrugSlug(drug.name)})`,
    };
  }

  // Charger la substance avec sideEffects + depletions actifs
  const substance = await db.drugSubstance.findUnique({
    where: { id: substanceId },
    select: {
      id: true,
      normalizedKey: true,
      canonicalName: true,
      sideEffects: {
        where: { isActive: true },
        select: {
          id: true,
          symptomTermId: true,
          symptomTerm: { select: { label: true } },
          effectType: true,
          frequency: true,
          severity: true,
          temporality: true,
          evidenceLevel: true,
          sourceId: true,
          source: { select: { shortLabel: true } },
          mechanism: true,
        },
      },
      depletions: {
        where: { isActive: true },
        select: {
          id: true,
          nutrient: true,
          nutrientKey: true,
          mechanism: true,
          evidenceLevel: true,
          sourceId: true,
          source: { select: { shortLabel: true } },
          symptoms: { select: { symptomId: true } },
        },
      },
    },
  });

  if (!substance) {
    return {
      input: drug,
      unresolved: true,
      reason: `Substance ID "${substanceId}" introuvable après résolution`,
    };
  }

  const sideEffects: LoadedSideEffect[] = substance.sideEffects.map((se) => ({
    id: se.id,
    symptomTermId: se.symptomTermId,
    symptomLabel: se.symptomTerm.label,
    effectType: se.effectType,
    frequency: se.frequency,
    severity: se.severity,
    temporality: se.temporality,
    evidenceLevel: se.evidenceLevel,
    sourceId: se.sourceId,
    sourceShortLabel: se.source.shortLabel,
    mechanism: se.mechanism,
  }));

  const depletions: LoadedDepletion[] = substance.depletions.map((d) => ({
    id: d.id,
    nutrient: d.nutrient,
    nutrientKey: d.nutrientKey,
    mechanism: d.mechanism,
    evidenceLevel: d.evidenceLevel,
    sourceId: d.sourceId,
    sourceShortLabel: d.source.shortLabel,
    symptomIds: d.symptoms.map((s) => s.symptomId),
  }));

  return {
    input: drug,
    substanceId: substance.id,
    normalizedKey: substance.normalizedKey,
    canonicalName: substance.canonicalName,
    sideEffects,
    depletions,
    unresolved: false,
  };
}

// ---------------------------------------------------------------------------
// Export principal
// ---------------------------------------------------------------------------

export async function resolveDrugs(drugs: DrugInput[]): Promise<DrugResolution[]> {
  return Promise.all(drugs.map(resolveSingle));
}
