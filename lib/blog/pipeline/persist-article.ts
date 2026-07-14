/**
 * Mise en forme des données à écrire dans BlogArticle — module pur, séparé de
 * l'orchestrateur (run-generation.ts) pour rester testable sans base de
 * données. L'upsert lui-même (impur) vit dans l'orchestrateur.
 */

import type { BlogArticleStatus } from "@prisma/client";
import type { EditorialDna } from "../dna/compose";
import type { BlogArticleContent } from "./content-types";
import type { ReplacementLogEntry } from "./language-guardrails";
import type { QualityScoreResult } from "./quality-score";

export interface StoredImage {
  slot: string;
  url: string;
  visualFamily: string;
}

export interface ArticleGenerationOutcome {
  content: BlogArticleContent;
  scoreResult: QualityScoreResult;
  hardErrors: string[];
  replacementLog: ReplacementLogEntry[];
}

export interface BlogArticleRowData {
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  contentJson: BlogArticleContent;
  heroImageUrl: string | null;
  images: StoredImage[];
  toneUsed: EditorialDna["tone"];
  depthUsed: EditorialDna["depth"];
  structureUsed: EditorialDna["structure"];
  blocksUsed: string[];
  qualityScore: number;
  status: BlogArticleStatus;
  publishedAt: Date | null;
  generationLog: { errors: string[]; warnings: string[] };
}

/** Construit les champs BlogArticle à partir d'un résultat de génération/traduction. */
export function buildArticleRowData(
  dna: EditorialDna,
  outcome: ArticleGenerationOutcome,
  images: StoredImage[],
  status: Extract<BlogArticleStatus, "PUBLISHED" | "REVIEW_REQUIRED">
): BlogArticleRowData {
  return {
    title: outcome.content.title,
    excerpt: outcome.content.quickAnswer,
    metaTitle: outcome.content.metaTitle,
    metaDescription: outcome.content.metaDescription,
    contentJson: outcome.content,
    heroImageUrl: images.find((i) => i.slot === "hero")?.url ?? null,
    images,
    toneUsed: dna.tone,
    depthUsed: dna.depth,
    structureUsed: dna.structure,
    blocksUsed: dna.blocks,
    qualityScore: outcome.scoreResult.score,
    status,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    generationLog: {
      errors: outcome.hardErrors,
      warnings: outcome.replacementLog.map((r) => `${r.label}: "${r.original}" → "${r.neutral}"`),
    },
  };
}
