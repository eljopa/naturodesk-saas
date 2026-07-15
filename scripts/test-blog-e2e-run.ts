/**
 * Vérification end-to-end réelle du pipeline blog — exécute un run complet
 * (sélection, DNA, texte FR, traduction EN, images, sauvegarde DB) contre la
 * vraie base et les vraies API (OpenAI + Supabase Storage).
 *
 * Exécution :
 *   npx tsx scripts/test-blog-e2e-run.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { runBlogGenerationOnce } from "@/lib/blog/pipeline/run-generation";
import { db } from "@/lib/db";

async function main() {
  console.log("Lancement d'un run complet du pipeline blog...\n");
  const result = await runBlogGenerationOnce();
  console.log("Résultat:", JSON.stringify(result, null, 2));

  if (result.topicSlug) {
    const articles = await db.blogArticle.findMany({
      where: { topic: { slug: result.topicSlug } },
      select: { locale: true, status: true, qualityScore: true, title: true, heroImageUrl: true, images: true },
    });
    console.log("\nArticles créés/mis à jour :");
    for (const a of articles) {
      const images = Array.isArray(a.images) ? a.images.length : 0;
      console.log(`  [${a.locale}] "${a.title}" — statut=${a.status} score=${a.qualityScore}/100 images=${images} hero=${!!a.heroImageUrl}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("ÉCHEC:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
