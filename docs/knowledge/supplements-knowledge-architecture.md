# NaturoDesk — Architecture Knowledge Supplements (ODS + DSLD)

**Version :** 1.0  
**Date :** 2026-04-05  
**Statut :** Proposition validée — implémentation Phase 17+

---

## 1. Objectif métier

La brique Supplements Knowledge étend le moteur d'analyse de NaturoDesk aux compléments alimentaires. Elle permet au praticien de recevoir des signaux documentés sur :

- les **interactions potentielles** entre un complément et un médicament pris par le patient
- les **redondances d'ingrédients** entre plusieurs produits du protocole
- les **vigilances spécifiques** à un ingrédient (dosage excessif, contre-indication relative)
- l'**identification documentée** d'un produit commercial saisi librement

L'objectif n'est pas de remplacer un conseil pharmaceutique. Il est de fournir au naturopathe un **signal documenté, traçable et hiérarchisé** pour orienter son analyse.

---

## 2. Sources utilisées

### 2.1. NIH ODS — Office of Dietary Supplements

**URL :** `https://ods.od.nih.gov/factsheets/`  
**Nature :** Corpus documentaire institutionnel ingrédient

Les Fact Sheets ODS sont des monographies par ingrédient publiées par le NIH. Elles couvrent :
- propriétés, formes, biodisponibilité
- apports recommandés (RDA, UL)
- risques de toxicité à hautes doses
- interactions médicamenteuses documentées
- populations à risque
- sources alimentaires

Il existe deux versions par ingrédient : **HealthProfessional** (détaillée, avec références) et **Consumer** (simplifiée). NaturoDesk utilise exclusivement la version **HealthProfessional**.

**Volume estimé :** ~100 fact sheets (nutriments et ingrédients courants)  
**Format :** HTML structuré (headings, tables, lists) — pas d'API JSON native  
**Fréquence de mise à jour source :** irrégulière (quelques fois par an)  
**Langue :** Anglais uniquement

---

### 2.2. NIH DSLD — Dietary Supplement Label Database

**URL :** `https://dsld.od.nih.gov/api/`  
**Nature :** Base de données produits / étiquettes (structuré, déclaratif)

Le DSLD recense les produits commerciaux de compléments alimentaires vendus aux États-Unis. Chaque entrée est un **label déclaré par le fabricant**, importé tel quel dans la base. Les données disponibles par produit :
- nom produit et marque
- fabricant
- liste d'ingrédients avec quantités et unités
- taille de portion
- statut marché (on market / discontinued)
- claims et avertissements label

**Volume :** >175 000 produits  
**Format :** JSON via API REST (pagination `size` / `from`)  
**Mise à jour :** continue (nouveaux labels ajoutés régulièrement)  
**Langue :** Anglais (marché US)

---

## 3. Niveaux de confiance

La hiérarchie de confiance est une décision architecturale centrale. Elle s'applique à chaque source de fait dans le moteur d'analyse.

```
BDPM (confiance 1.00)       — médicament — source réglementaire française
NIH_ODS (confiance 0.90)    — ingrédient — source institutionnelle forte (NIH)
MANUAL (confiance 0.85)     — contenu interne validé par l'équipe
PUBMED (confiance 0.75)     — étude — nécessite contexte clinique
NIH_DSLD (confiance 0.60)   — produit commercial — déclaratif fabricant
```

### Règles concrètes par source

| Source | Peut générer alerte CRITIQUE | Peut générer INTERACTION | Signal de vigilance | Présenter comme "à vérifier" |
|---|---|---|---|---|
| BDPM | ✅ | ✅ | ✅ | Non obligatoire |
| NIH_ODS | ✅ si UL dépassé ou interaction documentée | ✅ | ✅ | Non obligatoire |
| MANUAL | ✅ | ✅ | ✅ | Non |
| PUBMED | ⚠️ seulement si répliqué | ⚠️ seulement si documenté | ✅ | Toujours |
| NIH_DSLD | ❌ jamais directement | ❌ jamais directement | ✅ aide à l'identification | Toujours |

**Règle absolue :**  
> Le DSLD ne peut pas seul générer un finding d'interaction ou une alerte clinique.  
> Il sert uniquement à identifier les ingrédients d'un produit, lesquels sont ensuite matchés contre des faits ODS/BDPM qui, eux, peuvent générer des findings.

---

## 4. Place de cette brique dans NaturoDesk

### Architecture globale

```
[Consultation praticien]
        │
        ▼
[Matching engine]
  ├── Médicaments → KnowledgeTerm (DRUG) → KnowledgeFact (BDPM/ANSM source)
  ├── Compléments nom produit → SupplementProduct (DSLD) → ingrédients → KnowledgeTerm (SUPPLEMENT/NUTRIENT)
  ├── Compléments nom ingrédient → KnowledgeTerm (SUPPLEMENT/NUTRIENT) → KnowledgeFact (ODS source)
  └── Symptômes → KnowledgeTerm (SYMPTOM)
        │
        ▼
[Analysis engine]
  ├── Scoring déterministe (predicate × confidence × source weight)
  ├── Détection redondance (même termId dans plusieurs SupplementIngredient)
  └── Cross-check complément × médicament (KnowledgeFact predicate INTERACTS_WITH)
        │
        ▼
[Findings persistence + UI + PDF]
```

### Ce qui change dans le pipeline existant

Le pipeline knowledge actuel (`consultation-runner.ts`) charge déjà `medications`, `supplements`, `symptoms`. Il passe `supplements` au matching engine. Avec cette brique :

1. Si un supplement match un **SupplementProduct** → ses ingrédients sont extraits et matchés contre `KnowledgeTerm`
2. Si un supplement match directement un **KnowledgeTerm** (SUPPLEMENT/NUTRIENT) → les facts ODS associés sont utilisés
3. Les ingrédients résolus entrent dans le même pipeline `runSecureMatching` → `runDeterministicAnalysis` → `persistAnalysisResults`

---

## 5. Modèle de données cible

### 5.1. Extensions d'enums existants

```prisma
enum KnowledgeSourceType {
  BDPM
  ANSM
  PUBMED
  MANUAL
  NIH_ODS   // + NEW — fact sheets ingrédients NIH
  NIH_DSLD  // + NEW — labels produits commerciaux NIH
}

enum KnowledgeDocType {
  MONOGRAPH
  NOTICE
  INTERACTION_SHEET
  STUDY
  FACT_SHEET    // + NEW — fiche ingrédient ODS (HealthProfessional)
  PRODUCT_LABEL // + NEW — label produit commercial DSLD
}
```

### 5.2. Extension KnowledgeTerm

Ajout d'un champ `odsId` pour lier les termes ingrédients à l'identifiant ODS.

```prisma
model KnowledgeTerm {
  // ... champs existants inchangés ...
  drugKey       String?  // clé BDPM (existant)
  odsId         String?  // + NEW — identifiant ODS (ex: "Magnesium", "VitaminD")

  // + NEW relation
  supplementIngredients SupplementIngredient[]

  @@index([odsId])       // + NEW
}
```

### 5.3. Nouveaux modèles — Produits DSLD

```prisma
// Produit commercial issu du DSLD
model SupplementProduct {
  id             String   @id @default(uuid())
  dsldId         String   @unique         // ID produit DSLD (numérique sous forme string)
  brandName      String                   // marque
  productName    String                   // nom complet produit
  manufacturer   String?                  // fabricant
  marketStatus   String?                  // "Market" | "Off Market"
  servingSize    String?                  // ex: "2 capsules"
  servingSizeUom String?                  // unité portion
  language       String?  @default("EN")
  fetchedAt      DateTime                 // horodatage de l'import DSLD
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  ingredients SupplementIngredient[]

  @@index([brandName])
  @@index([productName])
  @@map("supplement_products")
}

// Ingrédient déclaré dans un produit DSLD
model SupplementIngredient {
  id             String   @id @default(uuid())
  productId      String
  rawName        String              // nom brut issu du label (ex: "Vitamin C (as Ascorbic Acid)")
  normalizedKey  String?             // slug normalisé post-traitement → KnowledgeTerm.normalizedKey
  termId         String?             // résolu vers KnowledgeTerm (null si non résolu)
  amount         Float?              // quantité déclarée
  unit           String?             // mg | mcg | IU | CFU | g …
  ingredientForm String?             // forme chimique déclarée (ex: "as Magnesium citrate")
  dailyValue     Float?              // %DV déclaré (0–100+)
  createdAt      DateTime @default(now())

  product SupplementProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  term    KnowledgeTerm?    @relation(fields: [termId], references: [id])

  @@index([productId])
  @@index([normalizedKey])
  @@index([termId])
  @@map("supplement_ingredients")
}
```

### 5.4. Utilisation de KnowledgeSourceSync pour ODS

La table `KnowledgeSourceSync` existante est réutilisée pour tracer les syncs ODS. Le champ `drugKey` stocke l'identifiant ODS de l'ingrédient (ex: `"Magnesium"`, `"VitaminD3"`). C'est une extension sémantique du champ (pas un breaking change).

```
KnowledgeSourceSync {
  sourceType: NIH_ODS
  drugKey: "Magnesium"     -- identifiant ODS de l'ingrédient
  status: DONE
  lastSyncAt: 2026-04-05
  docCount: 1              -- 1 fact sheet importée
  chunkCount: 8            -- 8 sections découpées
}
```

---

## 6. Stratégie de matching pour les compléments

### 6.1. Flux de matching d'un complément saisi librement

```
Input praticien: "Magnésium marin Solgar 300mg"
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
   [Niveau produit]          [Niveau ingrédient]
   SupplementProduct         KnowledgeTerm (SUPPLEMENT/NUTRIENT)
   ILIKE productName         normalizedKey / aliases
            │                       │
   trouvé → ingrédients    trouvé → KnowledgeFact (ODS)
   → KnowledgeTerm                  │
            └───────────────────────┘
                        │
               [KnowledgeFact lookup]
               (predicate matching)
```

### 6.2. Niveaux de résolution (priorité décroissante)

1. **Match exact ingrédient** — `normalizedKey` dans `knowledge_terms` (termType SUPPLEMENT/NUTRIENT)
2. **Match alias** — tableau `aliases` dans `KnowledgeTerm` (ILIKE ANY)
3. **Match produit commercial** — `productName` ou `brandName` dans `supplement_products` (ILIKE)  
   → extraction des ingrédients → résolution vers KnowledgeTerm
4. **Non résolu** — le terme passe dans `termsUnmatched`, aucun fait exploité

### 6.3. Normalisation pour les compléments

Les règles de normalisation sont identiques à celles des médicaments mais avec des alias spécifiques :

| Saisie praticien | normalizedKey |
|---|---|
| Magnésium marin | magnesium |
| Magnesium | magnesium |
| Mg | magnesium |
| Vitamine D | vitamin_d |
| Vitamin D3 | vitamin_d |
| Cholécalciférol | vitamin_d |
| Cholecalciferol | vitamin_d |
| Omega-3 | omega_3 |
| EPA/DHA | omega_3 |
| Huile de poisson | omega_3 |
| Ashwagandha | ashwagandha |
| Withania somnifera | ashwagandha |
| Curcumine | curcumin |
| Curcuma | curcumin |

Ces alias sont à peupler dans `KnowledgeTerm.aliases` à l'ingestion ODS.

### 6.4. Déduplication multi-produits

Si un patient prend 3 compléments et que 2 d'entre eux contiennent du zinc :
1. Chaque supplément est matchévers ses ingrédients
2. Le moteur collecte tous les `termId` résolus
3. Les doublons de `termId` → signal de redondance (nouveau FactPredicate ou logique dédiée dans l'analyse)

---

## 7. Cas d'usage concrets dans NaturoDesk

### CU-1 — Doublon d'ingrédient entre deux produits

**Scénario :** Le patient prend "Zinc Bisglycinate 25mg" + "Multi-vitamines Solgar" (contient aussi du zinc 15mg).

**Flux :**
1. Les deux produits sont matchés → chaque ingrédient zinc → termId `zinc` 
2. Le moteur détecte deux occurrences du même termId dans le même contexte consultation
3. Finding : vigilance — "Le zinc est présent dans plusieurs produits. Dose totale déclarée : 40mg. L'UL est de 40mg/jour (source ODS)."
4. riskLevel : MEDIUM (dans la limite, mais à surveiller)

---

### CU-2 — Interaction complément × médicament documentée

**Scénario :** Patient sous warfarine + prend de la coenzyme Q10.

**Flux :**
1. Warfarine → KnowledgeTerm DRUG
2. CoQ10 → KnowledgeTerm SUPPLEMENT  
3. KnowledgeFact : `CoQ10 INTERACTS_WITH Warfarine` (source ODS fact sheet "Coenzyme Q10") — confidence 0.85
4. Finding : interaction — "La coenzyme Q10 peut réduire l'efficacité de la warfarine. Surveillance INR recommandée."
5. riskLevel : HIGH

---

### CU-3 — Complément non reconnu → identification via DSLD

**Scénario :** Praticien saisit "Athletic Greens AG1".

**Flux :**
1. Pas de KnowledgeTerm direct pour "AG1"
2. Match SupplementProduct.productName = "AG1" (ou brandName = "Athletic Greens")
3. Extraction des 75 ingrédients déclarés
4. Résolution de chaque ingrédient vers KnowledgeTerm : magnésium, zinc, vitamine C, ashwagandha, etc.
5. Le moteur dispose maintenant d'une liste d'ingrédients structurés pour la consultation
6. Génération des findings applicables (ex : zinc déjà présent ailleurs, ashwagandha × médicament thyroïdien)

---

### CU-4 — Vigilance dosage excessif (UL dépassé)

**Scénario :** Patient prend vitamine D 10 000 UI/jour.

**Flux :**
1. Vitamine D → KnowledgeTerm NUTRIENT → termId `vitamin_d`
2. ODS fact sheet : UL (Tolerable Upper Intake Level) = 4 000 UI/jour (adulte)
3. KnowledgeFact : `VitamineD INCREASES_RISK_OF Toxicity` si dose > UL — confidence 0.90
4. Finding : alerte — "La dose de vitamine D saisie dépasse l'apport maximal tolérable (UL = 4 000 UI/jour selon NIH ODS)."
5. riskLevel : HIGH

*Note : la dose déclarée par le praticien dans le champ "complément" n'est pas structurée actuellement. Ce cas d'usage est documenté pour préparer un champ dosage structuré dans une version future.*

---

### CU-5 — Complément avec ingrédient à risque pour contexte médical

**Scénario :** Patient hypothyroïdien sous lévothyroxine + prend du varech (iode).

**Flux :**
1. Lévothyroxine → KnowledgeTerm DRUG
2. Varech → KnowledgeTerm SUPPLEMENT → alias "kelp", "algue marine", "iodine"
3. KnowledgeFact : `Iode INTERACTS_WITH LevoThyroxine` (source ODS fact sheet "Iodine") — modifier thyroïdien
4. Finding : interaction — "L'iode en excès peut perturber la fonction thyroïdienne et interférer avec le traitement à la lévothyroxine."
5. riskLevel : HIGH

---

### CU-6 — Protocole praticien vs. compléments existants

**Scénario :** Patient prend déjà du magnésium + le protocole recommandé ajoute un autre magnésium.

**Flux :**
1. Au moment de la création du protocole (future fonctionnalité), les ingrédients du protocole sont comparés aux KnowledgeTerm actifs de la consultation
2. Doublon détecté → signal de cohérence avant validation protocole
3. Ceci nécessite le branchement du matching engine dans le flux protocole (Phase future)

---

## 8. Impact sur les modules existants

### Matching engine (`lib/knowledge/matching/`)

**Changements requis (Phase 17) :**
- `match-terms.ts` : ajouter résolution via SupplementProduct (niveau 3 après alias_db)
- `normalize-input.ts` : ajouter normalisation des noms produits courants (alias dictionary)
- Nouveau service `match-supplement-products.ts` : ILIKE sur productName/brandName → extraction ingrédients → résolution termId

### Analysis engine (`lib/knowledge/analysis/`)

**Changements requis (Phase 17) :**
- `score-fact.ts` : appliquer le multiplicateur de confiance source (BDPM=1.0, ODS=0.90, DSLD=0.60)
- Logique déduplication ingrédients : détecter doublons de termId dans le contexte de la consultation

### Consultation runner (`lib/knowledge/consultation-runner.ts`)

Aucun changement requis immédiatement. Le runner charge déjà `supplements`. Une fois le matching engine étendu, les supplements seront mieux résolus automatiquement.

---

## 9. Limites connues et décisions explicites

| Limite | Décision |
|---|---|
| DSLD = marché US uniquement | Utile pour identifier ingrédients, pas comme vérité de disponibilité France |
| DSLD = déclaratif fabricant non vérifié | Jamais source directe de finding clinique |
| ODS = anglais uniquement | Nécessite traduction/adaptation des termes et alias en français |
| ODS = ~100 ingrédients | Couverture suffisante pour V1, extension progressive |
| DSLD = 175k produits | Import scope limité aux ingrédients présents dans KnowledgeTerm (approche ingredient-driven) |
| Dosages non structurés côté consultation | CU-4 (UL) partiellement exploitable ; champ dosage structuré à prévoir |
| Pas de source compléments France officielle | ODS reste la meilleure option publique disponible en V1 |

---

## 10. Contrat produit

> **NaturoDesk V1 avec brique supplements :**
>
> Le système identifie les ingrédients actifs des compléments saisis, les croise avec la documentation institutionnelle disponible (NIH ODS), et signale les points de vigilance documentés.
>
> Il n'affirme pas l'exhaustivité des interactions. Il ne remplace pas l'avis d'un pharmacien.
>
> Les signaux issus du DSLD sont présentés comme des informations de composition déclarée, non comme des vérités cliniques.

---

## 11. Dépendances et ordre d'implémentation

```
Phase actuelle : schema additions (NIH_ODS, NIH_DSLD enums + SupplementProduct + SupplementIngredient)
       ↓
Phase 17-A : Ingestion ODS (n8n workflow → webhook → import fact sheets → chunks → KnowledgeFact)
       ↓
Phase 17-B : Ingestion DSLD (n8n workflow → API → SupplementProduct + SupplementIngredient)
       ↓
Phase 18 : Extension matching engine (product matching + ingredient resolution)
       ↓
Phase 19 : Déduplication ingrédients + vigilance dosage
       ↓
Phase 20 : Scoring source-aware (multiplicateurs de confiance par sourceType)
```
