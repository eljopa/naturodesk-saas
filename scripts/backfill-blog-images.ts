/**
 * One-off — génère des images pour les articles publiés qui n'en ont aucune
 * (les 4 premiers articles générés avant le correctif d'amorçage se sont
 * arrêtés avant l'étape image, cf. run-generation.ts). Une seule génération
 * par topic, partagée entre les locales fr/en (comme le fait l'orchestrateur
 * normalement).
 *
 * Exécution :
 *   npx tsx scripts/backfill-blog-images.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { composeEditorialDNA } from "@/lib/blog/dna/compose";
import { generateArticleImages } from "@/lib/blog/pipeline/generate-images";
import type { StoredImage } from "@/lib/blog/pipeline/persist-article";

async function main() {
  const published = await db.blogArticle.findMany({
    where: { status: "PUBLISHED" },
    include: { topic: { select: { id: true, slug: true, cluster: true, contentType: true, keyword: true } } },
  });

  const missingImages = published.filter((a) => {
    const images = Array.isArray(a.images) ? (a.images as unknown as StoredImage[]) : [];
    return images.length === 0;
  });

  if (missingImages.length === 0) {
    console.log("Tous les articles publiés ont déjà au moins une image.");
    return;
  }

  console.log(`${missingImages.length} article(s) sans image (sur ${published.length} publiés).`);

  const byTopicId = new Map<string, (typeof missingImages)[number]>();
  for (const article of missingImages) byTopicId.set(article.topicId, article);

  for (const article of byTopicId.values()) {
    const topic = article.topic;
    const dna = composeEditorialDNA(
      { slug: topic.slug, cluster: topic.cluster, contentType: topic.contentType, keyword: topic.keyword },
      []
    );

    console.log(`\n${topic.slug} — génération de ${dna.visual.slots.length} image(s) (familles: ${dna.visual.families.join(", ")})...`);
    const images = await generateArticleImages(dna.visual.slots, { slug: topic.slug, keyword: topic.keyword });
    const heroImageUrl = images.find((i) => i.slot === "hero")?.url ?? null;

    await db.blogArticle.updateMany({
      where: { topicId: topic.id },
      data: { images: images as unknown as Prisma.InputJsonValue, heroImageUrl },
    });

    console.log(`  → ${images.length} image(s) enregistrée(s) sur toutes les locales du topic, hero=${!!heroImageUrl}`);
  }

  console.log(`\n${byTopicId.size} topic(s) mis à jour.`);
}

main()
  .catch((err) => {
    console.error("ÉCHEC:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
