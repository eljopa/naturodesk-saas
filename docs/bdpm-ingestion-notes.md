# Notes d'intégration NaturoDesk — Ingestion BDPM

> Version : 4.0.0 — **Référence d'implémentation finale**  
> Dernière mise à jour : 2026-04

---

## Changelog

| Version | Correction |
|---------|-----------|
| 4.0.0 | **[1] Paths** — Convention unifiée : `manifest.storagePath` = préfixe racine, `files[n].storagePath` = chemin complet. NaturoDesk utilise toujours `files[n].storagePath`. Seule reconstruction légitime : `${batchPath}/manifest.json` dans `fetchManifest()`, explicitement commentée. |
| 4.0.0 | **[2] Métadonnées n8n** — Nœud "Snapshot métadonnées fichier" intercalé avant le HTTP Request. Validate relit depuis `$('Snapshot...')`, jamais depuis `$input` post-HTTP. |
| 4.0.0 | **[3] Encodage** — Suppression de la promesse "octets bruts ISO-8859-1". Vérité documentée : n8n décode ISO-8859-1 → string JS → upload UTF-8. NaturoDesk lit avec `.text()`, n'utilise pas `TextDecoder('iso-8859-1')`. |
| 4.0.0 | **[4] Webhook body** — Nœuds HTTP webhook en `specifyBody: raw` + `rawBody: "={{ $json.payloadJson }}"`. Garantit que la string signée = string transmise. |
| 4.0.0 | **[5] Code 409** — `409 already_processing` = état métier normal, pas de retry. Suppression de toute mention "réessayer dans X min". |
| 4.0.0 | **[6] CIS_COMPO mémoire** — Formulation corrigée : "chargé en mémoire une fois (~10 MB, acceptable), traité par batches de 500 lignes pour les écritures DB". Suppression de "jamais en mémoire complète". |
| 4.0.0 | **[7] Vercel async** — `waitUntil(@vercel/functions)` remplace le fire-and-forget. Limite Vercel Pro (300s) documentée. Fallback Vercel Cron avec code complet. |

---

## Contrainte fondamentale

Les fichiers BDPM sont stockés dans **Supabase Storage** par n8n (Hostinger).  
NaturoDesk les lit via le SDK Supabase **côté serveur uniquement**.  
**Il n'existe aucun chemin de fichier local, aucun volume partagé.**

---

## Convention des storage paths — Règle définitive

Deux champs distincts coexistent dans le manifest et dans le payload webhook :

| Champ | Valeur | Usage |
|-------|--------|-------|
| `manifest.storagePath` | `"2026-04"` | Préfixe racine du lot — utilisé pour lire le manifest |
| `manifest.files[n].storagePath` | `"2026-04/CIS_bdpm.txt"` | Chemin complet du fichier — utilisé pour le download |
| payload webhook `storagePath` | `"2026-04"` | Préfixe racine — permet de lire le manifest |

**Règle d'utilisation côté NaturoDesk :**

```typescript
// Lire le manifest avec le préfixe racine
const manifest = await fetchManifest(storageBucket, storagePath); // storagePath = "2026-04"

// Télécharger chaque fichier avec son storagePath COMPLET depuis le manifest
for (const file of manifest.files.filter(f => f.status === "ok")) {
  const buffer = await downloadBdpmFile(storageBucket, file.storagePath);
  // file.storagePath = "2026-04/CIS_bdpm.txt" — chemin complet, pas reconstruit
}
```

Ne jamais reconstruire le chemin par `${storagePath}/${file.filename}` en dehors du nœud n8n qui le calcule. Toujours utiliser `file.storagePath` du manifest comme source de vérité.

---

## Authentification Supabase Storage

Les deux acteurs utilisent `SUPABASE_SERVICE_ROLE_KEY` :
- **n8n** : upload via API REST Supabase Storage
- **NaturoDesk** : download via SDK Supabase, côté serveur uniquement

Le bucket `bdpm-raw` est **privé**. Aucune lecture publique anonyme.

```typescript
// lib/knowledge/bdpm/storage.ts
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function fetchManifest(bucket: string, batchPath: string) {
  // batchPath = préfixe racine du lot, ex: "2026-04"
  // Exception légitme : on reconstruit ici le chemin du manifest car il est
  // toujours à la racine du lot. C'est la SEULE reconstruction autorisée.
  // Pour tous les fichiers de données, utiliser file.storagePath du manifest.
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(`${batchPath}/manifest.json`);
  if (error || !data) throw new Error(`[BDPM] manifest.json illisible: ${error?.message}`);
  return JSON.parse(await data.text()); // manifest.json est UTF-8
}

export async function downloadBdpmFile(bucket: string, fileStoragePath: string): Promise<string> {
  // fileStoragePath = chemin complet issu de manifest.files[n].storagePath
  // ex: "2026-04/CIS_bdpm.txt" — jamais reconstruit ici
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(fileStoragePath);
  if (error || !data) throw new Error(`[BDPM] Download failed: ${fileStoragePath} — ${error?.message}`);
  // Lire en UTF-8 — les fichiers sont stockés en UTF-8 par n8n (voir section Encodage)
  return data.text();
}
```

---

## Encodage — Situation réelle et procédure exacte

### Ce que fait n8n

n8n télécharge les fichiers BDPM avec `responseFormat: "text"`. Node.js/n8n interprète la réponse HTTP et la décode en string JavaScript interne (UTF-16). La source ANSM est ISO-8859-1, mais cette conversion se passe implicitement à l'intérieur de n8n lors du décodage HTTP.

Quand n8n uploade ensuite vers Supabase avec `Content-Type: text/plain; charset=utf-8`, la string JavaScript est sérialisée en UTF-8.

**Résultat : les fichiers dans Supabase Storage sont en UTF-8**, pas en ISO-8859-1 d'origine.

### Procédure côté NaturoDesk

```typescript
// Lire le fichier depuis Supabase Storage
const content = await downloadBdpmFile(storageBucket, file.storagePath);
// content est une string UTF-8 — directement utilisable pour le parsing
// Ne PAS appeler TextDecoder('iso-8859-1') — les fichiers dans Supabase sont déjà en UTF-8
```

### Résumé par étape

| Étape | Acteur | Encodage en entrée | Encodage en sortie |
|-------|--------|-------------------|-------------------|
| Téléchargement HTTP | n8n | ISO-8859-1 (ANSM) | String JS (UTF-16 interne) |
| Upload Supabase | n8n | String JS | **UTF-8** dans Supabase |
| Stockage | Supabase | UTF-8 | UTF-8 (opaque) |
| Download Supabase | NaturoDesk | UTF-8 | String UTF-8 via `.text()` |
| Parsing | NaturoDesk | String UTF-8 | — |

### Note sur les caractères accentués

La conversion ISO-8859-1 → UTF-8 effectuée implicitement par n8n/Node.js préserve correctement les caractères accentués français (é, è, ê, à, ï, etc.) présents dans les noms de médicaments. Vérifier sur un médicament connu lors du premier test (`BUPIVACAÏNE`, `ACIDE ACÉTYLSALICYLIQUE`...).

---

## Stratégie d'ingestion asynchrone sur Vercel

### Le problème du fire-and-forget sur Vercel

```typescript
// Ce pattern est risqué sur Vercel :
startBdpmIngestion(...).catch(...);
return NextResponse.json({ received: true, ... }); // Vercel peut couper la fonction ici
```

Sur Vercel, une serverless function se termine dès que la réponse HTTP est envoyée. Une `Promise` non-awaited peut être interrompue avant de se terminer. Pour un traitement court (< 1s), ça passe. Pour une ingestion BDPM complète (parsing 50 000 lignes + embeddings), **ce pattern est non fiable**.

### Stratégie V1 retenue — `waitUntil`

Vercel expose `waitUntil` via `@vercel/functions` pour prolonger l'exécution d'une fonction après l'envoi de la réponse :

```typescript
import { waitUntil } from "@vercel/functions";

// Dans le handler, remplacer le fire-and-forget par :
waitUntil(
  startBdpmIngestion(syncRecord.id, batchId, storageBucket, storagePath)
    .catch(err => {
      console.error(`[BDPM] Ingestion failed for ${batchId}:`, err);
      db.knowledgeSourceSync.update({
        where: { id: syncRecord.id },
        data: { status: "failed", completedAt: new Date(), errorMessage: String(err) }
      }).catch(() => {});
    })
);

return NextResponse.json({ received: true, batchId, action: "ingestion_scheduled" });
```

`waitUntil` garantit que la Promise se termine même après l'envoi de la réponse. La durée maximale d'exécution dépend du plan Vercel (60s sur Hobby, 300s sur Pro, 800s sur Enterprise).

**Pour une ingestion BDPM complète (parsing + embeddings batch), le plan Pro minimum est recommandé.**

### Fallback si `waitUntil` ne suffit pas

Si l'ingestion complète dépasse la limite d'exécution Vercel :

**Option A — Vercel Cron Job** : un cron toutes les heures vérifie les entrées `KnowledgeSourceSync` en `processing` depuis plus de X minutes et relance l'ingestion.

```typescript
// app/api/cron/bdpm-ingestion/route.ts
export async function GET(req: NextRequest) {
  // Vérifier le header Vercel Cron
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stalled = await db.knowledgeSourceSync.findMany({
    where: {
      status: "processing",
      startedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } // > 30 min
    }
  });

  for (const record of stalled) {
    await db.knowledgeSourceSync.update({
      where: { id: record.id },
      data: { status: "failed", errorMessage: "Timeout — relancé par cron" }
    });
    // Relancer proprement
    waitUntil(startBdpmIngestion(record.id, record.batchId, record.storageBucket!, record.storagePath!));
  }

  return NextResponse.json({ checked: stalled.length });
}
```

**Option B — Découper l'ingestion en étapes** : le webhook déclenche uniquement le parsing et la normalisation. Les embeddings sont générés par un job séparé déclenché en fin de parsing.

### Décision pour l'implémentation

Pour la V1, utiliser `waitUntil` avec le plan Vercel Pro. Si les timeouts deviennent un problème en production, implémenter l'Option A (Vercel Cron). Ne pas complexifier avant d'avoir observé le comportement réel.

---

## Parsing des fichiers BDPM

### Structure des fichiers (tabulés, sans en-tête)

```
CIS_bdpm.txt (7 colonnes) :
  [0] CIS | [1] dénomination | [2] forme_pharma | [3] voie_admin
  [4] statut_AMM | [5] type_proc | [6] etat_comm

CIS_COMPO_bdpm.txt (8 colonnes) :
  [0] CIS | [1] désignation_élément | [2] code_substance
  [3] dénomination_substance | [4] dosage | [5] ref_dosage
  [6] nature_composant | [7] num_liaison

CIS_CPD_bdpm.txt (2 colonnes) :
  [0] CIS | [1] condition_prescription_délivrance

CIS_MITM.txt (4 colonnes) :
  [0] CIS | [1] motif_liste | [2] ATC | [3] num_liste
```

### Traitement de CIS_COMPO_bdpm.txt (~50 000 lignes)

Le fichier est téléchargé en mémoire dans sa totalité via `downloadBdpmFile()` — c'est inévitable avec le SDK Supabase Storage qui retourne un Blob. La taille en UTF-8 est d'environ 10 MB, ce qui est gérable en mémoire pour une serverless function Vercel (limite mémoire 1024 MB par défaut).

Le **batch processing** s'applique au traitement et aux écritures DB, pas au chargement :

```typescript
const content = await downloadBdpmFile(storageBucket, file.storagePath);
const lines = content.split("\n").filter(l => l.trim());

// Le fichier est en mémoire (10 MB — acceptable)
// Le traitement et les écritures DB se font par batches pour ne pas saturer Prisma/Postgres
const BATCH_SIZE = 500;

for (let i = 0; i < lines.length; i += BATCH_SIZE) {
  const batch = lines.slice(i, i + BATCH_SIZE);
  await processCompoLines(batch, batchId); // upserts Prisma en batch
  // Pause courte pour éviter de saturer le pool de connexions
  if (i + BATCH_SIZE < lines.length) {
    await new Promise(r => setTimeout(r, 20));
  }
}
```

Le terme "jamais en mémoire complète" dans les versions précédentes était inexact. La formulation correcte est : **chargé en mémoire une fois, traité par batches de 500 lignes pour les écritures DB**.

### Priorité de traitement

| Priorité | Fichier | Raison |
|:--------:|---------|--------|
| 1 | `CIS_bdpm.txt` | Pivot — CIS + dénomination |
| 2 | `CIS_COMPO_bdpm.txt` | DCI, dosage — base des KnowledgeTerm |
| 3 | `CIS_CPD_bdpm.txt` | Conditions de prescription |
| 4 | `CIS_MITM.txt` | Flag vigilance |
| 5+ | Autres | Enrichissement optionnel |

---

## Pipeline d'ingestion complet

```typescript
// lib/knowledge/bdpm/ingestion.ts
export async function startBdpmIngestion(
  syncRecordId: string,
  batchId: string,
  storageBucket: string, // "bdpm-raw"
  storagePath: string    // "2026-04" — préfixe racine
): Promise<void> {
  try {
    // 1. Lire le manifest depuis storagePath (préfixe)
    const manifest = await fetchManifest(storageBucket, storagePath);

    // 2. Filtrer les fichiers OK, dans l'ordre de priorité
    const filesToProcess = manifest.files
      .filter((f: ManifestFile) => f.status === "ok")
      .sort((a: ManifestFile, b: ManifestFile) => getPriority(a.filename) - getPriority(b.filename));

    let filesProcessed = 0, docsCreated = 0, chunksCreated = 0, factsCreated = 0;

    // 3. Traiter chaque fichier
    for (const fileEntry of filesToProcess) {
      // Utiliser file.storagePath (chemin complet) — jamais reconstruire
      const content = await downloadBdpmFile(storageBucket, fileEntry.storagePath);
      const result = await parseBdpmFile(fileEntry.filename, content, batchId);
      filesProcessed++;
      docsCreated   += result.docsCreated;
      chunksCreated += result.chunksCreated;
      factsCreated  += result.factsCreated;
    }

    // 4. Générer les embeddings (batch séparé, après tout le parsing)
    await generatePendingEmbeddings(batchId);

    // 5. Marquer comme terminé
    await db.knowledgeSourceSync.update({
      where: { id: syncRecordId },
      data: { status: "completed", completedAt: new Date(),
               filesProcessed, docsCreated, chunksCreated, factsCreated, errorMessage: null }
    });

  } catch (err) {
    await db.knowledgeSourceSync.update({
      where: { id: syncRecordId },
      data: { status: "failed", completedAt: new Date(), errorMessage: String(err) }
    });
    throw err;
  }
}
```

---

## Embeddings — Génération en batch séparé

Les embeddings sont générés en batch après le parsing complet, pas pendant.

```typescript
async function generatePendingEmbeddings(batchId: string): Promise<void> {
  const chunks = await db.knowledgeChunk.findMany({
    where: { embedding: null, excerpt: { not: "" } },
    select: { id: true, excerpt: true }
  });

  const EMBED_BATCH = 100; // limite API OpenAI
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map(c => c.excerpt),
      dimensions: 1536
    });
    for (let j = 0; j < batch.length; j++) {
      await db.$executeRaw`
        UPDATE "KnowledgeChunk"
        SET embedding = ${response.data[j].embedding}::vector
        WHERE id = ${batch[j].id}
      `;
    }
  }
}
```

---

## Idempotence — Règles complètes

| Situation | Comportement |
|-----------|-------------|
| `batchId` absent de `KnowledgeSourceSync` | Créer `processing` + ingestion |
| `batchId` en `completed` | Répondre `200 already_completed`, ne rien faire |
| `batchId` en `processing` | Répondre `409 already_processing`, ne rien faire |
| `batchId` en `failed` | Traiter comme nouveau — relancer l'ingestion |
| `KnowledgeDocument` avec même `drugKey` | `upsert` — pas de doublon |
| `KnowledgeTerm` avec même `canonicalKey` | `upsert` — enrichir les aliases |
| `KnowledgeFact` avec même clé composite | `upsert` — mettre à jour la valeur |

---

## Modèle Prisma KnowledgeSourceSync

```prisma
model KnowledgeSourceSync {
  id               String    @id @default(uuid())
  source           String    // "BDPM" | "EMA" | "ODS"
  batchId          String    // "2026-04"
  storageBucket    String?   // "bdpm-raw"
  storagePath      String?   // "2026-04" — préfixe racine
  status           String    // "processing" | "completed" | "failed"
  startedAt        DateTime?
  completedAt      DateTime?
  filesProcessed   Int?
  documentsCreated Int?
  chunksCreated    Int?
  factsCreated     Int?
  errorMessage     String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@unique([source, batchId])
  @@index([source, status])
  @@index([status, startedAt]) // pour le Vercel Cron de détection des stalled
}
```

---

## Ordre d'implémentation

1. Créer `KnowledgeSourceSync` dans Prisma + migration
2. Implémenter `fetchManifest()` + `downloadBdpmFile()` dans `lib/knowledge/bdpm/storage.ts`
3. Implémenter `POST /api/knowledge/bdpm-ready` (voir `bdpm-webhook-contract.md`)
4. Implémenter parser `CIS_bdpm.txt`
5. Implémenter parser `CIS_COMPO_bdpm.txt` avec batch DB de 500 lignes
6. Implémenter normalisation `KnowledgeTerm`
7. Implémenter `KnowledgeDocument` + `KnowledgeChunk`
8. Implémenter `generatePendingEmbeddings()`
9. Implémenter extraction `KnowledgeFact` déterministe
10. Implémenter `waitUntil` dans le webhook handler
11. Test end-to-end avec un vrai lot n8n

---

## Points non négociables

| Règle | Raison |
|-------|--------|
| Toujours `file.storagePath` du manifest pour le download | Jamais de reconstruction `${prefix}/${filename}` côté NaturoDesk |
| `data.text()` pour lire depuis Supabase | Fichiers stockés en UTF-8 par n8n |
| Ne PAS utiliser `TextDecoder('iso-8859-1')` sur les fichiers Storage | Ils sont déjà en UTF-8 |
| `req.text()` avant `JSON.parse()` dans le webhook | Nécessaire pour vérifier HMAC sur rawBody |
| `waitUntil()` pour l'ingestion asynchrone | Fire-and-forget non fiable sur Vercel |
| Traitement DB par batches de 500 lignes | Évite la saturation du pool de connexions Prisma |
| Embeddings après le parsing complet | Jamais inline dans une boucle de parsing |
| Toute lecture Storage côté serveur uniquement | `SUPABASE_SERVICE_ROLE_KEY` jamais exposée au browser |
