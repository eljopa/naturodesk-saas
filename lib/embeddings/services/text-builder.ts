/**
 * Construction du texte d'embedding.
 *
 * Ne pas envoyer l'excerpt brut à l'API OpenAI.
 * Un texte d'embedding bien construit améliore significativement la qualité
 * du matching sémantique futur, car le modèle comprend mieux le contexte.
 *
 * Structure retenue :
 *   [TYPE DE SECTION]
 *   Label du chunk
 *
 *   Extrait textuel complet
 *
 *   Métadonnées métier utiles (si présentes)
 *
 * isChunkIndexable() est la porte d'entrée : si un chunk n'est pas indexable,
 * on ne dépense pas de tokens OpenAI dessus.
 */

import { isIndexableKind } from "@/lib/knowledge/import/utils/classify";
import type { EmbeddingCandidate } from "../types";

// ---------------------------------------------------------------------------
// Labels humains par kind (en français — cohérent avec le contenu des chunks)
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<string, string> = {
  side_effect: "EFFETS INDÉSIRABLES",
  interaction: "INTERACTIONS MÉDICAMENTEUSES",
  contraindication: "CONTRE-INDICATIONS",
  warning: "MISES EN GARDE ET PRÉCAUTIONS",
  indication: "INDICATIONS THÉRAPEUTIQUES",
  mechanism: "MÉCANISME D'ACTION",
  pregnancy_warning: "GROSSESSE, ALLAITEMENT ET FERTILITÉ",
};

// ---------------------------------------------------------------------------
// Filtrage
// ---------------------------------------------------------------------------

/**
 * Indique si ce chunk doit recevoir un embedding.
 * Délègue à isIndexableKind() de classify.ts — source de vérité unique.
 */
export function isChunkIndexable(candidate: EmbeddingCandidate): boolean {
  return isIndexableKind(candidate.kind);
}

// ---------------------------------------------------------------------------
// Construction du texte
// ---------------------------------------------------------------------------

/**
 * Construit le texte à envoyer à l'API OpenAI pour générer l'embedding.
 *
 * Inclut :
 * - Le type de section en majuscules (contexte pour le modèle)
 * - Le label (identifie la molécule + la catégorie)
 * - L'extrait complet (contenu principal)
 * - Des métadonnées métier sélectionnées selon le kind (enrichissement ciblé)
 */
export function buildEmbeddingText(candidate: EmbeddingCandidate): string {
  const kindLabel = KIND_LABELS[candidate.kind] ?? candidate.kind.toUpperCase();
  const meta = candidate.metaJson;

  const lines: string[] = [
    `[${kindLabel}]`,
    candidate.label,
    "",
    candidate.excerpt,
  ];

  // Enrichissement ciblé selon le kind — uniquement les champs utiles au matching
  if (meta) {
    const extra = buildMetaEnrichment(candidate.kind, meta);
    if (extra) {
      lines.push("", extra);
    }
  }

  return lines.join("\n").trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MetaValue = string | number | boolean | null;

/**
 * Extrait les métadonnées pertinentes pour enrichir le texte d'embedding
 * selon le kind du chunk. Évite de polluer avec des champs inutiles.
 */
function buildMetaEnrichment(
  kind: string,
  meta: Record<string, MetaValue>
): string | null {
  const parts: string[] = [];

  switch (kind) {
    case "side_effect":
      if (typeof meta.depletionRisk === "string") {
        parts.push(`Déplétion documentée : ${meta.depletionRisk}`);
      }
      if (typeof meta.depletionFrequency === "string") {
        parts.push(`Fréquence de déplétion : ${meta.depletionFrequency}`);
      }
      break;

    case "interaction":
      if (typeof meta.interactionTargets === "string") {
        parts.push(`Substances en interaction : ${meta.interactionTargets}`);
      }
      if (typeof meta.interactionMechanism === "string") {
        parts.push(`Mécanisme : ${meta.interactionMechanism}`);
      }
      break;

    case "contraindication":
      if (typeof meta.interactionContraindicated === "string") {
        parts.push(`Contre-indiqué avec : ${meta.interactionContraindicated}`);
      }
      break;

    case "warning":
      if (typeof meta.monitoringNeeded === "string") {
        parts.push(`Surveillance recommandée : ${meta.monitoringNeeded}`);
      }
      if (typeof meta.criticalTiming === "string") {
        parts.push(`Condition critique : ${meta.criticalTiming}`);
      }
      break;

    default:
      break;
  }

  return parts.length > 0 ? parts.join("\n") : null;
}
