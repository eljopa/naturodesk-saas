/**
 * Sélection du prochain sujet à générer — porté depuis selectNextArticle() de
 * scripts/blog-auto-publish.mjs (SelfHook). Différence : SelfHook lit/écrit un
 * compteur dans data/blog-topical-map.json:_meta.articlesSinceLastProofContent ;
 * ici ce compteur est recalculé à la volée depuis les BlogArticle publiés, pas
 * besoin de le persister séparément (spec §6 étape 2).
 */

import { db } from "@/lib/db";
import type { BlogTopic } from "@prisma/client";

const PROOF_CONTENT_INTERVAL = 8;
const CLUSTER_ROTATION_WINDOW = 2;

async function countArticlesSinceLastProof(): Promise<number> {
  const recent = await db.blogArticle.findMany({
    where: { locale: "fr", status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { topic: { select: { contentType: true } } },
  });
  let count = 0;
  for (const article of recent) {
    if (article.topic.contentType === "PREUVE") break;
    count++;
  }
  return count;
}

async function getLastPublishedClusters(limit: number): Promise<string[]> {
  const recent = await db.blogArticle.findMany({
    where: { locale: "fr", status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: { topic: { select: { cluster: true } } },
  });
  return recent.map((a) => a.topic.cluster);
}

/** Choisit le prochain BlogTopic à générer, ou null s'il n'y a plus rien de PLANNED. */
export async function selectNextTopic(): Promise<BlogTopic | null> {
  const sinceProof = await countArticlesSinceLastProof();
  if (sinceProof >= PROOF_CONTENT_INTERVAL) {
    const proof = await db.blogTopic.findFirst({
      where: { status: "PLANNED", contentType: "PREUVE" },
      orderBy: { priority: "asc" },
    });
    if (proof) return proof;
  }

  const lastClusters = await getLastPublishedClusters(CLUSTER_ROTATION_WINDOW);

  const planned = await db.blogTopic.findMany({
    where: { status: "PLANNED", contentType: { not: "PREUVE" } },
    orderBy: [{ priority: "asc" }, { cluster: "asc" }],
  });

  if (planned.length === 0) {
    return db.blogTopic.findFirst({ where: { status: "PLANNED", contentType: "PREUVE" }, orderBy: { priority: "asc" } });
  }

  const rotated = planned.find((t) => !lastClusters.includes(t.cluster));
  // Pool trop petit pour respecter la rotation de cluster — on relâche la contrainte
  // plutôt que de bloquer la publication.
  return rotated ?? planned[0]!;
}
