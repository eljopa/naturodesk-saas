/**
 * Score qualité (0-100) et validation dure — porté depuis computeQualityScore()
 * et hardValidate() de scripts/blog-auto-publish.mjs (SelfHook), adapté au
 * contrat structurel de la spec (§5.7) : seuil de publication 80/100.
 *
 * Le score est calculé contre le PLAN DNA de l'article lui-même (pas une liste
 * fixe) : un article avec 3 blocs n'est jamais pénalisé de ne pas avoir les 8
 * blocs du catalogue, seulement les 3 qui étaient prévus pour lui.
 */

import type { EditorialDna } from "../dna/compose";
import type { BlogArticleContent, BlogContentBlock } from "./content-types";
import { findForbiddenTerms } from "./language-guardrails";

const QUALITY_THRESHOLD = 80;

type BlockValidator = (block: BlogContentBlock) => boolean;

const BLOCK_MIN_REQUIREMENTS: Record<BlogContentBlock["type"], BlockValidator> = {
  comparisonTable: (b) => b.type === "comparisonTable" && b.headers.length >= 2 && b.rows.length >= 2,
  faq: (b) => b.type === "faq" && b.items.length >= 2 && b.items.every((i) => i.q && i.a),
  checklist: (b) => b.type === "checklist" && b.items.length >= 4,
  planAction: (b) => b.type === "planAction" && b.steps.length >= 2,
  caseStudy: (b) => b.type === "caseStudy" && b.body.length >= 60,
  keyTakeaways: (b) => b.type === "keyTakeaways" && b.items.length >= 3,
  sources: (b) => b.type === "sources" && b.items.length >= 2,
  timeline: (b) => b.type === "timeline" && b.items.length >= 2,
  quote: (b) => b.type === "quote" && b.text.length >= 10,
  expertFocus: (b) => b.type === "expertFocus" && b.body.length >= 40,
  commonMistakes: (b) => b.type === "commonMistakes" && b.items.length >= 2,
};

function findBlock(content: BlogArticleContent, type: BlogContentBlock["type"]): BlogContentBlock | null {
  return content.blocks.find((b) => b.type === type) ?? null;
}

/** Estimation du nombre de mots du contenu (tous champs texte confondus). */
export function estimateWordCount(content: BlogArticleContent): number {
  const blockText = content.blocks
    .map((b) => {
      const { type: _type, ...rest } = b;
      return JSON.stringify(rest).replace(/[{}[\]",:]/g, " ");
    })
    .join(" ");
  const text = [
    content.quickAnswer,
    content.definition,
    content.intro,
    ...content.sections.map((s) => `${s.body} ${(s.list ?? []).join(" ")}`),
    content.naturodeskContext,
    content.conclusion,
    blockText,
  ]
    .filter(Boolean)
    .join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

const CONCRETE_ELEMENT_MARKERS = [
  "par exemple",
  "concrètement",
  "en pratique",
  "cas pratique",
  "checklist",
  "retour d'expérience",
  "résultat",
  "étude de cas",
  "scénario",
  "données",
  "exemple",
  "cas d'usage",
  "chiffre d'affaires",
  "patientèle",
  "cabinet",
];

/** L'article doit contenir au moins un élément concret (spec §5.7). */
export function detectConcreteElement(content: BlogArticleContent): boolean {
  const fullText = JSON.stringify(content).toLowerCase();
  return CONCRETE_ELEMENT_MARKERS.some((marker) => fullText.includes(marker));
}

export interface InternalLinkCandidates {
  hasPillarLink: boolean;
  clusterLinkCount: number;
}

export interface QualityCheck {
  points: number;
  description: string;
  passed: boolean;
}

export interface QualityScoreResult {
  score: number;
  total: number;
  checks: QualityCheck[];
}

/** Calcule le score qualité 0-100 d'un contenu contre le plan DNA de l'article. */
export function computeQualityScore(
  content: BlogArticleContent,
  dna: EditorialDna,
  links: InternalLinkCandidates
): QualityScoreResult {
  const checks: QualityCheck[] = [];
  const add = (points: number, description: string, passed: boolean) => checks.push({ points, description, passed });

  // Title / meta (15 pts)
  add(5, "title présent & ≤ 70 caractères", !!content.title && content.title.length <= 70);
  add(5, "metaTitle ≤ 60 caractères", !!content.metaTitle && content.metaTitle.length <= 60);
  add(
    5,
    "metaDescription 140-165 caractères",
    !!content.metaDescription && content.metaDescription.length >= 140 && content.metaDescription.length <= 165
  );

  // Contenu vs plan DNA (15 pts)
  const wordCount = estimateWordCount(content);
  add(8, `nombre de mots ≥ ${dna.wordTarget[0]} (obtenu ~${wordCount})`, wordCount >= dna.wordTarget[0] * 0.9);
  add(4, "quickAnswer ≤ 82 mots", !!content.quickAnswer && content.quickAnswer.split(/\s+/).length <= 82);
  add(3, `sections ≥ ${dna.sectionRange[0]}`, content.sections.length >= dna.sectionRange[0]);

  // Colonne vertébrale GEO (15 pts)
  add(6, "definition présente & ≥ 30 caractères", !!content.definition && content.definition.length >= 30);
  const questionH2Count = content.sections.filter((s) => s.title?.endsWith("?")).length;
  add(5, "au moins 1 titre H2 en question", questionH2Count >= 1);
  add(4, "intro présente & ≥ 100 mots", !!content.intro && content.intro.split(/\s+/).length >= 100);

  // Blocs Editorial DNA (25 pts) — scoré contre le plan de CET article
  const perBlock = dna.blocks.length > 0 ? 25 / dna.blocks.length : 0;
  for (const type of dna.blocks) {
    const block = findBlock(content, type);
    const valid = !!block && BLOCK_MIN_REQUIREMENTS[type](block);
    add(Math.round(perBlock * 10) / 10, `bloc [${type}] présent & valide`, valid);
  }

  // NaturoDesk + élément concret (16 pts)
  add(8, "naturodeskContext mentionne 'NaturoDesk'", !!content.naturodeskContext && content.naturodeskContext.includes("NaturoDesk"));
  add(8, "élément concret détecté", detectConcreteElement(content));

  // Maillage interne (14 pts)
  add(6, "lien pilier sélectionné", links.hasPillarLink);
  add(4, "au moins 4 liens de cluster", links.clusterLinkCount >= 4);
  add(4, "au moins 1 lien de cluster", links.clusterLinkCount >= 1);

  const score = checks.reduce((sum, c) => sum + (c.passed ? c.points : 0), 0);
  const total = checks.reduce((sum, c) => sum + c.points, 0);
  return { score: Math.round(score), total: Math.round(total), checks };
}

/** Validation dure — un seul échec place l'article en REVIEW_REQUIRED. */
export function hardValidate(content: BlogArticleContent, score: number, dna: EditorialDna): string[] {
  const errors: string[] = [];

  if (!content.title) errors.push("Titre manquant");
  if (!content.quickAnswer) errors.push("quickAnswer manquant (bloc GEO 'Réponse rapide')");
  if (!content.definition || content.definition.length < 30) errors.push("definition manquante ou trop courte");
  if (!content.naturodeskContext) errors.push("naturodeskContext manquant");
  if (content.naturodeskContext && !content.naturodeskContext.includes("NaturoDesk")) {
    errors.push("naturodeskContext doit citer littéralement 'NaturoDesk'");
  }
  if (!content.sections || content.sections.length < dna.sectionRange[0]) {
    errors.push(`Besoin d'au moins ${dna.sectionRange[0]} sections (profondeur DNA : ${dna.depth})`);
  }
  if (!content.conclusion) errors.push("Conclusion manquante");

  const wordCount = estimateWordCount(content);
  if (wordCount < dna.wordTarget[0] * 0.85) {
    errors.push(`Nombre de mots trop faible : ${wordCount} (cible DNA ≥ ${dna.wordTarget[0]}, profondeur : ${dna.depth})`);
  }

  for (const type of dna.blocks) {
    const block = findBlock(content, type);
    if (!block) {
      errors.push(`Bloc prévu [${type}] manquant`);
      continue;
    }
    if (!BLOCK_MIN_REQUIREMENTS[type](block)) errors.push(`Bloc [${type}] présent mais malformé`);
  }

  if (score < QUALITY_THRESHOLD) errors.push(`Score qualité ${score}/100 < seuil ${QUALITY_THRESHOLD}`);

  for (const hit of findForbiddenTerms(content)) {
    errors.push(`Terme interdit "${hit.term}" dans ${hit.field} :\n       → "${hit.context}"`);
  }

  return errors;
}

export { QUALITY_THRESHOLD };
