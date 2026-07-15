/**
 * One-off — publie manuellement tous les BlogArticle FR actuellement en
 * REVIEW_REQUIRED (même logique que publishArticleAction de l'admin). Utilisé
 * pour amorcer le blog : les tout premiers articles ne peuvent pas gagner les
 * points de maillage interne tant que rien n'est publié (cf. correctif
 * quality-score.ts), donc un déblocage manuel initial est nécessaire.
 *
 * Exécution :
 *   npx tsx scripts/publish-review-required.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";

async function main() {
  const articles = await db.blogArticle.findMany({
    where: { status: "REVIEW_REQUIRED" },
    include: { topic: { select: { id: true, slug: true, keyword: true } } },
  });

  if (articles.length === 0) {
    console.log("Aucun article en REVIEW_REQUIRED.");
    return;
  }

  for (const article of articles) {
    await db.blogArticle.update({
      where: { id: article.id },
      data: { status: "PUBLISHED", publishedAt: article.publishedAt ?? new Date() },
    });

    const siblingArticles = await db.blogArticle.findMany({
      where: { topicId: article.topicId },
      select: { status: true },
    });
    const allPublished = siblingArticles.every((a) => a.status === "PUBLISHED");
    await db.blogTopic.update({
      where: { id: article.topicId },
      data: { status: allPublished ? "PUBLISHED" : "REVIEW_REQUIRED" },
    });

    console.log(`Publié : [${article.locale}] "${article.topic.keyword}" (${article.topic.slug})`);
  }

  console.log(`\n${articles.length} article(s) publié(s).`);
}

main()
  .catch((err) => {
    console.error("ÉCHEC:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
