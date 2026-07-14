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
import { composeEditorialDNA } from "../dna/compose";
import { generateArticleImages } from "./generate-images";
import { generateArticleText } from "./generate-text";
import { getRecentDnaHistory } from "./recent-dna-history";
import { resolveInternalLinks } from "./internal-links";
import { buildArticleRowData, type BlogArticleRowData, type StoredImage } from "./persist-article";
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

async function upsertArticle(topicId: string, locale: "fr" | "en", rowData: BlogArticleRowData): Promise<void> {
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

    const images = await generateArticleImages(dna, { slug: topic.slug, keyword: topic.keyword });

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
