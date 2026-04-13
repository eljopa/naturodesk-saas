# Consultations & Données cliniques — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Vue d'ensemble

Une consultation (ou "bilan de vitalité") est le cœur du workflow clinique. Elle regroupe l'ensemble des données cliniques d'une séance : contexte, symptômes, médicaments, compléments alimentaires, et observations/findings.

---

## Modèles de données

### Consultation

```prisma
enum ConsultationStatus {
  DRAFT             // En cours de saisie
  READY             // Prêt pour analyse IA
  ANALYSIS_PENDING  // Analyse en file d'attente
  ANALYSIS_RUNNING  // Analyse LLM en cours
  ANALYSIS_DONE     // Analyse terminée
  ANALYSIS_ERROR    // Erreur lors de l'analyse
}

model Consultation {
  id                     String               @id @default(uuid())
  patientId              String
  appointmentId          String?              @unique  // RDV optionnel, one-to-one
  status                 ConsultationStatus   @default(DRAFT)
  context                String?              // Motif, contexte de vie, objectifs
  medicationLoadScore    Float?               // Score 0-10 (calculé par analyse)
  medicationLoadLevel    MedicationLoadLevel? // LOW | MEDIUM | HIGH | CRITICAL
  terrainSummary         String?              // Résumé terrain naturo (généré IA)
  protocolCoherenceScore Float?               // Score cohérence protocole
}
```

**⚠️ Pas de `userId`** — l'ownership se vérifie via `patient.userId`.

### Données cliniques

```prisma
model Symptom {
  id            String    @id @default(uuid())
  consultationId String
  label         String                   // ex : "fatigue chronique"
  normalizedLabel String?                // Forme normalisée (NLP futur)
  intensity     Int?                     // 1-10
  duration      String?                  // ex : "3 semaines"
  category      String?                  // ex : "digestif"
  embedding     Unsupported("vector(1536)")?  // Embedding pour recherche sémantique
}

model Medication {
  id            String    @id @default(uuid())
  consultationId String
  name          String
  normalizedName String?
  dosage        String?
  frequency     String?
  duration      String?
  drugKey       String?   // Clé de liaison vers KnowledgeDocument
}

model Supplement {
  id            String    @id @default(uuid())
  consultationId String
  name          String
  dosage        String?
  duration      String?
}

enum FindingCategory {
  SIDE_EFFECT | INTERACTION | DEPLETION | RED_FLAG | TERRAIN | PROTOCOL | QUESTION
}

model Finding {
  id             String          @id @default(uuid())
  consultationId String
  category       FindingCategory
  title          String
  description    String
  confidence     Float           @default(1.0)  // 0-1 (1 = manuel / certain)
  validated      Boolean         @default(false)
  practitionerNote String?
  sourceType     String          @default("MANUAL")  // RULE | LLM | SEMANTIC | MANUAL
  citations      Citation[]
}
```

---

## Pages

### Liste — `/consultations`

**Fichier :** `app/(dashboard)/consultations/page.tsx`

- Liste paginée (20/page), filtrée par statut
- Filtres : Tous / En cours (DRAFT) / Analysés (ANALYSIS_DONE)
- Tri : `createdAt DESC`
- Affiche : patient, date, statut avec badge coloré

### Nouveau bilan — `/consultations/new`

**Fichier :** `app/(dashboard)/consultations/new/page.tsx`

Formulaire de création :
- Sélection du patient (requis)
- RDV associé (optionnel — liste des RDV sans consultation existante)
- Contexte initial (optionnel)

Pré-remplissage via URL : `?patientId=` et `?appointmentId=`

### Détail bilan — `/consultations/[id]`

**Fichier :** `app/(dashboard)/consultations/[id]/page.tsx`

Navigation par tabs via `?tab=` :

| Tab | Défaut | Contenu |
|-----|--------|---------|
| `context` | ✅ | Éditeur de contexte inline (ContextEditor) |
| `symptoms` | — | SymptomSection : liste + formulaire d'ajout |
| `medications` | — | MedicationSection : liste + formulaire d'ajout |
| `supplements` | — | SupplementSection : liste + formulaire d'ajout |
| `findings` | — | FindingSection : liste + formulaire d'ajout |

**En-tête de page :**
- Badge statut coloré
- Date création + RDV associé
- Bouton **Export PDF** → `GET /api/pdf/consultation/[id]`
- Boutons de transition de statut (selon statut courant) :
  - DRAFT → "Marquer comme prêt"
  - READY → "Remettre en brouillon" + "Lancer l'analyse"
  - ANALYSIS_ERROR → "Relancer l'analyse"
  - ANALYSIS_RUNNING/PENDING → spinner (pas d'action)

**Résumé analyse** (visible si `ANALYSIS_DONE`) :
- Charge médicamenteuse : score + niveau (LOW/MEDIUM/HIGH/CRITICAL) avec couleur
- Terrain naturopathique : texte libre généré par l'IA

---

## Server Actions

### Consultations — `lib/actions/consultations.ts`

#### `createConsultationAction(prevState, formData)`

```
Input  → patientId (req), appointmentId?, context?
Output → redirect /consultations/[id] | { errorCode }
```

Validations :
- Patient appartient à l'utilisateur
- Si `appointmentId` fourni : RDV appartient à l'utilisateur
- Idempotence : un RDV ne peut avoir qu'une seule consultation (`already_has_consultation`)

#### `updateConsultationContextAction(consultationId, prevState, formData)`

Met à jour le champ `context`. Retourne `null` (succès) ou `{ errorCode }`.

#### `setConsultationStatusAction(consultationId, status)`

Transitions manuelles : `DRAFT ↔ READY` uniquement. `.bind(null, id, status)`.

### Données cliniques — `lib/actions/clinical.ts`

Pattern uniforme pour les 4 types de données cliniques :

```typescript
// Ajout (useActionState)
addSymptomAction(consultationId, prevState, formData)
addMedicationAction(consultationId, prevState, formData)
addSupplementAction(consultationId, prevState, formData)
addFindingAction(consultationId, prevState, formData)

// Suppression (form action avec id dans formData)
deleteSymptomAction(consultationId, null, formData)
deleteMedicationAction(consultationId, null, formData)
deleteSupplementAction(consultationId, null, formData)
deleteFindingAction(consultationId, null, formData)  // Uniquement sourceType="MANUAL"
```

Tous vérifient l'ownership via `assertOwnsConsultation(consultationId, userId)`.

### Analyse IA — `lib/actions/analysis.ts`

#### `triggerAnalysisAction(consultationId)`

1. Vérifie ownership + statut READY
2. Crée un `AnalysisRun` avec clé d'idempotence
3. Passe le statut à `ANALYSIS_PENDING`
4. Lance `runAnalysis()` async
5. Redirige vers `?tab=findings`

#### `retryAnalysisAction(consultationId)`

1. Vérifie statut `ANALYSIS_ERROR`
2. Remet à `READY`, crée nouveau run, relance
3. Redirige vers findings

---

## Composants cliniques

**Pattern commun :** Chaque section est un Client Component avec `useActionState`.

### `ContextEditor`

- `editing: boolean` state local
- Bascule texte → textarea
- `useActionState(updateAction, null)` — succès = ferme l'éditeur

### `SymptomSection`, `MedicationSection`, `SupplementSection`

- Liste + bouton "Ajouter"
- Formulaire inline affiché/masqué
- Suppression via `<form action={(fd) => { deleteAction(null, fd); }}>` avec `id` caché

### `FindingSection`

- Même pattern + enum `category`
- Seulement les findings `sourceType="MANUAL"` sont supprimables par le praticien
- Les findings IA (RULE, LLM, SEMANTIC) affichent un badge de source

---

## Pipeline d'analyse IA (schéma câblé, logique partielle)

```
Consultation (READY)
  → triggerAnalysisAction
  → AnalysisRun.create (idempotency key)
  → status = ANALYSIS_PENDING
  → runAnalysis(consultationId, runId)
      → Fetch symptoms + medications + knowledge chunks (pgvector)
      → OpenAI call (GPT-4)
      → Store Findings (sourceType = LLM | RULE | SEMANTIC)
      → Update medicationLoadScore, terrainSummary
      → status = ANALYSIS_DONE
```

L'intégration OpenAI et les règles cliniques sont dans `lib/analysis/` (voir TECH_ANALYSIS.md futur).

---

## Sécurité

- Le modèle `Consultation` n'a **pas** de `userId` — ownership via `patient.userId`
- `assertOwnsConsultation(id, userId)` dans `clinical.ts` vérifie : `consultation.patient.userId === userId`
- Les findings IA ne peuvent pas être supprimés par le praticien (guard sur `sourceType`)
