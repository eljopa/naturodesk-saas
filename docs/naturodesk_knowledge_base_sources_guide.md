# NaturoDesk — Guide de la phase “Knowledge Base source-driven”

## Objectif du document

Ce document sert de référence pour la phase de mise en place de la base de connaissance documentaire de NaturoDesk.

Il complète les documents existants du projet et précise **la stratégie correcte de collecte, normalisation, structuration et exploitation des données** pour le moteur d’analyse.

Ce guide existe pour éviter une erreur d’architecture importante :

> **NaturoDesk ne doit pas reposer sur une base de connaissance remplie manuellement dès le départ.**
>
> La V1 doit s’appuyer d’abord sur des **sources externes fiables**, puis transformer ces sources en objets internes exploitables par le pipeline d’analyse.

---

# 1. Rappel du positionnement produit

NaturoDesk est un **assistant documentaire et organisationnel** pour naturopathes.

Le produit ne doit pas :
- poser un diagnostic
- remplacer un médecin
- recommander l’arrêt d’un traitement
- inventer une interaction
- affirmer un lien de causalité non documenté

La partie IA ne doit donc pas fonctionner comme un simple chatbot généraliste.

Elle doit s’appuyer sur :
- des **sources documentaires identifiées**
- des **preuves traçables**
- des **règles métier déterministes**
- un **LLM strictement encadré**

---

# 2. Principe directeur de cette phase

## Règle fondamentale

La knowledge base V1 doit être **source-driven**.

Cela signifie que l’on ne construit pas d’abord une “bibliothèque maison” floue.

On part de **sources fiables externes**, puis on transforme les données dans un format exploitable par NaturoDesk.

Le schéma global doit être :

```text
Sources externes fiables
    ↓
Import / synchronisation
    ↓
Normalisation interne
    ↓
Découpage documentaire (chunks)
    ↓
Dérivation de faits structurés
    ↓
Matching + rules engine + LLM encadré
```

---

# 3. Pourquoi cette stratégie est indispensable

Sans cette approche, plusieurs risques apparaissent immédiatement :

## 3.1. Risque de base floue
Si l’on stocke simplement des textes ou des fiches “faites main”, la qualité devient hétérogène et difficile à auditer.

## 3.2. Risque d’hallucination
Si le LLM doit “deviner” les corrélations à partir de peu de structure, il devient trop central et donc dangereux pour un usage métier.

## 3.3. Risque de non-traçabilité
Chaque finding doit pouvoir être justifié par :
- une source
- un extrait
- une logique de matching ou une règle déterministe

## 3.4. Risque juridique et réputationnel
Dans un contexte de santé / bien-être, même sans dispositif médical, le produit doit rester prudent, traçable et défendable.

---

# 4. Sources de données à utiliser en V1

## 4.1. Médicaments — source primaire France

### BDPM / ANSM
La base de départ doit être la **Base de Données Publique des Médicaments**.

C’est la source prioritaire pour la V1 française.

### Ce qu’elle permet d’exploiter
- spécialités
- substances actives
- notices
- RCP
- informations administratives utiles
- contenu officiel réutilisable comme preuve documentaire

### Pourquoi c’est la bonne base
- source publique
- logique française
- adaptée au contexte utilisateur principal
- cohérente avec le rôle d’assistant documentaire

---

## 4.2. Médicaments — source complémentaire Europe

### EMA
L’EMA peut compléter certains cas :
- médicaments à AMM centralisée
- documentation européenne
- données utiles pour enrichir certains produits

### Usage recommandé
L’EMA n’est pas la base principale en V1.
Elle sert plutôt de **source secondaire / complémentaire**.

---

## 4.3. Interactions médicamenteuses

C’est le point le plus sensible.

### Position claire pour la V1
Sans source sous licence spécialisée, NaturoDesk ne doit **pas se présenter comme un checker exhaustif d’interactions**.

Il doit rester un **assistant documentaire prudent**.

### Sources évoquées
- Vidal : source riche mais généralement sous licence / contrat
- DrugBank Clinical API : API commerciale spécialisée

### Décision V1
- ne pas scraper Vidal
- ne pas promettre l’exhaustivité des interactions
- rester dans une logique de vigilance documentaire
- prévoir une architecture permettant d’ajouter plus tard une source sous licence

---

## 4.4. Compléments alimentaires / nutriments

### ODS (NIH Office of Dietary Supplements)
Source utile pour :
- fiches nutriments
- précautions générales
- éléments de vigilance
- documentation de base sur certains compléments

### DSLD
Source utile en appoint pour :
- ingrédients déclarés
- étiquetage produits
- recensement de formulations

### Limite importante
Le DSLD dépend du déclaratif fabricant.
Il ne doit pas être utilisé comme vérité clinique forte.

### Décision V1
- ODS comme source documentaire principale pour compléments / nutriments
- DSLD comme source secondaire éventuelle
- enrichissement progressif via expertise métier interne

---

# 5. Ce que NaturoDesk doit produire à partir de ces sources

Le but n’est pas de conserver uniquement les documents bruts.

La plateforme doit transformer les sources en **4 couches de connaissance**.

## 5.1. Couche 1 — Documents sources

Elle conserve la preuve d’origine.

Exemples :
- notice médicament
- RCP
- fiche nutriment
- monographie complément
- fiche red flag
- référentiel interne futur

Rôle :
- traçabilité
- auditabilité
- versioning
- déduplication

Table cible : `KnowledgeDocument`

---

## 5.2. Couche 2 — Chunks documentaires

Le document est découpé en unités exploitables.

Exemples de sections utiles :
- effets indésirables
- interactions
- mises en garde
- contre-indications
- déplétions potentielles
- précautions

Rôle :
- recherche sémantique
- citation
- génération de contexte contrôlé pour le LLM

Table cible : `KnowledgeChunk`

---

## 5.3. Couche 3 — Faits structurés

C’est la couche qui transforme la documentation en objets métier exploitables par les règles et les findings.

Exemples :
- un médicament peut être associé à une déplétion en B12
- un traitement peut avoir parmi ses effets indésirables possibles des céphalées
- un symptôme ou un contexte peut nécessiter une vigilance / question complémentaire

Rôle :
- alimenter le rules engine
- produire des findings déterministes
- réduire la dépendance au LLM

Table cible recommandée : `KnowledgeFact`

---

## 5.4. Couche 4 — Dictionnaire de normalisation

Elle sert à harmoniser les termes et à gérer les alias.

Exemples :
- DCI
- nom commercial
- classe de médicament
- synonymes de symptômes
- variantes orthographiques
- termes de nutriments / compléments

Rôle :
- normaliser les entrées de consultation
- améliorer le matching lexical
- limiter les ambiguïtés

Table cible recommandée : `KnowledgeTerm`

---

# 6. Modèle de données recommandé pour cette phase

## 6.1. Tables à conserver

### `KnowledgeDocument`
Conserve le document source.

### `KnowledgeChunk`
Conserve les extraits exploitables.

---

## 6.2. Tables à ajouter

### `KnowledgeFact`
Stocke les faits structurés dérivés des documents.

Exemples de `factType` :
- `side_effect`
- `interaction`
- `depletion`
- `contraindication`
- `red_flag`
- `question_to_ask`
- `terrain_hint`
- `protocol_vigilance`

---

### `KnowledgeTerm`
Stocke les termes normalisés et leurs alias.

Exemples de `termType` :
- `drug`
- `drug_class`
- `symptom`
- `supplement`
- `nutrient`
- `terrain`
- `protocol_tag`

---

### `KnowledgeSourceSync` *(recommandé)*
Historise les imports/synchronisations de sources.

Rôle :
- savoir quand une source a été importée
- conserver le statut d’un import
- gérer retry / logs / idempotence
- préparer les mises à jour futures

---

# 7. Flux d’ingestion recommandé

## Étape 1 — Import source
Récupérer les données ou documents depuis la source choisie.

Exemples :
- BDPM
- EMA
- ODS

## Étape 2 — Normalisation primaire
Transformer les données source dans un format interne stable.

Exemples :
- uniformiser les clés
- distinguer molécule / spécialité / classe
- nettoyer le texte
- extraire les métadonnées

## Étape 3 — Création du `KnowledgeDocument`
Créer l’enregistrement document avec :
- origine
- type
- version
- hash contenu
- date de récupération

## Étape 4 — Chunking
Découper le document en sections exploitables.

Le chunking doit suivre une logique métier plutôt que brute.

Exemples de chunks :
- effets indésirables
- mises en garde
- interactions
- précautions
- déplétions

## Étape 5 — Embeddings
Générer les embeddings pour chaque chunk utile.

Attention :
- seuls les chunks exploitables doivent être vectorisés
- éviter la vectorisation de bruit documentaire

## Étape 6 — Dérivation de `KnowledgeFact`
Extraire ou dériver les faits structurés depuis les chunks ou documents.

Cette étape peut être :
- déterministe si la structure source le permet
- assistée par LLM en extraction contrôlée, mais jamais sans validation stricte

## Étape 7 — Mapping des `KnowledgeTerm`
Créer ou enrichir le dictionnaire de normalisation.

Exemples :
- lier nom commercial ↔ DCI
- créer les alias connus
- uniformiser symptômes / nutriments

---

# 8. Ce qui doit être fait en premier

Pour rester efficace, la V1 doit commencer par un périmètre réduit mais utile.

## Priorité 1 — Médicaments les plus fréquents
Objectif : construire un premier noyau robuste autour des cas les plus courants.

À extraire en priorité :
- substance active
- spécialité
- effets indésirables
- mises en garde
- interactions documentées présentes dans la source
- déplétions ou vigilances pertinentes si disponibles

## Priorité 2 — Nutriments / compléments majeurs
Exemples :
- magnésium
- vitamine D
- vitamine B12
- zinc
- oméga 3
- probiotiques

## Priorité 3 — Red flags documentaires
Créer une base de vigilance claire et prudente.

Exemples :
- perte de poids inexpliquée
- douleur aiguë persistante
- saignement anormal
- aggravation rapide
- symptôme neurologique notable

---

# 9. Ce qu’il ne faut pas faire

## 9.1. Ne pas remplir la base “à la main” comme stratégie principale
Une petite base de red flags internes peut exister, mais elle ne doit pas devenir le cœur du système.

## 9.2. Ne pas scraper des sources sous licence / juridiquement sensibles
Exemple : Vidal.

## 9.3. Ne pas mélanger preuves documentaires et hypothèses
Chaque élément doit être distingué clairement :
- source documentaire
- fait structuré
- règle métier
- reformulation LLM

## 9.4. Ne pas laisser le LLM créer des preuves
Le LLM peut :
- reformuler
- regrouper
- structurer
- résumer prudemment

Le LLM ne peut pas :
- inventer une interaction
- inventer un effet secondaire
- inventer une preuve
- remplacer le matching ou les règles

---

# 10. Contrat fonctionnel de cette phase

À l’issue de cette phase, NaturoDesk doit être capable de :

1. importer une source documentaire fiable
2. la convertir en `KnowledgeDocument`
3. découper en `KnowledgeChunk`
4. générer les embeddings nécessaires
5. créer des `KnowledgeFact` structurés
6. maintenir un dictionnaire `KnowledgeTerm`
7. tracer les synchronisations de source

À l’issue de cette phase, NaturoDesk ne cherche pas encore à :
- couvrir parfaitement toutes les interactions du marché
- remplacer une base clinique spécialisée sous licence
- générer seul des conclusions médicales

---

# 11. Décision produit claire pour la V1

## Positionnement officiel côté analyse
NaturoDesk V1 fonctionne comme :

> un assistant documentaire structuré, traçable et prudent,
> alimenté par des sources fiables,
> aidant le praticien à repérer des points d’attention,
> mais ne prétendant pas à l’exhaustivité clinique absolue.

Cette formulation est importante pour :
- la cohérence produit
- la sécurité
- la crédibilité
- la communication commerciale future

---

# 12. Livrables attendus de cette phase

## Livrable 1 — Modèle de données
- ajout des tables nécessaires
- enums stabilisés
- métadonnées source bien définies

## Livrable 2 — Service d’import
- import source
- hash / version / logs
- persistance des documents

## Livrable 3 — Service de chunking
- découpage métier
- sections prioritaires
- nettoyage texte

## Livrable 4 — Service d’embeddings
- génération embeddings
- stockage pgvector
- filtrage des chunks utiles

## Livrable 5 — Service de dérivation des facts
- extraction contrôlée
- validation stricte
- lien document/chunk/fact

## Livrable 6 — Service de normalisation
- création / enrichissement des `KnowledgeTerm`
- alias
- clés canoniques

---

# 13. Ordre recommandé d’implémentation

1. stabiliser le modèle de données
2. définir les enums et clés canoniques
3. implémenter l’import source
4. implémenter le chunking
5. implémenter le stockage embeddings
6. implémenter la dérivation des facts
7. implémenter la normalisation via `KnowledgeTerm`
8. seulement ensuite brancher proprement le pipeline d’analyse

---

# 14. Conclusion

La réussite de NaturoDesk ne dépend pas d’un simple appel LLM.

Elle dépend d’une chaîne robuste :
- source fiable
- structure claire
- preuve traçable
- logique déterministe
- reformulation IA strictement encadrée

Cette phase est donc une phase fondatrice.

Si elle est bien conçue, elle permettra ensuite :
- un matching plus fiable
- un rules engine plus utile
- des findings plus crédibles
- une meilleure confiance praticien
- une vraie différenciation produit

---

# 15. Règle finale à conserver

> Dans NaturoDesk, l’IA ne pense pas à partir du vide.
>
> Elle travaille à partir de preuves, de structures et de règles.

