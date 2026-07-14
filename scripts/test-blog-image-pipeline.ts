/**
 * Script de test local — pipeline d'images du blog (lot 5).
 *
 * Teste en isolation :
 *   1. le fallback SVG (déterministe, pas de réseau)
 *   2. la résolution du prompt image (déterministe, pas de réseau)
 *   3. (si OPENAI_API_KEY est définie) un vrai appel à l'API images OpenAI
 *      + redimensionnement sharp — UNE SEULE image générée (coût réel)
 *
 * L'upload Supabase Storage n'est PAS testé ici : l'API Supabase n'était pas
 * joignable depuis l'environnement d'implémentation (seule l'API OpenAI
 * l'était). À valider manuellement en conditions réelles, après avoir lancé
 * scripts/setup-blog-images-bucket.ts.
 *
 * Exécution :
 *   npx tsx scripts/test-blog-image-pipeline.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import sharp from "sharp";
import { composeEditorialDNA, type EditorialDnaTopicInput } from "@/lib/blog/dna/compose";
import { buildImagePrompt } from "@/lib/blog/pipeline/image-prompt";
import { generateSvgFallback } from "@/lib/blog/pipeline/svg-fallback";

function testSvgFallback() {
  console.log("=== Test 1 : fallback SVG ===");
  const svgA = generateSvgFallback({ keyword: "ouvrir son cabinet de naturopathie", seed: "test-slug::hero" });
  const svgB = generateSvgFallback({ keyword: "ouvrir son cabinet de naturopathie", seed: "test-slug::hero" });
  const svgC = generateSvgFallback({ keyword: "ouvrir son cabinet de naturopathie", seed: "test-slug::midSections" });

  if (!svgA.startsWith("<svg") || !svgA.includes("</svg>")) {
    throw new Error("ANOMALIE: le SVG généré n'a pas une structure valide");
  }
  if (!svgA.includes("NATURODESK")) {
    throw new Error("ANOMALIE: le SVG ne contient pas la mention NaturoDesk");
  }
  if (svgA !== svgB) {
    throw new Error("ANOMALIE: deux générations avec le même seed devraient être identiques (déterminisme)");
  }
  if (svgA === svgC) {
    throw new Error("ANOMALIE: deux emplacements différents ne devraient pas produire le même SVG");
  }
  console.log(`SVG généré : ${svgA.length} caractères, déterministe par seed, distinct par emplacement.`);
  console.log("OK\n");
}

function testImagePrompt() {
  console.log("=== Test 2 : résolution du prompt image ===");
  const dnaTopic: EditorialDnaTopicInput = {
    slug: "quels-outils-de-gestion",
    cluster: "GESTION_OUTILS",
    contentType: "COMPARATIF",
    keyword: "outils de gestion pour naturopathe",
  };
  const dna = composeEditorialDNA(dnaTopic, []);
  console.log(`Familles visuelles tirées : ${dna.visual.families.join(", ")}`);

  for (const slot of dna.visual.slots) {
    const prompt = buildImagePrompt(slot, dnaTopic.keyword);
    if (prompt.includes("{{keyword}}")) {
      throw new Error(`ANOMALIE: le placeholder {{keyword}} n'a pas été substitué pour ${slot.family}`);
    }
    if (!prompt.toLowerCase().includes("naturopathe")) {
      throw new Error(`ANOMALIE: le prompt pour ${slot.family} ne mentionne pas le mot-clé`);
    }
    console.log(`  [${slot.anchor}/${slot.family}] ${prompt.slice(0, 100)}...`);
  }
  console.log("OK\n");
}

async function testLiveImageGeneration() {
  console.log("=== Test 3 : génération réelle via OpenAI images + sharp ===");
  if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY absente — test ignoré.\n");
    return;
  }

  const model = process.env.OPENAI_BLOG_IMAGE_MODEL || "gpt-image-1";
  const prompt =
    "Minimal line-icon schematic illustrating naturopathy practice management — 3 simple icons connected by thin dotted lines on a plain cream background, sage-green accent color, no gradients, no photorealism.";

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, prompt, size: "1536x1024", quality: "low", n: 1 }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API OpenAI images ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("ANOMALIE: pas de b64_json dans la réponse OpenAI images");

  const raw = Buffer.from(b64, "base64");
  console.log(`Image brute reçue : ${raw.length} octets`);

  const resized = await sharp(raw).resize(1200, 630, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  const metadata = await sharp(resized).metadata();
  console.log(`Image redimensionnée : ${resized.length} octets, ${metadata.width}x${metadata.height}, format ${metadata.format}`);

  if (metadata.width !== 1200 || metadata.height !== 630 || metadata.format !== "webp") {
    throw new Error(`ANOMALIE: dimensions/format inattendus (${metadata.width}x${metadata.height} ${metadata.format})`);
  }
  console.log("OK — appel OpenAI images + redimensionnement sharp fonctionnent\n");
}

async function main() {
  testSvgFallback();
  testImagePrompt();
  await testLiveImageGeneration();
  console.log("Toutes les vérifications sont passées.");
  console.log("\nNon testé ici (réseau Supabase indisponible dans cet environnement) : l'upload vers le bucket 'blog-images'.");
  console.log("→ lancer scripts/setup-blog-images-bucket.ts puis rejouer le pipeline complet en conditions réelles.");
}

main().catch((err) => {
  console.error("ÉCHEC:", err);
  process.exit(1);
});
