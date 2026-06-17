# NaturoDesk — Documentation Fonctionnelle des Modules

> Document de référence produit à usage interne (marketing, design, développement, SEO).
> Basé sur l'analyse du code source — état au 17 juin 2026.

---

## 1. Dossiers Patients

### Objectif du module
Centraliser toutes les informations relatives à chaque patient du praticien : identité, coordonnées, données cliniques de fond, et accès unifié à l'ensemble de son historique (rendez-vous, consultations, suivis, factures).

---

### Fonctionnalités principales

**Création et édition**
- Formulaire de création avec champs : prénom, nom, date de naissance, téléphone, email, adresse, profession, allergies connues, antécédents médicaux, notes libres.
- Tous les champs à l'exception du prénom et du nom sont optionnels.
- Édition disponible à tout moment depuis la fiche patient.

**Liste des patients**
- Affichage sous forme de liste paginée (25 patients par page).
- Recherche en temps réel sur prénom et nom (insensible à la casse).
- Filtre actifs / archivés.
- Affichage des initiales, nom complet, date de naissance avec âge calculé et numéro de téléphone.

**Fiche patient — navigation par onglets**
La fiche d'un patient est organisée en cinq onglets :
1. **Informations** : coordonnées, données cliniques de fond (allergies, antécédents), notes libres.
2. **Rendez-vous** : historique des rendez-vous non annulés, accès rapide à la création.
3. **Consultations** : liste des bilans de vitalité, statut et date.
4. **Suivis** : entrées de suivi inter-consultation (évolution symptômes, ajustements protocole, observations, prochaines étapes).
5. **Factures** : liste des factures avec numéro, montant, statut et date.

**Export PDF**
- Génération à la demande d'une fiche patient complète au format PDF (via `/api/pdf/patient/[id]`).

**Archivage**
- Un patient peut être archivé (soft delete logique — il n'est pas supprimé).
- La liste filtre par défaut sur les patients actifs.
- Le patient archivé reste accessible et consultable, il est simplement sorti de la vue courante.

---

### Fonctionnalités secondaires

**Suivis (FollowUp)**
Module de compte-rendu léger entre les bilans formels. Quatre champs texte libres :
- Évolution des symptômes
- Ajustements du protocole
- Observations du praticien
- Prochaines étapes

Un suivi peut être rattaché à un rendez-vous existant. Accessible depuis l'onglet "Suivis" de la fiche patient.

**Création rapide depuis le contexte**
Depuis la fiche patient, chaque onglet dispose d'un bouton d'action direct : créer un rendez-vous, créer une consultation, créer une facture, créer un suivi — sans revenir à la liste globale.

---

### Données stockées

| Champ | Type | Description |
|---|---|---|
| `firstName` | Texte | Prénom |
| `lastName` | Texte | Nom |
| `birthDate` | Date | Date de naissance (âge calculé dynamiquement) |
| `phone` | Texte | Téléphone |
| `email` | Texte | Email |
| `address` | Texte | Adresse postale |
| `profession` | Texte | Profession |
| `allergies` | Texte long | Allergies connues |
| `medicalHistory` | Texte long | Antécédents médicaux |
| `notes` | Texte long | Notes libres praticien |
| `isArchived` | Booléen | Statut archivage |

Relations : `Appointment[]`, `Consultation[]`, `FollowUp[]`, `Invoice[]`, `TimelineEvent[]`, `AdviceSheet[]`

---

### Flux utilisateur complet

1. Menu latéral → **Patients** → liste paginée avec recherche.
2. Bouton **Nouveau patient** → formulaire de création.
3. Clic sur un patient → fiche avec 5 onglets.
4. Onglet **Informations** : visualisation et accès à l'édition.
5. Depuis chaque onglet : accès direct aux entités liées (RDV, bilans, suivis, factures).
6. Bouton **Télécharger PDF** : génération et téléchargement de la fiche complète.
7. Bouton **Archiver** : passage en mode archivé, réversible.

---

### Cas d'usage

- Praticien qui commence avec un nouveau patient : création de la fiche en 2 minutes avant ou pendant le premier rendez-vous.
- Praticien qui reprend un patient après 6 mois d'absence : consultation rapide de l'historique complet depuis la fiche, sans chercher dans plusieurs outils.
- Gestion de fin de suivi : archivage du patient sans perte des données.

---

### Gains de temps apportés

- Recherche instantanée sur 25 résultats paginés vs. un classeur papier.
- Toutes les informations d'un patient (coordonnées, historique clinique, rendez-vous, factures) accessibles depuis une seule interface tabulée.
- Export PDF instantané pour dossier partagé ou archive réglementaire.

---

### Différences avec un dossier papier

| Papier | NaturoDesk |
|---|---|
| Recherche par index alphanumérique ou mémoire | Recherche texte instantanée |
| Données dispersées (cahier, agenda, factures papier) | Vue centralisée en un seul endroit |
| Pas d'historique structuré | Suivi horodaté de tous les événements |
| Archivage = boîte physique | Archivage numérique, données conservées et accessibles |
| Export impossible | PDF à la demande |

---

### Arguments différenciants

Contrairement aux logiciels de gestion généraliste (qui ne connaissent que le patient comme un contact), NaturoDesk relie le patient à ses **bilans de vitalité**, ses **protocoles** et ses **fiches conseil** au sein d'une même interface. La notion de "suivi inter-consultation" (FollowUp) est propre au workflow naturopathique : ce n'est pas un rendez-vous, mais une entrée clinique légère entre deux séances formelles.

---

### Fonctionnalités actuelles
Liste, recherche, pagination, filtres actif/archivé, fiche tabulée (5 onglets), export PDF, archivage, suivis.

### Fonctionnalités prévues (roadmap)
- Timeline chronologique complète par patient (`TimelineEvent` déjà modélisé : APPOINTMENT, CONSULTATION, FINDING, PROTOCOL_CHANGE, SYMPTOM_CHANGE, NOTE).
- Détection de patterns cliniques récurrents (`PatternCase` modélisé : symptôme cluster, terrain, contexte médicamenteux, score d'outcome).

### Questions ouvertes
- Partage de dossier entre praticiens d'un même cabinet (cas multi-praticiens).
- Durée de conservation légale et politique de suppression définitive.
- Import/export FHIR ou autre format d'échange standardisé.

---

## 2. Bilans de vitalité

### Objectif
Formaliser la saisie structurée des données cliniques d'une séance de bilan : contexte général du patient, symptômes observés, traitements médicamenteux en cours, compléments alimentaires pris, puis déclencher une analyse documentaire pour identifier les signaux pertinents.

---

### Méthodologie utilisée

Le bilan de vitalité dans NaturoDesk suit une logique de collecte progressive en cinq couches d'information :

1. **Contexte général** : texte libre décrivant la situation de vie, les motifs de consultation, l'état général.
2. **Symptômes** : liste structurée avec intensité (échelle numérique), durée et catégorie.
3. **Médicaments** : traitements allopathiques en cours avec dosage et fréquence.
4. **Compléments alimentaires** : suppléments pris avec dosage et durée.
5. **Constats** (Findings) : alertes, observations, terrains identifiés — générés par le moteur d'analyse ou saisis manuellement.

---

### Systèmes organiques analysés

Les symptômes sont catégorisés selon 9 systèmes organiques :

| Catégorie | Exemples |
|---|---|
| GASTROINTESTINAL | Nausée, diarrhée, ballonnement, reflux |
| NEUROLOGICAL | Céphalée, vertiges, paresthésies, tremblements |
| PSYCHIATRIC | Insomnie, anxiété, irritabilité, humeur dépressive |
| CARDIOVASCULAR | Palpitations, hypotension, hypertension |
| MUSCULOSKELETAL | Crampes, myalgies, fatigue musculaire, arthralgies |
| DERMATOLOGICAL | Rash, prurit, sécheresse cutanée |
| RESPIRATORY | Dyspnée, toux sèche |
| METABOLIC | Prise de poids, hypoglycémie, déshydratation |
| GENERAL | Fatigue, asthénie, malaise général |

---

### Fonctionnement du scoring

**Score de charge médicamenteuse** (`medicationLoadScore`, 0–10)
Évaluation de la complexité du traitement médicamenteux en cours. Quatre niveaux de résultat : LOW, MEDIUM, HIGH, CRITICAL. Affiché visuellement avec code couleur (vert → rouge) une fois l'analyse complétée.

**Score de cohérence protocolaire** (`protocolCoherenceScore`)
Évalue dans quelle mesure le protocole de compléments est compatible avec le profil clinique du patient.

**Résumé de terrain** (`terrainSummary`)
Synthèse textuelle du terrain naturopathique identifié, générée à l'issue de l'analyse.

**Scoring des constats (Findings)**
Chaque constat produit par le moteur d'analyse est scoré avec :
- `confidence` : score de confiance 0–0.90
- `riskLevel` : CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL
- `evidenceLevel` : DOCUMENTED / PARSED / CLINICAL / ABSENT

---

### Génération des résultats — Machine d'états

Le bilan passe par 6 états successifs :

```
DRAFT → READY → ANALYSIS_PENDING → ANALYSIS_RUNNING → ANALYSIS_DONE
                                                     ↘ ANALYSIS_ERROR → (retry) → ANALYSIS_RUNNING
```

- **DRAFT** : saisie en cours, toutes les sections sont éditables.
- **READY** : le praticien valide que la saisie est complète.
- **ANALYSIS_PENDING / RUNNING** : le pipeline d'analyse est en file d'attente puis en cours.
- **ANALYSIS_DONE** : résultats disponibles — score de charge médicamenteuse, résumé de terrain, constats.
- **ANALYSIS_ERROR** : échec, le praticien peut relancer l'analyse.

**Pipeline d'analyse**
- `AnalysisRun` : chaque déclenchement crée un run traçable avec idempotency key, comptage de tokens, coût estimé, logs horodatés par étape.
- Moteur de règles (`RuleRun`) : évalue des règles déterministes (RED_FLAG, MISSING_DATA, MEDICATION_LOAD, DEPLETION, PROTOCOL_VIGILANCE).
- Moteur documentaire (base de connaissance + LLM) : recherche sémantique sur les chunks indexés, extraction de faits structurés.

---

### Normalisation des entrées (parsing)

**Médicaments** (`ConsultationMedicationIntake`)
À partir du texte libre saisi ("metformine 500mg matin et soir"), le moteur extrait :
- DCI nettoyée (`parsedLabel`) et nom de marque (`parsedBrandName`)
- Dose (`doseValue`, `doseUnit`)
- Fréquence et durée (`frequencyText`, `durationText`)
- Forme galénique (`galenicForm`)
- Résolution vers la **BDPM** : la spécialité (`DrugProduct`) et la substance active (`DrugSubstance`) sont identifiées dans la base de données publique ANSM.

**Compléments** (`ConsultationSupplementIntake`)
Parsing structuré du texte libre :
- Label normalisé et clé de résolution vers le catalogue `KnowledgeTerm`.
- Forme galénique (chélaté, citrate, D3, EPA/DHA, multi-souches…) résolue vers `KnowledgeTermVariant`.
- Dose journalière calculée (dosePerUnit × units × intakes) ou déclarée explicitement.
- Qualité du parsing : PARSED / PARTIAL / UNRESOLVED, avec niveau de confiance HIGH / MEDIUM / LOW.

---

### Exploitation lors des consultations

**Onglet Contexte**
Zone de texte libre éditée en séance. Enregistrement sans rechargement de page (Server Action).

**Onglet Symptômes**
Ajout ligne par ligne avec intensité et durée. Suppression individuelle. Les symptômes sont ensuite vectorisés (embedding 1536 dimensions) pour la recherche sémantique.

**Onglet Médicaments**
Saisie libre, parsing automatique en arrière-plan. Affichage de la liste avec suppression.

**Onglet Compléments**
Idem médicaments. Le panneau `SupplementAnalysisPanel` affiche les résultats de la résolution dans la base de connaissance.

**Onglet Constats (Findings)**
Affichage des alertes produites par le moteur, catégorisées par type : effet indésirable, interaction, déplétion, signal d'alerte, terrain, protocole, question. Le praticien peut ajouter des constats manuels, valider ou annoter chaque constat avec une note.

**Onglet Base documentaire**
Accès aux faits documentaires de la base de connaissance (KnowledgeFindingsPanel) : interactions, déplétions, alertes identifiées sur les substances du bilan.

---

### Fiches conseil liées
Un widget en bas de la page du bilan liste les fiches conseil déjà créées pour cette consultation et permet d'en créer une nouvelle.

---

### Export PDF
Téléchargement de la fiche de consultation complète (via `/api/pdf/consultation/[id]`).

---

### Cas d'usage

- Naturopathe en séance : saisie des symptômes et des traitements en cours sur l'écran, déclenchement de l'analyse à la fin de la saisie.
- Naturopathe qui prépare une séance : consultation de l'analyse du bilan précédent pour préparer ses questions.
- Naturopathe face à une polymédication complexe : déclenchement de l'analyse pour obtenir le score de charge et les signaux d'alerte.

---

### Bénéfices pour le praticien

- Structure la saisie clinique là où la prise de notes libres ne permet pas de retrouver l'information.
- Identifie des signaux (déplétions nutritionnelles, interactions connues) qui nécessiteraient sinon une recherche documentaire manuelle.
- Produit un historique structuré et horodaté, consultable par bilan.
- Trace chaque analyse avec ses sources, rendant le raisonnement auditable.

---

### Fonctionnalités actuelles
Saisie structurée en 6 onglets, machine d'états, pipeline d'analyse avec règles déterministes et base documentaire, scoring de charge médicamenteuse, normalisation BDPM des médicaments, normalisation des compléments, export PDF, widget fiches conseil.

### Fonctionnalités prévues (roadmap)
- PatternCase : détection de patterns cliniques récurrents entre bilans (déjà modélisé).
- Synthèse terrain plus précise (terrain drainage, terrain émotionnel, etc.).
- Suggestions protocolaires basées sur les constats validés.

### Questions ouvertes
- Interface de saisie optimisée mobile (actuellement pensée pour desktop).
- Temps moyen de traitement de l'analyse et gestion des timeouts.
- Niveau d'exhaustivité de la base BDPM importée (toutes les spécialités ? seulement les commercialisées ?).

### Arguments différenciants
Aucun logiciel naturopathique existant ne propose une normalisation structurée des médicaments et compléments en texte libre contre une base de données médicales officielle (BDPM/ANSM). La hiérarchie des sources (RCP officiel > déplétions documentées > faits structurés > sémantique) garantit que chaque alerte affichée est traçable jusqu'à sa source primaire.

---

## 3. Protocoles et Fiches Conseil

### Objectif
Formaliser le protocole naturopathique issu d'une consultation sous la forme d'un document structuré, versionné, imprimable et remettable au patient. Le module "Fiches conseil" (`AdviceSheet`) est le document de sortie de la séance — l'équivalent numérique d'une ordonnance naturopathique.

---

### Création de protocoles

**Création libre**
Une fiche conseil peut être créée à tout moment, indépendamment d'une consultation, pour n'importe quel patient.

**Création depuis une consultation**
Depuis la page d'un bilan de vitalité (statut `ANALYSIS_DONE`), un bouton "Créer une fiche" pré-remplit automatiquement le lien `consultationId` et propose la génération d'un brouillon assisté.

**Formulaire structuré**
La fiche est organisée en 13 sections thématiques :

| Section | Contenu |
|---|---|
| Synthèse de la consultation | Résumé court affiché en tête de fiche |
| Objectifs du protocole | Ce que le praticien cherche à obtenir |
| Conseils alimentaires | Modifications du régime alimentaire |
| Compléments alimentaires | Suppléments, posologie, durée |
| Phytothérapie | Plantes, tisanes, extraits |
| Aromathérapie | Huiles essentielles |
| Micronutrition | Vitamines, minéraux, acides aminés |
| Gemmothérapie | Bourgeons et macérats |
| Fleurs de Bach | Élixirs floraux |
| Hygiène de vie | Rythme, sommeil, stress |
| Activité physique | Recommandations mouvements |
| Remarques complémentaires | Notes libres |
| Précautions éventuelles | Contre-indications, vigilances |

Toutes les sections sont optionnelles. Seules les sections remplies apparaissent dans le PDF généré.

---

### Génération de brouillon assisté

Quand la fiche est liée à une consultation ayant passé l'analyse, un bouton "Générer un brouillon" (`generateAdviceSheetDraftAction`) est disponible. Le système produit un premier jet des sections en s'appuyant sur les données saisies (symptômes, constats, compléments, contexte) et pose le flag `aiDraftGenerated = true` pour traçabilité. Le praticien édite ensuite librement le brouillon avant finalisation.

---

### Bibliothèque de modèles

Un modèle de protocole (`ProtocolTemplate`) est prévu en base avec catégories : DIGESTIVE, HORMONAL, STRESS, DETOX, IMMUNITY, ENERGY, OTHER. Cette fonctionnalité n'est pas encore exposée dans l'interface utilisateur.

---

### Versionnement

Chaque fiche appartient à une **famille de versions** identifiée par un `parentId`. Le numéro de version suit le format **V[majeur].[mineur]** (ex. V1.0, V1.1, V2.0).

**Actions de version disponibles :**
- **Nouvelle version mineure** : copie avec incrémentation du mineur (V1.0 → V1.1) — ajustement de protocole.
- **Nouvelle version majeure** : copie avec incrémentation du majeur (V1.0 → V2.0) — refonte du protocole.
- **Dupliquer** : copie indépendante, nouvelle famille.
- **Supprimer** : suppression de la version courante.

La liste globale des fiches groupe les versions par famille et affiche la version la plus récente en tête. Les versions précédentes sont visibles dans un sous-panneau.

---

### Machine d'états

```
DRAFT → FINAL → DRAFT (réversible)
```

- **DRAFT** : brouillon éditable, n'est pas considéré comme définitif.
- **FINAL** : fiche finalisée — le champ `signedAt` est horodaté automatiquement. Réversible manuellement si le praticien doit corriger.

---

### Génération PDF

- Route : `/api/pdf/advice-sheet/[id]`
- Le PDF inclut uniquement les sections renseignées.
- En-tête avec nom du patient, version, date de création et date de finalisation.
- Téléchargeable depuis la liste globale, depuis la fiche de consultation liée, et depuis la vue détail.

---

### Flux complet consultation → protocole → remise patient

1. Séance de bilan → saisie dans **Consultation**.
2. Déclenchement de l'analyse → review des **Constats**.
3. Depuis la consultation → **Créer une fiche conseil**.
4. Option : générer un brouillon assisté depuis les données de la consultation.
5. Édition libre du praticien dans les 13 sections.
6. Finalisation (DRAFT → FINAL) → horodatage.
7. **Export PDF** → remise au patient (imprimé ou email).
8. Si ajustement à la prochaine séance : **Nouvelle version mineure** V1.0 → V1.1.

---

### Cas d'usage

- Première consultation : protocole V1.0 remis en fin de séance.
- Séance de suivi : ajustements du protocole → V1.1 (version mineure).
- Changement de terrain ou d'objectif : nouveau protocole → V2.0 (version majeure).
- Consultation de longue durée : retrouver rapidement ce qui avait été prescrit 6 mois plus tôt en consultant V1.2.

---

### Fonctionnalités actuelles
13 sections structurées, machine d'états DRAFT/FINAL, versionnement majeur/mineur, duplication, génération de brouillon assisté (si liée à une consultation), export PDF, historique de versions dans la fiche, filtres Brouillon/Final dans la liste.

### Fonctionnalités prévues (roadmap)
- Bibliothèque de modèles de protocoles par catégorie (DIGESTIVE, HORMONAL, STRESS…) — modèle en base, UI à construire.
- Pré-remplissage automatique de la section "Compléments" depuis les données du bilan.
- Envoi de la fiche au patient par email directement depuis l'interface.

### Questions ouvertes
- Niveau de personnalisation graphique du PDF (logo praticien, couleurs).
- Accès patient en lecture seule à ses fiches (espace patient futur).
- Format d'export complémentaire (DOCX pour édition post-téléchargement).

### Arguments différenciants
La liaison directe consultation → fiche conseil avec pré-remplissage basé sur les données cliniques saisies est unique. Le versionnement sémantique (majeur/mineur) adapte un concept de gestion de version logicielle au suivi protocolaire — ce qui offre une traçabilité chronologique précise des évolutions thérapeutiques, absente de tout logiciel naturopathique du marché.

---

## 4. Agenda et Rendez-vous

### Objectif
Gérer le planning du praticien : création manuelle de rendez-vous, vue calendrier hebdomadaire, réception et suivi des réservations en ligne.

---

### Gestion du planning

**Vue calendrier**
Affichage en grille hebdomadaire (`WeekCalendar`), navigation de semaine en semaine via le paramètre `date` dans l'URL. Les rendez-vous sont affichés dans leur créneau horaire avec nom du patient, type et statut.

**Création manuelle**
Depuis le bouton "Nouveau rendez-vous" ou depuis la fiche d'un patient (onglet Rendez-vous). Champs : patient, date/heure de début et de fin, type, notes optionnelles.

**Types de rendez-vous**
- **BILAN** : première consultation ou consultation de fond.
- **SUIVI** : rendez-vous de suivi d'un protocole en cours.

**Statuts**
- `SCHEDULED` : planifié
- `COMPLETED` : réalisé
- `CANCELLED` : annulé
- `NO_SHOW` : patient absent

---

### Disponibilités

**Configuration des disponibilités** (`PractitionerSchedule`)
Le praticien définit ses plages de disponibilité hebdomadaires récurrentes en JSON structuré :
```json
{ "monday": [{"from":"09:00","to":"12:00"},{"from":"14:00","to":"18:00"}], ... }
```
Un jour absent ou un tableau vide = praticien indisponible ce jour. Timezone configurable (défaut : Europe/Paris).

Ces disponibilités sont **la source unique de vérité** partagée entre le module Agenda du dashboard et le widget de réservation en ligne de la page publique.

---

### Réservations en ligne

**Onglet "Réservations en ligne"**
Vue dédiée accessible depuis l'agenda, filtrée sur les rendez-vous avec `source: "online_booking"`. Badge de comptage dans l'onglet (nombre de réservations futures en attente).

Deux sections : **À venir** (statut SCHEDULED, date future) et **Passés**.

**Flux de réservation côté public** (voir aussi Module 7 — Page professionnelle)
1. Le visiteur choisit une prestation sur la page publique.
2. Il sélectionne un créneau disponible (calculé en temps réel par `lib/public/slots.ts`).
3. Il saisit ses coordonnées.
4. Le rendez-vous est créé en base avec `source: "online_booking"`.
5. Notification email au praticien.

**Condition d'affichage du widget** : la réservation en ligne n'est proposée que si `appointmentEnabled = true`, au moins une prestation active existe, et des disponibilités sont configurées.

---

### Gestion des annulations

Les rendez-vous peuvent être passés au statut `CANCELLED` ou `NO_SHOW` via l'édition. Ils ne sont pas supprimés mais exclus des comptages actifs et des disponibilités.

---

### Rappels et synchronisation

**Rappels** : envoi d'un email de confirmation lors de la création d'un rendez-vous (via Resend — `sendAppointmentConfirmationEmail`).

**Synchronisation agenda externe** : non implémentée (pas de Google Calendar, iCal ou CalDAV).

---

### Liaison avec la consultation

Un rendez-vous peut être lié à une **consultation** (relation 1-1 optionnelle) ou à un **suivi** (FollowUp). Cela permet de retrouver depuis la consultation quel rendez-vous lui correspond.

---

### Cas d'usage

- Praticien qui reçoit une réservation en ligne le matin : l'onglet "Réservations en ligne" affiche la demande, le rendez-vous est déjà créé.
- Praticien qui gère son planning : vue semaine par semaine, création de rendez-vous en quelques clics.
- Patient absent : passage au statut NO_SHOW pour traçabilité.

---

### Fonctionnalités actuelles
Vue calendrier hebdomadaire, création/édition de rendez-vous, deux types (Bilan/Suivi), quatre statuts, onglet réservations en ligne, configuration des disponibilités, email de confirmation.

### Fonctionnalités prévues (roadmap)
- Éditeur visuel des disponibilités directement dans l'onglet Agenda.
- Vue mensuelle (actuellement uniquement hebdomadaire).
- Synchronisation avec un agenda externe (Google Calendar / iCal).
- Rappel automatique patient J-1 avant le rendez-vous.

### Questions ouvertes
- Gestion des jours fériés et des congés.
- Buffer entre deux rendez-vous (paramétrable ou fixe).
- Politique de délai minimum de réservation en ligne (ex. : pas de réservation possible dans les 24h).

### Arguments différenciants
La disponibilité hebdomadaire est un objet de données partagé entre le planning interne et la réservation publique en ligne — ce qui évite toute désynchronisation. L'onglet dédié aux réservations en ligne avec badge de comptage permet au praticien de distinguer immédiatement les demandes web de ses rendez-vous manuels.

---

## 5. Facturation

### Objectif
Créer, émettre et suivre les factures de consultations. Générer des PDF conformes pour la remise au patient et l'archivage comptable.

---

### Création de factures

**Formulaire de création**
- Sélection du patient.
- Numéro de facture unique (généré automatiquement ou saisi).
- Lignes de facturation (InvoiceLine) : description, quantité, prix unitaire → total calculé.
- Méthode de paiement : espèces (CASH), carte (CARD), virement (TRANSFER), chèque (CHECK).
- Le total est la somme des lignes.

---

### Machine d'états

```
DRAFT → ISSUED → PAID
              ↘ CANCELLED
```

- **DRAFT** : brouillon, modifiable, suppressible.
- **ISSUED** : émise — la date d'émission (`issuedAt`) est horodatée.
- **PAID** : réglée.
- **CANCELLED** : annulée.

Transitions disponibles dans l'interface :
- DRAFT → "Émettre" → ISSUED
- ISSUED → "Marquer payée" → PAID
- ISSUED → "Annuler" → CANCELLED
- DRAFT → "Supprimer" (suppression définitive)

---

### Données stockées

| Champ | Description |
|---|---|
| `number` | Numéro de facture (unique) |
| `status` | DRAFT / ISSUED / PAID / CANCELLED |
| `totalAmount` | Montant total calculé |
| `paymentMethod` | CASH / CARD / TRANSFER / CHECK |
| `issuedAt` | Date d'émission |
| Lines : `description`, `quantity`, `unitPrice`, `total` | Lignes de détail |

---

### Export PDF

Route : `/api/pdf/invoice/[id]`
Le PDF inclut : en-tête praticien, informations patient, numéro et date de facture, tableau des lignes avec total, méthode de paiement.

---

### Historique et accès

- Liste globale des factures (`/invoices`) avec statut, montant et date.
- Accès rapide aux factures d'un patient depuis l'onglet "Factures" de la fiche patient.
- Les factures sont toujours liées à un patient (jamais orphelines).

---

### Archivage

Les factures ne sont pas supprimées une fois émises (seules les DRAFT sont suppressibles). Les statuts ISSUED, PAID, CANCELLED sont définitifs et constituent l'historique comptable.

---

### Cas d'usage

- Fin de séance : création d'une facture depuis la fiche patient, une ligne "Bilan de vitalité — 90 min", émission immédiate, téléchargement PDF.
- Paiement différé : création en DRAFT pendant la séance, passage en ISSUED + PAID quand le paiement est reçu.
- Justificatif mutuelle : téléchargement du PDF émis.

---

### Fonctionnalités actuelles
Création multi-lignes, 4 méthodes de paiement, machine d'états DRAFT/ISSUED/PAID/CANCELLED, export PDF, accès depuis la fiche patient.

### Fonctionnalités prévues (roadmap)
- Envoi de la facture PDF par email directement depuis l'interface (`sendInvoiceEmail` déjà implémenté dans `lib/email/index.ts`).
- Export comptable (CSV ou vers un logiciel de comptabilité).
- Numérotation automatique configurable (préfixe, format d'année).
- Statistiques de chiffre d'affaires dans le tableau de bord.

### Questions ouvertes
- Gestion de la TVA (les naturopathes sont généralement exonérés — confirmation nécessaire pour les cas particuliers).
- Avoir (note de crédit) sur une facture annulée.
- Gestion multi-devises (pour praticiens binationaux).

### Arguments différenciants
L'intégration directe facturation ↔ dossier patient évite la double saisie : le patient est déjà dans le système, la facture est créée depuis son profil. La machine d'états simple mais complète couvre tous les workflows d'un cabinet en activité sans complexité comptable superflue.

---

## 6. Assistance Clinique

### Objectif
Mettre à disposition du praticien, pendant et après la consultation, une base documentaire structurée permettant d'identifier des signaux cliniques pertinents entre les symptômes déclarés, les médicaments pris et les compléments alimentaires. Il s'agit d'un **outil d'aide à la décision**, pas d'un système de diagnostic.

---

### Sources de données utilisées

| Source | Type | Description |
|---|---|---|
| **BDPM (ANSM)** | Base officielle | Base de Données Publique des Médicaments — RCP, substances actives, spécialités commerciales |
| **ANSM** | Fiches officielles | Résumés des Caractéristiques Produit (RCP) |
| **NIH ODS** | Fact sheets | Office of Dietary Supplements (NIH) — fiches ingrédients compléments alimentaires |
| **NIH DSLD** | Labels produits | Dietary Supplement Label Database (NIH) — labels de produits commerciaux |
| **PubMed** | Études scientifiques | Littérature biomédicale |
| **MANUAL** | Saisie interne | Documents ajoutés manuellement par l'équipe NaturoDesk |

**Importation BDPM**
La totalité de la base BDPM est importée et synchronisée par lots (`DrugSyncBatch`). Chaque import trace : nombre de produits, substances, créations, mises à jour, entrées inactivées.

**Structure BDPM importée**
- `DrugSubstance` : substances actives (DCI) avec code BDPM, nom canonique, classe pharmacologique.
- `DrugProduct` : spécialités commerciales (ex. "DOLIPRANE 1000 mg, comprimé") avec codes CIS.
- `DrugPresentation` : conditionnements (codes CIP7/CIP13).
- `DrugGenericGroup` : groupes de génériques.
- `DrugAlias` : alias de résolution rapide (noms de marque, abréviations, variantes orthographiques).

---

### Fonctionnement du moteur de recherche

**Indexation**
Les documents source sont découpés en chunks (`KnowledgeChunk`) avec métadonnées métier. Chaque chunk est vectorisé en embedding de 1536 dimensions (OpenAI) via pgvector (PostgreSQL).

**Recherche sémantique**
La recherche (`KnowledgeSearch`) interroge les embeddings pour trouver les chunks les plus proches d'une requête en langage naturel. Permet de retrouver une information même sans connaître le terme exact.

**Faits structurés**
Au-delà du texte, le moteur extrait des `KnowledgeFact` : des relations sémantiques typées entre entités, avec leur méthode d'extraction (déterministe ou assistée par LLM).

---

### Interactions médicamenteuses

Identifiées via le prédicat `INTERACTS_WITH` dans `KnowledgeFact` ou via `DrugSideEffect.effectType = SECONDARY_MECHANISM`. Chaque interaction est sourcée (`sourceId` obligatoire vers `ClinicalSource`) avec :
- Niveau d'évidence : RCP_ANSM, HAS_GUIDELINE, SYSTEMATIC_REVIEW, CLINICAL_STUDY, EXPERT_CONSENSUS, CASE_REPORTS.
- Qualificateur : sévérité, fréquence, contexte clinique.

---

### Effets secondaires

Modélisés dans `DrugSideEffect` avec :
- **Fréquence** : VERY_COMMON (>1/10), COMMON (>1/100), UNCOMMON (>1/1000), RARE, VERY_RARE, UNKNOWN.
- **Sévérité** : MILD, MODERATE, SEVERE.
- **Temporalité** : IMMEDIATE (<24h), EARLY (jours–2 semaines), DELAYED (2–12 semaines), CHRONIC (>3 mois), WITHDRAWAL (à l'arrêt).
- **Source primaire obligatoire** : pas d'effet sans référence traçable (RCP officiel ou publication).

---

### Déplétions nutritionnelles

Modélisées sur deux niveaux (`DrugNutrientDepletion` → `NutrientDepletionSymptom`) :
- Niveau 1 : substance → nutriment épuisé (avec mécanisme sourcé).
- Niveau 2 : nutriment → symptômes consécutifs.

Exemple : Metformine → déplétion Vitamine B12 → fatigue + paresthésies.

---

### Contre-indications

Prédicat `CONTRAINDICATED_WITH` dans `KnowledgeFact`. Aussi modélisées via `FactType = CONTRAINDICATION`.

---

### Analyse des traitements — Hiérarchie des sources (Tiers)

La `ClinicalAnalysis` produit des `AnalysisItem` classés en 4 niveaux de fiabilité :

| Tier | Source | Description |
|---|---|---|
| **TIER_1_DIRECT** | `DrugSideEffect` (RCP/HAS) | Effet documenté dans le RCP officiel — haute fiabilité |
| **TIER_2_INDIRECT** | `DrugNutrientDepletion` ou mécanisme secondaire | Relation indirecte documentée |
| **TIER_3_FACT_ONLY** | `KnowledgeFact` seul | Relation documentée sans DrugSideEffect — prudence maximale |
| **TIER_4_UNMATCHED** | Aucune correspondance | Symptôme sans correspondance structurée identifiée |

**Scoring multi-facteurs** (tous les facteurs persistés pour audit complet) :
```
confidenceScore = min(max(frequencyFactor + temporalModifier + corroborationBoost, 0), evidenceCeiling)
```
- `frequencyFactor` : score de base selon la fréquence de l'effet (VERY_COMMON → 0.85, RARE → 0.25)
- `evidenceCeiling` : plafond dur selon le niveau de preuve (RCP_ANSM → 0.90, CASE_REPORTS → 0.50)
- `temporalModifier` : +0.05 si temporalité cohérente, -0.15 si incohérente
- `corroborationBoost` : +0.05 si un KnowledgeFact corrobore (jamais source primaire)

---

### Aide à la construction du protocole

Les constats (`Finding`) produits par l'analyse sont catégorisés :
- `SIDE_EFFECT` : effet indésirable identifié
- `INTERACTION` : interaction entre substances
- `DEPLETION` : déplétion nutritionnelle induite
- `RED_FLAG` : signal d'alerte nécessitant vigilance
- `TERRAIN` : information sur le terrain du patient
- `PROTOCOL` : suggestion ou observation protocolaire
- `QUESTION` : point à clarifier avec le patient

Le praticien peut valider, annoter ou ignorer chaque constat. Les constats validés alimentent la rédaction de la fiche conseil.

---

### Limites de l'outil

- **N'est pas un système de diagnostic** : NaturoDesk ne pose aucun diagnostic médical.
- **La signification clinique reste à l'appréciation du praticien** : un signal identifié peut être non pertinent dans le contexte spécifique du patient.
- **Couverture partielle** : toutes les substances ne sont pas encore couvertes par des faits structurés. Les niveaux TIER_3 et TIER_4 indiquent explicitement la limite de la correspondance.
- **Reformulation LLM non créatrice** : le LLM sert uniquement à formuler les explications en langage naturel (items TIER_1 et TIER_2 seulement). Il ne crée aucune relation clinique et n'invente aucune information.
- **Sources publiques uniquement** : les données proviennent de bases publiques (BDPM, NIH). Elles ne remplacent pas une consultation médicale.

---

### Ce qui relève de l'aide à la décision (et non du diagnostic)

- Signaler qu'un médicament déclaré par le patient est connu pour provoquer un symptôme qu'il décrit.
- Identifier qu'un médicament induit une déplétion d'un nutriment lié aux symptômes observés.
- Calculer un score de charge médicamenteuse pour orienter la discussion.
- Suggérer des points de vigilance à explorer lors de la consultation.

---

### Fonctionnalités actuelles
Base BDPM complète importée et synchronisée, NIH ODS pour les compléments, faits structurés avec 10 prédicats sémantiques, recherche sémantique par embeddings, moteur de règles déterministes, analyse clinique multi-tiers avec scoring tracé, hiérarchie stricte des sources, page Knowledge avec stats et recherche.

### Fonctionnalités prévues (roadmap)
- Couverture élargie des études PubMed (faits structurés).
- Enrichissement du catalogue `SymptomTerm` avec codes MedDRA.
- Alertes proactives lors de la saisie (avant déclenchement de l'analyse complète).
- Résolution DSLD des produits commerciaux de compléments alimentaires (modèle en place).

### Questions ouvertes
- Fréquence de mise à jour de la BDPM (mensuelle, trimestrielle).
- Politique de versionning des faits cliniques (qu'arrive-t-il aux analyses existantes si un fait est mis à jour).
- Affichage des citations vers les RCP dans l'interface praticien.

### Arguments différenciants
La hiérarchie des sources avec plafonds durs sur le score de confiance est un choix architectural délibéré : une information moins bien documentée ne peut jamais atteindre le score d'un RCP officiel, quelles que soient les autres variables. Le moteur est conçu pour être conservateur — il préfère signaler une incertitude plutôt qu'afficher une fausse certitude.

---

## 7. Page Professionnelle

### Objectif
Offrir à chaque praticien une page web publique professionnelle sur son propre sous-domaine de slug (`/p/[slug]`), accessible sans compte, optimisée pour le référencement local, et avec widget de réservation en ligne intégré.

**Accès** : disponible à partir du plan **Growth**.

---

### Structure de la page publique

La page est composée de 9 sections dans l'ordre d'affichage :

| # | Section | Contenu |
|---|---|---|
| 1 | **Hero** | Nom du cabinet / praticien, bio courte, bouton "Prendre rendez-vous" (si activé), logo |
| 2 | **Qui suis-je** | Présentation longue (approche, parcours), panneau décoratif visuel |
| 3 | **Mes spécialités** | Sections d'information libres (titre + description) en grille 3 colonnes |
| 4 | **Mes prestations** | Cartes services avec durée et tarif |
| 5 | **Prendre rendez-vous** | Widget de réservation multi-étapes (ou message de redirection si non configuré) |
| 6 | **Me trouver** | Adresse, téléphone, email (fond sombre) |
| 7 | **Suivez le cabinet** | Liens réseaux sociaux |
| 8 | **Me contacter** | Formulaire de contact (nom, email, message) |
| 9 | **Footer** | Nom du cabinet + mention NaturoDesk |

Les sections conditionnelles s'affichent uniquement si les données correspondantes sont renseignées.

---

### Informations affichées

**Identité**
- Nom du cabinet ou nom du praticien
- Photo de profil (logo uploadé)
- Bio courte (quelques lignes, affichée dans le hero)
- Présentation longue (approche, philosophie)

**Sections libres**
Blocs `WebPageInfoSection` : titre + description, ordonnés librement. Affichés dans la section "Mes spécialités" sous forme de cartes (ex. "Phytothérapie", "Homéopathie", "Bilan minéral").

---

### Services et Tarifs

Chaque prestation (`ServiceOffering`) est affichée avec :
- Nom de la prestation
- Description optionnelle
- Durée en minutes (badge pill)
- Tarif en euros (badge pill — si renseigné)
- Type : BILAN ou SUIVI (utilisé pour la réservation en ligne)

Les services sont classés par `displayOrder` paramétrable.

---

### Réservation en ligne

**Conditions d'affichage du widget**
- `appointmentEnabled = true` dans la configuration de la page
- Au moins une prestation active configurée
- Disponibilités hebdomadaires configurées (`PractitionerSchedule`)

**Fonctionnement du widget** (`BookingWidget`)
Widget multi-étapes côté client :
1. Sélection de la prestation
2. Sélection du créneau (calculé dynamiquement par `lib/public/slots.ts`)
3. Saisie des informations du visiteur (nom, email, téléphone)
4. Confirmation

Les créneaux disponibles sont calculés via l'API publique (`/api/public/[slug]/slots`). Un rendez-vous est créé avec `source: "online_booking"` et une notification est envoyée au praticien.

---

### Horaires

Les disponibilités configurées dans le module Agenda sont exposées via le moteur de créneaux. Pas d'affichage statique des horaires — c'est la disponibilité réelle calculée qui est présentée dans le widget.

---

### SEO local

**Balises meta**
- `<title>` : titre SEO personnalisé ou "{Nom du cabinet} — Naturopathe" par défaut
- `<meta description>` : description SEO personnalisée
- `robots: index, follow` pour les pages publiées

**OpenGraph**
- `og:title`, `og:description`, `og:type: "profile"`, `og:image` (logo si renseigné)

**Schema.org JSON-LD**
Structuration sémantique automatique :
```json
{
  "@type": ["LocalBusiness", "MedicalBusiness"],
  "name": "...",
  "telephone": "...",
  "email": "...",
  "address": { "@type": "PostalAddress", "streetAddress": "..." },
  "url": "..."
}
```
Ce balisage est lu par Google pour enrichir les résultats de recherche (Knowledge Panel, référencement local).

---

### Visibilité Google

- URL propre et stable : `https://[domaine]/p/[slug]`
- Le slug est **verrouillé définitivement à la première publication** (`slugLockedAt`) pour préserver la continuité du référencement.
- Page indexable uniquement si `isPublished = true`.

---

### Gestion du contenu (dashboard)

**Éditeur de page** (`WebPageForm`)
Interface de configuration dans `/webpage` du dashboard :
- Thème graphique : 10 thèmes prédéfinis avec variations de couleurs.
- Image hero : choix parmi une galerie (herbes, forêt, pierres…) ou dégradé couleur.
- Logo uploadé.
- Bio et présentation longue.
- Adresse, téléphone, email de contact public.
- Liens réseaux sociaux (Instagram, Facebook, LinkedIn, site web).
- Titre et description SEO.
- Activation / désactivation du formulaire de contact.
- Activation / désactivation de la réservation en ligne.

**Gestion des prestations** (`ServicesManager`)
CRUD des services avec réordonnancement.

**Sections d'information** (`InfoSectionsManager`)
CRUD des blocs libres (spécialités, approches) avec réordonnancement.

**Aperçu avant publication**
Mode preview via `?preview=1`, accessible au praticien propriétaire et aux admins uniquement. Bandeau amber visible.

**Publication / Dépublication**
Actions `publishWebPageAction` / `unpublishWebPageAction`. La publication verrouille le slug.

---

### Messages de contact

Stockés dans `ContactMessage` avec :
- Statuts : UNREAD → READ → REPLIED / ARCHIVED
- Notes internes praticien (jamais transmises au visiteur)
- Horodatage de lecture, réponse, archivage

Interface de gestion dans `/webpage/messages`.

---

### Cas d'usage

- Praticien qui s'installe : création de sa page en 15 minutes, publication immédiate avec ses prestations et coordonnées.
- Praticien qui active la réservation en ligne : configure ses disponibilités dans l'agenda, active l'option sur la page, son calendrier se remplit automatiquement depuis le web.
- Patient qui cherche un naturopathe : trouve la page via Google (LocalBusiness), voit les prestations et tarifs, réserve directement en ligne.
- Praticien qui met à jour ses offres : modification du service dans le dashboard, mise à jour immédiate sur la page publique.

---

### Fonctionnalités actuelles
Page publique en 9 sections, 10 thèmes graphiques, galerie d'images hero, bio + présentation, sections libres (spécialités), prestations avec tarifs et durées, widget de réservation en ligne, formulaire de contact avec gestion des messages, coordonnées, réseaux sociaux, SEO (meta + Schema.org JSON-LD), aperçu avant publication, verrouillage du slug à la publication.

### Fonctionnalités prévues (roadmap)
- Éditeur visuel des disponibilités directement dans le module Agenda (Lot D).
- Avis / témoignages patients (section dédiée).
- Intégration Google Maps sur la section coordonnées.
- Analytics simples (nombre de visites, clics sur le bouton RDV).
- Personnalisation avancée (couleurs libres au-delà des 10 thèmes prédéfinis).

### Questions ouvertes
- Gestion du nom de domaine personnalisé (ex. `www.cabinet-dupont.fr` → redirect vers `/p/slug`).
- RGPD formulaire de contact : durée de conservation des messages.
- Page multi-praticiens (cabinet de groupe avec plusieurs thérapeutes sur la même page).

### Arguments différenciants
La plupart des naturopathes utilisent soit un Linktree, soit un site WordPress statique qu'ils n'entretiennent plus. La page NaturoDesk est **directement connectée au logiciel métier** : les prestations configurées dans le logiciel s'affichent sur la page, les disponibilités de l'agenda alimentent la réservation en ligne, les réservations arrivent directement dans l'agenda. Zéro double saisie, zéro désynchronisation. Le balisage Schema.org généré automatiquement est invisible pour le praticien mais décisif pour le référencement local sur Google.

---

*Fin du document — NaturoDesk Documentation Fonctionnelle v1.0 — 17 juin 2026*
