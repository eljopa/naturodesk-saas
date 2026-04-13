# NaturoDesk — README_START

## Objectif du projet

NaturoDesk est une application web métier destinée aux naturopathes.

Le logiciel doit permettre de :

- gérer les patients
- gérer les rendez-vous
- créer des bilans de vitalité
- analyser les symptômes, médicaments et compléments
- détecter des corrélations documentaires possibles
- structurer un protocole naturopathique
- gérer le suivi patient
- gérer la facturation
- exporter les données en CSV
- préparer une future commercialisation en SaaS

Le produit est d'abord développé pour un usage réel en cabinet, avec validation terrain par une naturopathe.

---

## Positionnement

NaturoDesk n'est pas un dispositif médical.

Le système ne doit jamais :
- poser un diagnostic
- remplacer un médecin
- recommander l'arrêt d'un traitement
- affirmer une interaction non documentée
- inventer des liens de causalité

Le logiciel est un **assistant documentaire et organisationnel**.

---

## Priorité produit

Construire un outil :
- simple à utiliser
- rapide
- fiable
- traçable
- sécurisé
- évolutif vers un SaaS multi-praticiens

---

## Stack imposée

- Next.js 16 App Router
- TypeScript strict
- Tailwind CSS
- Supabase
- PostgreSQL
- Prisma
- n8n
- OpenAI
- pgvector

---

## Principes d’architecture

- code modulaire
- backend fort
- logique métier côté serveur
- frontend simple et clair
- validation stricte des données
- logs structurés
- idempotence pour les workflows
- séparation entre logique déterministe et logique LLM

---

## Règles absolues

### 1. IA
L’IA ne doit jamais :
- inventer une interaction
- inventer un effet secondaire
- diagnostiquer
- prescrire
- sortir du JSON attendu

### 2. Sécurité
- aucune clé secrète côté client
- service role Supabase uniquement côté serveur
- routes API protégées
- RLS activé
- données santé traitées avec prudence

### 3. Qualité
- TypeScript strict
- Zod pour validation
- Prisma propre
- fonctions pures quand possible
- composants réutilisables

---

## Méthode de travail attendue pour Claude Code

Tu dois travailler par étapes.

Ordre attendu :
1. lire tous les fichiers `.md`
2. proposer une architecture cohérente
3. implémenter ticket par ticket
4. toujours expliquer ce que tu modifies
5. ne jamais improviser une architecture hors spec
6. respecter strictement le périmètre du MVP étendu

---

## Livrables techniques attendus

- schéma Prisma complet
- routes API structurées
- base UI dashboard exploitable
- CRUD patients
- CRUD rendez-vous
- création bilan
- pipeline d’analyse prêt à connecter à n8n
- findings structurés
- facturation simple
- exports CSV
- architecture évolutive pour :
  - timeline patient
  - protocol builder
  - protocol library
  - pattern engine