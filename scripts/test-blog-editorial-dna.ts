/**
 * Script de test local — catalogue Editorial DNA du blog (lot 2).
 *
 * Vérifie que composeEditorialDNA() :
 *   1. produit un vecteur DNA cohérent pour un sujet donné (chaque axe rempli)
 *   2. varie d'un sujet à l'autre (pas de format figé)
 *   3. évite de répéter le ton/la structure/les familles visuelles de l'article
 *      immédiatement précédent quand un historique est fourni
 *
 * Exécution :
 *   npx tsx scripts/test-blog-editorial-dna.ts
 */

import { composeEditorialDNA, buildPromptFragments, type RecentDnaEntry } from "@/lib/blog/dna/compose";
import type { EditorialDnaTopicInput } from "@/lib/blog/dna/compose";

function printDna(label: string, topic: EditorialDnaTopicInput, recentDna: RecentDnaEntry[]) {
  const dna = composeEditorialDNA(topic, recentDna);
  const fragments = buildPromptFragments(dna);
  console.log(`\n--- ${label} (${topic.slug}) ---`);
  console.log(`ton: ${dna.tone} | profondeur: ${dna.depth} (${dna.wordTarget[0]}-${dna.wordTarget[1]} mots) | structure: ${dna.structure}`);
  console.log(`blocs (${dna.blocks.length}): ${dna.blocks.join(", ")}`);
  console.log(`visuels (${dna.visual.imageCount}): ${dna.visual.slots.map((s) => `${s.anchor}=${s.family}`).join(", ")}`);
  console.log(`instruction de ton: ${fragments.toneInstruction.slice(0, 80)}...`);
  return dna;
}

function main() {
  console.log("=== Test 1 : composition sur sujets de clusters différents (sans historique) ===");
  const topicInstallation: EditorialDnaTopicInput = {
    slug: "comment-ouvrir-son-cabinet-de-naturopathie",
    cluster: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "ouvrir son cabinet de naturopathie",
  };
  const topicGestion: EditorialDnaTopicInput = {
    slug: "quels-outils-de-gestion-pour-un-naturopathe",
    cluster: "GESTION_OUTILS",
    contentType: "COMPARATIF",
    keyword: "outils de gestion pour naturopathe",
  };
  const topicPreuve: EditorialDnaTopicInput = {
    slug: "benchmark-tarifs-naturopathes-2026",
    cluster: "DEVELOPPEMENT_ACTIVITE",
    contentType: "PREUVE",
    keyword: "tarifs consultation naturopathie",
  };

  const dna1 = printDna("Installation / guide", topicInstallation, []);
  const dna2 = printDna("Gestion outils / comparatif", topicGestion, []);
  printDna("Preuve / benchmark", topicPreuve, []);

  console.log("\n=== Test 2 : anti-répétition — même sujet rejoué avec dna1 comme historique récent ===");
  const historyAfterDna1: RecentDnaEntry[] = [
    {
      slug: dna1.slug,
      tone: dna1.tone,
      depth: dna1.depth,
      structure: dna1.structure,
      blocks: dna1.blocks,
      visual: { imageCount: dna1.visual.imageCount, families: dna1.visual.families },
    },
  ];
  const topicInstallation2: EditorialDnaTopicInput = {
    slug: "quel-statut-juridique-pour-un-naturopathe",
    cluster: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "statut juridique naturopathe",
  };
  const dna3 = printDna("Installation / guide #2 (avec historique)", topicInstallation2, historyAfterDna1);

  const sameToneAsPrevious = dna3.tone === dna1.tone;
  const sameFamiliesAsPrevious = dna3.visual.families.some((f) => dna1.visual.families.includes(f));
  console.log(`\nMême ton que l'article précédent : ${sameToneAsPrevious ? "OUI (pénalisé mais possible si peu de candidats)" : "non"}`);
  console.log(`Famille visuelle partagée avec l'article précédent (hard-exclude) : ${sameFamiliesAsPrevious ? "OUI — ANOMALIE" : "non — OK"}`);

  console.log("\n=== Test 3 : déterminisme — même sujet + même historique => même DNA ===");
  const dnaRepeatA = composeEditorialDNA(topicGestion, []);
  const dnaRepeatB = composeEditorialDNA(topicGestion, []);
  const deterministic =
    dnaRepeatA.tone === dnaRepeatB.tone &&
    dnaRepeatA.depth === dnaRepeatB.depth &&
    dnaRepeatA.structure === dnaRepeatB.structure &&
    JSON.stringify(dnaRepeatA.blocks) === JSON.stringify(dnaRepeatB.blocks);
  console.log(`Résultat identique sur deux exécutions : ${deterministic ? "OUI — OK" : "NON — ANOMALIE"}`);

  if (sameFamiliesAsPrevious || !deterministic) {
    console.error("\nÉchec : au moins une vérification a échoué.");
    process.exit(1);
  }
  console.log("\nToutes les vérifications sont passées.");
}

main();
