/**
 * Détection des interactions croisées médicaments ↔ suppléments.
 *
 * Source principale : seeds V1 (Option B — déterministe, auditable).
 * Les seeds priment toujours sur tout signal textuel.
 *
 * Pipeline :
 *   1. Pour chaque seed, chercher un supplément résolu (normalizedKey match) — fiabilité haute.
 *   2. Fallback : si aucun intake résolu ne matche, tenter un match brut sur rawText — fiabilité réduite.
 *   3. Pour chaque seed avec un supplément trouvé, chercher un médicament correspondant.
 *   4. Si les deux matchent → générer un FindingInput.
 *
 * Garanties :
 *   - Un seul finding par seed par run (déduplication (seedId, medicationName)).
 *   - Le fallback brut ne dépasse jamais riskLevel MEDIUM (contrainte B).
 *   - Chaque finding est traçable via seed.id dans le titre.
 *   - sourceType "RULE" permet à l'UI de distinguer ces findings des findings ODS.
 */

import type { IntakeWithResolution } from "../types";
import type { MedicationEntry } from "@/lib/analysis/types";
import type { FindingInput } from "@/lib/knowledge/persistence/types";
import {
  DRUG_INTERACTION_SEEDS,
  type DrugInteractionSeed,
} from "../drug-interaction-seeds";

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

interface SupplementHit {
  /** Nom affiché (canonical > parsedLabel > rawText). */
  name: string;
  /** true = normalizedKey exact match ; false = rawText fallback (moins fiable). */
  viaKey: boolean;
}

interface CrossMatch {
  seed:           DrugInteractionSeed;
  supplementName: string;
  medicationName: string;
  matchedViaKey:  boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Génère les FindingInput pour les interactions croisées médicaments ↔ suppléments.
 *
 * Non-bloquant : retourne [] si medications est vide ou si aucune seed ne matche.
 */
export function generateDrugSupplementFindings(
  intakes:        IntakeWithResolution[],
  medications:    MedicationEntry[],
  consultationId: string,
  analysisRunId:  string,
): FindingInput[] {
  if (medications.length === 0 || intakes.length === 0) return [];

  const matches = detectCrossMatches(intakes, medications);
  if (matches.length === 0) return [];

  // Déduplication : une seule alerte par (seedId, médicament détecté).
  // Si le même ingrédient actif est saisi plusieurs fois, on ne génère pas de doublon.
  const seen = new Set<string>();
  const findings: FindingInput[] = [];

  for (const match of matches) {
    const dedupeKey = `${match.seed.id}::${match.medicationName.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    findings.push(buildCrossInteractionFinding(match, consultationId, analysisRunId));
  }

  console.log(
    `[supplements:drug-interactions] ${findings.length} finding(s) croisé(s) généré(s) ` +
    `pour ${medications.length} médicament(s) et ${intakes.length} supplément(s)`
  );

  return findings;
}

// ---------------------------------------------------------------------------
// Détection
// ---------------------------------------------------------------------------

function detectCrossMatches(
  intakes:     IntakeWithResolution[],
  medications: MedicationEntry[],
): CrossMatch[] {
  const matches: CrossMatch[] = [];

  for (const seed of DRUG_INTERACTION_SEEDS) {
    const supplementHit = findSupplementHit(intakes, seed);
    if (!supplementHit) continue;

    for (const med of medications) {
      if (matchesAnyPattern(med.name, seed.drugPatterns)) {
        matches.push({
          seed,
          supplementName: supplementHit.name,
          medicationName: med.name,
          matchedViaKey:  supplementHit.viaKey,
        });
        // Un seul médicament par classe suffit : la recommandation porte sur la classe,
        // pas sur le médicament individuel. On évite la répétition intra-classe.
        break;
      }
    }
  }

  return matches;
}

/**
 * Cherche un match supplément pour une seed donnée.
 * Priorité 1 : normalizedKey exact (intakes résolus).
 * Priorité 2 : rawText substring (fallback pour non résolus).
 */
function findSupplementHit(
  intakes: IntakeWithResolution[],
  seed:    DrugInteractionSeed,
): SupplementHit | null {
  // ── Priorité 1 : match par normalizedKey ──────────────────────────────────
  for (const intake of intakes) {
    if (intake.normalizedKey && seed.supplementKeys.includes(intake.normalizedKey)) {
      return {
        name:   intake.canonicalName ?? intake.parsedLabel ?? intake.rawText,
        viaKey: true,
      };
    }
  }

  // ── Priorité 2 : fallback raw text (suppléments non résolus) ─────────────
  for (const intake of intakes) {
    if (matchesAnyPattern(intake.rawText, seed.supplementRawPatterns)) {
      return {
        name:   intake.parsedLabel ?? intake.rawText,
        viaKey: false,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function buildCrossInteractionFinding(
  match:          CrossMatch,
  consultationId: string,
  analysisRunId:  string,
): FindingInput {
  const { seed, supplementName, medicationName, matchedViaKey } = match;

  // Contrainte B : le fallback brut ne dépasse jamais riskLevel MEDIUM.
  const riskLevel: string = (!matchedViaKey && seed.riskLevel === "HIGH")
    ? "MEDIUM"
    : seed.riskLevel;

  const confidence =
    seed.severity === "HIGH"   ? (matchedViaKey ? 0.90 : 0.70) :
    seed.severity === "MEDIUM" ? (matchedViaKey ? 0.80 : 0.60) :
                                  (matchedViaKey ? 0.70 : 0.50);

  const fallbackNote = matchedViaKey
    ? ""
    : " (supplément détecté sur texte brut — terme non résolu dans la base)";

  // Titre : noms réels du patient (supplément détecté + médicament détecté).
  // La classe médicamenteuse et le mécanisme sont dans la description.
  const title = `${supplementName} ↔ ${medicationName}`;

  const description = [
    `Classe médicamenteuse : ${seed.drugClass}${fallbackNote}.`,
    `Mécanisme : ${seed.mechanism}`,
    `Recommandation : ${seed.recommendation}`,
  ].join("\n\n");

  return {
    consultationId,
    analysisRunId,
    category:      "INTERACTION",
    title,
    description,
    confidence,
    riskLevel,
    evidenceLevel: seed.evidenceLevel,
    sourceType:    "RULE",
    citations: [{
      reference: seed.sourceLabel,
      excerpt:   `Seed : ${seed.id}`,
    }],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesAnyPattern(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p.toLowerCase()));
}
