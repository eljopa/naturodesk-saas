# BDPM — Workflow de collecte n8n

> Version : 4.0.0 — **Référence d'implémentation finale**  
> Dernière mise à jour : 2026-04

---

## Changelog

| Version | Correction |
|---------|-----------|
| 4.0.0 | **[1] Paths** — Convention définitive : `manifest.storagePath` = préfixe racine (`"2026-04"`), `files[n].storagePath` = chemin complet (`"2026-04/CIS_bdpm.txt"`). NaturoDesk utilise `files[n].storagePath` directement, sans reconstruction. |
| 4.0.0 | **[2] Métadonnées n8n** — Nœud "Snapshot métadonnées fichier" intercalé entre Splitter et Download. Résout la perte de métadonnées causée par le HTTP Request qui écrase `$json`. |
| 4.0.0 | **[3] Encodage** — n8n utilise `responseFormat: text`. Les fichiers sont stockés en UTF-8 dans Supabase (pas ISO-8859-1 brut). Toute la doc alignée sur cette réalité. |
| 4.0.0 | **[4] Webhook body** — `specifyBody: raw` sur les nœuds HTTP webhook. La string signée = la string transmise, sans re-sérialisation intermédiaire. |
| 4.0.0 | **[5] Code 409** — État métier normal, pas de retry. Unifié dans workflow, contrat et doc architecture. |
| 4.0.0 | **[6] CIS_COMPO mémoire** — "Chargé en mémoire une fois, traité par batches DB" — formulation honnête, contradiction supprimée. |
| 4.0.0 | **[7] Vercel async** — `waitUntil(@vercel/functions)` documenté comme stratégie V1. Fallback Vercel Cron documenté avec code. |

---

## Contraintes d'infrastructure réelles

**Il n'existe aucun volume partagé entre n8n et NaturoDesk.**

| Composant | Hébergement | Rôle |
|-----------|-------------|------|
| NaturoDesk (Next.js) | Vercel | Consommateur — reçoit webhook, lit Storage, ingère |
| n8n | Hostinger (auto-hébergé) | Collecteur — télécharge BDPM, écrit Storage, notifie |
| Supabase Storage | Supabase Cloud | Couche d'échange — écrit par n8n, lu par NaturoDesk |

---

## Architecture cible

```
┌────────────────────────────────────────────────────────────────┐
│ HOSTINGER — n8n                                                │
│                                                                │
│  [Cron/Manuel] → [Init batch]                                  │
│    → [Fetch page BDPM] → [Résoudre CIS_InfoImportantes]        │
│    → [Split par fichier]                                       │
│    → [Snapshot métadonnées] ← conserve filename, required...  │
│    → [Download fichier BDPM] (responseFormat: text)            │
│    → [Validate] (relit métadonnées depuis Snapshot)            │
│    → [Upload Supabase] (UTF-8, x-upsert)                       │
│    → [Agréger] → [Générer manifest] → [Upload manifest]        │
│    → [Préparer payload HMAC] → [POST webhook] (mode raw)       │
│    → [Évaluer résultat] → [Retry 1× si nécessaire]             │
└──────────────────────────┬─────────────────────────────────────┘
                           │ PUT /storage/v1/object/bdpm-raw/{path}
                           │ Authorization: Bearer SERVICE_ROLE_KEY
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ SUPABASE STORAGE — bucket bdpm-raw (PRIVÉ)                     │
│                                                                │
│  bdpm-raw/                                                     │
│  └── 2026-04/                      ← batchStoragePath         │
│      ├── CIS_bdpm.txt              ← UTF-8 (converti par n8n)  │
│      ├── CIS_COMPO_bdpm.txt        ← UTF-8                     │
│      ├── ...                                                   │
│      └── manifest.json             ← UTF-8                     │
└──────────────────────────┬─────────────────────────────────────┘
                           │ POST /api/knowledge/bdpm-ready
                           │ Headers: Bearer + HMAC + emittedAt
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ VERCEL — NaturoDesk (Next.js)                                  │
│                                                                │
│  [Vérif HMAC sur rawBody] → [Anti-rejeu emittedAt]             │
│  → [Idempotence KnowledgeSourceSync]                           │
│  → waitUntil(startBdpmIngestion())                             │
│       → fetchManifest(bucket, "2026-04")                       │
│       → pour chaque file.storagePath :                         │
│           downloadBdpmFile(bucket, "2026-04/CIS_bdpm.txt")     │
│           data.text() → string UTF-8 directement utilisable    │
│           parsing tabulé → KnowledgeTerm, KnowledgeDocument    │
│           KnowledgeChunk, KnowledgeFact (déterministe)         │
│       → generatePendingEmbeddings() (batch 100)                │
│       → KnowledgeSourceSync: status = "completed"              │
└────────────────────────────────────────────────────────────────┘
```

---

## Responsabilités par composant

### n8n

| Fait | Ne fait pas |
|------|------------|
| Déclenchement cron + manuel | Parsing métier |
| Construction batchId `YYYY-MM` | Normalisation DCI |
| Résolution `CIS_InfoImportantes_*.txt` | Chunking / embeddings |
| Snapshot métadonnées avant HTTP Request | Conversion encodage explicite |
| Download fichiers BDPM (`responseFormat: text`) | — |
| Validation (taille, HTTP status) | — |
| Upload UTF-8 vers Supabase (`x-upsert`) | — |
| Génération + upload `manifest.json` | — |
| Webhook POST signé HMAC (mode `raw`) | — |
| Retry 1× si erreur transitoire | — |

### Supabase Storage

- Bucket `bdpm-raw` privé — accès uniquement via service role key
- Fichiers stockés en UTF-8 (produit par n8n)
- `manifest.files[n].storagePath` = chemin complet, source de vérité pour NaturoDesk
- `manifest.storagePath` = préfixe racine (`"2026-04"`), utilisé pour lire le manifest

### NaturoDesk

| Fait | Ne fait pas |
|------|------------|
| Vérification HMAC sur `req.text()` (rawBody) | Accès filesystem local |
| Anti-rejeu `emittedAt` (< 5 min) | Reconstruire les chemins fichier |
| Idempotence `KnowledgeSourceSync` | Utiliser `TextDecoder('iso-8859-1')` |
| `waitUntil()` pour l'ingestion asynchrone | Traitement côté client browser |
| `file.storagePath` du manifest pour chaque download | — |
| `data.text()` → string UTF-8 | — |
| Parsing tabulé par type de fichier | — |
| Normalisation `KnowledgeTerm` | — |
| `KnowledgeDocument` + `KnowledgeChunk` | — |
| Embeddings batch (OpenAI, 100/appel) | — |
| `KnowledgeFact` déterministe | — |
| Mise à jour `KnowledgeSourceSync` | — |

---

## Convention des storage paths — Règle définitive

```
manifest.storagePath         = "2026-04"               ← préfixe racine
manifest.files[n].storagePath = "2026-04/CIS_bdpm.txt" ← chemin complet fichier
```

NaturoDesk utilise **toujours** `files[n].storagePath` pour les downloads. Il ne reconstruit jamais le chemin.

---

## Encodage — Ce qui se passe réellement

n8n utilise `responseFormat: "text"`. Node.js/n8n décode la réponse HTTP (source ISO-8859-1 ANSM) en string JavaScript interne. L'upload vers Supabase sérialise cette string en UTF-8.

**Les fichiers dans Supabase Storage sont en UTF-8.**

NaturoDesk les lit avec `.text()` directement. Il ne doit pas utiliser `TextDecoder("iso-8859-1")` sur ces fichiers.

| Étape | Acteur | Résultat |
|-------|--------|---------|
| Download BDPM | n8n | String JS (décode ISO-8859-1 implicitement) |
| Upload Supabase | n8n | UTF-8 dans Supabase |
| Download Supabase | NaturoDesk | `.text()` → string UTF-8 utilisable |

---

## Conservation des métadonnées entre nœuds — Pattern Snapshot

Le nœud HTTP Request de n8n écrase `$json` avec sa réponse (`{ body, statusCode, headers }`). Les métadonnées du fichier en cours (`filename`, `required`, `batchId`, etc.) sont perdues.

Solution : un nœud Code "Snapshot métadonnées fichier" est intercalé **avant** le nœud HTTP Request. Il stocke les métadonnées dans l'historique d'exécution n8n, accessible via `$('Snapshot métadonnées fichier').first().json` dans le nœud Validate suivant.

```
[Split] → [Snapshot métadonnées] → [HTTP Download] → [Validate (relit depuis Snapshot)]
```

Le nœud Validate ne lit jamais les métadonnées depuis `$input.first().json` — uniquement le contenu HTTP (body, statusCode). Les métadonnées viennent exclusivement du Snapshot.

---

## Webhook — Mode d'envoi `raw`

Le nœud HTTP Request qui appelle le webhook NaturoDesk utilise `specifyBody: "raw"` avec `rawBody: "={{ $json.payloadJson }}"`.

Le mode `json` de n8n re-parse puis re-sérialise le body avant envoi. Cela peut modifier l'ordre des clés JSON et invalider la signature HMAC. Le mode `raw` envoie la string telle quelle — la string signée et la string transmise sont identiques.

---

## Stratégie de retry n8n sur le webhook

| Code NaturoDesk | Retry | Raison |
|-----------------|:-----:|--------|
| `200` | Non | Succès |
| `409` | **Non** | `already_processing` = état métier normal |
| `422` | Non | Lot incomplet à corriger côté n8n |
| `4xx` autres | Oui (1×, 30s) | Potentiellement transitoire |
| `5xx` | Oui (1×, 30s) | Erreur Vercel transitoire |
| timeout | Oui (1×, 60s) | Indisponibilité temporaire |

Maximum 1 retry. Le lot est dans Supabase Storage indépendamment du résultat du webhook.

---

## Ingestion asynchrone sur Vercel — `waitUntil`

Le webhook handler NaturoDesk utilise `waitUntil` de `@vercel/functions` pour garantir que l'ingestion se termine même après l'envoi de la réponse HTTP.

```typescript
import { waitUntil } from "@vercel/functions";
waitUntil(startBdpmIngestion(...));
return NextResponse.json({ received: true, batchId, action: "ingestion_scheduled" });
```

Le fire-and-forget simple (`.catch()` sans `waitUntil`) est non fiable sur Vercel — la fonction peut être coupée avant la fin de l'ingestion.

Plan Vercel Pro minimum recommandé (300s d'exécution max par fonction). Voir `bdpm-ingestion-notes.md` pour le fallback Vercel Cron si ce délai s'avère insuffisant.

---

## Fichiers BDPM collectés

| Fichier | Requis | Priorité d'ingestion |
|---------|:------:|:--------------------:|
| `CIS_bdpm.txt` | ✅ | P1 |
| `CIS_CIP_bdpm.txt` | ✅ | P1 |
| `CIS_COMPO_bdpm.txt` | ✅ | P1 |
| `CIS_CPD_bdpm.txt` | — | P2 |
| `CIS_MITM.txt` | — | P2 |
| `CIS_GENER_bdpm.txt` | — | P3 |
| `CIS_HAS_SMR_bdpm.txt` | — | P3 |
| `CIS_HAS_ASMR_bdpm.txt` | — | P3 |
| `CIS_CIP_Dispo_Spec.txt` | — | P3 |
| `HAS_LiensPageCT_bdpm.txt` | — | P3 |
| `CIS_InfoImportantes_*.txt` | — | P3 |

---

## Variables d'environnement — Référence

### n8n (Hostinger)

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `SUPABASE_URL` | ✅ | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role — écriture Storage |
| `NATURODESK_WEBHOOK_URL` | ✅ | `https://app.naturodesk.fr/api/knowledge/bdpm-ready` |
| `N8N_WEBHOOK_SECRET` | ✅ | Secret HMAC partagé (hex 32+ chars) |

### NaturoDesk (Vercel)

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `N8N_WEBHOOK_SECRET` | ✅ | Même valeur que n8n |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Déjà présent — lecture Storage serveur |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Déjà présent |

---

## Limites connues de la V4

| Limite | Impact | Mitigation |
|--------|--------|-----------|
| Fichiers chargés en mémoire (max ~10 MB) | Acceptable sur Vercel Pro (1 GB RAM) | Surveiller si de nouveaux fichiers BDPM grossissent significativement |
| `waitUntil` limité à 300s (Vercel Pro) | Ingestion complète peut dépasser | Vercel Cron de reprise — voir bdpm-ingestion-notes.md |
| Regex `CIS_InfoImportantes` | Fragile si ANSM change le HTML | Monitoring mensuel |
| 1 seul retry webhook | Lot perdu si NaturoDesk indisponible > 2 min | Vercel Cron de détection des `KnowledgeSourceSync` en `processing` depuis > 30 min |
| Pas de hash SHA256 inter-lots | Re-ingestion complète chaque mois | Hash dans manifest + skip si identique |
