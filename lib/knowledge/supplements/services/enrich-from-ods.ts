/**
 * Enrichissement ODS pour une liste de KnowledgeTerm matchés.
 *
 * Stratégie :
 *   - Requête batch : un seul findMany sur KnowledgeDocument (sourceType=NIH_ODS)
 *   - Filtrage par drugKey = term.normalizedKey (convention d'import ODS)
 *   - Chunks filtrés par kind utile : warning, interaction, dosage, indication
 *   - Retourne une Map termId → OdsEnrichment (présence ou absence de données)
 *
 * Seul le premier chunk de chaque kind est utilisé dans le moteur de findings V1
 * (le plus représentatif, aucun des sub-chunks ne manque d'info critique).
 * Les chunks complets sont disponibles dans l'objet OdsEnrichment pour usage futur.
 */

import { db } from "@/lib/db";
import type { OdsChunkData, OdsEnrichmentMap } from "../types";

/** Kinds de chunks ODS à récupérer pour l'enrichissement. */
const ODS_RELEVANT_KINDS = ["warning", "interaction", "dosage", "indication"] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enrichit une liste de termes matchés avec leurs données ODS.
 *
 * @param terms  Liste de termes à enrichir.
 * @returns      Map termId → OdsEnrichment (toujours peuplée, hasOdsData=false si absent).
 */
export async function enrichTermsFromOds(
  terms: Array<{ termId: string; normalizedKey: string; canonicalName: string }>
): Promise<OdsEnrichmentMap> {
  const result: OdsEnrichmentMap = new Map();

  if (terms.length === 0) return result;

  const normalizedKeys = terms.map((t) => t.normalizedKey);

  // ── Batch query ──────────────────────────────────────────────────────────
  const docs = await db.knowledgeDocument.findMany({
    where: {
      sourceType: "NIH_ODS",
      drugKey:    { in: normalizedKeys },
    },
    select: {
      drugKey: true,
      chunks: {
        where:   { kind: { in: [...ODS_RELEVANT_KINDS] } },
        select:  { id: true, kind: true, label: true, excerpt: true },
        orderBy: [{ kind: "asc" }, { label: "asc" }],
      },
    },
  });

  // ── Build lookup: normalizedKey → chunks ─────────────────────────────────
  const chunksByKey = new Map<string, Array<{ id: string; kind: string; label: string; excerpt: string }>>();
  for (const doc of docs) {
    const existing = chunksByKey.get(doc.drugKey) ?? [];
    chunksByKey.set(doc.drugKey, [...existing, ...doc.chunks]);
  }

  // ── Build OdsEnrichment per term ─────────────────────────────────────────
  for (const term of terms) {
    const allChunks = chunksByKey.get(term.normalizedKey) ?? [];

    const toChunkData = (c: (typeof allChunks)[number]): OdsChunkData => ({
      chunkId:  c.id,
      kind:     c.kind,
      label:    c.label,
      excerpt:  c.excerpt,
      drugKey:  term.normalizedKey,
    });

    const warnings     = allChunks.filter((c) => c.kind === "warning").map(toChunkData);
    const interactions = allChunks.filter((c) => c.kind === "interaction").map(toChunkData);
    const dosageNotes  = allChunks.filter((c) => c.kind === "dosage").map(toChunkData);
    const indications  = allChunks.filter((c) => c.kind === "indication").map(toChunkData);

    const hasOdsData = allChunks.length > 0;

    result.set(term.termId, {
      termId:        term.termId,
      normalizedKey: term.normalizedKey,
      canonicalName: term.canonicalName,
      warnings,
      interactions,
      dosageNotes,
      indications,
      hasOdsData,
    });

    console.log(
      `[supplements:ods] ${term.canonicalName} — ` +
      (hasOdsData
        ? `${warnings.length} warning(s), ${interactions.length} interaction(s), ` +
          `${dosageNotes.length} dosage(s), ${indications.length} indication(s)`
        : "aucune donnée ODS")
    );
  }

  return result;
}
