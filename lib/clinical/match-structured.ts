/**
 * lib/clinical/match-structured.ts
 *
 * Étape 3 du pipeline : croise les symptômes normalisés × données structurées
 * de chaque substance résolue pour produire des RawMatch.
 *
 * Hiérarchie des matches par symptôme × substance :
 *   Tier 1 : DrugSideEffect effectType=DIRECT_SIDE_EFFECT
 *   Tier 2 : DrugSideEffect effectType=SECONDARY_MECHANISM
 *   Tier 2 : DrugNutrientDepletion → NutrientDepletionSymptom
 *   Tier 4 : aucune correspondance structurée (symptôme hors catalogue ou aucun lien)
 *
 * Règles :
 *   - Un même symptôme peut générer N matches (un par substance impliquée)
 *   - Si une substance a un DrugSideEffect pour ce symptôme, on ne cherche PAS
 *     en plus les déplétions pour ce couple (évite les doublons Tier 1 + Tier 2)
 *   - Un symptôme sans aucun match génère exactement un UnmatchedSymptom
 */

import type {
  SymptomMatch,
  DrugResolution,
  ResolvedDrug,
  RawMatch,
  SideEffectMatch,
  DepletionMatch,
  UnmatchedSymptom,
} from "./types";

export function matchStructured(
  symptomMatches: SymptomMatch[],
  drugResolutions: DrugResolution[],
): RawMatch[] {
  const results: RawMatch[] = [];

  const resolvedDrugs = drugResolutions.filter(
    (d): d is ResolvedDrug => !d.unresolved,
  );

  for (const symptomMatch of symptomMatches) {
    // Symptôme hors catalogue → Tier 4 immédiat
    if (!symptomMatch.symptomTermId) {
      results.push({
        type: "UNMATCHED",
        tier: "TIER_4_UNMATCHED",
        symptomMatch,
      });
      continue;
    }

    const matchesForSymptom: (SideEffectMatch | DepletionMatch)[] = [];

    for (const drug of resolvedDrugs) {
      // ── DrugSideEffect (Tier 1 ou Tier 2 SECONDARY_MECHANISM) ────────────
      const se = drug.sideEffects.find(
        (s) => s.symptomTermId === symptomMatch.symptomTermId,
      );

      if (se) {
        const tier: SideEffectMatch["tier"] =
          se.effectType === "DIRECT_SIDE_EFFECT"
            ? "TIER_1_DIRECT"
            : "TIER_2_INDIRECT";

        matchesForSymptom.push({ type: "SIDE_EFFECT", tier, symptomMatch, drug, sideEffect: se });
        // DrugSideEffect trouvé → on ne cherche pas de dépletion en plus pour ce couple
        continue;
      }

      // ── DrugNutrientDepletion (Tier 2 INDIRECT) ────────────────────────────
      const depletion = drug.depletions.find((d) =>
        d.symptomIds.includes(symptomMatch.symptomTermId!),
      );

      if (depletion) {
        matchesForSymptom.push({
          type: "DEPLETION",
          tier: "TIER_2_INDIRECT",
          symptomMatch,
          drug,
          depletion,
        });
      }
    }

    if (matchesForSymptom.length > 0) {
      results.push(...matchesForSymptom);
    } else {
      // Symptôme reconnu dans le catalogue mais aucune substance déclarée ne le couvre
      const unmatched: UnmatchedSymptom = {
        type: "UNMATCHED",
        tier: "TIER_4_UNMATCHED",
        symptomMatch,
      };
      results.push(unmatched);
    }
  }

  return results;
}
