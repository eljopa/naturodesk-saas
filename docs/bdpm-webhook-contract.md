# Contrat webhook — BDPM batch ready

> Version : 4.0.0 — **Référence d'implémentation finale**  
> Dernière mise à jour : 2026-04

---

## Changelog

| Version | Correction |
|---------|-----------|
| 4.0.0 | **[4] Webhook body** — `specifyBody: raw` + `rawBody` sur les deux nœuds HTTP webhook. Suppression du mode `json` qui re-sérialisait et invalidait la signature HMAC. |
| 4.0.0 | **[5] Code 409** — `409 already_processing` = état métier normal, pas de retry. Suppression de toute mention "réessayer dans 10–15 min". Tableau de retry unifié. |
| 4.0.0 | **[3] Encodage** — `storagePath` dans le payload = préfixe racine uniquement. Note explicite : les chemins complets des fichiers sont dans `manifest.files[n].storagePath`. |

---

## Vue d'ensemble

Quand n8n (Hostinger) a terminé de collecter et stocker un lot BDPM dans Supabase Storage, il notifie NaturoDesk (Vercel) via un webhook HTTP signé.

Ce document est le contrat d'implémentation entre les deux parties.

---

## Endpoint cible

```
POST https://<app.naturodesk.fr>/api/knowledge/bdpm-ready
```

Fichier : `app/api/knowledge/bdpm-ready/route.ts`

---

## Sécurité — Trois niveaux

### Niveau 1 — Bearer token

```http
Authorization: Bearer <N8N_WEBHOOK_SECRET>
```

Générer : `openssl rand -hex 32`

### Niveau 2 — Signature HMAC-SHA256

```http
X-NaturoDesk-Signature: sha256=<hmac_hex>
```

La signature est calculée sur la **string JSON exacte transmise dans le body** — pas sur un objet re-sérialisé.

**Calcul côté n8n :**
```js
const payloadJson = JSON.stringify(payload); // sérialisé une seule fois
const hmacHex = crypto.createHmac('sha256', secret).update(payloadJson).digest('hex');
// Header : `sha256=${hmacHex}`
```

**Mode d'envoi n8n — `specifyBody: raw` obligatoire :**
```json
"specifyBody": "raw",
"rawBody": "={{ $json.payloadJson }}"
```
Le mode `json` de n8n re-parse puis re-sérialise le body, ce qui peut modifier l'ordre des clés et invalider la signature. Le mode `raw` envoie la string telle quelle.

**Vérification côté NaturoDesk :**
```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifyHmac(rawBody: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    // timingSafeEqual : comparaison en temps constant — protège contre timing attacks
    return timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    return false; // longueurs différentes
  }
}
```

> **Règle absolue :** NaturoDesk lit `rawBody = await req.text()` **avant** tout `JSON.parse()`. La vérification HMAC porte sur les octets du body HTTP, pas sur un objet re-sérialisé. Ne jamais appeler `req.json()` avant la vérification.

### Niveau 3 — Timestamp anti-rejeu

Le payload inclut `emittedAt`. NaturoDesk rejette si > 5 minutes.

```typescript
const diffMin = Math.abs(Date.now() - new Date(payload.emittedAt).getTime()) / 60000;
if (diffMin > 5) return NextResponse.json({ error: "request_expired" }, { status: 401 });
```

---

## Headers complets de la requête n8n → NaturoDesk

```http
POST /api/knowledge/bdpm-ready HTTP/1.1
Host: app.naturodesk.fr
Content-Type: application/json
Authorization: Bearer <N8N_WEBHOOK_SECRET>
X-NaturoDesk-Signature: sha256=<hmac_hex>
```

---

## Payload

```typescript
interface BdpmBatchReadyPayload {
  event: "bdpm.batch.ready";
  emittedAt: string;           // ISO 8601 — anti-rejeu
  batchId: string;             // ex: "2026-04"
  downloadedAt: string;        // ISO 8601 — fin téléchargement BDPM
  source: "BDPM";
  storageProvider: "supabase";
  storageBucket: string;       // "bdpm-raw"
  storagePath: string;         // préfixe racine du lot — ex: "2026-04"
  globalStatus: "success" | "partial_success" | "partial_failure";
  summary: {
    totalFiles: number;
    successCount: number;
    errorCount: number;
    emptyCount: number;
    notFoundCount: number;
    requiredErrors: number;    // > 0 → NaturoDesk rejette avec 422
  };
}
```

> `storagePath` dans le payload = préfixe racine (`"2026-04"`). Les chemins complets des fichiers individuels sont dans `manifest.files[n].storagePath` (ex: `"2026-04/CIS_bdpm.txt"`). NaturoDesk lit le manifest en premier pour obtenir ces chemins.

---

## Codes HTTP

### Erreurs de protocole

| Code | Déclencheur |
|------|-------------|
| `400` | `Content-Type` manquant ou non `application/json` |
| `400` | JSON invalide ou champs requis absents |
| `401` | Bearer absent ou incorrect |
| `401` | Signature HMAC absente, malformée ou invalide |
| `401` | `emittedAt` > 5 minutes |
| `500` | Exception non catchée |

### États métier

| Code | Déclencheur | Action n8n |
|------|-------------|-----------|
| `200` | Ingestion planifiée | — |
| `200` | `batchId` déjà `completed` | — |
| `409` | `batchId` en `processing` | Pas de retry — état normal |
| `422` | `globalStatus === "partial_failure"` | Pas de retry — corriger n8n |

**`409` est un état métier normal**, pas une erreur. Il signifie que NaturoDesk a déjà enregistré ce lot et qu'une ingestion est en cours. n8n ne doit pas retenter.

### Corps de réponse

```typescript
// 200
{ "received": true, "batchId": "2026-04", "action": "ingestion_scheduled" }
{ "received": true, "batchId": "2026-04", "action": "already_completed" }

// 409
{ "received": true, "batchId": "2026-04", "action": "already_processing" }

// 422
{ "received": true, "batchId": "2026-04", "action": "rejected_partial_failure",
  "reason": "Lot rejeté : requiredErrors > 0. Corriger n8n et réessayer." }

// 401
{ "error": "unauthorized" }

// 400
{ "error": "invalid_payload", "detail": "..." }
```

---

## Stratégie de retry n8n

| Code reçu | Retry | Justification |
|-----------|:-----:|---------------|
| `200` | Non | Succès |
| `409` | **Non** | Lot déjà en cours — état métier attendu |
| `422` | Non | Problème source à corriger manuellement |
| `400` | Oui (1×, 30s) | Bug potentiellement transitoire |
| `401` | Oui (1×, 30s) | Décalage horloge possible sur emittedAt |
| `5xx` | Oui (1×, 30s) | Erreur Vercel potentiellement transitoire |
| timeout | Oui (1×, 60s) | Indisponibilité temporaire Vercel |

**Maximum : 1 retry.** Si le second appel échoue, le lot est dans Supabase Storage et l'ingestion peut être déclenchée manuellement.

**Interaction retry + idempotence :** si le premier appel a créé `KnowledgeSourceSync` en `processing` avant de répondre `500`, le retry recevra `409` → n8n traite comme succès → l'ingestion se poursuit normalement. Pas de double ingestion.

---

## Implémentation complète — Route Handler NaturoDesk

```typescript
// app/api/knowledge/bdpm-ready/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { startBdpmIngestion } from "@/lib/knowledge/bdpm/ingestion";

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET!;

function verifyHmac(rawBody: string, sigHeader: string | null): boolean {
  if (!sigHeader?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  // 1. Content-Type
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "invalid_content_type" }, { status: 400 });
  }

  // 2. Body brut — AVANT JSON.parse, nécessaire pour HMAC
  const rawBody = await req.text();

  // 3. Bearer
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 4. Signature HMAC sur rawBody
  if (!verifyHmac(rawBody, req.headers.get("x-naturodesk-signature"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 5. Parse
  let payload: BdpmBatchReadyPayload;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  // 6. Champs requis
  if (!payload.batchId || payload.event !== "bdpm.batch.ready" || !payload.emittedAt) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // 7. Anti-rejeu
  if (Math.abs(Date.now() - new Date(payload.emittedAt).getTime()) / 60000 > 5) {
    return NextResponse.json({ error: "request_expired" }, { status: 401 });
  }

  const { batchId, storageBucket, storagePath, globalStatus } = payload;

  // 8. Rejet métier
  if (globalStatus === "partial_failure") {
    return NextResponse.json({
      received: true, batchId, action: "rejected_partial_failure",
      reason: "Lot rejeté : requiredErrors > 0. Corriger n8n et réessayer."
    }, { status: 422 });
  }

  // 9. Idempotence
  const existing = await db.knowledgeSourceSync.findFirst({
    where: { source: "BDPM", batchId }
  });
  if (existing?.status === "completed") {
    return NextResponse.json({ received: true, batchId, action: "already_completed" });
  }
  if (existing?.status === "processing") {
    // 409 = état métier normal — ne pas retenter
    return NextResponse.json(
      { received: true, batchId, action: "already_processing" }, { status: 409 }
    );
  }

  // 10. Upsert sync record
  const syncRecord = await db.knowledgeSourceSync.upsert({
    where: { source_batchId: { source: "BDPM", batchId } },
    create: { source: "BDPM", batchId, storageBucket, storagePath,
               status: "processing", startedAt: new Date() },
    update: { status: "processing", startedAt: new Date(),
               completedAt: null, errorMessage: null }
  });

  // 11. Ingestion asynchrone — voir bdpm-ingestion-notes.md pour la stratégie Vercel
  startBdpmIngestion(syncRecord.id, batchId, storageBucket, storagePath)
    .catch(err => {
      console.error(`[BDPM] Ingestion failed for ${batchId}:`, err);
      db.knowledgeSourceSync.update({
        where: { id: syncRecord.id },
        data: { status: "failed", completedAt: new Date(), errorMessage: String(err) }
      }).catch(() => {});
    });

  return NextResponse.json({ received: true, batchId, action: "ingestion_scheduled" });
}
```

---

## Variables d'environnement

### n8n (Hostinger)

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `SUPABASE_URL` | ✅ | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role — écriture Storage |
| `NATURODESK_WEBHOOK_URL` | ✅ | URL complète du webhook |
| `N8N_WEBHOOK_SECRET` | ✅ | Secret HMAC partagé |

### NaturoDesk (Vercel)

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `N8N_WEBHOOK_SECRET` | ✅ | Même valeur que n8n |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Déjà présent |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Déjà présent |
