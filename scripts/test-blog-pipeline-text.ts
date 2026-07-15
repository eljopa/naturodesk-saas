/**
 * Script de test local — pipeline de génération de texte du blog (lot 3).
 *
 * Teste en isolation (sans base de données, celle-ci n'étant pas joignable
 * depuis cet environnement) :
 *   1. les garde-fous de langage (marketing + réglementaire naturopathie)
 *   2. le score qualité + la validation dure sur un contenu fabriqué
 *   3. la construction du prompt système/utilisateur
 *   4. (si OPENAI_API_KEY est définie) une génération réelle via OpenAI
 *
 * Les modules qui touchent la base (select-topic, recent-dna-history,
 * internal-links) ne sont PAS exercés ici — à valider une fois la migration
 * du lot 1 appliquée sur la vraie base.
 *
 * Exécution :
 *   npx tsx scripts/test-blog-pipeline-text.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { composeEditorialDNA, type EditorialDnaTopicInput } from "@/lib/blog/dna/compose";
import { applyReplacements, findForbiddenTerms } from "@/lib/blog/pipeline/language-guardrails";
import { computeQualityScore, hardValidate } from "@/lib/blog/pipeline/quality-score";
import { buildSystemPrompt, buildUserPrompt, type PromptTopicInput } from "@/lib/blog/pipeline/prompt";
import { generateArticleText } from "@/lib/blog/pipeline/generate-text";
import type { BlogArticleContent } from "@/lib/blog/pipeline/content-types";

function testLanguageGuardrails() {
  console.log("=== Test 1 : garde-fous de langage ===");
  const fixture = {
    title: "Comment garanti des résultats en naturopathie",
    naturodeskContext: "NaturoDesk vous aide à guérir vos patients plus vite.",
  };
  const { content, log } = applyReplacements(fixture);
  console.log(
    "Remplacements marketing appliqués:",
    log.map((l) => `${l.original} → ${l.neutral}`)
  );
  const forbidden = findForbiddenTerms(content);
  console.log(
    "Termes interdits détectés:",
    forbidden.map((f) => f.term)
  );
  if (!forbidden.some((f) => f.term === "guérir")) {
    throw new Error("ANOMALIE: le garde-fou médical n'a pas détecté 'guérir'");
  }
  if (log.length === 0) {
    throw new Error("ANOMALIE: aucun remplacement marketing appliqué alors que 'garanti' était présent");
  }
  console.log("OK\n");
}

function fixtureContent(overrides: Partial<BlogArticleContent> = {}): BlogArticleContent {
  return {
    title: "Comment ouvrir son cabinet de naturopathie en 2026",
    metaTitle: "Ouvrir son cabinet de naturopathie",
    metaDescription:
      "Un guide complet en 145 à 165 caractères pour bien démarrer, avec les étapes clés à suivre pour se lancer sereinement dans l'aventure entrepreneuriale du métier de naturopathe.",
    quickAnswer:
      "Ouvrir son cabinet de naturopathie demande de choisir un statut juridique, un lieu d'exercice et de définir son offre de services avant d'accueillir ses premiers clients.",
    definition:
      "L'installation en naturopathie est l'ensemble des démarches administratives et pratiques nécessaires pour exercer en tant qu'indépendant.",
    intro: "mot ".repeat(150),
    sections: [
      { title: "Quel statut juridique choisir ?", body: "mot ".repeat(130) },
      { title: "Comment trouver un local", body: "mot ".repeat(130) },
      { title: "Combien ça coûte", body: "mot ".repeat(130) },
    ],
    naturodeskContext:
      "NaturoDesk centralise l'agenda, les dossiers patients et la facturation dès le premier jour, un exemple concret pour gagner du temps en pratique dès l'installation du cabinet. ".repeat(
        2
      ),
    blocks: [],
    conclusion: "mot ".repeat(90),
    ...overrides,
  };
}

function testQualityScore() {
  console.log("=== Test 2 : score qualité + validation dure ===");
  const topic: EditorialDnaTopicInput = {
    slug: "test-ouvrir-cabinet",
    cluster: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "ouvrir cabinet naturopathie",
  };
  const dna = composeEditorialDNA(topic, []);
  console.log(`DNA: blocs prévus = ${dna.blocks.join(", ")}`);

  // Contenu volontairement sans les blocs prévus par le DNA, pour vérifier
  // que la validation dure bloque bien la publication.
  const content = fixtureContent({ blocks: [] });
  // publishedArticlesInLocale > 0 : simule un blog déjà amorcé, pour que les
  // vérifications de maillage interne s'appliquent réellement dans ce test.
  const links = { hasPillarLink: false, clusterLinkCount: 0, publishedArticlesInLocale: 5 };
  const scoreResult = computeQualityScore(content, dna, links);
  console.log(`Score: ${scoreResult.score}/${scoreResult.total}`);
  for (const c of scoreResult.checks) {
    if (!c.passed) console.log(`  échoué (${c.points}pts): ${c.description}`);
  }
  const errors = hardValidate(content, scoreResult.score, dna);
  console.log(`Erreurs de validation dure (${errors.length}):`, errors.slice(0, 6));
  if (errors.length === 0) {
    throw new Error("ANOMALIE: la validation dure aurait dû échouer (blocs DNA manquants)");
  }
  console.log("OK — la validation dure bloque correctement un contenu incomplet\n");
}

function testPromptBuilder() {
  console.log("=== Test 3 : construction du prompt ===");
  const dnaTopic: EditorialDnaTopicInput = {
    slug: "quels-outils-de-gestion",
    cluster: "GESTION_OUTILS",
    contentType: "COMPARATIF",
    keyword: "quels outils de gestion pour un naturopathe",
  };
  const promptTopic: PromptTopicInput = {
    keyword: dnaTopic.keyword,
    secondaryKeywords: ["logiciel naturopathe", "agenda naturopathe"],
    cluster: dnaTopic.cluster,
    contentType: dnaTopic.contentType,
    naturodeskContext: "NaturoDesk est justement ce type d'outil tout-en-un pour un cabinet de naturopathie.",
  };
  const dna = composeEditorialDNA(dnaTopic, []);
  const system = buildSystemPrompt(dna);
  const user = buildUserPrompt(promptTopic, dna, [{ slug: "autre-article", title: "Un autre article" }]);
  console.log(`Prompt système: ${system.length} caractères`);
  console.log(`Prompt utilisateur: ${user.length} caractères`);
  if (!system.includes("NaturoDesk") || !user.includes("NaturoDesk")) {
    throw new Error("ANOMALIE: le prompt ne mentionne pas NaturoDesk");
  }
  if (!system.toLowerCase().includes("guérit")) {
    throw new Error("ANOMALIE: le garde-fou réglementaire n'apparaît pas dans le prompt système");
  }
  console.log("OK\n");
}

async function testLiveGeneration() {
  console.log("=== Test 4 : génération réelle via OpenAI ===");
  if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY absente — test ignoré.\n");
    return;
  }
  const dnaTopic: EditorialDnaTopicInput = {
    slug: "comment-obtenir-ses-premiers-clients-naturopathie",
    cluster: "ACQUISITION_CLIENTELE",
    contentType: "GUIDE",
    keyword: "comment obtenir ses premiers clients en naturopathie",
  };
  const promptTopic: PromptTopicInput = {
    keyword: dnaTopic.keyword,
    secondaryKeywords: ["trouver des clients naturopathe", "premiers patients naturopathie"],
    cluster: dnaTopic.cluster,
    contentType: dnaTopic.contentType,
    naturodeskContext:
      "NaturoDesk permet de publier une page professionnelle en ligne et de gérer les prises de rendez-vous, un premier levier concret d'acquisition.",
  };
  const dna = composeEditorialDNA(dnaTopic, []);
  console.log(
    `DNA choisi: ton=${dna.tone}, profondeur=${dna.depth} (${dna.wordTarget[0]}-${dna.wordTarget[1]} mots), structure=${dna.structure}, blocs=${dna.blocks.join(",")}`
  );

  const result = await generateArticleText(promptTopic, dna, [], {
    hasPillarLink: false,
    clusterLinkCount: 0,
    publishedArticlesInLocale: 0,
  });
  console.log(`Titre généré: ${result.content.title}`);
  console.log(`Score qualité: ${result.scoreResult.score}/${result.scoreResult.total}`);
  console.log(`Tokens utilisés: ${result.tokensUsed}`);
  console.log(`Remplacements marketing appliqués: ${result.replacementLog.length}`);
  console.log(`Erreurs de validation dure (${result.hardErrors.length}):`, result.hardErrors);
  if (!result.content.naturodeskContext?.includes("NaturoDesk")) {
    throw new Error("ANOMALIE: naturodeskContext généré ne mentionne pas NaturoDesk");
  }
  console.log("OK — génération réelle terminée\n");
}

async function main() {
  testLanguageGuardrails();
  testQualityScore();
  testPromptBuilder();
  await testLiveGeneration();
  console.log("Toutes les vérifications sont passées.");
}

main().catch((err) => {
  console.error("ÉCHEC:", err);
  process.exit(1);
});
