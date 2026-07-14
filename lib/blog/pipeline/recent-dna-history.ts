/**
 * Historique DNA récent pour l'anti-répétition — équivalent DB de
 * data/blog-topical-map.json:_meta.recentDna (SelfHook). Contrairement à
 * SelfHook qui persiste ce tableau dans le fichier JSON après chaque
 * publication, ici il est recalculé à la volée depuis les derniers
 * BlogArticle publiés : pas d'état dupliqué à maintenir (spec §4).
 */

import { db } from "@/lib/db";
import type { RecentDnaEntry } from "../dna/compose";
import type { BlogBlockType, BlogVisualFamilyKey } from "../dna/types";

const DEFAULT_LIMIT = 5;

interface StoredImage {
  slot: string;
  url: string;
  visualFamily: string;
}

/**
 * Renvoie les vecteurs DNA des derniers articles FR publiés, du plus ancien au
 * plus récent (le dernier élément est l'article le plus récent — convention
 * attendue par composeEditorialDNA()).
 */
export async function getRecentDnaHistory(limit = DEFAULT_LIMIT): Promise<RecentDnaEntry[]> {
  const recent = await db.blogArticle.findMany({
    where: { locale: "fr", status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: { topic: { select: { slug: true } } },
  });

  const entries: RecentDnaEntry[] = recent.map((article) => {
    const images = (Array.isArray(article.images) ? (article.images as unknown as StoredImage[]) : []) ?? [];
    return {
      slug: article.topic.slug,
      tone: article.toneUsed,
      depth: article.depthUsed,
      structure: article.structureUsed,
      blocks: article.blocksUsed as BlogBlockType[],
      visual: {
        imageCount: images.length,
        families: images.map((i) => i.visualFamily as BlogVisualFamilyKey),
      },
    };
  });

  return entries.reverse();
}
