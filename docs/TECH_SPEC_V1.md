# NaturoDesk — TECH_SPEC_V1

## Objectif technique

Construire une application Next.js robuste, modulaire et évolutive, avec :

- base métier cabinet
- pipeline documentaire
- intégration n8n
- sécurité forte
- données structurées
- compatibilité SaaS future

---

## Architecture générale

### Frontend
- Next.js App Router
- pages dashboard
- pages patients
- pages bilans
- pages rendez-vous
- pages facturation
- pages paramètres

### Backend
- API routes Next.js
- services métier dans `lib/`
- accès données via Prisma
- validation Zod

### Base de données
- Supabase PostgreSQL
- Prisma
- pgvector pour embeddings

### Automatisation
- n8n pour workflows d’analyse

### IA
- OpenAI comme unique fournisseur LLM
- 1 seule clé API
- appels serveur uniquement

---

## Arborescence recommandée


/app
  /(dashboard)
  /api
    /patients
    /appointments
    /consultations
    /analysis
    /findings
    /followups
    /invoices
    /exports

/components
  /ui
  /dashboard
  /patients
  /consultations
  /appointments
  /invoices

/lib
  /db
  /auth
  /llm
  /analysis
  /rules
  /embeddings
  /pdf
  /exports
  /validators

/prisma
  schema.prisma

/docs
  README_START.md
  PRODUCT_OVERVIEW.md
  TECH_SPEC_V1.md
  BACKLOG_V1.md

##  Modèles de données principaux
## User

- id
- email
- name
- createdAt
- updatedAt

## Patient

- id
- userId
- firstName
- lastName
- birthDate
- phone
- email
- address
- profession
- allergies
- medicalHistory
- notes
- isArchived
- createdAt
- updatedAt

## Appointment

- id
- patientId
- startAt
- endAt
- type
- status
- notes
- source
- externalId
- createdAt
- updatedAt

## Consultation

- id
- patientId
- status
- context
- medicationLoadScore
- medicationLoadLevel
- terrainSummary
- protocolCoherenceScore
- createdAt
- updatedAt

## Symptom

- id
- consultationId
- label
- normalizedLabel
- intensity
- duration
- category
- embedding
- createdAt
- updatedAt

Medication

- id
- consultationId
- name
- dosage
- frequency
- duration
- normalizedName
- drugKey
- createdAt
- updatedAt

## Supplement
- id
- consultationId
- name
- dosage
- duration
- createdAt
- updatedAt

## Finding

- id
- consultationId
- category
- title
- description
- confidence
- validated
- practitionerNote
- sourceType
- createdAt
- updatedAt

## Citation

- id
- findingId
- reference
- excerpt
- url
- createdAt

## FollowUp

- id
- patientId
- appointmentId
- symptomEvolution
- protocolAdjustment
- observations
- nextSteps
- createdAt
- updatedAt

## Invoice

- id
- patientId
- number
- status
- totalAmount
- paymentMethod
- issuedAt
- createdAt
- updatedAt

## InvoiceLine

- id
- invoiceId
- description
- quantity
- unitPrice
- total
- createdAt
- updatedAt

## Modèles avancés à prévoir dès maintenant
## KnowledgeDocument

- id
- drugKey
- sourceType
- docType
- title
- url
- contentHash
- fetchedAt
- createdAt
- updatedAt

 ## KnowledgeChunk

- id
- documentId
- kind
- label
- excerpt
- sectionPath
- embedding
- createdAt
- updatedAt

## AnalysisRun

- id
- consultationId
- status
- stage
- attempt
- idempotencyKey
- tokensUsed
- costEstimate
- errorCode
- errorMessage
- startedAt
- finishedAt
- createdAt
- updatedAt

## AnalysisLog

- id
- runId
- stage
- level
- message
- metaJson
- createdAt

## Rule

- id
- code
- name
- category
- enabled
- version
- createdAt
- updatedAt

## RuleRun

- id
- consultationId
- ruleId
- matched
- evidenceJson
- createdAt

## rotocolTemplate

- id
- title
- slug
- category
- contentJson
- createdAt
- updatedAt

## TimelineEvent

- id
- patientId
- type
- label
- date
- source
- metaJson
- createdAt
- updatedAt

## PatternCase

- id
- patientId
- consultationId
- symptomCluster
- terrainType
- medicationContext
- protocolSnapshot
- outcomeScore
- createdAt
- updatedAt

## Endpoints API à implémenter
## Patients

- POST /api/patients
- GET /api/patients
- GET /api/patients/:id
- PATCH /api/patients/:id
- DELETE /api/patients/:id (soft archive)

## Appointments

- POST /api/appointments
- GET /api/appointments
- GET /api/appointments/:id
- PATCH /api/appointments/:id
- DELETE /api/appointments/:id

## Consultations

- POST /api/consultations
- GET /api/consultations
- GET /api/consultations/:id
- PATCH /api/consultations/:id

## Analysis

- POST /api/analysis/start
- GET /api/analysis/run/:id

## Findings

- POST /api/findings/:id/validate
- POST /api/findings/:id/reject
- POST /api/findings/:id/comment

## Followups

- POST /api/followups
- GET /api/patients/:id/followups

## Invoices

- POST /api/invoices
- GET /api/invoices
- GET /api/invoices/:id
- PATCH /api/invoices/:id

## Exports

- GET /api/exports/patients
- GET /api/exports/consultations
- GET /api/exports/invoices

## Pipeline d’analyse
Étapes

- Créer un analysis_run
- charger les données consultation
- normaliser les médicaments
- récupérer les documents BDPM
- extraire les sections utiles
- générer les embeddings
- faire le matching sémantique
- exécuter le rules engine
- préparer le payload LLM
- lancer LLM pass 1
- valider le JSON
- lancer LLM pass 2
- filtrer et persister les findings
- mettre à jour la consultation

## Matching sémantique sécurisé
Le matching doit suivre cette logique :
- matching lexical exact
- sinon matching par embeddings
- seuil strict : similarity >= 0.85
- overlap lexical requis
- si seuil non atteint : rejet

Le LLM ne doit jamais créer un lien non validé par ce système.

## Rules engine

Le rules engine doit gérer au minimum :

- red flags
- données manquantes
- score de charge médicamenteuse
- déplétions nutriments
- vigilance protocole

Le rules engine produit des findings déterministes.

## LLM

Le LLM ne doit servir qu’à :

- structurer
- reformuler
- regrouper
- résumer
- suggérer prudemment

Le LLM ne doit jamais :

- diagnostiquer
- prescrire
- créer des preuves
- recalculer le score médicamenteux

## Contraintes qualité

- TypeScript strict
- Zod partout pour validation
- Prisma pour persistance
- logs propres
- erreurs typées
- idempotence workflows
- composants propres

## Contraintes sécurité

- API protégées
- auth obligatoire
- RLS active
- pas de secret côté client
- logs minimisés sur données santé