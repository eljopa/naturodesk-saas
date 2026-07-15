/**
 * One-off — aligne publishedAt de chaque ligne EN sur celui de sa ligne FR
 * (source de vérité), pour corriger l'ordre d'affichage divergent entre
 * locales causé par les publications manuelles à des instants différents.
 *
 * Exécution :
 *   npx tsx scripts/sync-published-at.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";

async function main() {
  const frArticles = await db.blogArticle.findMany({
    where: { locale: "fr", status: "PUBLISHED", publishedAt: { not: null } },
    include: { topic: { select: { slug: true } } },
  });

  let synced = 0;

  for (const fr of frArticles) {
    const en = await db.blogArticle.findUnique({ where: { topicId_locale: { topicId: fr.topicId, locale: "en" } } });
    if (!en || en.status !== "PUBLISHED") continue;
    if (en.publishedAt?.getTime() === fr.publishedAt?.getTime()) continue;

    await db.blogArticle.update({ where: { id: en.id }, data: { publishedAt: fr.publishedAt } });
    console.log(`${fr.topic.slug}: en.publishedAt aligné sur fr (${fr.publishedAt?.toISOString()})`);
    synced++;
  }

  console.log(`\n${synced} ligne(s) EN synchronisée(s).`);
}

main()
  .catch((err) => {
    console.error("ÉCHEC:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
