# Brief design — Refonte du template de page web thérapeute

> **Destinataire :** Claude (IA de développement)
> **Projet :** NaturoDesk — feature "Ma page web"
> **Objectif :** Refondre le template de la page publique du thérapeute (`app/p/[slug]/page.tsx`) pour le rendre visuellement attractif et professionnel, et ajouter un système de sélection d'image hero/illustration.

---

## 1. État actuel — structure de la page

La page publique (`app/p/[slug]/page.tsx`) est un Server Component Next.js 15 (App Router). Elle est accessible à `/p/[slug]` et `/p/[slug]?preview=1` pour l'aperçu propriétaire.

### Sections dans l'ordre d'affichage

| Section | Condition d'affichage | Contenu actuel |
|---|---|---|
| **Bandeau preview** | `preview === "1"` | Bande amber sticky en haut |
| **Hero (header)** | Toujours | Dégradé couleur + nom du cabinet + bio courte optionnelle |
| **Qui suis-je** | `bio` ou `presentation` non null | Texte libre, prose |
| **Mes prestations** | Services DB ou `servicesDisplay` | Cards durée/prix + texte libre |
| **Tarifs** | `pricingDisplay` non null | Texte libre |
| **Prendre rendez-vous** | `appointmentEnabled` | Widget multi-étapes (Client Component) |
| **Coordonnées** | Adresse/téléphone/email non null | Liste avec icônes |
| **Réseaux sociaux** | Au moins 1 lien social | Boutons avec icônes |
| **Me contacter** | `contactFormEnabled` | Formulaire de contact (Client Component) |
| **Footer** | Toujours | Nom du cabinet + "Propulsé par NaturoDesk" |

### Données disponibles (champs Prisma `TherapistWebPage`)

```typescript
{
  heroThemeId: number;       // 1–10 → palette couleur du hero
  heroImageId: string | null;  // NOUVEAU — identifiant de l'image hero (à créer)
  logoUrl: string | null;
  bio: string | null;          // courte, max 500 chars — affichée dans le hero
  presentation: string | null; // longue, max 3000 chars — section "Qui suis-je"
  servicesDisplay: string | null;
  pricingDisplay: string | null;
  address: string | null;
  phone: string | null;
  contactEmail: string | null;
  socialLinks: Record<string, string> | null; // { instagram, facebook, linkedin, website }
  seoTitle: string | null;
  seoDescription: string | null;
  contactFormEnabled: boolean;
  appointmentEnabled: boolean;
}
```

### Problèmes visuels actuels

1. **Hero trop plat** — uniquement un dégradé couleur uni, sans texture ni image. Rendu "brochure corporate" au lieu de "thérapeute bien-être".
2. **Manque de hiérarchie visuelle** — toutes les sections se ressemblent (h2 + texte sous fond blanc), aucun rythme.
3. **Cards de prestations ternes** — fond légèrement coloré mais sans caractère.
4. **Aucune image** — une page de thérapeute/naturopathe a besoin d'images inspirantes (nature, plantes, lumière naturelle).
5. **Max-width trop étroit** (`max-w-3xl`) — peut être élargi à `max-w-4xl` pour respirer davantage sur desktop.

---

## 2. Nouvelle fonctionnalité — Sélection d'image hero

### Concept

Remplacer (ou superposer) le fond dégradé couleur uni par une **image photographique**. Le thérapeute choisit parmi **10 visuels curatés** proposés par NaturoDesk dans le dashboard (`/webpage`).

L'image est affichée en **cover background** dans la section hero, avec un overlay de la couleur du thème sélectionné (opacité ~60%) pour garantir la lisibilité du texte blanc.

### Les 10 images à intégrer

Télécharger ces images depuis Unsplash (licence libre) et les placer dans `/public/images/page-heroes/` :

| ID | Thème | Recherche Unsplash suggérée |
|---|---|---|
| `herbs` | Plantes médicinales | "herbal plants natural light flat lay" |
| `forest` | Forêt lumineuse | "forest light green nature serene" |
| `stones` | Galets zen / spa | "zen stones water spa wellness" |
| `hands` | Soins / mains | "natural healing hands warm light" |
| `flowers` | Fleurs blanches | "white flowers soft light minimal" |
| `yoga` | Yoga / méditation | "yoga meditation sunrise golden hour" |
| `bowl` | Bol chantant / cristaux | "singing bowl crystals holistic" |
| `coast` | Côte / mer calme | "calm sea coast morning mist" |
| `harvest` | Récolte / graines | "seeds grains harvest natural texture" |
| `light` | Lumière abstraite | "soft light bokeh warm abstract" |

Nommage des fichiers : `herbs.jpg`, `forest.jpg`, `stones.jpg`, `hands.jpg`, `flowers.jpg`, `yoga.jpg`, `bowl.jpg`, `coast.jpg`, `harvest.jpg`, `light.jpg`  
Dimensions recommandées : **1600×600px minimum**, format paysage, optimisées (< 200 Ko avec `next/image` ou squoosh.app).

### Rendu hero avec image

```
┌─────────────────────────────────────────────┐
│  [Image cover, bleed full-width]            │
│  + overlay couleur thème (opacity-60)       │
│                                             │
│  [Logo optionnel]                           │
│  Nom du cabinet     ← blanc, bold           │
│  Bio courte         ← blanc, opacity-90     │
│                                             │
└─────────────────────────────────────────────┘
```

Si aucune image choisie → fallback sur le dégradé couleur actuel (comportement existant préservé).

---

## 3. Modifications de schéma Prisma

Ajouter un champ `heroImageId` à `TherapistWebPage` :

```prisma
model TherapistWebPage {
  // ... champs existants
  heroImageId  String?   // ex: "herbs", "forest", etc. — null = dégradé couleur
}
```

Migration Prisma à créer.

---

## 4. Modifications du formulaire dashboard (`/webpage`)

### Nouveau composant `HeroImagePicker`

Insérer **après** le `ThemePicker` (couleur) dans la section "Identité & présentation" :

```
┌─ Identité & présentation ──────────────────────────────────────────┐
│                                                                     │
│  Thème couleur : [● Teal] [○ Forest] [○ Sage] ...                 │
│                                                                     │
│  Image d'illustration :                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │herbs │ │forest│ │stones│ │hands │ │flower│  → ligne 1          │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │yoga  │ │bowl  │ │coast │ │harv. │ │light │  → ligne 2          │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                    │
│  [Aucune image — utiliser la couleur seule]                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Chaque vignette :
- `80×52px`, `rounded-lg`, `object-cover`
- Border 2px transparente, sélectionnée → border teal + ring
- Hover → légère élévation (shadow-md)

`<input type="hidden" name="heroImageId" value={selectedImageId ?? ""} />`

### Champ Zod à ajouter (`lib/validators/webpage.ts`)

```typescript
heroImageId: z
  .string()
  .max(20)
  .optional()
  .transform((v) => v || null),
```

### Champ dans `saveWebPageAction` (`lib/actions/webpage.ts`)

```typescript
heroImageId: get("heroImageId"),
```

---

## 5. Refonte visuelle de la page publique

### 5.1 Hero — avec image

```tsx
<header className="relative overflow-hidden min-h-[340px] flex items-end">
  {/* Image de fond */}
  {page.heroImageId && (
    <Image
      src={`/images/page-heroes/${page.heroImageId}.jpg`}
      alt=""
      fill
      className="object-cover"
      priority
    />
  )}
  {/* Overlay couleur */}
  <div className={`absolute inset-0 bg-gradient-to-br ${theme.heroGradient} opacity-70`} />
  {/* Contenu */}
  <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 sm:py-20 w-full">
    {page.logoUrl && <img ... />}
    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{displayName}</h1>
    {page.bio && <p className="mt-3 text-lg text-white/90 max-w-xl">{page.bio}</p>}
  </div>
</header>
```

### 5.2 Structure générale

- Passer de `max-w-3xl` à `max-w-4xl` pour le contenu principal
- Ajouter un fond légèrement teinté `bg-slate-50` sur toute la page (au lieu de blanc pur)
- Espacements verticaux `space-y-20` (au lieu de `space-y-16`)

### 5.3 Section "Qui suis-je" — amélioration visuelle

Option A — avec image décorative latérale sur desktop (2 colonnes) :
```
┌──────────────────────────────────────────────────────┐
│  Qui suis-je                                          │
│  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │  Image illustrative │  │  Texte de présentation │ │
│  │  (même img hero     │  │  long                  │ │
│  │  ou image choisie)  │  │                        │ │
│  └─────────────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

Option B (plus simple) — titre avec ligne décorative couleur thème + fond léger :
```tsx
<section className={`rounded-2xl ${theme.accentBg} px-8 py-10`}>
  <h2 className={`text-2xl font-semibold ${theme.accentText} mb-4`}>Qui suis-je</h2>
  <p className="text-slate-700 leading-relaxed">{page.presentation}</p>
</section>
```

### 5.4 Cards de prestations — amélioration

Remplacer les cards plates par des cards avec icône et meilleur contraste :

```
┌─────────────────────────────────────────────┐
│  [🌿 icône ou emoji selon le type]           │
│  Nom de la prestation      60 min  |  75 €   │
│  Description optionnelle                     │
└─────────────────────────────────────────────┘
```

- Fond blanc, ombre légère `shadow-sm hover:shadow-md`
- Coin durée/prix avec badge coloré (couleur thème)
- Transition au hover

### 5.5 Section contact — bannière plein-fond

Au lieu d'une liste austère, une section avec fond sombre (couleur hero) :

```
┌─────────────────────────────────────────────────┐
│  [couleur thème hero, texte blanc]              │
│  Me retrouver                                   │
│                                                 │
│  📍 12 rue des Lilas, Paris                     │
│  📞 06 00 00 00 00                              │
│  ✉️  contact@cabinet.fr                         │
└─────────────────────────────────────────────────┘
```

### 5.6 Boutons réseaux sociaux — style pill

```tsx
<a className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 
              text-sm font-medium text-slate-700 shadow-sm hover:shadow-md transition-all
              hover:border-[theme-accent] hover:text-[theme-accent]">
```

### 5.7 Footer — identité renforcée

```
┌─────────────────────────────────────────────────┐
│  [Fond couleur thème très atténué bg-opacity-10]│
│  Nom du cabinet                                 │
│                         Propulsé par NaturoDesk │
└─────────────────────────────────────────────────┘
```

---

## 6. Fichiers à modifier

| Fichier | Modification |
|---|---|
| `prisma/schema.prisma` | Ajouter `heroImageId String?` à `TherapistWebPage` |
| `lib/validators/webpage.ts` | Ajouter `heroImageId` au `WebPageFormSchema` |
| `lib/actions/webpage.ts` | Passer `heroImageId` dans `get()` + `rest` |
| `components/webpage/webpage-form.tsx` | Ajouter `HeroImagePicker` + state `heroImageId` |
| `app/(dashboard)/webpage/page.tsx` | Passer `heroImageId` dans `formDefaults` |
| `app/p/[slug]/page.tsx` | Refonte visuelle complète + support `heroImageId` |
| `/public/images/page-heroes/*.jpg` | 10 images à télécharger et optimiser |

---

## 7. Contraintes techniques à respecter

- **Next.js 15 App Router** — la page publique est un Server Component pur (pas de `"use client"`)
- **Prisma 5** — pas de Prisma 6
- **Tailwind CSS v4** — via `@theme inline` dans `globals.css`, tokens `nd-*` disponibles
- **next/image** pour les images hero (optimisation automatique)
- **TypeScript strict** — pas de `any`
- **i18n** — la page publique n'est pas internationalisée (textes hardcodés FR) ; le dashboard est i18n (fr/en)
- **Pas de dépendances nouvelles** — uniquement ce qui est déjà installé

---

## 8. Priorité d'implémentation

1. **P0** — Schéma Prisma + migration + `HeroImagePicker` dans le dashboard + hero avec image
2. **P1** — Refonte visuelle sections (cards prestations, contact, footer)
3. **P2** — Layout 2 colonnes "Qui suis-je" sur desktop

Commencer par P0 pour débloquer la valeur principale (image dans le hero). Les améliorations P1/P2 peuvent être une seconde passe.
