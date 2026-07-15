/**
 * One-off — traduit en EN tous les articles FR publiés qui n'ont pas encore
 * de version EN (cas des 4 premiers articles, publiés manuellement avant que
 * le pipeline n'atteigne l'étape de traduction).
 *
 * Exécution :
 *   npx tsx scripts/translate-published-articles.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";
import { translateExistingArticle } from "@/lib/blog/pipeline/run-generation";

async function main() {
  const frArticles = await db.blogArticle.findMany({
    where: { locale: "fr", status: "PUBLISHED" },
    include: { topic: { select: { slug: true, keyword: true } } },
  });

  let translated = 0;
  let skipped = 0;

  for (const fr of frArticles) {
    console.log(`\n${fr.topic.slug} — "${fr.topic.keyword}"`);
    const result = await translateExistingArticle(fr.topicId);

    if (result.status === "already_translated") {
      console.log("  → déjà traduit, ignoré.");
      skipped++;
      continue;
    }
    if (result.status === "no_fr_article") {
      console.log("  → ANOMALIE : article FR introuvable ou non publié.");
      continue;
    }

    console.log(`  → EN ${result.status === "published" ? "PUBLISHED" : "REVIEW_REQUIRED"} (score ${result.enScore}/100)`);
    if (result.errors) result.errors.forEach((e) => console.log(`     - ${e}`));
    translated++;
  }

  console.log(`\n${translated} article(s) traduit(s), ${skipped} déjà traduit(s).`);
}

main()
  .catch((err) => {
    console.error("ÉCHEC:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
