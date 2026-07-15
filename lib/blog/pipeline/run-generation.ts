/**
 * Orchestrateur du pipeline de génération — spec §6. Exécute un run complet :
 * sélection du sujet → composition DNA → génération FR → (arrêt si score FR
 * insuffisant) → adaptation EN → génération des images → sauvegarde.
 *
 * Les images sont générées une seule fois par article (pas par locale — un
 * visuel n'a pas besoin d'être traduit) et partagées entre les lignes
 * BlogArticle fr et en.
 *
 * Décision produit : si le FR passe la validation mais que l'adaptation EN
 * échoue, l'article FR est quand même publié (la France est le marché
 * principal, cf. spec §11) — seule la ligne EN reste en REVIEW_REQUIRED et le
 * BlogTopic global aussi, pour qu'un admin puisse régénérer l'anglais sans
 * retoucher le français déjà validé.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendBlogGenerationFailedEmail, sendBlogTopicsLowEmail } from "@/lib/email";
import { composeEditorialDNA, type EditorialDna } from "../dna/compose";
import { BLOG_DEPTHS } from "../dna/catalog-tone-depth-structure";
import type { BlogBlockType } from "../dna/types";
import { generateArticleImages } from "./generate-images";
import { generateArticleText } from "./generate-text";
import { getRecentDnaHistory } from "./recent-dna-history";
import { resolveInternalLinks } from "./internal-links";
import { buildArticleRowData, type BlogArticleRowData, type StoredImage } from "./persist-article";
import type { BlogArticleContent } from "./content-types";
import type { PromptTopicInput } from "./prompt";
import { selectNextTopic } from "./select-topic";
import { translateArticleText } from "./translate-text";

const LOW_TOPICS_THRESHOLD = 5;
const NO_IMAGES: StoredImage[] = []; // sujet non publié (REVIEW_REQUIRED côté FR) — pas d'images générées

export type RunGenerationStatus = "disabled" | "no_topic" | "review_required" | "published" | "failed";

export interface RunGenerationResult {
  status: RunGenerationStatus;
  topicSlug?: string;
  frScore?: number;
  enScore?: number;
  errors?: string[];
}

async function warnIfTopicsLow(): Promise<void> {
  const remaining = await db.blogTopic.count({ where: { status: "PLANNED" } });
  if (remaining < LOW_TOPICS_THRESHOLD) {
    await sendBlogTopicsLowEmail(remaining).catch((err) => console.error("[blog] Alerte calendrier bas non envoyée:", err));
  }
}

export async function upsertArticle(topicId: string, locale: "fr" | "en", rowData: BlogArticleRowData): Promise<void> {
  const data = {
    ...rowData,
    contentJson: rowData.contentJson as unknown as Prisma.InputJsonValue,
    images: rowData.images as unknown as Prisma.InputJsonValue,
    generationLog: rowData.generationLog as unknown as Prisma.InputJsonValue,
  };
  await db.blogArticle.upsert({
    where: { topicId_locale: { topicId, locale } },
    create: { topicId, locale, ...data },
    update: data,
  });
}

/** Exécute un run complet du pipeline. Ne lève jamais — les erreurs sont capturées et renvoyées dans le résultat. */
export async function runBlogGenerationOnce(): Promise<RunGenerationResult> {
  if (process.env.BLOG_AUTOPUBLISH_ENABLED === "false") {
    return { status: "disabled" };
  }

  const topic = await selectNextTopic();
  if (!topic) {
    return { status: "no_topic" };
  }

  try {
    await db.blogTopic.update({ where: { id: topic.id }, data: { status: "GENERATING" } });

    const recentDna = await getRecentDnaHistory();
    const dna = composeEditorialDNA(
      { slug: topic.slug, cluster: topic.cluster, contentType: topic.contentType, keyword: topic.keyword },
      recentDna
    );

    const promptTopic: PromptTopicInput = {
      keyword: topic.keyword,
      secondaryKeywords: topic.secondaryKeywords,
      cluster: topic.cluster,
      contentType: topic.contentType,
      naturodeskContext: topic.naturodeskContext,
    };

    const frLinks = await resolveInternalLinks(topic, "fr");
    const frResult = await generateArticleText(promptTopic, dna, frLinks.candidates, frLinks);

    if (frResult.hardErrors.length > 0) {
      await upsertArticle(topic.id, "fr", buildArticleRowData(dna, frResult, NO_IMAGES, "REVIEW_REQUIRED"));
      await db.blogTopic.update({ where: { id: topic.id }, data: { status: "REVIEW_REQUIRED" } });
      await warnIfTopicsLow();
      return {
        status: "review_required",
        topicSlug: topic.slug,
        frScore: frResult.scoreResult.score,
        errors: frResult.hardErrors,
      };
    }

    const enLinks = await resolveInternalLinks(topic, "en");
    const enResult = await translateArticleText(frResult.content, dna, enLinks.candidates, enLinks);
    const enPassed = enResult.hardErrors.length === 0;

    const images = await generateArticleImages(dna.visual.slots, { slug: topic.slug, keyword: topic.keyword });

    await upsertArticle(topic.id, "fr", buildArticleRowData(dna, frResult, images, "PUBLISHED"));
    await upsertArticle(topic.id, "en", buildArticleRowData(dna, enResult, images, enPassed ? "PUBLISHED" : "REVIEW_REQUIRED"));

    const topicStatus = enPassed ? "PUBLISHED" : "REVIEW_REQUIRED";
    await db.blogTopic.update({ where: { id: topic.id }, data: { status: topicStatus } });
    await warnIfTopicsLow();

    return {
      status: topicStatus === "PUBLISHED" ? "published" : "review_required",
      topicSlug: topic.slug,
      frScore: frResult.scoreResult.score,
      enScore: enResult.scoreResult.score,
      errors: enPassed ? undefined : enResult.hardErrors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.blogTopic
      .update({ where: { id: topic.id }, data: { status: "FAILED", errorMessage: message.slice(0, 2000) } })
      .catch(() => {});
    await sendBlogGenerationFailedEmail(topic.slug, message).catch((e) => console.error("[blog] Alerte d'échec non envoyée:", e));
    return { status: "failed", topicSlug: topic.slug, errors: [message] };
  }
}

export type TranslateExistingArticleStatus = "no_fr_article" | "already_translated" | "published" | "review_required";

export interface TranslateExistingArticleResult {
  status: TranslateExistingArticleStatus;
  enScore?: number;
  errors?: string[];
}

/**
 * Traduit en EN un article FR déjà publié qui n'a pas encore de version EN —
 * cas d'un article publié manuellement avant que le pipeline n'atteigne
 * l'étape de traduction (ex : correctif d'amorçage, spec §6). Reconstruit un
 * EditorialDna minimal à partir des colonnes toneUsed/depthUsed/structureUsed/
 * blocksUsed déjà stockées sur la ligne FR — dna.visual n'est pas nécessaire,
 * translate-text.ts ne l'utilise pas.
 */
export async function translateExistingArticle(topicId: string): Promise<TranslateExistingArticleResult> {
  const [topic, frArticle, existingEn] = await Promise.all([
    db.blogTopic.findUnique({ where: { id: topicId } }),
    db.blogArticle.findUnique({ where: { topicId_locale: { topicId, locale: "fr" } } }),
    db.blogArticle.findUnique({ where: { topicId_locale: { topicId, locale: "en" } } }),
  ]);
  if (!topic || !frArticle || frArticle.status !== "PUBLISHED") return { status: "no_fr_article" };
  if (existingEn) return { status: "already_translated" };

  const depthDef = BLOG_DEPTHS[frArticle.depthUsed];
  const dna: EditorialDna = {
    slug: topic.slug,
    tone: frArticle.toneUsed,
    depth: frArticle.depthUsed,
    structure: frArticle.structureUsed,
    wordTarget: depthDef.words,
    sectionRange: depthDef.sections,
    blocks: frArticle.blocksUsed as BlogBlockType[],
    visual: { imageCount: 0, families: [], slots: [] },
  };

  const enLinks = await resolveInternalLinks(topic, "en");
  const frContent = frArticle.contentJson as unknown as BlogArticleContent;
  const enResult = await translateArticleText(frContent, dna, enLinks.candidates, enLinks);
  const enPassed = enResult.hardErrors.length === 0;

  const images = (frArticle.images as unknown as StoredImage[]) ?? [];
  await upsertArticle(topicId, "en", buildArticleRowData(dna, enResult, images, enPassed ? "PUBLISHED" : "REVIEW_REQUIRED"));
  await db.blogTopic.update({ where: { id: topicId }, data: { status: enPassed ? "PUBLISHED" : "REVIEW_REQUIRED" } });

  return {
    status: enPassed ? "published" : "review_required",
    enScore: enResult.scoreResult.score,
    errors: enPassed ? undefined : enResult.hardErrors,
  };
}
