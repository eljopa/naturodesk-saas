/**
 * Classification des sections documentaires.
 *
 * Chaque sectionPath (ex. "4.8") est mappé vers un kind interne stable.
 * Ce kind est utilisé pour :
 * - le filtrage lors de l'embedding (on ne vectorise pas tout)
 * - le routing dans le rules engine
 * - la recherche sémantique par catégorie
 *
 * Convention : les kinds correspondent aux valeurs de FactType.
 * Cela facilite la dérivation future de KnowledgeFact depuis les chunks.
 */

/** Map des sectionPath BDPM vers les kinds internes. */
const SECTION_KIND_MAP: Record<string, string> = {
  // ── BDPM — sections numérotées RCP ───────────────────────────────────────
  "1": "composition",
  "4.1": "indication",
  "4.2": "dosage",
  "4.3": "contraindication",
  "4.4": "warning",
  "4.5": "interaction",
  "4.6": "pregnancy_warning",
  "4.7": "driving_warning",
  "4.8": "side_effect",
  "4.9": "overdose",
  "5.1": "mechanism",
  "5.2": "pharmacokinetics",
  "5.3": "pharmacokinetics_safety",
  "6": "formulation",

  // ── ODS (NIH) — sections sémantiques issues d'OdsSectionType ─────────────
  // Voir lib/knowledge/ingestion/ods/ods-sections.ts
  OVERVIEW: "general",
  HEALTH_EFFECTS: "indication",
  SAFETY: "warning",
  INTERACTIONS: "interaction",
  DOSAGE_NOTE: "dosage",
};

/**
 * Sections qui doivent recevoir un embedding pgvector.
 * On exclut les sections purement administratives ou posologiques
 * qui ne sont pas utiles pour le matching sémantique clinique.
 */
const INDEXABLE_KINDS = new Set([
  "side_effect",
  "interaction",
  "contraindication",
  "warning",
  "indication",
  "mechanism",
  "pregnancy_warning",
]);

/** Retourne le kind interne correspondant à un sectionPath. */
export function classifySection(sectionPath: string): string {
  return SECTION_KIND_MAP[sectionPath] ?? "general";
}

/** Indique si un chunk de ce kind doit être vectorisé (embedding). */
export function isIndexableKind(kind: string): boolean {
  return INDEXABLE_KINDS.has(kind);
}
