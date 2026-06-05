/**
 * lib/clinical/corroborate.ts
 *
 * Étape 5 du pipeline : enrichit les ScoredItem Tier 1 et Tier 2 avec un
 * boost corroboratif si un KnowledgeFact documentaire confirme la relation.
 *
 * Règles strictes :
 *   - Tier 4 : ignoré (aucun enrichissement possible sans source primaire)
 *   - Boost : +0.05, plafonné par evidenceCeiling — jamais seul au-delà du plafond
 *   - Un seul fact retenu par item (meilleure confiance en DB)
 *   - Le KnowledgeFact ne crée aucune relation clinique — il corrobore uniquement
 *
 * Stratégie de recherche :
 *   - subject ≈ normalizedKey de la substance (contains, insensible à la casse)
 *   - predicate IN [CAUSES, DEPLETES]
 *   - object ≈ nom du nutriment (Tier 2 dépletion) ou du symptôme (Tier 1/2 sideEffect)
 *
 * Note Phase 3 :
 *   Pour de meilleures performances, un index GIN full-text sur knowledge_facts.rawExcerpt
 *   sera ajouté en Phase 3 (prerequis : CREATE INDEX knowledge_facts_rawexcerpt_fts ...).
 *   Le matching actuel (ILIKE via contains) est fonctionnel mais non optimisé pour des
 *   volumes > 10k facts.
 */

import { db } from "@/lib/db";
import type { ScoredItem } from "./types";

export async function corroborateItems(items: ScoredItem[]): Promise<ScoredItem[]> {
  const result: ScoredItem[] = [];

  for (const item of items) {
    // Tier 4 : pas de corroboration possible
    if (item.tier === "TIER_4_UNMATCHED" || !item.drugSubstanceId || !item._meta.substanceKey) {
      result.push(item);
      continue;
    }

    // L'objet cible : nutriment pour les déplétions, symptôme pour les effets directs
    const targetObject =
      item._meta.nutrientLabel ??
      item._meta.symptomLabel ??
      "";

    if (!targetObject) {
      result.push(item);
      continue;
    }

    // Cherche un KnowledgeFact corroborant
    const substanceSearch = item._meta.substanceKey.replace(/-/g, " ");

    const fact = await db.knowledgeFact.findFirst({
      where: {
        subject:   { contains: substanceSearch, mode: "insensitive" },
        predicate: { in: ["CAUSES", "DEPLETES"] },
        object:    { contains: targetObject,    mode: "insensitive" },
      },
      orderBy: { confidence: "desc" },
      select:  { id: true },
    });

    if (fact) {
      const newBoost = 0.05;
      const newScore = Math.min(
        Math.max(item.frequencyFactor + item.temporalModifier + newBoost, 0),
        item.evidenceCeiling,
      );
      result.push({
        ...item,
        knowledgeFactId:    fact.id,
        corroborationBoost: newBoost,
        confidenceScore:    newScore,
      });
    } else {
      result.push(item);
    }
  }

  return result;
}
