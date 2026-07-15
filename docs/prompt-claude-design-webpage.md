# Prompt — Claude Design : Refonte template page web thérapeute NaturoDesk

---

## Contexte du projet

NaturoDesk est un SaaS de gestion de cabinet pour naturopathes et thérapeutes bien-être. Parmi ses fonctionnalités, chaque thérapeute peut créer sa **page web professionnelle publique** — une mini-vitrine en ligne partageable avec ses patients.

Je dois refondre le **template visuel** de cette page. L'objectif est de passer d'un rendu fonctionnel mais plat à une page visuellement attractive, chaleureuse et professionnelle, cohérente avec l'univers du bien-être naturel.

---

## Ce que je veux que tu fasses

Crée le **design complet** de la page web publique du thérapeute, sous la forme d'une maquette haute-fidélité (ou d'une proposition de code HTML/CSS si tu génères du code). Je veux voir :

1. La **version desktop** (1280px) et la **version mobile** (390px)
2. **Toutes les sections** de la page (détaillées ci-dessous)
3. **Deux variantes de hero** : avec image photographique + avec dégradé couleur seul
4. Le **pickerr d'image** dans le dashboard (formulaire d'édition) — composant à part

---

## Structure de la page (dans l'ordre)

### 1. HERO — En-tête plein-largeur

**Contenu à afficher :**
- Nom du cabinet (ex : "Cabinet Bien-Être Marie Dupont") — titre h1
- Bio courte optionnelle (ex : "Naturopathe certifiée · Paris 11e") — sous-titre
- Logo optionnel en haut à gauche

**Comportement visuel :**
- **Version A — avec image photo** : image de fond en cover full-bleed (photos nature/bien-être : plantes, forêt, lumière douce, galets zen…). Un overlay de couleur semi-transparent (la teinte choisie par le thérapeute) vient par-dessus l'image pour garantir la lisibilité du texte blanc. Le texte est blanc.
- **Version B — sans image** : dégradé couleur uni dans la teinte choisie. Le texte est blanc.
- Hauteur : ~360px desktop, ~260px mobile
- Le logo, s'il existe, est un cercle ou rectangle arrondi en haut, bien détaché du bord

**Palette couleur du thème (le thérapeute choisit parmi 10) :**
Le système de couleur est basé sur ces teintes principales :
- Teal (vert-bleu profond)
- Forest (vert forêt)
- Sage (vert sauge doux)
- Ocean (bleu océan)
- Terracotta (terre cuite)
- Lavande (violet doux)
- Charcoal (gris ardoise)
- Olive (kaki doré)
- Rose (vieux rose)
- Indigo (bleu nuit)

---

### 2. QUI SUIS-JE — Section présentation

**Contenu :** Texte long (jusqu'à 3000 caractères) décrivant l'approche thérapeutique, le parcours, les spécialités.

**Design demandé :**
- Section avec fond légèrement teinté dans la couleur du thème (très atténué, type `opacity-10`)
- Titre "Qui suis-je" bien marqué, avec une ligne décorative ou un accent couleur
- Texte en prose, bonne lisibilité (interlignage généreux, `leading-relaxed`)
- Option desktop : layout 2 colonnes — une image décorative (même image que le hero, ou image de nature) à gauche, texte à droite

---

### 3. MES PRESTATIONS — Cards de services

**Contenu :** Liste de prestations avec nom, description optionnelle, durée (minutes), prix (€).

**Design demandé :**
- Cards blanches, ombre légère (`shadow-sm`), coins arrondis (`rounded-xl`)
- Au hover : légère élévation (`shadow-md`, légère translation `translateY(-2px)`)
- Layout : 1 colonne mobile, grille 2 colonnes desktop si > 2 prestations
- Chaque card :
  - **En-tête** : nom en gras, description en gris
  - **Badges en bas à droite** : durée (icône horloge + "60 min") et prix (icône € + "75,00 €") dans des badges arrondis couleur thème
- Texte libre complémentaire sous les cards (conditions, modalités) en italique gris

---

### 4. TARIFS — Texte libre

**Contenu :** Texte libre (ex : "Bilan initial 90 € · Suivi 60 €")

**Design demandé :**
- Section minimaliste, fond blanc
- Le texte en grande taille (`text-lg`) centré, ou en liste avec points décoratifs couleur thème
- Ou alternative : une bannière horizontale sobre avec fond couleur thème très clair

---

### 5. PRENDRE RENDEZ-VOUS — Widget de réservation

**Contenu :** Widget interactif multi-étapes (sélection prestation → sélection créneau → formulaire → confirmation).

**Design demandé :**
- Encadré bien distinct du reste (`rounded-2xl`, border couleur thème, léger fond)
- Titre "Prendre rendez-vous" avec icône calendrier couleur thème
- Si la réservation n'est pas encore configurée : un message d'invitation doux avec CTA "Me contacter"

---

### 6. COORDONNÉES — Contact

**Contenu :** Adresse cabinet, téléphone, email de contact.

**Design demandé :**
- **Option préférée** : section avec fond couleur thème (version sombre, texte blanc) — cela crée un point d'ancrage visuel fort
- Icônes blanches (MapPin, Phone, Mail)
- Les liens téléphone et email sont cliquables
- Largeur plein-fond (pas de `max-w` sur cette section), puis contenu centré à l'intérieur

---

### 7. RÉSEAUX SOCIAUX — Liens

**Contenu :** Liens Instagram, Facebook, LinkedIn, Site web.

**Design demandé :**
- Boutons "pill" (`rounded-full`) avec icône + label
- Fond blanc, border fine, ombre légère
- Au hover : border couleur thème, icône couleur thème
- Disposition flex wrap, centrée

---

### 8. ME CONTACTER — Formulaire

**Contenu :** Formulaire nom, email, message + bouton "Envoyer".

**Design demandé :**
- Fond légèrement teinté (couleur thème, très clair)
- Champs avec border fine et focus ring couleur thème
- Bouton CTA en couleur thème, full-width sur mobile
- Message de confirmation discret sous le formulaire après envoi

---

### 9. FOOTER

**Contenu :** Nom du cabinet à gauche, "Propulsé par NaturoDesk" à droite.

**Design demandé :**
- Fond couleur thème très atténué (quasi blanc)
- Séparateur haut en border-top
- Texte petit, gris
- "NaturoDesk" avec une petite feuille ou icône brand

---

## Composant additionnel : Image Picker (dans le dashboard d'édition)

Dans le formulaire de configuration de la page (dashboard `/webpage`), ajouter un composant de sélection d'image hero.

**Design demandé :**
- Grille 5 colonnes × 2 lignes de vignettes
- Chaque vignette : `~120×80px`, `rounded-lg`, `object-cover`, fit "cover"
- État non-sélectionné : border transparente, légère opacité
- État sélectionné : border 2px couleur teal, ring offset, légère élévation
- Au hover : élévation légère, bordure apparaît
- Option supplémentaire "Aucune image" (vignette avec fond dégradé et icône palette) — permet de revenir au mode couleur seule
- Label en dessous de chaque vignette (ex : "Plantes", "Forêt", "Zenitude"…)

**Les 10 images du picker (thèmes à illustrer) :**

| Vignette | Label FR | Description visuelle |
|---|---|---|
| `herbs` | Plantes | Herbes aromatiques, lumière naturelle dorée, fond bois |
| `forest` | Forêt | Sous-bois vert émeraude, rayons de lumière entre les arbres |
| `stones` | Zenitude | Galets empilés, eau claire, ambiance spa |
| `hands` | Soin | Mains ouvertes, peau douce, lumière chaude latérale |
| `flowers` | Fleurs | Fleurs blanches ou crème, fond épuré, douceur |
| `yoga` | Méditation | Silhouette yoga au lever du soleil, horizon dégagé |
| `bowl` | Bien-être | Bol chantant tibétain, cristaux, fond textured sombre |
| `coast` | Sérénité | Mer calme, brume matinale, palette bleue-grise |
| `harvest` | Nature | Graines, épices, textures organiques en flat lay |
| `light` | Lumière | Bokeh de lumière chaude, abstrait, très doux |

---

## Direction artistique générale

- **Univers** : bien-être naturel, thérapies douces, naturopathie — chaleureux, organique, apaisant
- **Pas de** : designs hi-tech, gradients néon, angles acérés, typographies ultra-condensées
- **Typographie** : sans-serif humaniste (type Inter, Plus Jakarta Sans ou similaire) — lisible, doux
- **Couleurs de base** : fond `#FAFAF8` (blanc légèrement ivoire), texte `#0f172a` (slate-900), gris secondaires en slate
- **Espacement** : généreux — `padding` élevé dans les sections, `gap` entre éléments
- **Coins** : tous arrondis (`rounded-xl` à `rounded-2xl`) — jamais de coins vifs
- **Ombres** : douces et légères — jamais de drop shadows lourdes
- **Animations** : transitions légères au hover (200ms ease), pas d'animations intempestives

---

## Références visuelles d'inspiration

Des sites avec un rendu similaire à viser :

- Pages de thérapeutes sur **Practice Better** ou **Healthie**
- Templates Squarespace catégorie "Health & Wellness"
- Pages de naturopathes sur **Wix** dans les templates "Organic"
- L'esthétique de **Notion** (propre, aéré) + la chaleur de **Goop** (ivoire, organique)

---

## Livrable attendu

- Maquette haute-fidélité de la page complète (desktop 1280px + mobile 390px)
- Zoom sur le composant Image Picker (dashboard)
- Variante du hero avec image vs sans image (dégradé couleur)
- Annotations des espacements, couleurs et états hover si possible

---

*Projet NaturoDesk — SaaS naturopathie — Stack : Next.js 15, Tailwind CSS v4*
