# Blog business naturopathie — génération automatique

**Date** : 2026-07-14
**Statut** : validé, en attente de plan d'implémentation

## 1. Contexte & objectif

NaturoDesk dispose déjà d'un squelette de blog marketing (`app/(marketing)/blog`) totalement vide : page de liste avec un état vide codé en dur, page article qui retourne systématiquement `notFound()`, aucun modèle de données. Ce projet remplace ce squelette par un blog qui se remplit tout seul, avec des articles **orientés business du métier de naturopathe** (ouvrir son cabinet, trouver des clients, se faire connaître, s'organiser, choisir des outils de gestion...) plutôt que des sujets de naturopathie clinique.

Le but est double :
- Générer du contenu qui parle directement au public cible de NaturoDesk (naturopathes en installation ou déjà en activité), pour le SEO et la notoriété.
- Mettre naturellement en avant NaturoDesk comme la solution de gestion adaptée à ces problématiques, sans que les articles ressemblent à de la pub.

Ce projet s'inspire du système de blog automatique interne de SelfHook (projet `SELFHOOK_PROJET/selfhook`), adapté à la stack NaturoDesk (Prisma/Postgres, pas de publication git, pas de n8n) et à sa thématique.

## 2. Périmètre

**Dans le périmètre** :
- Modèle de données Prisma pour le calendrier éditorial et les articles générés (FR + EN).
- Catalogue "Editorial DNA" versionné en code (tons, profondeurs, structures, blocs, familles visuelles) adapté à la thématique business-naturopathie.
- Pipeline de génération complet en pilotage automatique (cron), texte + traduction/adaptation EN + images, avec score qualité et garde-fous de langage (marketing ET réglementaire/déontologique propre à la naturopathie).
- Rendu public du blog (liste + page article) branché sur les vraies données, SEO inclus.
- Mini back-office admin de supervision (liste, statuts, publier/dépublier, régénérer images, forcer une génération).
- Amorçage du calendrier éditorial (script de seed, ~30-40 sujets).

**Hors périmètre (voir section 12)** : édition riche du contenu généré, extension automatique du calendrier éditorial, plafond de budget IA automatisé, tout ce qui touche au système "client WordPress" de SelfHook (non pertinent ici — NaturoDesk n'écrit pas d'articles pour ses propres utilisateurs).

## 3. Architecture générale

Trois couches, entièrement internes à NaturoDesk (pas de n8n, pas de service tiers) :

1. **Charte éditoriale versionnée** — `lib/blog/editorial-dna.ts` : catalogue TypeScript (clusters, personas, tons, profondeurs, structures, blocs, familles visuelles, règles de langage). Relue/modifiée en revue de code, jamais via une UI d'admin.
2. **Pipeline de génération** — `app/api/cron/generate-blog-article`, déclenché par Vercel Cron (Lun/Mer/Ven) et rejouable manuellement depuis l'admin. Sélectionne un sujet, compose l'ADN éditorial, génère le texte FR, valide/score, adapte en EN, génère les images, sauvegarde en base.
3. **Rendu public** — `app/(marketing)/blog`, lit les articles publiés en base selon la locale courante (cookie `NEXT_LOCALE`, sans préfixe d'URL — cohérent avec le reste du site).

Un back-office (`app/(admin)/admin/blog`) supervise l'ensemble.

## 4. Modèle de données (Prisma)

```prisma
enum BlogCluster {
  INSTALLATION
  REGLEMENTATION_JURIDIQUE
  ACQUISITION_CLIENTELE
  COMMUNICATION_VISIBILITE
  GESTION_OUTILS
  DEVELOPPEMENT_ACTIVITE
}

enum BlogPersona {
  INSTALLATION
  CROISSANCE
  LES_DEUX
}

enum BlogContentType {
  GUIDE
  TUTORIEL
  COMPARATIF
  PREUVE
}

enum BlogTopicStatus {
  PLANNED
  GENERATING
  GENERATED
  REVIEW_REQUIRED
  PUBLISHED
  FAILED
}

enum BlogArticleStatus {
  DRAFT
  REVIEW_REQUIRED
  PUBLISHED
  UNPUBLISHED
  FAILED
}

enum BlogTone {
  PEDAGOGIQUE
  RETOUR_EXPERIENCE
  ANALYTIQUE
  JOURNALISTIQUE
  PRATIQUE
  EXPERT
}

enum BlogDepth {
  COURTE
  MOYENNE
  LONGUE
  APPROFONDIE
}

enum BlogStructure {
  LINEAIRE
  MODULAIRE
  MIXTE
}

model BlogTopic {
  id                String            @id @default(cuid())
  slug              String            @unique
  cluster           BlogCluster
  persona           BlogPersona
  contentType       BlogContentType
  keyword           String
  secondaryKeywords String[]
  priority          Int               @default(100)
  pillarSlug        String?
  relatedSlugs      String[]
  naturodeskContext String            @db.Text
  status            BlogTopicStatus   @default(PLANNED)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  articles          BlogArticle[]
}

model BlogArticle {
  id                String             @id @default(cuid())
  topicId           String
  topic             BlogTopic          @relation(fields: [topicId], references: [id])
  locale            String             // "fr" | "en" — aligné sur i18n/request.ts, pas d'enum dupliqué
  title             String
  excerpt           String             @db.Text
  metaTitle         String
  metaDescription   String
  contentJson       Json               // quickAnswer, intro, sections[], blocks[], faq[], conclusion...
  heroImageUrl      String?            // dénormalisé depuis images[] pour accès rapide (listing, OG)
  images            Json               // [{ slot, url, visualFamily }]
  toneUsed          BlogTone
  depthUsed         BlogDepth
  structureUsed     BlogStructure
  blocksUsed        String[]           // clés du catalogue de blocs (lib/blog/editorial-dna.ts)
  qualityScore      Int
  status            BlogArticleStatus  @default(DRAFT)
  publishedAt        DateTime?
  generationLog     Json               // { errors: string[], warnings: string[] }
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  @@unique([topicId, locale])
}
```

Pas de table d'historique séparée pour l'anti-répétition : on interroge les 5 derniers `BlogArticle` (`locale = "fr"`, triés par `publishedAt desc`) et on lit leurs champs `toneUsed`/`depthUsed`/`structureUsed`/`blocksUsed` pour pondérer le tirage suivant.

`pillarSlug` et `relatedSlugs` sont des références **souples** (chaînes de caractères, pas de clé étrangère) vers `BlogTopic.slug` — un lien vers un slug inexistant ou pas encore publié est simplement ignoré au rendu, jamais une erreur bloquante.

## 5. Charte éditoriale

### 5.1 Personas & clusters (6)

Répartition 50/50 entre les deux publics.

| Cluster | Persona dominant | Poids éditorial |
|---|---|---|
| `INSTALLATION` — lancer son cabinet (statut, business plan, premier local) | INSTALLATION | 15% |
| `REGLEMENTATION_JURIDIQUE` — cadre légal, assurance RC pro, déontologie | INSTALLATION | 10% |
| `ACQUISITION_CLIENTELE` — trouver et convertir des clients | CROISSANCE | 20% |
| `COMMUNICATION_VISIBILITE` — se faire connaître (réseaux, SEO local, bouche-à-oreille) | LES_DEUX | 20% |
| `GESTION_OUTILS` — organiser son cabinet, outils numériques | LES_DEUX | 20% |
| `DEVELOPPEMENT_ACTIVITE` — tarifs, offres, fidélisation, diversification | CROISSANCE | 15% |

Un article sur 8 est un contenu de type `PREUVE` (comparatif d'outils de gestion, étude de cas chiffrée, benchmark tarifaire), rattaché en priorité à `GESTION_OUTILS` ou `DEVELOPPEMENT_ACTIVITE`.

Ces poids s'appliquent **au moment du seed** (§10) : ils déterminent combien de `BlogTopic` de chaque cluster sont créés initialement. La sélection du sujet à chaque run du pipeline (§6, étape 2) ne repondère pas dynamiquement par cluster — elle suit simplement l'ordre de `priority` en excluant les clusters des 2 derniers articles publiés, ce qui suffit à respecter la répartition dans la durée puisqu'elle est déjà reflétée dans le volume de topics seedés par cluster.

### 5.2 Tons (6, pondérés par cluster)

Pédagogique · Retour d'expérience/narratif · Analytique (chiffres, données du secteur) · Journalistique (tendances métier) · Pratique/actionnable (check-list) · Expert (avis tranché).

### 5.3 Profondeurs (4) & structures (3)

`COURTE` (600-900 mots) / `MOYENNE` (900-1400) / `LONGUE` (1400-2000) / `APPROFONDIE` (2000-2800), pondérées par `contentType` (guide→longue, tutoriel→moyenne, comparatif→longue, preuve→approfondie). Structure `LINEAIRE` / `MODULAIRE` / `MIXTE`, pondérée par le ton tiré.

### 5.4 Blocs de contenu optionnels (11 au total, 2 à 4 tirés par article)

`comparisonTable` (statuts juridiques, outils, canaux d'acquisition), `faq` (4-6 Q/R), `checklist` (8-12 items), `planAction` (plan sur X jours), `caseStudy` (portrait/témoignage type de naturopathe, toujours anonymisé/fictif), `keyTakeaways`, `sources`, `timeline` (ex : étapes d'installation sur 6 mois), `quote`, `expertFocus` (zoom réglementaire/déontologique), `commonMistakes`.

### 5.5 Familles visuelles (16 = 10 "interface" + 6 génériques)

Les familles "interface" montrent des mockups d'écrans NaturoDesk (agenda, dossier patient, facturation, bilan de vitalité, page web thérapeute, protocoles, consultations, dashboard, paramètres, vue mobile) dans la palette nd-sage/nd-cream. Les familles génériques : photo de cabinet/plantes, portrait professionnel, illustration botanique, ambiance bien-être, iconographie schématique, infographie chiffrée. Le cluster `GESTION_OUTILS` pioche surtout dans les familles "interface" ; les autres clusters privilégient les génériques.

### 5.6 Garde-fous de langage

Table de remplacement automatique (regex, filet de sécurité) sur deux axes :
- **Marketing** — pas de "garanti", "doublez vos revenus en 1 mois" → reformulé en "peut contribuer à", "dans certains cas".
- **Réglementaire/déontologique, spécifique naturopathie** — la naturopathie n'étant pas une profession médicale réglementée en France, tout contenu (y compris les exemples et témoignages fictifs générés) bannit "guérit", "soigne", "traite", "diagnostic" et reste sur le registre de l'accompagnement/bien-être.

### 5.7 Bloc GEO obligatoire & contrat structurel

Chaque article contient un H2 "Réponse rapide" (`quickAnswer`, 40-80 mots, pensé pour être cité par les IA/moteurs de recherche génératifs), `title` ≤70 caractères, `metaDescription` 145-160 caractères, intro 150-200 mots, 3-5 sections H2, un "élément concret" obligatoire (exemple chiffré, retour d'expérience), un paragraphe `naturodeskContext` de 80-120 mots qui doit citer littéralement "NaturoDesk", conclusion 80-120 mots.

**Score qualité** 0-100 (pondération des critères ci-dessus + absence de vocabulaire proscrit), seuil de publication **80**. En dessous, l'article passe en `REVIEW_REQUIRED` et le pipeline s'arrête à cette étape pour cette locale.

### 5.8 Maillage interne

Au moins 2 liens obligatoires (mention de la marque → page d'accueil ou `/tarifs`, bouton CTA → `/register` ou `/tarifs`), un lien vers l'article pilier du cluster (`pillarSlug`), 1 à 4 liens vers d'autres articles publiés du même cluster.

## 6. Pipeline de génération

Exécuté par `app/api/cron/generate-blog-article`, rejouable manuellement depuis l'admin ("Générer maintenant"). Toute erreur non gérée à une étape place le `BlogTopic` en `FAILED` avec le message d'erreur enregistré, déclenche un email d'alerte admin (`lib/email/index.ts`), et le cron se termine proprement — jamais de crash silencieux, jamais de publication à moitié faite.

1. **Kill switch** — si `BLOG_AUTOPUBLISH_ENABLED=false`, sortie immédiate.
2. **Sélection du sujet** — prochain `BlogTopic` `status=PLANNED` trié par `priority`, en excluant les clusters utilisés dans les 2 derniers articles publiés. Détermine si ce run est un slot `PREUVE` (compteur d'articles publiés depuis le dernier contenu de preuve).
3. **Composition de l'Editorial DNA** — tirage pondéré (ton, profondeur, structure, 2-4 blocs, famille(s) visuelle(s)) en pénalisant ce qui a été utilisé dans les 5 derniers articles FR publiés (anti-répétition).
4. **Génération du texte FR** — un appel OpenAI (modèle configurable via `OPENAI_BLOG_TEXT_MODEL`), réponse JSON strict. Le prompt système embarque la charte éditoriale complète (§5), le contrat structurel, les instructions du ton/structure/blocs tirés, le `naturodeskContext` du topic, et les candidats de maillage interne (topics pilier/cluster déjà publiés).
5. **Validation & score qualité** — remplacement automatique des formulations interdites, vérification des contraintes structurelles, calcul du score. Si score < 80 → `REVIEW_REQUIRED`, arrêt du pipeline pour cet article (pas de version EN, pas d'images).
6. **Adaptation EN** — un second appel OpenAI qui prend le JSON FR validé et produit une adaptation anglaise (reformulée naturellement, pas une traduction littérale), même structure de blocs. Score qualité recalculé sur la version EN avec le même seuil.
7. **Génération des images** — pour chaque emplacement du plan DNA (hero + 1-3 inline selon la profondeur), prompt construit à partir du template de la famille visuelle tirée + mot-clé + charte visuelle NaturoDesk (palette nd-sage/nd-cream, style éditorial SaaS soigné). Appel OpenAI images (`OPENAI_BLOG_IMAGE_MODEL`, défaut `gpt-image-1`), redimensionnement/recadrage via `sharp` (1200×630 pour le hero), upload vers le bucket Supabase Storage public `blog-images` (`<slug>/<emplacement>.webp`). **Fallback automatique** vers un SVG de secours (template paramétré, palette nd-sage) si l'API échoue ou si la clé est absente — le pipeline ne bloque jamais sur les images.
8. **Sauvegarde** — écriture des deux lignes `BlogArticle` (fr + en), statut `PUBLISHED` (ou `REVIEW_REQUIRED` si une des deux locales n'a pas passé le score), `publishedAt=now`, mise à jour de `BlogTopic.status`, `generationLog` renseigné pour traçabilité en admin.

## 7. Intégration au site public

- **`app/(marketing)/blog/page.tsx`** remplace le placeholder actuel : requête `BlogArticle` où `locale=<cookie NEXT_LOCALE>` et `status=PUBLISHED`, jointure `BlogTopic` pour le cluster, pagination (12 par page). Les catégories affichées correspondent aux 6 clusters réels + "Toutes" (remplace les labels provisoires `practice/software/naturopathy/business`).
- **`app/(marketing)/blog/[slug]/page.tsx`** récupère le `BlogTopic` par slug puis le `BlogArticle` de la locale courante ; `notFound()` si absent. Rendu : image hero, titre, callout "Réponse rapide", sections, blocs dynamiques (un composant par type sous `components/blog/article-blocks/`), FAQ en accordéon (`components/ui/accordion.tsx`), bandeau CTA vers `/tarifs` ou `/register`, articles liés (pilier/cluster/`relatedSlugs`, même locale). `generateMetadata` à partir de `metaTitle`/`metaDescription`/`heroImageUrl`, JSON-LD `Article` (schema.org).

## 8. Back-office admin

`app/(admin)/admin/blog/page.tsx`, sur le modèle des sections admin existantes (`AdminShell`, tables type `AdminUsersTable`) :
- Table listant les topics/articles : titre, cluster, badges de locale (FR/EN) avec leur statut respectif, score qualité, date de publication.
- Filtres par statut (`REVIEW_REQUIRED` mis en avant — c'est la file d'attente à traiter) et par cluster.
- Actions via Server Actions (`lib/actions/admin/blog.ts`, pattern `.bind(null, id)` + `useActionState`, cohérent avec le reste de l'admin) : Publier/Dépublier, Régénérer les images (ne rejoue que l'étape 7), Générer maintenant (force le prochain topic `PLANNED` sans attendre le cron), Supprimer.
- Pas d'éditeur de texte riche : si un article ne convient pas, on le dépublie et on régénère plutôt que de l'éditer à la main (scope volontairement réduit, cf. §12).

## 9. Cron, infra, variables d'environnement & coûts

- **Déclenchement** : `vercel.json`, cron `0 7 * * 1,3,5` (UTC, ≈ 8h-9h Paris selon l'heure d'été) → `/api/cron/generate-blog-article`. Vercel ajoute automatiquement l'en-tête `Authorization: Bearer $CRON_SECRET` sur les appels cron dès que la variable est définie ; la route se contente de vérifier ce header.
- **Nouvelles variables d'environnement** : `CRON_SECRET`, `BLOG_AUTOPUBLISH_ENABLED` (`true` par défaut), `OPENAI_BLOG_TEXT_MODEL`, `OPENAI_BLOG_IMAGE_MODEL` (défaut `gpt-image-1`). Le bucket Supabase Storage `blog-images` (lecture publique) est créé une fois, sans variable dédiée.
- **Coûts/volumétrie** : par run, 2 appels texte (génération FR + adaptation EN) + jusqu'à 4 appels image ; à 3 runs/semaine ≈ 24-36 appels texte et ~48 appels image par mois. Pas de plafond budgétaire automatisé en v1 — à surveiller via le dashboard OpenAI.
- **Alerte d'échec** : email admin (`lib/email/index.ts`) si un topic passe `FAILED`, et avertissement préventif si moins de 5 `BlogTopic` restent `PLANNED` (le calendrier n'est pas auto-régénéré, cf. §12).

## 10. Amorçage du calendrier éditorial

Script one-off `scripts/seed-blog-topics.ts` qui peuple ~30-40 `BlogTopic` initiaux répartis selon les poids du §5.1, statut `PLANNED`. Exemples représentatifs qui seront présents dans le seed (liste indicative, complétée lors de l'implémentation) :

- *INSTALLATION* : "Comment ouvrir son cabinet de naturopathie : les étapes clés", "Quel statut juridique choisir pour démarrer en naturopathie ?", "Budget de départ : combien coûte l'installation d'un cabinet de naturopathe ?"
- *REGLEMENTATION_JURIDIQUE* : "Naturopathe et RC Pro : quelle assurance choisir ?", "Ce que dit la loi française sur l'exercice de la naturopathie"
- *ACQUISITION_CLIENTELE* : "Comment obtenir ses premiers clients en tant que naturopathe ?", "5 canaux pour trouver des clients en naturopathie sans y passer tout son temps"
- *COMMUNICATION_VISIBILITE* : "Comment se faire connaître comme naturopathe en local ?", "Réseaux sociaux pour naturopathe : lesquels choisir en priorité ?"
- *GESTION_OUTILS* : "Quels outils de gestion pour un cabinet de naturopathie ?", "Agenda, facturation, dossiers patients : centraliser sa gestion de cabinet"
- *DEVELOPPEMENT_ACTIVITE* : "Comment fixer ses tarifs de consultation en naturopathie ?", "Fidéliser sa patientèle : les bonnes pratiques pour un naturopathe"

## 11. Décisions validées (résumé)

- Génération 100% automatique (cron), pas de validation humaine bloquante avant publication — seul le score qualité < 80 bloque.
- Stockage en base de données (Prisma), pas de fichiers commités en git.
- Cadence : 3 articles/semaine (Lun/Mer/Ven).
- Modèle texte et images : OpenAI (réutilise `OPENAI_API_KEY` déjà configurée).
- Diversité éditoriale : réplique complète du système SelfHook (6 tons, 4 profondeurs, 3 structures, 11 blocs, 16 familles visuelles), adaptée à la thématique business-naturopathie.
- Audience : 50/50 entre naturopathes en installation et naturopathes déjà en activité cherchant à développer.
- Bilingue FR/EN, un seul slug par sujet (pas de préfixe d'URL par locale, cohérent avec l'i18n existante).
- Back-office admin dédié pour superviser (pas seulement Prisma Studio).
- Charte éditoriale en code TypeScript versionné (pas en base).
- Déclenchement via Vercel Cron (pas GitHub Actions).

## 12. Hors scope / limites connues

- Pas d'éditeur de texte riche en admin pour corriger un article généré — on dépublie et régénère.
- Le calendrier éditorial n'est pas auto-étendu par l'IA : une fois les ~30-40 sujets initiaux épuisés, il faut en ajouter manuellement (alerte email préventive en dessous de 5 sujets `PLANNED`).
- Pas de plafond de budget IA automatisé — surveillance manuelle via le dashboard OpenAI dans un premier temps.
- Pas de flux RSS, pas de commentaires publics, pas de multi-auteurs.
- Le contenu français est la source de vérité ; la version anglaise est une adaptation dérivée, jamais rédigée nativement.
- Rien du système "client WordPress" de SelfHook (n8n, `EditorialBrief`, publication sur des sites tiers) n'est repris — hors sujet pour NaturoDesk.
