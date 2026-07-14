/**
 * Forme du contenu généré pour un article (une locale). Stockée telle quelle
 * dans BlogArticle.contentJson. Le tableau "blocks" contient exactement les
 * blocs choisis par l'Editorial DNA (lib/blog/dna/compose.ts), dans l'ordre.
 */

export interface BlogComparisonTableBlock {
  type: "comparisonTable";
  caption: string;
  headers: string[];
  rows: string[][];
}

export interface BlogFaqBlock {
  type: "faq";
  items: { q: string; a: string }[];
}

export interface BlogChecklistBlock {
  type: "checklist";
  items: string[];
}

export interface BlogPlanActionBlock {
  type: "planAction";
  steps: { title: string; body: string }[];
}

export interface BlogCaseStudyBlock {
  type: "caseStudy";
  body: string;
}

export interface BlogKeyTakeawaysBlock {
  type: "keyTakeaways";
  items: string[];
}

export interface BlogSourcesBlock {
  type: "sources";
  items: { label: string; note: string }[];
}

export interface BlogTimelineBlock {
  type: "timeline";
  items: { period: string; body: string }[];
}

export interface BlogQuoteBlock {
  type: "quote";
  text: string;
}

export interface BlogExpertFocusBlock {
  type: "expertFocus";
  body: string;
}

export interface BlogCommonMistakesBlock {
  type: "commonMistakes";
  items: { title: string; body: string }[];
}

export type BlogContentBlock =
  | BlogComparisonTableBlock
  | BlogFaqBlock
  | BlogChecklistBlock
  | BlogPlanActionBlock
  | BlogCaseStudyBlock
  | BlogKeyTakeawaysBlock
  | BlogSourcesBlock
  | BlogTimelineBlock
  | BlogQuoteBlock
  | BlogExpertFocusBlock
  | BlogCommonMistakesBlock;

export interface BlogArticleSection {
  title: string;
  body: string;
  list?: string[];
}

/** Clés top-level connues — toute autre clé injectée par le modèle est supprimée. */
export const ARTICLE_CONTENT_KEYS = new Set([
  "title",
  "metaTitle",
  "metaDescription",
  "quickAnswer",
  "definition",
  "intro",
  "sections",
  "naturodeskContext",
  "blocks",
  "conclusion",
]);

export interface BlogArticleContent {
  title: string;
  metaTitle: string;
  metaDescription: string;
  /** "Réponse rapide" — bloc GEO obligatoire, 40-80 mots. */
  quickAnswer: string;
  /** 1-2 phrases au format "[Terme] est...", citable directement par un moteur IA. */
  definition: string;
  /** 150-200 mots. */
  intro: string;
  sections: BlogArticleSection[];
  /** 80-120 mots, doit citer littéralement "NaturoDesk". */
  naturodeskContext: string;
  blocks: BlogContentBlock[];
  /** 80-120 mots. */
  conclusion: string;
}

const KNOWN_BLOCK_TYPES = new Set<BlogContentBlock["type"]>([
  "comparisonTable",
  "faq",
  "checklist",
  "planAction",
  "caseStudy",
  "keyTakeaways",
  "sources",
  "timeline",
  "quote",
  "expertFocus",
  "commonMistakes",
]);

/**
 * Supprime les clés privées/internes injectées par le modèle : clés commençant
 * par "_", clés inconnues au niveau racine, blocs dont le "type" n'est pas au
 * catalogue. Partagé entre la génération FR (generate-text.ts) et l'adaptation
 * EN (translate-text.ts) — même forme de réponse JSON attendue dans les deux cas.
 */
export function stripPrivateFields(raw: Record<string, unknown>): BlogArticleContent {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("_")) continue;
    if (!ARTICLE_CONTENT_KEYS.has(key)) continue;
    cleaned[key] = value;
  }
  if (Array.isArray(cleaned.blocks)) {
    cleaned.blocks = (cleaned.blocks as Array<Record<string, unknown>>).filter(
      (b) => b && typeof b.type === "string" && KNOWN_BLOCK_TYPES.has(b.type as BlogContentBlock["type"])
    );
  } else {
    cleaned.blocks = [];
  }
  return cleaned as unknown as BlogArticleContent;
}
