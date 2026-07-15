/**
 * Script de test local — mise en forme des données BlogArticle (lot 4).
 *
 * Vérifie buildArticleRowData() en isolation (pas de base de données) :
 *   - heroImageUrl dénormalisé depuis le slot "hero" de la liste d'images
 *   - publishedAt renseigné uniquement pour un statut PUBLISHED
 *   - generationLog.warnings reflète le journal de remplacements
 *
 * Exécution :
 *   npx tsx scripts/test-blog-persist-article.ts
 */

import { composeEditorialDNA, type EditorialDnaTopicInput } from "@/lib/blog/dna/compose";
import { buildArticleRowData, type ArticleGenerationOutcome } from "@/lib/blog/pipeline/persist-article";
import type { BlogArticleContent } from "@/lib/blog/pipeline/content-types";

function fixtureContent(): BlogArticleContent {
  return {
    title: "Quels outils de gestion pour un naturopathe ?",
    metaTitle: "Outils de gestion pour naturopathe",
    metaDescription: "Comparatif des outils de gestion de cabinet pour naturopathes : agenda, facturation, dossiers patients et page web professionnelle en un seul endroit.",
    quickAnswer: "Un naturopathe a besoin d'un agenda, d'un outil de facturation et d'un espace pour ses dossiers patients — idéalement réunis dans un seul logiciel.",
    definition: "Un outil de gestion de cabinet est un logiciel qui centralise l'administratif d'un naturopathe indépendant.",
    intro: "mot ".repeat(150),
    sections: [
      { title: "Pourquoi centraliser sa gestion ?", body: "mot ".repeat(130) },
      { title: "Quels critères comparer ?", body: "mot ".repeat(130) },
    ],
    naturodeskContext: "NaturoDesk réunit agenda, facturation et dossiers patients dans un seul outil pensé pour les naturopathes. ".repeat(2),
    blocks: [],
    conclusion: "mot ".repeat(90),
  };
}

function main() {
  const topic: EditorialDnaTopicInput = {
    slug: "test-outils-gestion",
    cluster: "GESTION_OUTILS",
    contentType: "COMPARATIF",
    keyword: "outils de gestion naturopathe",
  };
  const dna = composeEditorialDNA(topic, []);

  const outcome: ArticleGenerationOutcome = {
    content: fixtureContent(),
    scoreResult: { score: 85, total: 100, checks: [] },
    hardErrors: [],
    replacementLog: [{ label: "garanti", original: "garanti", neutral: "recommandé", context: "…résultats garanti…" }],
  };

  console.log("=== Test 1 : statut PUBLISHED avec image hero ===");
  const sharedPublishedAt = new Date();
  const published = buildArticleRowData(
    dna,
    outcome,
    [{ slot: "hero", url: "https://example.com/hero.webp", visualFamily: "photo-cabinet" }],
    "PUBLISHED",
    sharedPublishedAt
  );
  console.log(`heroImageUrl: ${published.heroImageUrl}`);
  console.log(`publishedAt: ${published.publishedAt}`);
  console.log(`generationLog.warnings: ${JSON.stringify(published.generationLog.warnings)}`);
  if (published.heroImageUrl !== "https://example.com/hero.webp") {
    throw new Error("ANOMALIE: heroImageUrl mal dénormalisé depuis le slot hero");
  }
  if (published.publishedAt === null) {
    throw new Error("ANOMALIE: publishedAt doit être renseigné pour un statut PUBLISHED");
  }
  if (published.generationLog.warnings.length !== 1) {
    throw new Error("ANOMALIE: generationLog.warnings ne reflète pas le replacementLog");
  }
  console.log("OK\n");

  console.log("=== Test 1bis : publishedAt partagé entre deux locales d'un même topic ===");
  const publishedOtherLocale = buildArticleRowData(dna, outcome, [], "PUBLISHED", sharedPublishedAt);
  if (publishedOtherLocale.publishedAt?.getTime() !== published.publishedAt?.getTime()) {
    throw new Error("ANOMALIE: deux locales du même topic doivent partager le même publishedAt (sinon tri /blog incohérent fr/en)");
  }
  console.log("OK — même publishedAt pour fr et en\n");

  console.log("=== Test 2 : statut REVIEW_REQUIRED sans image ===");
  const review = buildArticleRowData(dna, outcome, [], "REVIEW_REQUIRED", new Date());
  console.log(`heroImageUrl: ${review.heroImageUrl}`);
  console.log(`publishedAt: ${review.publishedAt}`);
  if (review.publishedAt !== null) {
    throw new Error("ANOMALIE: publishedAt doit être null pour REVIEW_REQUIRED");
  }
  if (review.heroImageUrl !== null) {
    throw new Error("ANOMALIE: heroImageUrl doit être null sans image fournie");
  }
  console.log("OK\n");

  console.log("Toutes les vérifications sont passées.");
}

main();
