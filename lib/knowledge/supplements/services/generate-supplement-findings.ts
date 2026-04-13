/**
 * Générateur de findings supplements à partir des données ODS et du matching.
 *
 * Findings produits (par ordre de priorité) :
 *
 *   1. INTERACTION  — ingrédient avec chunks ODS "interaction"     (riskLevel: HIGH)
 *   2. SIDE_EFFECT  — ingrédient avec chunks ODS "warning"         (riskLevel: MEDIUM)
 *   3. PROTOCOL     — même ingrédient présent plusieurs fois        (riskLevel: MEDIUM)
 *   4. TERRAIN      — ingrédient reconnu, sans données ODS          (riskLevel: INFORMATIONAL)
 *   5. QUESTION     — ingrédient non reconnu dans la knowledge base (riskLevel: LOW)
 *
 * Règles de contenu :
 *   - Un seul finding par type par terme (pas de flood par chunk).
 *   - Pour warning/interaction : premier chunk de chaque kind, extrait 350 chars.
 *   - Titre humain lisible, description factuelle.
 *   - sourceType: KNOWLEDGE sur tous les findings.
 *
 * Déduplication :
 *   La déduplication intra-run par titre est gérée par persistFindings().
 *   Ce générateur émet un finding par (type, terme) — pas de doublon structurel.
 */

import type { TermMatchResult, TermNoMatch } from "@/lib/knowledge/matching/types";
import type { OdsEnrichmentMap, OdsChunkData } from "../types";
import type { FindingInput, CitationInput } from "@/lib/knowledge/persistence/types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Longueur maximale de l'extrait ODS dans la description d'un finding. */
const EXCERPT_MAX_LEN = 350;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Génère les FindingInput pour l'analyse supplement d'une consultation.
 *
 * @param matched       Termes matchés par le moteur lexical.
 * @param unmatched     Termes non reconnus.
 * @param enrichment    Données ODS pour les termes matchés.
 * @param consultationId
 * @param analysisRunId
 */
export function generateSupplementFindings(
  matched:        TermMatchResult[],
  unmatched:      TermNoMatch[],
  enrichment:     OdsEnrichmentMap,
  consultationId: string,
  analysisRunId:  string
): FindingInput[] {
  const findings: FindingInput[] = [];

  // ── 1. Détection des doublons (même termId résolu plusieurs fois) ────────
  const termIdCount = new Map<string, number>();
  for (const m of matched) {
    termIdCount.set(m.termId, (termIdCount.get(m.termId) ?? 0) + 1);
  }

  // ── 2. Findings par terme matché ─────────────────────────────────────────
  // Déduplique par termId pour ne traiter chaque terme qu'une fois
  const seenTermIds = new Set<string>();

  for (const term of matched) {
    if (seenTermIds.has(term.termId)) continue;
    seenTermIds.add(term.termId);

    const ods = enrichment.get(term.termId);

    // 2a. Doublon
    const count = termIdCount.get(term.termId) ?? 1;
    if (count > 1) {
      findings.push(buildDuplicateFinding(term, count, consultationId, analysisRunId));
    }

    if (!ods) {
      // Pas d'enrichissement (ne devrait pas arriver si enrichTermsFromOds a tourné)
      findings.push(buildNoOdsFinding(term, consultationId, analysisRunId));
      continue;
    }

    if (!ods.hasOdsData) {
      // 2b. Terme reconnu mais sans données ODS
      findings.push(buildNoOdsFinding(term, consultationId, analysisRunId));
      continue;
    }

    // 2c. Interaction ODS (priorité haute)
    if (ods.interactions.length > 0) {
      findings.push(
        buildOdsInteractionFinding(term, ods.interactions[0]!, consultationId, analysisRunId)
      );
    }

    // 2d. Warning ODS
    if (ods.warnings.length > 0) {
      findings.push(
        buildOdsWarningFinding(term, ods.warnings[0]!, consultationId, analysisRunId)
      );
    }
  }

  // ── 3. Findings pour termes non reconnus ─────────────────────────────────
  for (const nm of unmatched) {
    findings.push(buildUnrecognizedFinding(nm, consultationId, analysisRunId));
  }

  console.log(
    `[supplements:findings] ${findings.length} finding(s) générés ` +
    `(${matched.length} termes matchés, ${unmatched.length} non reconnus)`
  );

  return findings;
}

// ---------------------------------------------------------------------------
// Builders privés
// ---------------------------------------------------------------------------

function buildOdsInteractionFinding(
  term:           TermMatchResult,
  chunk:          OdsChunkData,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  const excerpt = truncate(chunk.excerpt, EXCERPT_MAX_LEN);
  const citation: CitationInput = {
    reference:       `${term.canonicalName} — ${chunk.label}`,
    excerpt:         chunk.label,
    knowledgeChunkId: chunk.chunkId,
  };

  return {
    consultationId,
    analysisRunId,
    category:    "INTERACTION",
    title:       `Interactions documentées — ${term.canonicalName} (ODS NIH)`,
    description: `Des interactions médicamenteuses ou avec d'autres substances ont été documentées pour ${term.canonicalName} dans la base NIH ODS. ${excerpt}`,
    confidence:  0.75,
    riskLevel:   "HIGH",
    sourceType:  "KNOWLEDGE",
    citations:   [citation],
  };
}

function buildOdsWarningFinding(
  term:           TermMatchResult,
  chunk:          OdsChunkData,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  const excerpt = truncate(chunk.excerpt, EXCERPT_MAX_LEN);
  const citation: CitationInput = {
    reference:       `${term.canonicalName} — ${chunk.label}`,
    excerpt:         chunk.label,
    knowledgeChunkId: chunk.chunkId,
  };

  return {
    consultationId,
    analysisRunId,
    category:    "SIDE_EFFECT",
    title:       `Vigilance ${term.canonicalName} — effets indésirables documentés (ODS NIH)`,
    description: `Des effets indésirables ou des risques en cas de surdosage ont été documentés pour ${term.canonicalName} dans la base NIH ODS. ${excerpt}`,
    confidence:  0.70,
    riskLevel:   "MEDIUM",
    sourceType:  "KNOWLEDGE",
    citations:   [citation],
  };
}

function buildDuplicateFinding(
  term:           TermMatchResult,
  count:          number,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  return {
    consultationId,
    analysisRunId,
    category:    "PROTOCOL",
    title:       `Doublon détecté — ${term.canonicalName} (×${count})`,
    description: `L'ingrédient ${term.canonicalName} apparaît ${count} fois dans les suppléments saisis sous des noms différents. Vérifiez si le doublon est intentionnel (formes galéniques distinctes, doses différentes) ou s'il s'agit d'une saisie redondante.`,
    confidence:  1.0,
    riskLevel:   "MEDIUM",
    sourceType:  "KNOWLEDGE",
    citations:   [],
  };
}

function buildNoOdsFinding(
  term:           TermMatchResult,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  return {
    consultationId,
    analysisRunId,
    category:    "TERRAIN",
    title:       `${term.canonicalName} — aucune fiche documentaire ODS`,
    description: `L'ingrédient ${term.canonicalName} est reconnu dans NaturoDesk (type : ${term.termType}) mais ne dispose pas de fiche documentaire NIH ODS indexée. Aucun signal automatique n'est disponible pour cet ingrédient.`,
    confidence:  1.0,
    riskLevel:   "INFORMATIONAL",
    sourceType:  "KNOWLEDGE",
    citations:   [],
  };
}

function buildUnrecognizedFinding(
  noMatch:        TermNoMatch,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  return {
    consultationId,
    analysisRunId,
    category:    "QUESTION",
    title:       `Supplément non reconnu : « ${noMatch.rawInput} »`,
    description: `L'ingrédient « ${noMatch.rawInput} » (clé normalisée : ${noMatch.normalizedKey}) n'a pas été identifié dans la base de connaissance NaturoDesk. Vérifiez l'orthographe ou ajoutez-le manuellement si nécessaire.`,
    confidence:  1.0,
    riskLevel:   "LOW",
    sourceType:  "KNOWLEDGE",
    citations:   [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLen: number): string {
  const flat = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  return flat.length <= maxLen ? flat : `${flat.slice(0, maxLen)}…`;
}
