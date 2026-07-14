"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/admin/audit";
import { generateArticleImages } from "@/lib/blog/pipeline/generate-images";
import { runBlogGenerationOnce } from "@/lib/blog/pipeline/run-generation";
import type { StoredImage } from "@/lib/blog/pipeline/persist-article";
import type { VisualSlot } from "@/lib/blog/dna/compose";
import type { BlogImageAnchor, BlogVisualFamilyKey } from "@/lib/blog/dna/types";

export type AdminBlogErrorCode = "not_found" | "no_images" | "generic_error";
export type AdminBlogFormState = { errorCode?: AdminBlogErrorCode; success?: boolean } | null;

/** Recalcule BlogTopic.status à partir du statut de ses BlogArticle : PUBLISHED seulement si toutes les locales le sont. */
async function syncTopicStatus(topicId: string): Promise<void> {
  const articles = await db.blogArticle.findMany({ where: { topicId }, select: { status: true } });
  if (articles.length === 0) return;
  const allPublished = articles.every((a) => a.status === "PUBLISHED");
  await db.blogTopic.update({ where: { id: topicId }, data: { status: allPublished ? "PUBLISHED" : "REVIEW_REQUIRED" } });
}

export async function publishArticleAction(
  articleId: string,
  _prevState: AdminBlogFormState,
  _formData: FormData
): Promise<AdminBlogFormState> {
  const admin = await requireAdmin();
  const article = await db.blogArticle.findUnique({ where: { id: articleId } });
  if (!article) return { errorCode: "not_found" };

  try {
    await db.blogArticle.update({
      where: { id: articleId },
      data: { status: "PUBLISHED", publishedAt: article.publishedAt ?? new Date() },
    });
    await syncTopicStatus(article.topicId);
  } catch {
    return { errorCode: "generic_error" };
  }

  await logAdminAction({ adminId: admin.id, action: "blog.article.publish", targetType: "BlogArticle", targetId: articleId });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

export async function unpublishArticleAction(
  articleId: string,
  _prevState: AdminBlogFormState,
  _formData: FormData
): Promise<AdminBlogFormState> {
  const admin = await requireAdmin();
  const article = await db.blogArticle.findUnique({ where: { id: articleId } });
  if (!article) return { errorCode: "not_found" };

  try {
    await db.blogArticle.update({ where: { id: articleId }, data: { status: "UNPUBLISHED" } });
    await syncTopicStatus(article.topicId);
  } catch {
    return { errorCode: "generic_error" };
  }

  await logAdminAction({ adminId: admin.id, action: "blog.article.unpublish", targetType: "BlogArticle", targetId: articleId });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

/**
 * Régénère les images d'un topic en réutilisant les mêmes emplacements/familles
 * visuelles déjà choisies (reconstruits depuis les images FR existantes) — ne
 * relance pas le tirage DNA, qui donnerait des familles différentes à chaque
 * appel à cause de l'anti-répétition.
 */
export async function regenerateArticleImagesAction(
  topicId: string,
  _prevState: AdminBlogFormState,
  _formData: FormData
): Promise<AdminBlogFormState> {
  const admin = await requireAdmin();
  const topic = await db.blogTopic.findUnique({ where: { id: topicId } });
  if (!topic) return { errorCode: "not_found" };

  const frArticle = await db.blogArticle.findUnique({ where: { topicId_locale: { topicId, locale: "fr" } } });
  const existingImages = (frArticle?.images as unknown as StoredImage[] | null) ?? [];
  if (existingImages.length === 0) return { errorCode: "no_images" };

  const slots: VisualSlot[] = existingImages.map((img) => ({
    anchor: img.slot as BlogImageAnchor,
    family: img.visualFamily as BlogVisualFamilyKey,
  }));

  try {
    const newImages = await generateArticleImages(slots, { slug: topic.slug, keyword: topic.keyword });
    const heroImageUrl = newImages.find((i) => i.slot === "hero")?.url ?? null;
    await db.blogArticle.updateMany({
      where: { topicId },
      data: { images: newImages as unknown as Prisma.InputJsonValue, heroImageUrl },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  await logAdminAction({ adminId: admin.id, action: "blog.images.regenerate", targetType: "BlogTopic", targetId: topicId });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

export async function deleteTopicAction(
  topicId: string,
  _prevState: AdminBlogFormState,
  _formData: FormData
): Promise<AdminBlogFormState> {
  const admin = await requireAdmin();
  const topic = await db.blogTopic.findUnique({ where: { id: topicId } });
  if (!topic) return { errorCode: "not_found" };

  try {
    await db.$transaction([
      db.blogArticle.deleteMany({ where: { topicId } }),
      db.blogTopic.delete({ where: { id: topicId } }),
    ]);
  } catch {
    return { errorCode: "generic_error" };
  }

  await logAdminAction({
    adminId: admin.id,
    action: "blog.topic.delete",
    targetType: "BlogTopic",
    targetId: topicId,
    meta: { slug: topic.slug },
  });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

/** Force le prochain sujet PLANNED à passer dans le pipeline, sans attendre le cron. */
export async function generateBlogArticleNowAction(
  _prevState: AdminBlogFormState,
  _formData: FormData
): Promise<AdminBlogFormState> {
  const admin = await requireAdmin();
  const result = await runBlogGenerationOnce();

  await logAdminAction({
    adminId: admin.id,
    action: "blog.generate_now",
    targetType: "BlogTopic",
    targetId: result.topicSlug,
    meta: { status: result.status, frScore: result.frScore, enScore: result.enScore },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");

  if (result.status === "failed" || result.status === "no_topic") {
    return { errorCode: "generic_error" };
  }
  return { success: true };
}
