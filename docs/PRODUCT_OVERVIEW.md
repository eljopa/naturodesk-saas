# NaturoDesk — PRODUCT_OVERVIEW

## Vision produit

NaturoDesk est un logiciel métier pour naturopathes qui combine :

- gestion de cabinet
- structuration des bilans
- assistance documentaire par IA
- suivi patient
- protocole
- préparation à une intelligence métier avancée

L’objectif est de faire gagner du temps au praticien tout en augmentant la qualité de structuration de ses consultations.

---

## Utilisateur principal

Praticien naturopathe indépendant.

Contexte réel :
- suit des patients en cabinet
- réalise des bilans de vitalité
- analyse médicaments, symptômes et compléments
- construit des protocoles personnalisés
- effectue des suivis
- facture ses consultations

---

## Cas d’usage principal

### 1. Création patient
Le praticien crée une fiche patient avec :
- identité
- coordonnées
- date de naissance
- antécédents
- allergies
- notes

### 2. Prise de rendez-vous
Le praticien programme :
- un bilan initial
- ou un rendez-vous de suivi

### 3. Bilan de vitalité
Le praticien saisit :
- motif
- symptômes
- médicaments
- compléments
- allergies
- contexte

### 4. Analyse
Le système exécute une analyse documentaire :
- normalisation médicaments
- récupération documents
- extraction effets indésirables/interactions
- matching sémantique
- rules engine
- synthèse IA structurée

### 5. Validation
Le praticien consulte les findings :
- valide
- rejette
- commente

### 6. Protocole
Le praticien prépare un protocole à partir :
- du terrain
- des findings
- de ses propres choix

### 7. Suivi
Le praticien ajoute des notes de suivi :
- évolution
- amélioration
- aggravation
- ajustements

### 8. Facturation
Le praticien crée une facture et exporte son livre de recettes.

---

## Modules du produit

### A. Core cabinet
- dashboard
- patients
- rendez-vous
- facturation
- exports

### B. Core clinique documentaire
- bilan de vitalité
- findings
- citations
- journal des décisions

### C. Core intelligence
- knowledge base
- embeddings
- semantic matching
- rules engine
- LLM analysis

### D. Extensions prévues dès l’architecture
- protocol builder
- protocol library
- timeline patient
- pattern engine
- case similarity

---

## Fonctionnalités essentielles du MVP étendu

### Dashboard
- KPI
- prochains RDV
- bilans récents
- analyses en cours

### Patients
- liste
- recherche
- création
- modification
- archivage
- fiche détaillée

### RDV
- créer
- modifier
- annuler
- lier à un patient
- distinguer bilan / suivi

### Bilans
- wizard de création
- saisie symptômes
- saisie médicaments
- saisie compléments
- lancement analyse
- restitution findings

### Findings
Catégories :
- side_effect
- interaction
- depletion
- red_flag
- terrain
- protocol
- question

### Suivi
- évolution symptômes
- ajustement protocole
- observations
- prochaines actions

### Facturation
- facture simple
- lignes de facture
- numérotation séquentielle
- export CSV

---

## Principes UX

L’interface doit être :
- simple
- claire
- rassurante
- professionnelle
- rapide à comprendre

Le praticien ne doit jamais se perdre.

---

## Ce qui différencie NaturoDesk

- moteur d’analyse documentaire
- logique de validation praticien
- future timeline causale patient
- future intelligence par patterns
- future bibliothèque de protocoles