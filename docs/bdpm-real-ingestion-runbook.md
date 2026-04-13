# Runbook — Ingestion BDPM réelle

Guide pratique pour charger la base BDPM complète (~15 000 médicaments) depuis les fichiers ANSM.

---

## Deux pipelines BDPM — ne pas confondre

| Pipeline | Route | Table cible | Usage |
|---|---|---|---|
| **A — Matching** | `POST /api/bdpm/ingest` ou script direct | `drug_products`, `drug_substances`, `drug_aliases` | Résoudre un médicament saisi librement → ID structuré |
| **B — RAG** | `POST /api/knowledge/bdpm-ready` (webhook n8n) | `knowledge_documents`, `knowledge_chunks`, `knowledge_terms` | Recherche sémantique / faits cliniques |

Ce runbook couvre le **Pipeline A** (matching). Le Pipeline B est alimenté par n8n via Supabase Storage.

---

## Prérequis

### Variables d'environnement

```bash
# .env.local
DATABASE_URL="postgresql://..."       # pooler pgBouncer (runtime Prisma)
DIRECT_URL="postgresql://..."         # connexion directe (migrations)
KNOWLEDGE_IMPORT_SECRET="..."         # auth POST /api/bdpm/ingest
```

### Dépendances Node.js

```bash
npm install tsconfig-paths             # résolution alias @/ dans ts-node
npm install dotenv                     # charge .env.local automatiquement
```

### État DB requis

Les migrations Prisma doivent être appliquées :

```bash
npx prisma migrate deploy
# Doit afficher : "All migrations have been applied"
```

Vérifier les tables attendues :

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/check-bdpm-ingestion.ts
```

---

## Ordre du flux — ingestion complète

```
1. (optionnel) Seed minimal pour tests rapides
2. Ingestion réelle depuis ANSM
3. Vérification des compteurs
4. Test du matching
```

---

## Commandes

### 1. Seed minimal (développement / tests)

Charge 9 substances, 11 produits, 29 alias (Doliprane, Amoxicilline, Ibuprofène…).
Durée : ~5 secondes.

```bash
npx ts-node \
  --compiler-options '{"module":"CommonJS"}' \
  scripts/seed-bdpm-minimal.ts
```

### 2. Ingestion réelle depuis ANSM

Télécharge les 4 fichiers BDPM (~22 MB total) et les injecte directement en base.
Durée : **3–10 minutes** selon connexion et serveur DB.

```bash
npx ts-node \
  -r tsconfig-paths/register \
  --compiler-options '{"module":"CommonJS"}' \
  scripts/ingest-bdpm-real.ts
```

Avec un `batchRef` explicite (défaut = mois courant `YYYY-MM`) :

```bash
npx ts-node \
  -r tsconfig-paths/register \
  --compiler-options '{"module":"CommonJS"}' \
  scripts/ingest-bdpm-real.ts 2026-04
```

Fichiers téléchargés :
- `CIS_bdpm.txt` — spécialités pharmaceutiques (requis)
- `CIS_COMPO_bdpm.txt` — compositions (requis)
- `CIS_CIP_bdpm.txt` — présentations / codes CIP (requis)
- `CIS_GENER_bdpm.txt` — groupes génériques (optionnel)

Source : `https://base-donnees-publique.medicaments.gouv.fr/telechargement` (URLs : `/download/file/<nom>.txt`)

### 3. Diagnostic post-ingestion

```bash
npx ts-node \
  --compiler-options '{"module":"CommonJS"}' \
  scripts/check-bdpm-ingestion.ts
```

### 4. Test du matching

```bash
npx ts-node \
  --compiler-options '{"module":"CommonJS"}' \
  scripts/test-drug-matching.ts
```

Résultat attendu après ingestion réelle : **22/22 tests passés** (avec l'alias seed en place).

---

## Vérifier le succès

Après `check-bdpm-ingestion.ts`, les valeurs attendues pour une ingestion complète :

| Compteur | Valeur typique |
|---|---|
| `drug_products` | ~15 000 |
| `drug_substances` | ~2 500 |
| `drug_aliases` | ~35 000 |
| `drug_product_substances` | ~80 000 |
| `drug_presentations` | ~30 000 |
| `drug_sync_batches` | ≥ 1, status `COMPLETED` |

Le dernier `DrugSyncBatch` doit afficher :

```
status    : COMPLETED
endedAt   : <date récente>
errors    : 0 (ou très peu)
```

---

## Diagnostiquer un échec

### Vérifier le statut du dernier batch

```bash
# Via script
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/check-bdpm-ingestion.ts

# Via API (dev local)
curl -H "x-api-key: bdpm-import-secret-2026" \
  http://localhost:3000/api/bdpm/ingest
```

### Erreurs fréquentes

| Symptôme | Cause probable | Solution |
|---|---|---|
| `HTTP 403` / `403 Forbidden` sur ANSM | IP bloquée ou User-Agent filtré | Relancer — ANSM peut throttler ponctuellement |
| `P1001` Prisma cannot reach DB | `DATABASE_URL` absent ou invalide | Vérifier `.env.local` |
| `Cannot find module 'tsconfig-paths'` | Paquet non installé | `npm install tsconfig-paths` |
| `Module not found: @/lib/bdpm/ingest` | `-r tsconfig-paths/register` manquant | Utiliser la commande complète ci-dessus |
| Batch `status: FAILED` en DB | Erreur dans `ingestBdpm()` | Lire `errorMessage` dans `drug_sync_batches` |
| Matching rate 0% | Seed minimal écrasé par ingestion réelle sans alias | Relancer `seed-bdpm-minimal.ts` après ingestion |

### Relancer après un batch échoué

Le batch `FAILED` est remplacé automatiquement si `batchRef` identique : `ingestBdpm` crée un nouveau batch.

```bash
# Forcer un nouveau batchRef
npx ts-node -r tsconfig-paths/register \
  --compiler-options '{"module":"CommonJS"}' \
  scripts/ingest-bdpm-real.ts 2026-04-retry
```

---

## Via webhook HTTP (production)

Pour appeler le Pipeline A via HTTP (n8n, curl…) — limité à 4.5 MB sur Vercel Free :

```bash
curl -X POST https://your-app.vercel.app/api/bdpm/ingest \
  -H "x-api-key: $KNOWLEDGE_IMPORT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batchRef":"2026-04-10","files":{"cis":"...","compo":"...","cip":"...","gener":"..."}}'
```

Réponse immédiate `202` — ingestion en arrière-plan (`after()`).
Vérifier avancement : `GET /api/bdpm/ingest?batchRef=2026-04-10`

> Pour les fichiers complets (>4.5 MB), utiliser `scripts/ingest-bdpm-real.ts` en direct.
