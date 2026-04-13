/**
 * Classification d'un fait scoré dans un bucket métier.
 *
 * classifyMatchedFact() détermine le bucket à partir de :
 *   - predicate  (relation sémantique)
 *   - riskLevel  (dérivé du finalScore)
 *
 * Table de classification :
 *   riskLevel CRITICAL                    → alert (toujours, quel que soit le prédicat)
 *   INTERACTS_WITH / REDUCES_EFFICACY_OF
 *     / POTENTIATES / INHIBITS + HIGH     → interaction
 *   INTERACTS_WITH / ... + < HIGH         → warning
 *   INCREASES_RISK_OF                     → warning
 *   REQUIRES_MONITORING_WITH              → warning
 *   DEPLETES                              → depletion (toujours)
 *   CAUSES + HIGH                         → warning
 *   CAUSES + MEDIUM/LOW                   → contextual
 *   TREATS                               → contextual
 *   Tout INFORMATIONAL                   → low_signal
 *   Autres cas                           → contextual
 *
 * Règle de sécurité : en cas de doute → bucket le plus conservateur.
 */

import type { FactPredicate } from "@prisma/client";
import type { RiskLevel, AnalysisBucket } from "../types";

/**
 * Assigne un bucket à un fait en fonction de son prédicat et de son niveau de risque.
 */
export function classifyMatchedFact(
  predicate: FactPredicate,
  riskLevel: RiskLevel
): AnalysisBucket {
  // Règle prioritaire — CRITICAL toujours en alert
  if (riskLevel === "CRITICAL") return "alert";

  // Signal trop faible — ne remonte pas dans les buckets actionnables
  if (riskLevel === "INFORMATIONAL") return "low_signal";

  switch (predicate) {
    // Interactions médicamenteuses/substances
    case "INTERACTS_WITH":
    case "REDUCES_EFFICACY_OF":
    case "POTENTIATES":
    case "INHIBITS":
      return riskLevel === "HIGH" ? "interaction" : "warning";

    // Risques et surveillances
    case "INCREASES_RISK_OF":
    case "REQUIRES_MONITORING_WITH":
      return "warning";

    // Déplétions nutritionnelles — bucket dédié quel que soit le niveau
    case "DEPLETES":
      return "depletion";

    // Effets indésirables
    case "CAUSES":
      return riskLevel === "HIGH" ? "warning" : "contextual";

    // Indications thérapeutiques — contexte uniquement
    case "TREATS":
      return "contextual";

    // CONTRAINDICATED_WITH → déjà traité par CRITICAL ci-dessus
    // Fallback conservateur
    default:
      return riskLevel === "LOW" ? "contextual" : "low_signal";
  }
}
