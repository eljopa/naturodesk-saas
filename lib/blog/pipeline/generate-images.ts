/**
 * Génération des images d'un article — spec §6 étape 7. Pour chaque emplacement
 * prévu par le plan DNA (dna.visual.slots) : appel OpenAI images, redimensionnement
 * via sharp, upload Supabase Storage. Fallback SVG automatique si l'IA échoue ou
 * si OPENAI_API_KEY est absente ; si même le fallback échoue à s'uploader,
 * l'emplacement est simplement ignoré — le pipeline ne bloque jamais sur les
 * images (spec §6).
 */

import sharp from "sharp";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { VisualSlot } from "../dna/compose";
import { buildImagePrompt } from "./image-prompt";
import { generateSvgFallback } from "./svg-fallback";
import type { StoredImage } from "./persist-article";

const BLOG_IMAGES_BUCKET = "blog-images";
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;
const DEFAULT_IMAGE_MODEL = "gpt-image-1";

interface OpenAiImagesResponse {
  data?: Array<{ b64_json?: string }>;
}

async function callOpenAiImageGeneration(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY n'est pas définie");
  const model = process.env.OPENAI_BLOG_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, prompt, size: "1536x1024", quality: "high", n: 1 }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API OpenAI images ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as OpenAiImagesResponse;
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("Réponse OpenAI images sans b64_json");
  return Buffer.from(b64, "base64");
}

async function toWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
}

async function uploadToStorage(path: string, buffer: Buffer, contentType: string): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload Supabase Storage échoué (${path}): ${error.message}`);
  const { data } = supabase.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export interface ImageTopicInput {
  slug: string;
  keyword: string;
}

/**
 * Génère (ou repli SVG) les images pour la liste d'emplacements donnée.
 * Accepte des `slots` explicites plutôt que l'objet EditorialDna complet :
 * utilisé aussi bien lors de la génération initiale (dna.visual.slots) que
 * lors d'une régénération admin (slots reconstruits depuis les images déjà
 * stockées, pour ne pas retirer de nouvelles familles visuelles au hasard).
 */
export async function generateArticleImages(slots: VisualSlot[], topic: ImageTopicInput): Promise<StoredImage[]> {
  const images: StoredImage[] = [];

  for (const slot of slots) {
    const seed = `${topic.slug}::${slot.anchor}`;

    try {
      const prompt = buildImagePrompt(slot, topic.keyword);
      const raw = await callOpenAiImageGeneration(prompt);
      const webp = await toWebp(raw);
      const url = await uploadToStorage(`${topic.slug}/${slot.anchor}.webp`, webp, "image/webp");
      images.push({ slot: slot.anchor, url, visualFamily: slot.family });
      continue;
    } catch (primaryErr) {
      console.warn(
        `[blog] Génération image IA échouée pour ${seed} (${slot.family}) — repli SVG :`,
        primaryErr instanceof Error ? primaryErr.message : primaryErr
      );
    }

    try {
      const svg = generateSvgFallback({ keyword: topic.keyword, seed, width: IMAGE_WIDTH, height: IMAGE_HEIGHT });
      const url = await uploadToStorage(`${topic.slug}/${slot.anchor}.svg`, Buffer.from(svg, "utf-8"), "image/svg+xml");
      images.push({ slot: slot.anchor, url, visualFamily: slot.family });
    } catch (fallbackErr) {
      console.error(`[blog] Emplacement image ${seed} ignoré (échec IA + fallback SVG) :`, fallbackErr);
    }
  }

  return images;
}
