/**
 * Résolution des candidats de maillage interne — spec §5.8 : lien pilier +
 * 1-4 liens de cluster, références souples (pillarSlug/relatedSlugs sont de
 * simples chaînes sur BlogTopic, pas de clé étrangère). Un slug introuvable
 * ou pas encore publié est simplement ignoré, jamais une erreur bloquante.
 */

import { db } from "@/lib/db";
import type { BlogCluster } from "@prisma/client";
import type { LinkCandidate } from "./prompt";
import type { InternalLinkCandidates } from "./quality-score";

export interface InternalLinkResolution extends InternalLinkCandidates {
  candidates: LinkCandidate[];
}

export interface InternalLinkTopicInput {
  slug: string;
  cluster: BlogCluster;
  pillarSlug: string | null;
  relatedSlugs: string[];
}

const MAX_CLUSTER_LINKS = 4;
const MAX_CANDIDATES_FOR_PROMPT = 5;

export async function resolveInternalLinks(topic: InternalLinkTopicInput, locale: string): Promise<InternalLinkResolution> {
  let pillarCandidate: LinkCandidate | null = null;
  if (topic.pillarSlug) {
    const pillar = await db.blogArticle.findFirst({
      where: { locale, status: "PUBLISHED", topic: { slug: topic.pillarSlug } },
      include: { topic: { select: { slug: true } } },
    });
    if (pillar) pillarCandidate = { slug: pillar.topic.slug, title: pillar.title };
  }

  const relatedSlugs = topic.relatedSlugs.filter((s) => s !== topic.pillarSlug);
  const related =
    relatedSlugs.length > 0
      ? await db.blogArticle.findMany({
          where: { locale, status: "PUBLISHED", topic: { slug: { in: relatedSlugs } } },
          include: { topic: { select: { slug: true } } },
        })
      : [];

  const clusterArticles = await db.blogArticle.findMany({
    where: { locale, status: "PUBLISHED", topic: { cluster: topic.cluster, slug: { not: topic.slug } } },
    orderBy: { publishedAt: "desc" },
    take: MAX_CLUSTER_LINKS,
    include: { topic: { select: { slug: true } } },
  });

  const publishedArticlesInLocale = await db.blogArticle.count({
    where: { locale, status: "PUBLISHED", topic: { slug: { not: topic.slug } } },
  });

  const seen = new Set<string>();
  const candidates: LinkCandidate[] = [];
  const pushUnique = (candidate: LinkCandidate | null) => {
    if (!candidate || seen.has(candidate.slug)) return;
    seen.add(candidate.slug);
    candidates.push(candidate);
  };

  pushUnique(pillarCandidate);
  for (const r of related) pushUnique({ slug: r.topic.slug, title: r.title });
  for (const c of clusterArticles) pushUnique({ slug: c.topic.slug, title: c.title });

  const clusterLinkCount = candidates.filter((c) => c.slug !== pillarCandidate?.slug).length;

  return {
    candidates: candidates.slice(0, MAX_CANDIDATES_FOR_PROMPT),
    hasPillarLink: !!pillarCandidate,
    clusterLinkCount,
    publishedArticlesInLocale,
  };
}
