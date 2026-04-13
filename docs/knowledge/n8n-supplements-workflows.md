# NaturoDesk — Design Workflows n8n Supplements (ODS + DSLD)

**Version :** 1.0  
**Date :** 2026-04-05  
**Statut :** Design technique — implémentation n8n Phase 17

---

## Vue d'ensemble

Deux workflows distincts, séparés du `bdpm_collect_workflow` existant :

```
bdpm_collect_workflow    → médicaments (existant)
ods_collect_workflow     → ingrédients compléments (documentaire)
dsld_collect_workflow    → produits commerciaux (structuré déclaratif)
```

Ils partagent le même webhook d'entrée NaturoDesk (`POST /api/knowledge/import`) mais avec des `sourceType` différents. Ils ne dépendent pas l'un de l'autre et peuvent tourner indépendamment.

---

## Workflow 1 — `ods_collect_workflow`

### Nature de la source

ODS fournit un **corpus documentaire narratif** par ingrédient. Chaque fact sheet est un document HTML structuré avec des sections métier (Safety, Interactions, Health Effects, etc.).

L'ingestion ODS ressemble à celle de BDPM : import document → chunking métier → embedding → extraction facts.

### Stratégie de collecte

**Mode :** List-driven (manifest interne)  
**Raison :** L'ODS n'expose pas d'API de listing. Les URLs des fact sheets suivent un pattern prévisible mais il n'existe pas d'endpoint de découverte fiable. On maintient un manifest interne des ingrédients à collecter.

```json
// manifest_ods.json — géré dans n8n ou fichier statique
{
  "ingredients": [
    { "id": "Magnesium", "url": "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/", "canonicalName": "Magnesium", "frName": "Magnésium" },
    { "id": "Zinc", "url": "https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/", "canonicalName": "Zinc", "frName": "Zinc" },
    { "id": "VitaminD", "url": "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/", "canonicalName": "Vitamin D", "frName": "Vitamine D" },
    { "id": "VitaminB12", "url": "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/", "canonicalName": "Vitamin B12", "frName": "Vitamine B12" },
    { "id": "Iron", "url": "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/", "canonicalName": "Iron", "frName": "Fer" },
    { "id": "Omega3FattyAcids", "url": "https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/", "canonicalName": "Omega-3 Fatty Acids", "frName": "Oméga-3" },
    { "id": "Ashwagandha", "url": "https://ods.od.nih.gov/factsheets/Ashwagandha-HealthProfessional/", "canonicalName": "Ashwagandha", "frName": "Ashwagandha" },
    { "id": "Melatonin", "url": "https://ods.od.nih.gov/factsheets/Melatonin-HealthProfessional/", "canonicalName": "Melatonin", "frName": "Mélatonine" },
    { "id": "Probiotics", "url": "https://ods.od.nih.gov/factsheets/Probiotics-HealthProfessional/", "canonicalName": "Probiotics", "frName": "Probiotiques" },
    { "id": "Calcium", "url": "https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/", "canonicalName": "Calcium", "frName": "Calcium" }
  ]
}
```

Ce manifest est la source de vérité pour les ingrédients couverts. On l'enrichit progressivement.

### Diagramme de flux

```
[Trigger : Cron hebdomadaire OU manuel]
        │
        ▼
[Node: Load manifest_ods.json]
  → liste des ingrédients à traiter
        │
        ▼
[Node: Loop over ingredients]
  Pour chaque ingrédient :
        │
        ├─ [Node: HTTP Request — GET fact sheet URL]
        │   Timeout: 30s
        │   Header: User-Agent: NaturoDesk-Collector/1.0
        │   Retries: 2
        │
        ├─ [Node: Compute SHA-256 hash du body]
        │
        ├─ [Node: Check KnowledgeSourceSync via NaturoDesk API]
        │   GET /api/admin/knowledge/sync-status?sourceType=NIH_ODS&entityKey={id}
        │   Si hash identique au dernier sync → skip (idempotence)
        │
        ├─ [Node: Parse HTML — extract sections]
        │   Sections à extraire :
        │   - "What is [ingredient]?" → chunk kind: OVERVIEW
        │   - "What are the health effects?" → kind: HEALTH_EFFECTS
        │   - "What are the risks?" / "Upper Intake Level" → kind: SAFETY
        │   - "Does [ingredient] interact with medications?" → kind: INTERACTIONS
        │   - "Recommended intakes" / "RDA" → kind: DOSAGE_NOTE
        │
        ├─ [Node: Build import payload]
        │   {
        │     sourceType: "NIH_ODS",
        │     entityKey: "Magnesium",
        │     docType: "FACT_SHEET",
        │     title: "Magnesium — Health Professional Fact Sheet",
        │     url: "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/",
        │     contentHash: "<sha256>",
        │     canonicalName: "Magnesium",
        │     frName: "Magnésium",
        │     chunks: [
        │       { kind: "SAFETY", label: "Risques et UL", excerpt: "...", metaJson: { ul: 350, ulUnit: "mg/day" } },
        │       { kind: "INTERACTIONS", label: "Interactions médicamenteuses", excerpt: "..." },
        │       ...
        │     ]
        │   }
        │
        ├─ [Node: POST /api/knowledge/import]
        │   Auth: Bearer NATURODESK_ADMIN_TOKEN
        │   Body: payload ci-dessus
        │
        └─ [Node: Log résultat]
             → success: document importé, N chunks créés
             → skip: hash identique, rien à faire
             → error: log + continue (ne bloque pas les autres ingrédients)
```

### Sections à extraire par priorité

| Section HTML | Chunk kind | Priorité | Contient |
|---|---|---|---|
| Risques / Safety / Upper Limit | SAFETY | 🔴 Haute | UL, toxicité, contre-indications |
| Interactions médicamenteuses | INTERACTIONS | 🔴 Haute | Noms médicaments, effets |
| Recommandations / RDA | DOSAGE_NOTE | 🟡 Moyenne | Doses recommandées, UL |
| Effets sur la santé | HEALTH_EFFECTS | 🟡 Moyenne | Bénéfices documentés |
| Vue d'ensemble | OVERVIEW | 🟢 Basse | Description générale |

Seules les sections SAFETY et INTERACTIONS sont vectorisées (embeddings coûteux). Les autres sont conservées pour contexte mais pas forcément vectorisées en V1.

### Extraction des KnowledgeFact depuis les chunks ODS

Le webhook NaturoDesk traite les chunks reçus et en extrait des faits structurés de façon déterministe :

**Pattern INTERACTIONS :**
- Recherche de patterns : "[médicament] + [ingrédient]", "[ingrédient] may [effect] [médicament]"
- Extraction → KnowledgeFact : `{ingrédient} INTERACTS_WITH {médicament}`, confidence=0.88, extractionMethod=DETERMINISTIC

**Pattern SAFETY / UL :**
- Extraction UL numérique → KnowledgeFact : `{ingrédient} INCREASES_RISK_OF {Toxicité}` si UL documenté
- Stocké dans metaJson : `{ ul: 40, ulUnit: "mg/day" }`

**Pour les cas complexes :** LLM_ASSISTED avec prompt strict et validation humaine avant persistance (hors scope V1 initial).

### Idempotence

- Hash SHA-256 du HTML source comparé au `contentHash` du KnowledgeDocument existant
- Si identique → aucun re-import (skip)
- Si différent → re-import complet du document + suppression des anciens chunks/facts de ce document

### Fréquence recommandée

- **Cron hebdomadaire** (dimanche 3h UTC)
- Les fact sheets ODS changent rarement — un check hebdomadaire est largement suffisant
- Possibilité de déclencher manuellement via webhook n8n pour un ingrédient spécifique

---

## Workflow 2 — `dsld_collect_workflow`

### Nature de la source

Le DSLD est une **base de données structurée de produits commerciaux**. Contrairement à ODS, il n'y a pas de narrative documentaire à parser — les données sont JSON structuré (produit → ingrédients → quantités).

L'ingestion DSLD ressemble à une synchronisation de catalogue, pas à un import documentaire.

### Stratégie de collecte — Ingredient-driven (scoped)

⚠️ **Le DSLD contient >175 000 produits. On N'importe PAS tout.**

**Stratégie retenue :** Import piloté par les `KnowledgeTerm` existants (termType SUPPLEMENT/NUTRIENT).

```
Pour chaque KnowledgeTerm actif (SUPPLEMENT/NUTRIENT) :
  → Appel DSLD /products?ingredient={canonicalName}&size=50
  → Récupérer les 50 produits les plus récents contenant cet ingrédient
  → Stocker dans SupplementProduct + SupplementIngredient
```

Cela limite le volume à : N ingrédients × 50 produits max = ~5 000 produits en V1 (avec 100 ingrédients).

**Critères de sélection des produits :**
- Status = "Market" uniquement (pas les discontinués)
- Les 50 produits les plus récents par ingrédient (tri par date d'ajout DSLD)
- Si un produit est déjà en base (dsldId existant) → mise à jour si changements détectés

### API DSLD — Endpoints utilisés

```
Base URL: https://dsld.od.nih.gov/api/

Listing produits par ingrédient :
GET /products?ingredient=Magnesium&status=on_market&size=50&from=0
→ Retourne: { total, products: [{ id, brandName, productName, ... }] }

Détail produit (avec ingrédients) :
GET /products/{id}
→ Retourne: { id, brandName, productName, servingSize, ingredients: [{ name, amount, unit, ... }] }
```

### Diagramme de flux

```
[Trigger : Cron mensuel OU manuel par ingrédient]
        │
        ▼
[Node: Load KnowledgeTerm list from NaturoDesk]
  GET /api/admin/knowledge/terms?termType=SUPPLEMENT,NUTRIENT
  → liste des termes avec canonicalName
        │
        ▼
[Node: Loop over terms]
  Pour chaque terme :
        │
        ├─ [Node: HTTP Request DSLD — search by ingredient]
        │   GET /products?ingredient={canonicalName}&status=on_market&size=50
        │   Retries: 3, timeout: 20s
        │   Rate limit: 1 requête / 500ms
        │
        ├─ [Node: Filter — skip if already up-to-date]
        │   Check: est-ce que dsldId existe déjà avec fetchedAt < 30 jours ?
        │   Si oui → skip
        │
        ├─ [Node: Loop over products — fetch details]
        │   Pour chaque produit (max 50) :
        │   GET /products/{id}
        │   Rate limit: 1 req / 200ms (API DSLD est permissive mais on reste poli)
        │
        ├─ [Node: Build product payload]
        │   {
        │     sourceType: "NIH_DSLD",
        │     action: "upsert_product",
        │     product: {
        │       dsldId: "12345",
        │       brandName: "Solgar",
        │       productName: "Magnesium Citrate",
        │       manufacturer: "Solgar Inc.",
        │       marketStatus: "Market",
        │       servingSize: "2 tablets",
        │       ingredients: [
        │         { rawName: "Magnesium (as Magnesium Citrate)", amount: 200, unit: "mg" },
        │         { rawName: "Calcium (as Calcium Carbonate)", amount: 50, unit: "mg" }
        │       ]
        │     }
        │   }
        │
        ├─ [Node: POST /api/knowledge/import]
        │   Auth: Bearer NATURODESK_ADMIN_TOKEN
        │   Body: payload ci-dessus
        │
        └─ [Node: Log + rate limit pause]
             → success: produit upserted, N ingrédients liés
             → skip: déjà à jour
             → error: log + continue
```

### Gestion du volume et rate limiting

| Paramètre | Valeur V1 | Raison |
|---|---|---|
| Produits max par ingrédient | 50 | Limite volume DB |
| Délai inter-requêtes listing | 500ms | Politesse API |
| Délai inter-requêtes détail | 200ms | Politesse API |
| Produits max total cible | ~5 000 | N_terms × 50 |
| Fréquence cron | Mensuelle | Catalogue stable |

### Normalisation des ingrédients DSLD → KnowledgeTerm

Après import, un step de normalisation résout les `rawName` DSLD vers les `normalizedKey` KnowledgeTerm :

```
"Magnesium (as Magnesium Citrate)" → slug → "magnesium" → KnowledgeTerm.id
"Vitamin C (as Ascorbic Acid)" → slug → "vitamin_c" → KnowledgeTerm.id
"CoQ10 (Coenzyme Q10)" → slug → "coq10" → KnowledgeTerm.id
```

Cette normalisation est exécutée par le webhook NaturoDesk lors de l'import, via la même logique de `normalize-input.ts` que le matching engine.

### Idempotence DSLD

- `dsldId` est unique en base (`@unique`)
- Upsert sur `dsldId` : si le produit existe → mise à jour des champs, suppression + recréation des ingrédients
- Un produit non vu depuis 90 jours peut être marqué "stale" (pas supprimé, juste flaggé)

### Fréquence recommandée

- **Cron mensuel** (1er du mois, 2h UTC) — le catalogue DSLD évolue lentement pour les produits existants
- **Déclenchement manuel** depuis l'admin NaturoDesk lors de l'ajout d'un nouvel ingrédient dans le manifest ODS

---

## Points communs aux deux workflows

### Webhook NaturoDesk — `POST /api/knowledge/import`

Endpoint existant (ou à créer en Phase 17). Accepte les deux types de payload via le champ `sourceType`.

```typescript
// Schéma Zod attendu
const ImportPayloadSchema = z.discriminatedUnion("sourceType", [
  // ODS — import documentaire
  z.object({
    sourceType: z.literal("NIH_ODS"),
    entityKey:    z.string(),       // ex: "Magnesium"
    docType:      z.literal("FACT_SHEET"),
    title:        z.string(),
    url:          z.string().url(),
    contentHash:  z.string(),
    canonicalName: z.string(),
    frName:       z.string().optional(),
    chunks:       z.array(ChunkSchema),
  }),
  // DSLD — import produit structuré
  z.object({
    sourceType: z.literal("NIH_DSLD"),
    action:     z.literal("upsert_product"),
    product:    DsldProductSchema,
  }),
]);
```

### Gestion des erreurs

- Chaque itération (ingrédient ou produit) est indépendante — une erreur n'arrête pas le batch
- Les erreurs sont loggées dans n8n + dans `KnowledgeSourceSync.errorMessage` si applicable
- Après 3 échecs consécutifs pour un même ingrédient → alerte dans n8n (Slack/email)
- Le workflow ne relance jamais automatiquement plus de 3 fois le même item

### Variables d'environnement n8n

```
NATURODESK_API_URL=https://app.naturodesk.com
NATURODESK_ADMIN_TOKEN=<token>
ODS_USER_AGENT=NaturoDesk-Collector/1.0 (contact@naturodesk.com)
DSLD_RATE_LIMIT_MS=500
```

---

## Comparaison ODS vs DSLD — Résumé décisionnel

| Dimension | `ods_collect_workflow` | `dsld_collect_workflow` |
|---|---|---|
| Type de source | Documentaire narratif | Structuré produit/label |
| Format | HTML → parsing sections | JSON → mapping direct |
| Volume | ~100 documents | ~5 000 produits (scoped) |
| Produit → KnowledgeDocument | Oui (1 doc par ingrédient) | Non — va dans SupplementProduct |
| Génère KnowledgeFact | Oui (interactions, safety) | Non directement |
| Confiance | 0.90 | 0.60 (déclaratif) |
| Fréquence | Hebdomadaire | Mensuelle |
| Idempotence | SHA-256 contentHash | dsldId @unique |
| Embeddings | Oui (chunks SAFETY + INTERACTIONS) | Non |
| Matching engine | Via KnowledgeFact + KnowledgeChunk | Via SupplementIngredient → KnowledgeTerm |

---

## Points d'arbitrage restants

| Point | Options | Recommandation |
|---|---|---|
| Stockage manifest ODS | Fichier statique n8n vs table DB | Table DB (KnowledgeSourceSync + flag) — plus auditable |
| Parsing HTML ODS | Regex vs LLM-assisted | Regex sur headings en V1, LLM pour cas complexes V2 |
| Scope DSLD initial | 10 ingrédients → 500 produits | Commencer avec les 20 ingrédients les plus courants |
| Langue ODS | Anglais brut vs traduction | Anglais brut + alias français dans KnowledgeTerm |
| Embeddings DSLD | Non recommandé | DSLD = structuré, pas narratif → pas d'embeddings |
