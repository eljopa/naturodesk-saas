/**
 * Editorial DNA composer — décide, pour un article donné, un jeu indépendant de
 * valeurs d'axes (ton, profondeur, structure, blocs de contenu, familles visuelles)
 * plutôt qu'un format unique fixe. Chaque axe est résolu déterministement à partir
 * des signaux du sujet (cluster, contentType) via le Diversity Governor, biaisé
 * contre ce qui a été utilisé récemment pour que deux articles consécutifs ne
 * partagent pas la même forme.
 *
 * Porté depuis scripts/lib/editorial-dna.mjs (SelfHook). Différence clé : SelfHook
 * lit l'historique récent depuis data/blog-topical-map.json:_meta.recentDna (fichier
 * JSON) ; ici l'historique est passé en paramètre (recentDna) — c'est à l'appelant
 * (pipeline de génération, lot suivant) d'aller le chercher en base via les 5
 * derniers BlogArticle publiés. Ce module reste pur, sans accès DB, donc testable
 * en isolation.
 */

import type { BlogCluster, BlogContentType, BlogDepth, BlogStructure, BlogTone } from "@prisma/client";
import { pickFromRange, pickMany, pickOne } from "./diversity-governor";
import {
  BLOG_DEPTHS,
  BLOG_STRUCTURES,
  BLOG_TONES,
  DEPTH_AFFINITY_BY_CONTENT_TYPE,
  DEPTH_TO_IMAGE_COUNT,
  PROOF_CONTENT_TONE_BOOST,
  STRUCTURE_AFFINITY_BY_TONE,
  TONE_AFFINITY_BY_CLUSTER,
} from "./catalog-tone-depth-structure";
import { BLOG_BLOCKS } from "./catalog-blocks";
import { BLOG_VISUAL_POOLS } from "./catalog-visuals";
import type { BlogBlockType, BlogImageAnchor, BlogVisualFamilyKey } from "./types";

const MAX_HISTORY_ARTICLES = 15;
const BLOCK_HISTORY_WINDOW = 24; // ~6 articles × 4 blocs
const VISUAL_HISTORY_WINDOW = 18; // ~6 articles × 3 images

/** Vecteur DNA d'un article déjà publié — utilisé comme historique anti-répétition. */
export interface RecentDnaEntry {
  slug: string;
  tone: BlogTone;
  depth: BlogDepth;
  structure: BlogStructure;
  blocks: BlogBlockType[];
  visual: { imageCount: number; families: BlogVisualFamilyKey[] };
}

/** Sous-ensemble de BlogTopic nécessaire à la composition du DNA. */
export interface EditorialDnaTopicInput {
  slug: string;
  cluster: BlogCluster;
  contentType: BlogContentType;
  keyword: string;
}

export interface VisualSlot {
  anchor: BlogImageAnchor;
  family: BlogVisualFamilyKey;
}

export interface EditorialDna {
  slug: string;
  tone: BlogTone;
  depth: BlogDepth;
  structure: BlogStructure;
  wordTarget: [number, number];
  sectionRange: [number, number];
  blocks: BlogBlockType[];
  visual: { imageCount: number; families: BlogVisualFamilyKey[]; slots: VisualSlot[] };
}

const ANCHOR_SETS: Record<number, BlogImageAnchor[]> = {
  1: ["hero"],
  2: ["hero", "beforeConclusion"],
  3: ["hero", "midSections", "beforeConclusion"],
  4: ["hero", "afterIntro", "midSections", "beforeConclusion"],
};

function historyOf<T>(recentDna: RecentDnaEntry[], pick: (entry: RecentDnaEntry) => T[]): T[] {
  return recentDna.slice(-MAX_HISTORY_ARTICLES).flatMap(pick);
}

/** Compose le vecteur Editorial DNA complet pour un article. */
export function composeEditorialDNA(topic: EditorialDnaTopicInput, recentDna: RecentDnaEntry[]): EditorialDna {
  const seed = topic.slug || topic.keyword;
  const isProof = topic.contentType === "PREUVE";

  // ── Ton ───────────────────────────────────────────────────────────────────
  const toneBase = TONE_AFFINITY_BY_CLUSTER[topic.cluster] ?? TONE_AFFINITY_BY_CLUSTER._default;
  const toneCandidates: Partial<Record<BlogTone, number>> = { ...toneBase };
  if (isProof) {
    for (const [t, w] of Object.entries(PROOF_CONTENT_TONE_BOOST) as [BlogTone, number][]) {
      toneCandidates[t] = (toneCandidates[t] ?? 0) + w;
    }
  }
  const toneHistory = historyOf(recentDna, (d) => [d.tone]);
  const tone = pickOne(toneCandidates, toneHistory, `${seed}::tone`, { recentWindow: 6, penaltyStrength: 0.6 }) ?? "PEDAGOGIQUE";

  // ── Profondeur ────────────────────────────────────────────────────────────
  const depthCandidates = DEPTH_AFFINITY_BY_CONTENT_TYPE[topic.contentType] ?? DEPTH_AFFINITY_BY_CONTENT_TYPE._default;
  const depthHistory = historyOf(recentDna, (d) => [d.depth]);
  const depth = pickOne(depthCandidates, depthHistory, `${seed}::depth`, { recentWindow: 5, penaltyStrength: 0.55 }) ?? "MOYENNE";
  const depthDef = BLOG_DEPTHS[depth];

  // ── Structure ─────────────────────────────────────────────────────────────
  const structureCandidates = STRUCTURE_AFFINITY_BY_TONE[tone] ?? { MIXTE: 2, MODULAIRE: 1, LINEAIRE: 1 };
  const structureHistory = historyOf(recentDna, (d) => [d.structure]);
  const structure =
    pickOne(structureCandidates, structureHistory, `${seed}::structure`, { recentWindow: 5, penaltyStrength: 0.5 }) ?? "MIXTE";

  // ── Blocs ─────────────────────────────────────────────────────────────────
  const blockCandidates: Partial<Record<BlogBlockType, number>> = {};
  for (const [type, def] of Object.entries(BLOG_BLOCKS) as [BlogBlockType, (typeof BLOG_BLOCKS)[BlogBlockType]][]) {
    const clusterW = def.clusterWeights[topic.cluster] ?? def.clusterWeights._default ?? 1;
    const toneW = def.toneWeights[tone] ?? 1;
    const structW = def.structureWeights[structure] ?? 1;
    const weight = clusterW * toneW * (structW + 0.2); // +0.2 plancher pour ne jamais mettre un bloc totalement à zéro
    if (weight > 0) blockCandidates[type] = weight;
  }
  const blockCountRange: [number, number] = [Math.max(2, depthDef.maxBlocks - 2), depthDef.maxBlocks];
  const blockCountHistory = historyOf(recentDna, (d) => [d.blocks.length]);
  const blockCount = pickFromRange(blockCountRange, blockCountHistory, `${seed}::blockcount`);
  const blockHistory = historyOf(recentDna, (d) => d.blocks).slice(-BLOCK_HISTORY_WINDOW);
  const blocks = pickMany(blockCandidates, blockHistory, `${seed}::blocks`, blockCount, {
    recentWindow: BLOCK_HISTORY_WINDOW,
    penaltyStrength: 0.5,
  });

  // ── Visuel ────────────────────────────────────────────────────────────────
  const imageCountHistory = historyOf(recentDna, (d) => [d.visual.imageCount]);
  const imageCount = pickFromRange(DEPTH_TO_IMAGE_COUNT[depth], imageCountHistory, `${seed}::imgcount`);
  const visualPool = BLOG_VISUAL_POOLS[topic.cluster] ?? BLOG_VISUAL_POOLS._default;
  const lastArticleFamilies = new Set<string>(recentDna.length > 0 ? recentDna[recentDna.length - 1]!.visual.families : []);
  const visualHistory = historyOf(recentDna, (d) => d.visual.families).slice(-VISUAL_HISTORY_WINDOW);
  const families = pickMany(visualPool, visualHistory, `${seed}::visual`, imageCount, {
    recentWindow: 6,
    penaltyStrength: 0.85,
    hardExclude: lastArticleFamilies,
  });
  const anchors = ANCHOR_SETS[families.length] ?? ANCHOR_SETS[1]!;
  const slots: VisualSlot[] = families.map((family, i) => ({ anchor: anchors[i] ?? "hero", family }));

  return {
    slug: topic.slug,
    tone,
    depth,
    structure,
    wordTarget: depthDef.words,
    sectionRange: depthDef.sections,
    blocks,
    visual: { imageCount: slots.length, families, slots },
  };
}

export interface PromptFragments {
  toneInstruction: string;
  structureInstruction: string;
  blockInstructions: { type: BlogBlockType; label: string; instruction: string; schema: string }[];
}

/** Fragments de texte à composer dans le prompt LLM — simple lookup, aucune logique. */
export function buildPromptFragments(dna: EditorialDna): PromptFragments {
  const toneInstruction = BLOG_TONES[dna.tone].voiceInstruction;
  const structureInstruction = BLOG_STRUCTURES[dna.structure].instruction;
  const blockInstructions = dna.blocks.map((type) => ({
    type,
    label: BLOG_BLOCKS[type].label,
    instruction: BLOG_BLOCKS[type].promptInstruction,
    schema: BLOG_BLOCKS[type].jsonSchemaExample,
  }));
  return { toneInstruction, structureInstruction, blockInstructions };
}
