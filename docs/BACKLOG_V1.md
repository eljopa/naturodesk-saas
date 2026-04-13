

# 4) `BACKLOG_V1.md`

# NaturoDesk — BACKLOG_V1

## Règle de travail
Toujours travailler dans l’ordre.
Ne pas sauter d’étape sans raison claire.

---

# PHASE 1 — Foundation

## T1
Initialiser le projet Next.js 16 + TypeScript + Tailwind.

## T2
Configurer Supabase.

## T3
Configurer Prisma.

## T4
Créer le schéma Prisma V1 complet.

## T5
Créer les premières migrations.

## T6
Créer les utilitaires serveur de base :
- db
- auth
- validators
- error handling

---

# PHASE 2 — Auth + Layout

## T7
Mettre en place l’authentification.

## T8
Créer le layout dashboard :
- sidebar
- topbar
- structure pages

## T9
Créer la navigation principale :
- Dashboard
- Patients
- RDV
- Bilans
- Facturation
- Paramètres

---

# PHASE 3 — Patients

## T10
Créer les endpoints CRUD patients.

## T11
Créer la page liste patients.

## T12
Créer la page création / édition patient.

## T13
Créer la fiche patient avec onglets.

## T14
Mettre en place l’archivage patient.

---

# PHASE 4 — RDV

## T15
Créer les endpoints CRUD appointments.

## T16
Créer la page liste RDV.

## T17
Créer le formulaire création / édition RDV.

## T18
Lier un RDV à un patient.

---

# PHASE 5 — Consultations / Bilans

## T19
Créer les endpoints consultations.

## T20
Créer le wizard de création d’un bilan.

## T21
Créer les modèles :
- symptoms
- medications
- supplements

## T22
Enregistrer les données de consultation.

## T23
Créer la page détail consultation.

---

# PHASE 6 — Knowledge Base

## T24
Créer les modèles knowledge_documents et knowledge_chunks.

## T25
Créer le service d’ingestion documentaire.

## T26
Créer le service de chunking.

## T27
Créer la persistance documentaire.

---

# PHASE 7 — Embeddings + Matching

## T28
Configurer pgvector.

## T29
Créer le service embeddings.

## T30
Créer le stockage embeddings.

## T31
Créer le service de matching sémantique sécurisé.

## T32
Créer la structure `evidence_links`.

---

# PHASE 8 — Rules Engine

## T33
Créer le moteur de règles V1.

## T34
Implémenter les règles red flags.

## T35
Implémenter les règles données manquantes.

## T36
Implémenter le score de charge médicamenteuse.

## T37
Implémenter les déplétions nutriments.

---

# PHASE 9 — LLM Pipeline

## T38
Créer le client OpenAI serveur.

## T39
Créer le prompt system.

## T40
Créer le prompt user pass 1.

## T41
Créer le prompt validator pass 2.

## T42
Créer la validation Zod du JSON retour.

## T43
Créer le service d’orchestration LLM.

---

# PHASE 10 — Findings

## T44
Créer la persistance findings / citations.

## T45
Créer la page de restitution findings.

## T46
Créer les actions :
- valider
- rejeter
- commenter

## T47
Créer le journal des décisions.

---

# PHASE 11 — Suivi

## T48
Créer les endpoints followups.

## T49
Créer le formulaire suivi.

## T50
Afficher l’historique des suivis.

---

# PHASE 12 — Facturation

## T51
Créer les modèles invoices / invoice_lines.

## T52
Créer le service numérotation facture.

## T53
Créer les endpoints facturation.

## T54
Créer les pages facturation.

## T55
Créer l’export CSV livre de recettes.

---

# PHASE 13 — Exports

## T56
Créer les exports CSV patients.

## T57
Créer les exports CSV consultations.

## T58
Créer les exports CSV factures.

---

# PHASE 14 — n8n

## T59
Créer la route de déclenchement analyse.

## T60
Créer la structure `analysis_runs`.

## T61
Créer le logging d’analyse.

## T62
Connecter n8n.

## T63
Gérer retry + erreurs + idempotence.

---

# PHASE 15 — Préparation évolutions

## T64
Préparer les modèles :
- ProtocolTemplate
- TimelineEvent
- PatternCase

## T65
Ne pas exposer encore ces modules dans l’UI, mais préparer leur base.

---

# FIN

Avant toute clôture :
- vérifier sécurité
- vérifier cohérence API
- vérifier qualité typing
- vérifier absence de logique IA côté client
- vérifier absence d’hallucination possible dans le pipeline