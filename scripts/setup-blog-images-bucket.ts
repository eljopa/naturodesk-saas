/**
 * Script one-off — crée le bucket Supabase Storage "blog-images" (lecture
 * publique) utilisé par lib/blog/pipeline/generate-images.ts. Idempotent :
 * ne fait rien si le bucket existe déjà.
 *
 * À exécuter une seule fois, depuis un environnement ayant accès réseau à
 * Supabase (ce n'était pas le cas de l'environnement d'implémentation —
 * l'API Supabase (REST/Storage) n'était pas joignable, seule l'API OpenAI
 * l'était).
 *
 * Exécution :
 *   npx tsx scripts/setup-blog-images-bucket.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createSupabaseServiceClient } from "@/lib/supabase/server";

const BUCKET_ID = "blog-images";

async function main() {
  const supabase = createSupabaseServiceClient();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Impossible de lister les buckets Supabase Storage : ${listError.message}`);
  }

  const existing = buckets.find((b) => b.id === BUCKET_ID);
  if (existing) {
    console.log(`Bucket "${BUCKET_ID}" déjà présent (public: ${existing.public}).`);
    if (!existing.public) {
      console.warn(`ATTENTION : le bucket existe mais n'est pas public — les images du blog ne seront pas accessibles.`);
    }
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET_ID, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/webp", "image/svg+xml"],
  });
  if (createError) {
    throw new Error(`Création du bucket "${BUCKET_ID}" échouée : ${createError.message}`);
  }

  console.log(`Bucket "${BUCKET_ID}" créé (public, 5MB max, webp/svg).`);
}

main().catch((err) => {
  console.error("ÉCHEC:", err);
  process.exit(1);
});
