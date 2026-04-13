/**
 * Mapping ScoredFact → FindingInput.
 *
 * Règles de mapping bucket → FindingCategory :
 *   alert         → RED_FLAG      (contre-indication, risque critique)
 *   interaction   → INTERACTION   (interaction médicamenteuse/substance)
 *   warning       → SIDE_EFFECT   (vigilance — FindingCategory la plus proche)
 *   depletion     → DEPLETION     (déplétion nutritionnelle)
 *   contextual    → TERRAIN       (contexte informatif)
 *   low_signal    → ignoré        (signal trop faible, ne pas persister)
 *
 * Titre humain lisible :
 *   DEPLETES       → "Déplétion en {object} sous {subject}"
 *   INTERACTS_WITH → "{subject} — interaction avec {object}"
 *   CONTRAINDICATED_WITH → "{subject} contre-indiqué avec {object}"
 *   Autres         → "{subject} {predicate} {object}"
 *
 * Description : phrase + qualifier + source + score.
 *
 * Citation : une par fact (lien knowledgeFactId + knowledgeChunkId).
 * Chunks supports (matchSource=fact_relation) sans fact associé : une citation chunk.
 */

import type { FindingCategory } from "@prisma/client";
import type { ScoredFact, ChunkRef, AnalysisBucket } from "@/lib/knowledge/analysis/types";
import type { AnalysisResult } from "@/lib/knowledge/analysis/types";
import type { FindingInput, CitationInput } from "../types";

// ---------------------------------------------------------------------------
// Mapping bucket → FindingCategory
// ---------------------------------------------------------------------------

const BUCKET_TO_CATEGORY: Partial<Record<AnalysisBucket, FindingCategory>> = {
  alert:       "RED_FLAG",
  interaction: "INTERACTION",
  warning:     "SIDE_EFFECT",
  depletion:   "DEPLETION",
  contextual:  "TERRAIN",
  // low_signal → ignoré
};

// ---------------------------------------------------------------------------
// Formatage lisible
// ---------------------------------------------------------------------------

const PREDICATE_LABELS: Record<string, string> = {
  DEPLETES:                 "déplétion documentée en",
  INTERACTS_WITH:           "interaction documentée avec",
  CONTRAINDICATED_WITH:     "contre-indiqué avec",
  REDUCES_EFFICACY_OF:      "réduit l'efficacité de",
  POTENTIATES:              "potentialise",
  INHIBITS:                 "inhibe",
  INCREASES_RISK_OF:        "augmente le risque de",
  REQUIRES_MONITORING_WITH: "surveillance requise avec",
  CAUSES:                   "peut provoquer",
  TREATS:                   "indiqué pour",
};

function buildTitle(fact: ScoredFact): string {
  switch (fact.predicate) {
    case "DEPLETES":
      return `Déplétion en ${fact.object} sous ${fact.subject}`;
    case "INTERACTS_WITH":
      return `${fact.subject} — interaction avec ${fact.object}`;
    case "CONTRAINDICATED_WITH":
      return `${fact.subject} contre-indiqué avec ${fact.object}`;
    case "REDUCES_EFFICACY_OF":
      return `${fact.subject} réduit l'efficacité de ${fact.object}`;
    default: {
      const label = PREDICATE_LABELS[fact.predicate] ?? fact.predicate.toLowerCase();
      return `${fact.subject} ${label} ${fact.object}`;
    }
  }
}

function buildDescription(fact: ScoredFact): string {
  const parts: string[] = [];
  const label = PREDICATE_LABELS[fact.predicate] ?? fact.predicate.toLowerCase();
  parts.push(`${fact.subject} ${label} ${fact.object}.`);

  if (fact.qualifier) {
    parts.push(`Contexte : ${fact.qualifier}.`);
  }

  parts.push(
    `Source : ${fact.extractionMethod === "DETERMINISTIC" ? "extraction déterministe" : "LLM assisté"} ` +
      `(score=${fact.finalScore.toFixed(4)}, confiance=${(fact.confidence * 100).toFixed(0)}%).`
  );

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Mapping principal
// ---------------------------------------------------------------------------

/**
 * Convertit un AnalysisResult en liste de FindingInput prêts à persister.
 * Les faits low_signal sont ignorés.
 * Déduplication par titre dans le scope d'un même run (Set en mémoire).
 */
export function mapAnalysisResultToFindings(
  analysisResult: AnalysisResult,
  consultationId: string,
  analysisRunId:  string
): FindingInput[] {
  const findings: FindingInput[] = [];
  const seenTitles = new Set<string>();

  // Lookup rapide chunk → ChunkRef pour les citations chunk
  const chunkRefById = new Map<string, ChunkRef>(
    analysisResult.supporting_chunks.map((c) => [c.chunkId, c])
  );

  const BUCKET_ENTRIES: Array<{ bucket: AnalysisBucket; facts: ScoredFact[] }> = [
    { bucket: "alert",       facts: analysisResult.alerts },
    { bucket: "interaction", facts: analysisResult.interactions },
    { bucket: "warning",     facts: analysisResult.warnings },
    { bucket: "depletion",   facts: analysisResult.depletions },
    { bucket: "contextual",  facts: analysisResult.contextual_notes },
    // low_signal : ignoré
  ];

  for (const { bucket, facts } of BUCKET_ENTRIES) {
    const category = BUCKET_TO_CATEGORY[bucket];
    if (!category) continue;

    for (const fact of facts) {
      const title = buildTitle(fact);

      // Déduplication intra-run
      if (seenTitles.has(title)) continue;
      seenTitles.add(title);

      const citations: CitationInput[] = [];

      // Citation principale : le KnowledgeFact source
      const chunkRef = chunkRefById.get(fact.sourceChunkId);
      citations.push({
        reference:        chunkRef
          ? `${chunkRef.drugKey} — ${chunkRef.label}`
          : `chunk:${fact.sourceChunkId}`,
        excerpt:          chunkRef?.label,
        knowledgeFactId:  fact.factId,
        knowledgeChunkId: fact.sourceChunkId,
      });

      findings.push({
        consultationId,
        analysisRunId,
        category,
        title,
        description: buildDescription(fact),
        confidence:  fact.finalScore,
        riskLevel:   fact.riskLevel,
        sourceType:  "KNOWLEDGE",
        citations,
      });
    }
  }

  return findings;
}
