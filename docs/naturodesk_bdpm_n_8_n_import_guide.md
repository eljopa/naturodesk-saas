# NaturoDesk — Guide de la phase d’import BDPM via n8n

## Objectif du document

Ce document définit le cadre fonctionnel et technique de la phase d’import de la BDPM dans NaturoDesk.

Il complète les documents existants et précise :
- le **contexte produit** de cette phase,
- le **rôle exact de n8n** dans le pipeline,
- le **rôle exact de NaturoDesk** dans le traitement métier,
- l’**architecture recommandée** pour collecter, stocker, parser et intégrer les données BDPM,
- les **contraintes de mise en œuvre** pour préparer proprement la phase Knowledge Base.

Ce document existe pour éviter une confusion fréquente :

> n8n ne doit pas devenir le moteur métier documentaire.
>
> n8n doit orchestrer la collecte et le versioning des fichiers.
>
> NaturoDesk doit conserver toute la logique métier de parsing, normalisation, ingestion, chunking, embeddings et facts.

---

# 1. Contexte produit

NaturoDesk entre dans la phase de construction de son moteur d’intelligence documentaire.

Cette phase repose sur un principe fondamental :

> la base de connaissance doit être alimentée par des **sources externes fiables**, puis transformée en objets internes exploitables.

Pour les médicaments en contexte France, la source de départ retenue est la **Base de Données Publique des Médicaments (BDPM)**.

Cette source fournit plusieurs fichiers téléchargeables qui permettent de reconstituer un socle documentaire cohérent autour des spécialités, compositions, présentations, conditions de prescription, groupes génériques, informations importantes, disponibilités et autres métadonnées associées.

---

# 2. Rôle de cette phase dans l’architecture globale

Cette phase ne correspond pas encore à l’analyse IA elle-même.

Elle sert à mettre en place le **socle de données documentaires versionnées** qui alimentera ensuite :
- la normalisation des médicaments,
- la création de `KnowledgeDocument`,
- la création de `KnowledgeChunk`,
- la création de `KnowledgeTerm`,
- la création de `KnowledgeFact`,
- le matching sémantique,
- le rules engine,
- puis le pipeline LLM encadré.

En d’autres termes :

```text
BDPM
  ↓
Collecte / versioning
  ↓
Parsing métier
  ↓
Knowledge Base interne
  ↓
Rules + Matching + LLM
```

---

# 3. Décision d’architecture

## 3.1. Principe retenu

La BDPM ne doit pas être consommée comme une API temps réel du produit.

Le bon modèle pour NaturoDesk est :

- récupération périodique des fichiers officiels,
- stockage versionné des datasets,
- ingestion contrôlée dans NaturoDesk,
- transformation progressive dans le modèle interne.

## 3.2. Pourquoi cette stratégie est la bonne

Elle permet de :
- ne pas dépendre d’un service tiers non maîtrisé en temps réel,
- conserver une photographie mensuelle des données,
- rejouer les imports si le parseur évolue,
- tracer les versions de dataset utilisées,
- isoler la logique métier dans l’application.

---

# 4. Répartition des responsabilités

## 4.1. Ce que fait n8n

n8n a un rôle **d’orchestrateur technique**.

Il doit gérer :
- le déclenchement périodique,
- le téléchargement des fichiers BDPM,
- le stockage versionné,
- éventuellement les notifications,
- éventuellement le déclenchement d’un import côté NaturoDesk.

n8n ne doit pas porter :
- la logique de parsing métier détaillée,
- la logique de normalisation métier,
- la création des embeddings,
- la génération des facts,
- la logique rules engine,
- la logique d’analyse.

## 4.2. Ce que fait NaturoDesk

NaturoDesk garde toute la logique métier.

Il doit gérer :
- lecture du dataset versionné,
- validation structurelle des fichiers,
- parsing BDPM,
- mapping des relations entre fichiers,
- normalisation interne,
- ingestion en base,
- création des documents,
- création des chunks,
- préparation embeddings,
- création des terms,
- création des facts,
- traçabilité des imports.

---

# 5. Architecture cible de la phase

## 5.1. Vue d’ensemble

```text
[CRON mensuel n8n]
        ↓
[Téléchargement fichiers BDPM]
        ↓
[Stockage versionné Drive / Bucket]
        ↓
[Optionnel : webhook NaturoDesk / import queue]
        ↓
[NaturoDesk Import Service]
        ↓
[Parsing + validation]
        ↓
[KnowledgeDocument / KnowledgeChunk / KnowledgeTerm / KnowledgeFact]
```

---

# 6. Workflow n8n recommandé

## 6.1. Objectif du workflow

Télécharger chaque mois les fichiers BDPM disponibles, les stocker de manière versionnée, puis notifier ou déclencher NaturoDesk pour traitement.

## 6.2. Déclencheur

### Cron mensuel
Fréquence recommandée :
- 1 fois par mois
- idéalement quelques jours après la date habituelle de mise à jour de la BDPM

Objectif :
- éviter les téléchargements inutiles,
- rester aligné avec le rythme mensuel de la source.

## 6.3. Étapes du workflow n8n

### Étape 1 — Initialisation
Créer un identifiant de lot, par exemple :
- `2026-04`
- ou `2026-04-02T03-00-00Z`

Cet identifiant servira à versionner le dataset.

### Étape 2 — Téléchargement de la page source ou des fichiers cibles
Deux stratégies sont possibles :

#### Option A — URLs fixes connues
Si les liens sont stables, n8n télécharge directement les fichiers.

#### Option B — récupération depuis la page de téléchargement
Si les liens changent, n8n lit la page puis récupère dynamiquement les URLs des fichiers.

Pour la V1, il faut privilégier l’option la plus simple et la plus robuste.

### Étape 3 — Téléchargement des fichiers BDPM
Télécharger au minimum les fichiers suivants :
- fichier des spécialités
- fichier des présentations
- fichier des compositions
- fichier des groupes génériques
- fichier des conditions de prescription et de délivrance
- fichier des informations importantes
- fichier des fiches disponibilité
- fichier des MITM

Les fichiers HAS peuvent aussi être téléchargés si l’on souhaite enrichir les données administratives.

### Étape 4 — Vérifications minimales
Pour chaque fichier téléchargé :
- vérifier qu’il existe,
- vérifier qu’il n’est pas vide,
- enregistrer sa taille,
- enregistrer son nom,
- éventuellement calculer un hash.

### Étape 5 — Stockage versionné
Stocker les fichiers dans un espace versionné.

Exemple d’arborescence :

```text
bdpm/
  2026-04/
    CIS_bdpm.txt
    CIS_CIP_bdpm.txt
    CIS_COMPO_bdpm.txt
    CIS_GENER_bdpm.txt
    CIS_CPD_bdpm.txt
    CIS_InfoImportantes_20260402103000_bdpm.txt
    CIS_CIP_Dispo_Spec.txt
    CIS_MITM.txt
    manifest.json
```

### Étape 6 — Génération d’un manifest
Créer un fichier `manifest.json` contenant par exemple :
- version du lot,
- date de téléchargement,
- liste des fichiers,
- tailles,
- hash éventuel,
- statut global du lot.

### Étape 7 — Notification / déclenchement NaturoDesk
Deux options :

#### Option simple
n8n envoie seulement une notification indiquant qu’un nouveau lot est disponible.

#### Option plus intégrée
n8n appelle un endpoint serveur NaturoDesk du type :
- `POST /api/knowledge/import/bdpm`

avec le payload minimal :
- version du lot,
- emplacement des fichiers,
- manifest.

---

# 7. Stockage recommandé

## 7.1. V1 acceptable
Google Drive est acceptable pour la V1 si le but est d’aller vite.

Avantages :
- rapide à mettre en place,
- historique simple,
- documents publics et non sensibles,
- usage faible coût.

## 7.2. Limites de Google Drive
À moyen terme, Drive n’est pas idéal pour un pipeline backend propre.

Limites :
- moins naturel pour un backend applicatif,
- moins pratique pour des imports automatisés fréquents,
- plus faible maîtrise qu’un storage orienté app.

## 7.3. Cible préférable à moyen terme
À moyen terme, il sera préférable d’utiliser :
- Supabase Storage,
- ou S3 / bucket compatible.

Mais cela ne doit pas bloquer la V1.

---

# 8. Process côté NaturoDesk

## 8.1. Principe fondamental

NaturoDesk ne traite pas un fichier isolé.

NaturoDesk traite un **lot versionné de fichiers BDPM**.

Le système doit pouvoir dire :
- quel lot est importé,
- quand il a été importé,
- quels fichiers ont été utilisés,
- si l’import a réussi ou échoué,
- si le lot a déjà été traité.

---

## 8.2. Étapes du process NaturoDesk

### Étape 1 — Réception du lot
Le backend reçoit :
- une version de lot,
- un emplacement de stockage,
- un manifest.

### Étape 2 — Validation structurelle
Avant tout parsing :
- vérifier la présence des fichiers obligatoires,
- vérifier qu’ils ne sont pas vides,
- vérifier qu’ils sont lisibles,
- journaliser le lot reçu.

### Étape 3 — Création / mise à jour d’un enregistrement de sync
Créer ou mettre à jour une ligne de suivi d’import.

Exemple de rôle pour `KnowledgeSourceSync` :
- source = BDPM
- lot = version mensuelle
- statut = PENDING / RUNNING / DONE / ERROR
- métriques d’import

### Étape 4 — Parsing métier
NaturoDesk parse les fichiers un par un.

Le parsing doit rester côté serveur, dans des services dédiés.

Exemples de services :
- parseSpecialtiesFile()
- parsePresentationsFile()
- parseCompositionsFile()
- parseGenericGroupsFile()
- parsePrescriptionConditionsFile()
- parseImportantInfoFile()
- parseAvailabilityFile()
- parseMitmFile()

### Étape 5 — Reconstruction du modèle BDPM interne
La clé pivot principale est le **CIS**.

NaturoDesk doit :
- charger `CIS_bdpm.txt` comme table centrale,
- rattacher les autres fichiers via `code CIS`,
- rattacher les liens HAS via le code de dossier HAS,
- construire une structure unifiée par spécialité.

### Étape 6 — Création d’objets métier internes
À partir du modèle BDPM unifié, créer progressivement :
- `KnowledgeDocument`
- `KnowledgeChunk`
- `KnowledgeTerm`
- éventuellement `KnowledgeFact` pour les éléments structurables dès cette phase

### Étape 7 — Journalisation et métriques
En fin de traitement, enregistrer :
- nombre de lignes lues,
- nombre de spécialités créées / mises à jour,
- nombre de chunks créés,
- nombre de terms créés,
- nombre d’erreurs,
- durée du traitement.

---

# 9. Modèle logique recommandé d’import

## 9.1. Fichier pivot

Le fichier pivot est :
- `CIS_bdpm.txt`

Il contient la description principale de la spécialité.

## 9.2. Fichiers enfants rattachés au CIS

Doivent être rattachés au CIS :
- `CIS_CIP_bdpm.txt`
- `CIS_COMPO_bdpm.txt`
- `CIS_HAS_SMR_bdpm.txt`
- `CIS_HAS_ASMR_bdpm.txt`
- `CIS_GENER_bdpm.txt`
- `CIS_CPD_bdpm.txt`
- `CIS_InfoImportantes_*.txt`
- `CIS_CIP_Dispo_Spec.txt`
- `CIS_MITM.txt`

## 9.3. Cas particulier HAS

Le fichier :
- `HAS_LiensPageCT_bdpm.txt`

ne se rattache pas directement par CIS mais via :
- `Code dossier HAS`

Le parseur doit le gérer explicitement.

---

# 10. Ce qui doit être importé en priorité

Pour la première itération, NaturoDesk n’a pas besoin de tout exploiter immédiatement.

## Priorité 1 — Identification du médicament
À partir de `CIS_bdpm.txt` :
- code CIS,
- dénomination,
- forme pharmaceutique,
- voies d’administration,
- statut,
- date AMM,
- titulaires,
- surveillance renforcée.

## Priorité 2 — Composition
À partir de `CIS_COMPO_bdpm.txt` :
- substances actives,
- dosages,
- référence du dosage,
- nature du composant.

## Priorité 3 — Présentations
À partir de `CIS_CIP_bdpm.txt` :
- CIP7,
- CIP13,
- libellé,
- état de commercialisation,
- prix et remboursement si utiles.

## Priorité 4 — Vigilance / contexte
À partir de :
- `CIS_CPD_bdpm.txt`
- `CIS_InfoImportantes_*.txt`
- `CIS_CIP_Dispo_Spec.txt`

## Priorité 5 — Enrichissements secondaires
À partir de :
- fichiers HAS,
- groupes génériques,
- MITM.

---

# 11. Ce que cette phase ne fait pas encore

Cette phase ne doit pas encore :
- produire une analyse LLM,
- implémenter le rules engine complet,
- décider de corrélations cliniques complexes,
- créer des interactions “inventées”,
- promettre un checker exhaustif.

Cette phase sert uniquement à **poser un socle documentaire et structurel robuste**.

---

# 12. Recommandations techniques côté code

## 12.1. Organisation recommandée

Exemple d’arborescence :

```text
/lib/knowledge/import/
  bdpm/
    fetch.ts
    manifest.ts
    parsers/
      specialties.ts
      presentations.ts
      compositions.ts
      smr.ts
      asmr.ts
      has-links.ts
      generics.ts
      cpd.ts
      important-info.ts
      availability.ts
      mitm.ts
    normalize.ts
    assemble.ts
    ingest.ts
```

## 12.2. Principes de code
- parseurs purs autant que possible,
- validation stricte,
- logs propres,
- idempotence,
- séparation nette entre lecture brute et transformation métier.

## 12.3. Traitement recommandé

### Niveau 1 — lecture brute
Lecture des lignes tabulées sans en-tête.

### Niveau 2 — mapping typé
Conversion dans des objets TypeScript typés.

### Niveau 3 — assemblage par CIS
Regroupement des différentes lignes autour du CIS.

### Niveau 4 — transformation métier
Création des objets internes NaturoDesk.

---

# 13. Intégration avec la phase Knowledge Base en cours

Cette phase doit être pensée comme la **source amont** de la Knowledge Base.

Elle doit s’intégrer proprement avec les travaux en cours sur :
- `KnowledgeDocument`
- `KnowledgeChunk`
- `KnowledgeFact`
- `KnowledgeTerm`
- `KnowledgeSourceSync`

Le lien fonctionnel est le suivant :

```text
BDPM files
  ↓
BDPM parsers
  ↓
Unified internal BDPM model
  ↓
KnowledgeDocument
  ↓
KnowledgeChunk
  ↓
KnowledgeTerm
  ↓
KnowledgeFact
```

Autrement dit :
- le workflow n8n prépare les fichiers,
- le module d’import BDPM les transforme,
- le module Knowledge les injecte dans la base documentaire.

---

# 14. Ordre recommandé d’implémentation

## Étape 1
Finaliser le modèle de données Knowledge.

## Étape 2
Créer l’infrastructure d’import BDPM côté NaturoDesk avec dataset local.

## Étape 3
Créer les parseurs des principaux fichiers BDPM.

## Étape 4
Créer l’assemblage par CIS.

## Étape 5
Créer l’ingestion dans `KnowledgeDocument` et `KnowledgeChunk`.

## Étape 6
Brancher ensuite `KnowledgeTerm` et `KnowledgeFact`.

## Étape 7
Seulement après, brancher le workflow n8n réel.

---

# 15. Décision stratégique V1

## Décision retenue

Pour la V1, l’architecture retenue est :

- collecte BDPM mensuelle via n8n,
- stockage versionné hors app,
- ingestion métier côté NaturoDesk,
- intégration progressive dans la Knowledge Base.

## Pourquoi cette décision est bonne

Elle permet de :
- avancer vite,
- limiter la complexité,
- rester robuste,
- conserver une architecture scalable,
- préparer la suite sans dette majeure.

---

# 16. Livrables attendus de cette phase

## Livrable 1 — Workflow n8n
- cron mensuel
- téléchargement des fichiers
- stockage versionné
- manifest
- notification ou webhook

## Livrable 2 — Service d’import BDPM côté NaturoDesk
- lecture d’un lot
- validation structurelle
- parsing typé
- assemblage par CIS

## Livrable 3 — Connexion à la Knowledge Base
- création des `KnowledgeDocument`
- création des `KnowledgeChunk`
- suivi via `KnowledgeSourceSync`

## Livrable 4 — Documentation technique
- format du lot
- liste des fichiers attendus
- règles de parsing
- mapping interne

---

# 17. Conclusion

Cette phase est une phase de fondation.

Elle ne produit pas encore l’intelligence métier finale, mais elle met en place le système qui rendra cette intelligence fiable, versionnée et traçable.

La réussite de NaturoDesk dépend ici d’une bonne séparation des rôles :

- **n8n collecte et orchestre**
- **NaturoDesk parse, normalise et structure**

C’est cette séparation qui permettra ensuite d’intégrer proprement le moteur documentaire dans la phase Knowledge Base en cours.

---

# 18. Règle finale à conserver

> Les fichiers BDPM ne sont pas la knowledge base finale.
>
> Ils sont la matière première versionnée à partir de laquelle NaturoDesk construit sa base de connaissance interne.

