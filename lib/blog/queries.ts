/**
 * Requêtes de lecture du blog public — spec §7. Ne renvoient que du contenu
 * `status: PUBLISHED`, jamais DRAFT/REVIEW_REQUIRED/FAILED.
 */

import { db } from "@/lib/db";
import type { BlogCluster } from "@prisma/client";
import type { BlogArticleContent } from "./pipeline/content-types";
import type { StoredImage } from "./pipeline/persist-article";

const PER_PAGE = 12;

export interface BlogListItem {
  slug: string;
  cluster: BlogCluster;
  title: string;
  excerpt: string;
  heroImageUrl: string | null;
  publishedAt: Date;
}

export interface BlogListPage {
  items: BlogListItem[];
  total: number;
  page: number;
  perPage: number;
}

export async function getPublishedArticles(
  locale: string,
  opts: { cluster?: BlogCluster; page?: number } = {}
): Promise<BlogListPage> {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const where = {
    locale,
    status: "PUBLISHED" as const,
    ...(opts.cluster ? { topic: { cluster: opts.cluster } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.blogArticle.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        title: true,
        excerpt: true,
        heroImageUrl: true,
        publishedAt: true,
        topic: { select: { slug: true, cluster: true } },
      },
    }),
    db.blogArticle.count({ where }),
  ]);

  const items: BlogListItem[] = rows
    .filter((r) => r.publishedAt !== null)
    .map((r) => ({
      slug: r.topic.slug,
      cluster: r.topic.cluster,
      title: r.title,
      excerpt: r.excerpt,
      heroImageUrl: r.heroImageUrl,
      publishedAt: r.publishedAt as Date,
    }));

  return { items, total, page, perPage: PER_PAGE };
}

export interface BlogArticleDetail {
  slug: string;
  cluster: BlogCluster;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroImageUrl: string | null;
  images: StoredImage[];
  content: BlogArticleContent;
  publishedAt: Date;
  pillarSlug: string | null;
  relatedSlugs: string[];
}

export async function getArticleBySlug(slug: string, locale: string): Promise<BlogArticleDetail | null> {
  const article = await db.blogArticle.findFirst({
    where: { locale, status: "PUBLISHED", topic: { slug } },
    include: { topic: { select: { slug: true, cluster: true, relatedSlugs: true, pillarSlug: true } } },
  });
  if (!article || !article.publishedAt) return null;

  return {
    slug: article.topic.slug,
    cluster: article.topic.cluster,
    title: article.title,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    heroImageUrl: article.heroImageUrl,
    images: (article.images as unknown as StoredImage[]) ?? [],
    content: article.contentJson as unknown as BlogArticleContent,
    publishedAt: article.publishedAt,
    pillarSlug: article.topic.pillarSlug,
    relatedSlugs: article.topic.relatedSlugs,
  };
}

export interface BlogRelatedItem {
  slug: string;
  title: string;
  heroImageUrl: string | null;
}

/** Articles liés : pilier + relatedSlugs en priorité, complétés par le même cluster si besoin. */
export async function getRelatedArticles(
  topic: { slug: string; cluster: BlogCluster; pillarSlug: string | null; relatedSlugs: string[] },
  locale: string,
  limit = 3
): Promise<BlogRelatedItem[]> {
  const candidateSlugs = [topic.pillarSlug, ...topic.relatedSlugs].filter(
    (s): s is string => !!s && s !== topic.slug
  );

  const bySlug =
    candidateSlugs.length > 0
      ? await db.blogArticle.findMany({
          where: { locale, status: "PUBLISHED", topic: { slug: { in: candidateSlugs } } },
          select: { title: true, heroImageUrl: true, topic: { select: { slug: true } } },
        })
      : [];

  const seenSlugs = new Set([topic.slug, ...bySlug.map((a) => a.topic.slug)]);
  const remaining = limit - bySlug.length;

  const byCluster =
    remaining > 0
      ? await db.blogArticle.findMany({
          where: { locale, status: "PUBLISHED", topic: { cluster: topic.cluster, slug: { notIn: [...seenSlugs] } } },
          orderBy: { publishedAt: "desc" },
          take: remaining,
          select: { title: true, heroImageUrl: true, topic: { select: { slug: true } } },
        })
      : [];

  return [...bySlug, ...byCluster].slice(0, limit).map((a) => ({
    slug: a.topic.slug,
    title: a.title,
    heroImageUrl: a.heroImageUrl,
  }));
}
