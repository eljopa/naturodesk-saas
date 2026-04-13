/**
 * Générateur enrichi de findings supplements (V2).
 *
 * Exploite ConsultationSupplementIntake complet :
 *   - KnowledgeTermVariant (forme galénique reconnue)
 *   - estimatedDailyDoseValue / declaredDailyDoseValue
 *   - parseStatus / confidence
 *
 * Findings produits (par priorité clinique) :
 *
 *   INTERACTION  MEDIUM       — interaction ODS documentée pour le terme parent      [evidenceLevel=DOCUMENTED]
 *   SIDE_EFFECT  MEDIUM       — warning ODS documenté pour le terme parent             [evidenceLevel=DOCUMENTED]
 *   PROTOCOL     MEDIUM        — doublon parent : même ingrédient > 1 fois            [evidenceLevel=CLINICAL]
 *   PROTOCOL     MEDIUM        — doublon variante : même forme exacte > 1 fois         [evidenceLevel=CLINICAL]
 *   PROTOCOL     INFORMATIONAL — dose journalière estimée ou déclarée connue            [evidenceLevel=PARSED]
 *   PROTOCOL     LOW           — dose unitaire connue mais fréquence manquante          [evidenceLevel=PARSED]
 *   PROTOCOL     LOW           — aucune information posologique                         [evidenceLevel=PARSED]
 *   TERRAIN      INFORMATIONAL — terme reconnu sans données ODS                         [evidenceLevel=ABSENT]
 *   QUESTION     LOW           — supplément non reconnu                                 [evidenceLevel=ABSENT]
 *
 * Règles de contenu :
 *   - Un seul finding par (catégorie sémantique, entité) — pas de flood
 *   - Les findings ODS incluent le contexte variante dans la description
 *   - Les findings de doublon distinguent "formes différentes" vs "même forme"
 *   - Distinction explicite entre dose certaine / estimée / incomplète
 *   - Confiance reflétée dans confidence (0.0–1.0) et dans le texte
 *
 * Déduplication :
 *   La déduplication intra-run par titre est gérée par persistFindings().
 *   Ce générateur émet un finding par (type, entité) — structure sans doublon.
 */

import type { IntakeWithResolution, OdsEnrichmentMap } from "../types";
import type { OdsChunkData } from "../types";
import type { FindingInput, CitationInput } from "@/lib/knowledge/persistence/types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const EXCERPT_MAX_LEN = 350;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Génère les FindingInput enrichis pour l'analyse supplement d'une consultation.
 *
 * @param intakes       Intakes parsés avec résolution terme + variante.
 * @param enrichment    Données ODS pour les termes matchés.
 */
export function generateEnrichedSupplementFindings(
  intakes:        IntakeWithResolution[],
  enrichment:     OdsEnrichmentMap,
  consultationId: string,
  analysisRunId:  string
): FindingInput[] {
  const findings: FindingInput[] = [];

  // ── Groupements ───────────────────────────────────────────────────────────
  // Par termId → pour ODS findings, doublons parent
  const byTerm  = groupBy(intakes, (i) => i.knowledgeTermId ?? "__none__");
  // Par variantId → pour doublons variante
  const byVariant = groupBy(
    intakes.filter((i) => i.knowledgeTermVariantId),
    (i) => i.knowledgeTermVariantId!
  );

  // ── A. Findings par terme parent ──────────────────────────────────────────
  for (const [termId, termIntakes] of byTerm) {
    if (termId === "__none__") continue; // non reconnus → section D

    const representative = termIntakes[0]!;
    const canonicalName  = representative.canonicalName ?? "?";
    const ods            = enrichment.get(termId);

    // Contexte variante pour les descriptions ODS
    const varCtx = buildVariantContextLine(termIntakes);

    // A1. Interaction ODS
    if (ods?.interactions.length) {
      findings.push(
        buildOdsInteractionFinding(canonicalName, varCtx, ods.interactions[0]!, consultationId, analysisRunId)
      );
    }

    // A2. Warning ODS
    if (ods?.warnings.length) {
      findings.push(
        buildOdsWarningFinding(canonicalName, varCtx, ods.warnings[0]!, consultationId, analysisRunId)
      );
    }

    // A3. Aucune données ODS
    if (!ods || !ods.hasOdsData) {
      findings.push(
        buildNoOdsFinding(representative, consultationId, analysisRunId)
      );
    }

    // A4. Doublon parent (même termId > 1 fois)
    if (termIntakes.length > 1) {
      findings.push(
        buildDuplicateParentFinding(termIntakes, canonicalName, consultationId, analysisRunId)
      );
    }
  }

  // ── B. Doublon variante (même variantId > 1 fois) ─────────────────────────
  for (const [, variantIntakes] of byVariant) {
    if (variantIntakes.length > 1) {
      findings.push(
        buildDuplicateVariantFinding(variantIntakes, consultationId, analysisRunId)
      );
    }
  }

  // ── C. Findings posologiques (par intake) ─────────────────────────────────
  // Dédupliqués par titre via persistFindings — chaque intake produit au max 1 finding.
  for (const intake of intakes) {
    if (!intake.knowledgeTermId) continue; // non reconnus → section D

    const name = intake.variantLabel ?? intake.parsedLabel ?? intake.canonicalName ?? "?";

    if (intake.estimatedDailyDoseValue !== null) {
      // C1. Dose journalière connue (estimée ou déclarée)
      findings.push(buildDoseKnownFinding(intake, name, consultationId, analysisRunId));
    } else if (intake.dosePerUnitValue !== null) {
      // C2. Dose unitaire connue mais fréquence manquante
      findings.push(buildDosePartialFinding(intake, name, consultationId, analysisRunId));
    } else if (intake.parseStatus === "PARTIAL") {
      // C3. Aucune information posologique
      findings.push(buildNoDoseFinding(intake, name, consultationId, analysisRunId));
    }
  }

  // ── D. Non reconnus — terme parent introuvable (knowledgeTermId null) ────────
  for (const intake of intakes) {
    if (!intake.knowledgeTermId) {
      findings.push(buildUnresolvedFinding(intake, consultationId, analysisRunId));
    }
  }

  console.log(
    `[supplements:findings] ${findings.length} finding(s) enrichis générés ` +
    `(${intakes.filter((i) => i.knowledgeTermId).length} reconnus, ` +
    `${intakes.filter((i) => !i.knowledgeTermId).length} non reconnus)`
  );

  return findings;
}

// ---------------------------------------------------------------------------
// Builders — ODS
// ---------------------------------------------------------------------------

function buildOdsInteractionFinding(
  canonicalName:  string,
  variantCtxLine: string,
  chunk:          OdsChunkData,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  const excerpt   = truncate(chunk.excerpt, EXCERPT_MAX_LEN);
  const citation: CitationInput = {
    reference:        `${canonicalName} — ${chunk.label}`,
    excerpt:          chunk.label,
    knowledgeChunkId: chunk.chunkId,
  };
  return {
    consultationId, analysisRunId,
    category:      "INTERACTION",
    title:         `Interactions documentées — ${canonicalName} (ODS NIH)`,
    description:   [
      `Des interactions médicamenteuses ou avec d'autres substances ont été documentées pour ${canonicalName} dans la base NIH ODS.`,
      variantCtxLine,
      excerpt,
    ].filter(Boolean).join(" "),
    confidence:    0.75,
    riskLevel:     "MEDIUM",
    evidenceLevel: "DOCUMENTED",
    sourceType:    "KNOWLEDGE",
    citations:     [citation],
  };
}

function buildOdsWarningFinding(
  canonicalName:  string,
  variantCtxLine: string,
  chunk:          OdsChunkData,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  const excerpt   = truncate(chunk.excerpt, EXCERPT_MAX_LEN);
  const citation: CitationInput = {
    reference:        `${canonicalName} — ${chunk.label}`,
    excerpt:          chunk.label,
    knowledgeChunkId: chunk.chunkId,
  };
  return {
    consultationId, analysisRunId,
    category:      "SIDE_EFFECT",
    title:         `Vigilance ${canonicalName} — effets indésirables documentés (ODS NIH)`,
    description:   [
      `Des effets indésirables ou des risques en cas de surdosage ont été documentés pour ${canonicalName} dans la base NIH ODS.`,
      variantCtxLine,
      excerpt,
    ].filter(Boolean).join(" "),
    confidence:    0.70,
    riskLevel:     "MEDIUM",
    evidenceLevel: "DOCUMENTED",
    sourceType:    "KNOWLEDGE",
    citations:     [citation],
  };
}

function buildNoOdsFinding(
  intake:         IntakeWithResolution,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  const canonicalName = intake.canonicalName ?? "?";
  return {
    consultationId, analysisRunId,
    category:      "TERRAIN",
    title:         `${canonicalName} — aucune fiche documentaire ODS`,
    description:   `L'ingrédient ${canonicalName} est reconnu dans NaturoDesk mais ne dispose pas de fiche documentaire NIH ODS indexée. Aucun signal automatique n'est disponible pour cet ingrédient.`,
    confidence:    1.0,
    riskLevel:     "INFORMATIONAL",
    evidenceLevel: "ABSENT",
    sourceType:    "KNOWLEDGE",
    citations:     [],
  };
}

// ---------------------------------------------------------------------------
// Builders — doublons
// ---------------------------------------------------------------------------

function buildDuplicateParentFinding(
  intakes:        IntakeWithResolution[],
  canonicalName:  string,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  const count = intakes.length;

  // Variantes uniques
  const variants = uniqueVariantDescriptions(intakes);
  const hasVariants = variants.length > 0;

  let title: string;
  let description: string;

  if (hasVariants && variants.length === count) {
    // Toutes les occurrences ont des variantes différentes → probablement intentionnel
    title = `Doublon parent — ${canonicalName} ×${count} (formes différentes)`;
    description =
      `L'ingrédient parent ${canonicalName} est présent ${count} fois sous des formes galéniques différentes : ${variants.join(", ")}. ` +
      `Si l'association de formes est intentionnelle (protocole multi-formes), ce signal peut être ignoré. ` +
      `Vérifiez que les doses combinées restent dans les limites recommandées.`;
  } else {
    // Cas général — peut-être redondant
    const varCtx = hasVariants ? ` (${variants.join(", ")})` : "";
    title = `Doublon détecté — ${canonicalName} (×${count})`;
    description =
      `L'ingrédient ${canonicalName} apparaît ${count} fois dans les suppléments saisis${varCtx}. ` +
      `Vérifiez si ce doublon est intentionnel (formes ou doses différentes) ou s'il s'agit d'une saisie redondante.`;
  }

  return {
    consultationId, analysisRunId,
    category:      "PROTOCOL",
    title,
    description,
    confidence:    1.0,
    riskLevel:     "MEDIUM",
    evidenceLevel: "CLINICAL",
    sourceType:    "KNOWLEDGE",
    citations:     [],
  };
}

function buildDuplicateVariantFinding(
  intakes:        IntakeWithResolution[],
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  const count       = intakes.length;
  const variantLabel = intakes[0]!.variantLabel ?? "?";
  const variantType  = intakes[0]!.variantType ?? "";

  return {
    consultationId, analysisRunId,
    category:      "PROTOCOL",
    title:         `Doublon variante — ${variantLabel} (×${count})`,
    description:   `La variante exacte « ${variantLabel} »${variantType ? ` (${variantType})` : ""} est saisie ${count} fois. ` +
      `Il s'agit probablement d'une saisie redondante. Vérifiez si les doses sont différentes (prises distinctes dans la journée) ou si une entrée est en doublon.`,
    confidence:    1.0,
    riskLevel:     "MEDIUM",
    evidenceLevel: "CLINICAL",
    sourceType:    "KNOWLEDGE",
    citations:     [],
  };
}

// ---------------------------------------------------------------------------
// Builders — posologie
// ---------------------------------------------------------------------------

function buildDoseKnownFinding(
  intake:         IntakeWithResolution,
  name:           string,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  const dose   = `${intake.estimatedDailyDoseValue} ${intake.estimatedDailyDoseUnit ?? ""}`.trim();
  const isDeclared = intake.declaredDailyDoseValue !== null;
  const isHighConf = intake.parseConfidence === "HIGH";

  const sourceLabel = isDeclared ? "déclarée" : "calculée";
  const certitudeLabel = isHighConf
    ? "Données complètes (dose unitaire, nombre d'unités, fréquence)."
    : isDeclared
      ? "Valeur déclarée explicitement dans la saisie."
      : "Fréquence inférée depuis le timing — à confirmer avec le patient.";

  return {
    consultationId, analysisRunId,
    category:      "PROTOCOL",
    title:         `Dose journalière — ${name} : ${dose}`,
    description:   `Dose journalière ${sourceLabel} pour ${name} : ${dose}. ${certitudeLabel}`,
    confidence:    isHighConf ? 0.95 : isDeclared ? 0.90 : 0.75,
    riskLevel:     "INFORMATIONAL",
    evidenceLevel: "PARSED",
    sourceType:    "KNOWLEDGE",
    citations:     [],
  };
}

function buildDosePartialFinding(
  intake:         IntakeWithResolution,
  name:           string,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  const dose = `${intake.dosePerUnitValue} ${intake.dosePerUnitUnit ?? ""}`.trim();

  return {
    consultationId, analysisRunId,
    category:      "PROTOCOL",
    title:         `Fréquence de prise non renseignée — ${name}`,
    description:   `La dose unitaire de ${name} est connue (${dose}) mais la fréquence de prise n'est pas renseignée. ` +
      `La dose journalière ne peut pas être calculée automatiquement. ` +
      `Complétez la posologie si vous souhaitez un suivi quantitatif.`,
    confidence:    0.90,
    riskLevel:     "LOW",
    evidenceLevel: "PARSED",
    sourceType:    "KNOWLEDGE",
    citations:     [],
  };
}

function buildNoDoseFinding(
  intake:         IntakeWithResolution,
  name:           string,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  return {
    consultationId, analysisRunId,
    category:      "PROTOCOL",
    title:         `Données posologiques manquantes — ${name}`,
    description:   `Aucune information de dosage n'a été saisie pour ${name}. ` +
      `Sans données posologiques, l'analyse automatique de la dose journalière est impossible.`,
    confidence:    1.0,
    riskLevel:     "LOW",
    evidenceLevel: "PARSED",
    sourceType:    "KNOWLEDGE",
    citations:     [],
  };
}

// ---------------------------------------------------------------------------
// Builder — non reconnu
// ---------------------------------------------------------------------------

function buildUnresolvedFinding(
  intake:         IntakeWithResolution,
  consultationId: string,
  analysisRunId:  string
): FindingInput {
  return {
    consultationId, analysisRunId,
    category:      "QUESTION",
    title:         `Supplément non reconnu : « ${intake.rawText} »`,
    description:   `Le supplément « ${intake.rawText} » (clé normalisée : ${intake.normalizedKey ?? "—"}) n'a pas été identifié dans la base de connaissance NaturoDesk. ` +
      `Vérifiez l'orthographe ou ajoutez-le manuellement si nécessaire.`,
    confidence:    1.0,
    riskLevel:     "LOW",
    evidenceLevel: "ABSENT",
    sourceType:    "KNOWLEDGE",
    citations:     [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const existing = map.get(k) ?? [];
    existing.push(item);
    map.set(k, existing);
  }
  return map;
}

/**
 * Construit la liste des variantes uniques pour un groupe d'intakes.
 * Ex: ["Magnésium bisglycinate (CHELATE)", "Magnésium marin (MARINE)"]
 */
function uniqueVariantDescriptions(intakes: IntakeWithResolution[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const intake of intakes) {
    if (!intake.variantLabel) continue;
    const desc = intake.variantType
      ? `${intake.variantLabel} (${intake.variantType})`
      : intake.variantLabel;
    if (!seen.has(desc)) {
      seen.add(desc);
      result.push(desc);
    }
  }
  return result;
}

/**
 * Construit une ligne de contexte variante pour les descriptions ODS.
 * Ex: "Forme(s) identifiée(s) : Magnésium bisglycinate (CHELATE), Magnésium marin (MARINE)."
 * Retourne "" si aucune variante.
 */
function buildVariantContextLine(intakes: IntakeWithResolution[]): string {
  const variants = uniqueVariantDescriptions(intakes);
  if (variants.length === 0) return "";
  return `Forme(s) identifiée(s) : ${variants.join(", ")}.`;
}

function truncate(text: string, maxLen: number): string {
  const flat = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  return flat.length <= maxLen ? flat : `${flat.slice(0, maxLen)}…`;
}
