/**
 * lib/knowledge/bdpm/ingestion.ts
 *
 * Pipeline d'ingestion BDPM complet.
 * Appelé via waitUntil() depuis app/api/knowledge/bdpm-ready/route.ts
 *
 * Étapes :
 *   1. Lire le manifest depuis Supabase Storage (storagePath = préfixe racine)
 *   2. Filtrer les fichiers status="ok", trier par priorité
 *   3. Télécharger + parser chaque fichier (file.storagePath = chemin complet)
 *   4. Générer les embeddings (batch séparé, après tout le parsing)
 *   5. Mettre à jour BdpmSyncRecord → "completed"
 */

import { db } from "@/lib/db";
import { fetchManifest, downloadBdpmFile, type ManifestFile } from "./storage";
import { parseBdpmFile } from "./parsers";
import { generatePendingEmbeddings } from "./embeddings";

// ---------------------------------------------------------------------------
// Priorité de traitement des fichiers BDPM
// ---------------------------------------------------------------------------

const FILE_PRIORITY: Record<string, number> = {
  "CIS_bdpm.txt": 1,
  "CIS_CIP_bdpm.txt": 1,
  "CIS_COMPO_bdpm.txt": 1,
  "CIS_CPD_bdpm.txt": 2,
  "CIS_MITM.txt": 2,
  "CIS_GENER_bdpm.txt": 3,
  "CIS_HAS_SMR_bdpm.txt": 3,
  "CIS_HAS_ASMR_bdpm.txt": 3,
  "CIS_CIP_Dispo_Spec.txt": 3,
  "HAS_LiensPageCT_bdpm.txt": 3,
};

function getPriority(filename: string): number {
  if (filename.startsWith("CIS_InfoImportantes")) return 3;
  return FILE_PRIORITY[filename] ?? 99;
}

// ---------------------------------------------------------------------------
// startBdpmIngestion
// ---------------------------------------------------------------------------

export async function startBdpmIngestion(
  syncRecordId: string,
  batchId: string,
  storageBucket: string, // "bdpm-raw"
  storagePath: string,   // "2026-04" — préfixe racine
): Promise<void> {
  try {
    console.log(`[BDPM] Ingestion démarrée — batch=${batchId} bucket=${storageBucket}`);

    // 1. Lire le manifest depuis le préfixe racine
    const manifest = await fetchManifest(storageBucket, storagePath);

    // 2. Filtrer les fichiers OK, trier par priorité
    const filesToProcess = manifest.files
      .filter((f: ManifestFile) => f.status === "ok")
      .sort((a: ManifestFile, b: ManifestFile) => getPriority(a.filename) - getPriority(b.filename));

    console.log(`[BDPM] ${filesToProcess.length} fichiers à traiter`);

    let filesProcessed = 0;
    let docsCreated = 0;
    let chunksCreated = 0;
    let factsCreated = 0;

    // 3. Traiter chaque fichier
    for (const fileEntry of filesToProcess) {
      console.log(`[BDPM] Traitement : ${fileEntry.filename} (${fileEntry.storagePath})`);

      // Utiliser file.storagePath (chemin complet) — jamais reconstruire
      const content = await downloadBdpmFile(storageBucket, fileEntry.storagePath);
      const result = await parseBdpmFile(fileEntry.filename, content, batchId);

      filesProcessed++;
      docsCreated += result.docsCreated;
      chunksCreated += result.chunksCreated;
      factsCreated += result.factsCreated;

      console.log(
        `[BDPM] ✓ ${fileEntry.filename} — docs=${result.docsCreated} chunks=${result.chunksCreated} facts=${result.factsCreated}`,
      );
    }

    // 4. Réinitialiser les embeddings des chunks mis à jour (pour re-vectorisation)
    // Les chunks dont l'extrait a changé ont un embedding obsolète → reset via SQL
    // Les nouveaux chunks ont déjà embedding = NULL par défaut
    await db.$executeRaw`
      UPDATE "knowledge_chunks"
      SET embedding = NULL
      WHERE embedding IS NOT NULL
        AND id IN (
          SELECT kc.id FROM "knowledge_chunks" kc
          JOIN "knowledge_documents" kd ON kd.id = kc."documentId"
          WHERE kd."contentHash" LIKE ${`%-${batchId}-%`} OR kd."contentHash" LIKE ${`%-${batchId}`}
        )
    `;

    // 5. Générer les embeddings (batch séparé, après tout le parsing)
    await generatePendingEmbeddings(batchId);

    // 6. Marquer comme terminé
    await db.bdpmSyncRecord.update({
      where: { id: syncRecordId },
      data: {
        status: "completed",
        completedAt: new Date(),
        filesProcessed,
        documentsCreated: docsCreated,
        chunksCreated,
        factsCreated,
        errorMessage: null,
      },
    });

    console.log(
      `[BDPM] Ingestion terminée — batch=${batchId} ` +
      `files=${filesProcessed} docs=${docsCreated} chunks=${chunksCreated} facts=${factsCreated}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[BDPM] Ingestion échouée — batch=${batchId}: ${message}`);

    await db.bdpmSyncRecord.update({
      where: { id: syncRecordId },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: message,
      },
    }).catch(() => {});

    throw err;
  }
}
