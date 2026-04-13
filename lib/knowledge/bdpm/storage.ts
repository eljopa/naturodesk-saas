/**
 * lib/knowledge/bdpm/storage.ts
 *
 * Accès Supabase Storage pour les fichiers BDPM.
 * Serveur uniquement — utilise SUPABASE_SERVICE_ROLE_KEY.
 *
 * Règle chemin :
 *   - fetchManifest(bucket, batchPath) — batchPath = préfixe racine ("2026-04")
 *     → seule reconstruction légitime : `${batchPath}/manifest.json`
 *   - downloadBdpmFile(bucket, fileStoragePath) — fileStoragePath = chemin complet
 *     issu de manifest.files[n].storagePath ("2026-04/CIS_bdpm.txt")
 *     → jamais reconstruit ici
 */

import { createSupabaseServiceClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types manifest
// ---------------------------------------------------------------------------

export interface ManifestFile {
  filename: string;
  storagePath: string; // chemin complet — ex: "2026-04/CIS_bdpm.txt"
  status: "ok" | "error" | "empty" | "not_found";
  size?: number;
  required?: boolean;
}

export interface BdpmManifest {
  batchId: string;
  storagePath: string;   // préfixe racine
  storageBucket: string;
  downloadedAt: string;
  files: ManifestFile[];
}

// ---------------------------------------------------------------------------
// fetchManifest
// ---------------------------------------------------------------------------

export async function fetchManifest(bucket: string, batchPath: string): Promise<BdpmManifest> {
  // batchPath = préfixe racine du lot, ex: "2026-04"
  // Exception légitime : on reconstruit ici le chemin du manifest car il est
  // toujours à la racine du lot. C'est la SEULE reconstruction autorisée.
  // Pour tous les fichiers de données, utiliser file.storagePath du manifest.
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(`${batchPath}/manifest.json`);
  if (error || !data) {
    throw new Error(`[BDPM] manifest.json illisible (${batchPath}): ${error?.message ?? "no data"}`);
  }
  // manifest.json est stocké en UTF-8 par n8n
  const text = await data.text();
  return JSON.parse(text) as BdpmManifest;
}

// ---------------------------------------------------------------------------
// downloadBdpmFile
// ---------------------------------------------------------------------------

export async function downloadBdpmFile(bucket: string, fileStoragePath: string): Promise<string> {
  // fileStoragePath = chemin complet issu de manifest.files[n].storagePath
  // ex: "2026-04/CIS_bdpm.txt" — jamais reconstruit ici
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(fileStoragePath);
  if (error || !data) {
    throw new Error(`[BDPM] Download failed: ${fileStoragePath} — ${error?.message ?? "no data"}`);
  }
  // Lire en UTF-8 — les fichiers sont stockés en UTF-8 par n8n
  // Ne PAS utiliser TextDecoder('iso-8859-1') — les fichiers dans Supabase sont déjà en UTF-8
  return data.text();
}
