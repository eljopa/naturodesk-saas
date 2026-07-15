# NaturoDesk — Dashboard Home · Brief de redesign pour v0.dev

## Contexte produit

NaturoDesk est un SaaS de gestion de cabinet pour naturopathes et thérapeutes holistiques. Le dashboard home est la première page vue après connexion. Elle donne une vue d'ensemble rapide de l'activité du cabinet.

---

## Design system — Couleurs & tokens

Toutes les couleurs sont définies comme variables CSS et classes Tailwind via `@theme inline`.

### Palette principale

| Token | Classe Tailwind | Hex | Usage |
|---|---|---|---|
| nd-sage | `bg-nd-sage` | `#799664` | Brand primary, boutons, accents actifs |
| nd-sage-deep | `text-nd-sage-deep` | `#5E7349` | Texte sur fond sage-tint, hover |
| nd-sage-soft | `bg-nd-sage-soft` | `#AAB59F` | Icônes secondaires |
| nd-sage-tint | `bg-nd-sage-tint` | `#E8EDE0` | Fond icône active, fond nav active |
| nd-sage-wash | `bg-nd-sage-wash` | `#F1F4EC` | Fond hover très léger |
| nd-cream | `bg-nd-cream` | `#FAF7F0` | Fond auth, hover nav |
| nd-cream-deep | `bg-nd-cream-deep` | `#F3ECDF` | Fond sidebar |
| nd-forest | `text-nd-forest` | `#3D4A33` | Texte sombre brand |
| nd-ink | `text-nd-ink` | `#2C3327` | Texte principal très sombre |
| nd-muted | `text-nd-muted` | `#74786C` | Labels de section nav, texte secondaire |
| nd-line | `border-nd-line` | `#E7E0D3` | Bordures principales |
| nd-line-soft | `border-nd-line-soft` | `#EFE9DD` | Séparateurs internes |
| nd-taupe | `text-nd-taupe` | `#92806E` | Texte tertiaire |
| nd-copper | `text-nd-copper` | `#B5895F` | Accents décoratifs |
| nd-sand | `bg-nd-sand` | `#E6D6C8` | Avatars, fond warm |

### Couleurs sémantiques (KPIs uniquement)

| Usage | Bg | Text |
|---|---|---|
| KPI Patients (teal/sage) | `bg-nd-sage-tint` | `text-nd-sage` |
| KPI Rendez-vous (blue) | `bg-blue-50` | `text-blue-600` |
| KPI Consultations (violet) | `bg-violet-50` | `text-violet-600` |
| KPI Factures (amber) | `bg-amber-50` | `text-amber-600` |

---

## Design system — Typographie

| Token | Police | Usage |
|---|---|---|
| `--font-sans` | Geist Sans | Corps de texte, labels, UI |
| `--font-serif` | Playfair Display | Titres décoratifs (pas utilisé dans le dashboard) |
| `--font-mono` | Geist Mono | Nombres, valeurs tabulaires |

Styles courants dans le dashboard :
- **Titre de page** : `text-2xl font-semibold text-slate-900 tracking-tight`
- **Sous-titre / date** : `text-sm text-slate-500`
- **Chiffre KPI** : `text-3xl font-bold text-slate-900 tabular-nums`
- **Label KPI** : `text-sm text-slate-500`
- **Titre de card** : `text-base font-semibold text-slate-900`
- **Texte item liste** : `text-sm font-medium text-slate-900`
- **Meta / timestamp** : `text-xs text-slate-400`

---

## Structure de la mise en page

```
┌────────────────────────────────────────────────────────┐
│  SIDEBAR (256px fixe, bg-nd-cream-deep)                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Logo NaturoDesk (PNG)                            │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Nav section sans titre :                         │  │
│  │   🏠 Tableau de bord                             │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ CABINET (label section)                          │  │
│  │   👥 Patients                                    │  │
│  │   📅 Rendez-vous                                 │  │
│  │   📄 Factures                                    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ CLINIQUE                                         │  │
│  │   📋 Consultations                               │  │
│  │   📜 Fiches conseil                              │  │
│  │   📖 Protocoles                                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ RESSOURCES                                       │  │
│  │   🗄️ Base de connaissances                       │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ WEB                                              │  │
│  │   🌐 Page web                                    │  │
│  │   📥 Messages  [badge numérique si non-lus]      │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ ⚙️ Paramètres  (bas de sidebar)                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ZONE PRINCIPALE                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ TOPBAR (h-16, sticky, bg-white, border-b)        │  │
│  │                      [FR/EN] [Avatar + Nom ▾]    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ MAIN CONTENT (px-4 py-6 lg:px-8 lg:py-8)        │  │
│  │                                                  │  │
│  │  Entête                                          │  │
│  │  ─────                                           │  │
│  │  "Bonjour, Marie ✦" (h1, 2xl semibold)          │  │
│  │  "Lundi 15 juin 2026" (sm, slate-500)            │  │
│  │                                                  │  │
│  │  KPIs  (grid 2 cols mobile / 4 cols desktop)     │  │
│  │  ──────                                          │  │
│  │  [Patients]  [Rendez-vous]  [Consult.]  [Fact.]  │  │
│  │                                                  │  │
│  │  Messages non lus (si > 0)                       │  │
│  │  ─────────────────                               │  │
│  │  Card avec liste de messages entrants            │  │
│  │                                                  │  │
│  │  Prochains rendez-vous                           │  │
│  │  ─────────────────────                           │  │
│  │  Card avec liste ou état vide                    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## Composants du contenu — Dashboard home

### 1. En-tête

```tsx
<div className="mb-8">
  <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
    Bonjour, Marie 👋
  </h1>
  <p className="text-sm text-slate-500 mt-1 capitalize">
    lundi 15 juin 2026
  </p>
</div>
```

### 2. KPI Cards (×4)

Grille `grid-cols-2 lg:grid-cols-4 gap-4`. Chaque card est cliquable (lien vers la section).

```tsx
// Anatomie d'une StatCard
<Card className="hover:border-slate-300 hover:shadow-md transition-all">
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      {/* Icône colorée */}
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-nd-sage-tint text-nd-sage">
        <Users className="w-5 h-5" />
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
    </div>
    <div className="mt-4">
      <p className="text-3xl font-bold text-slate-900 tabular-nums">42</p>
      <p className="text-sm text-slate-500 mt-1">Patients actifs</p>
    </div>
  </CardContent>
</Card>
```

**Les 4 KPIs :**
| # | Titre | Icône | Couleur fond | Couleur icône |
|---|---|---|---|---|
| 1 | Patients actifs | `Users` | `bg-nd-sage-tint` | `text-nd-sage` |
| 2 | Rendez-vous à venir | `Calendar` | `bg-blue-50` | `text-blue-600` |
| 3 | Consultations en cours | `ClipboardList` | `bg-violet-50` | `text-violet-600` |
| 4 | Factures brouillon | `FileText` | `bg-amber-50` | `text-amber-600` |

### 3. Messages non lus (conditionnel)

N'apparaît que si des messages sont non lus. Card avec :
- Header : titre + bouton "Voir tout" (variant secondary)
- Liste de messages séparés par `divide-y divide-slate-100`
- Chaque item : avatar circulaire `bg-nd-sage-tint` + icône `Mail`, nom expéditeur, email en gris, aperçu du message tronqué, date

### 4. Prochains rendez-vous

Card toujours présente :
- Header : titre + bouton "Voir tout"
- **Si liste vide** : état vide centré avec icône Calendar, titre, description, bouton "Nouveau rendez-vous" (variant primary, rounded-full)
- **Si liste non vide** : `divide-y divide-slate-100`, chaque item :
  - Icône `Clock` dans cercle `bg-nd-sage-tint`
  - Nom patient (sm, medium, slate-900)
  - Date/heure formatée (xs, slate-500)
  - Badge type : BILAN (default) ou SUIVI (info)
  - Badge "En ligne" (violet-100, violet-700, avec icône Globe) si réservation via page web

---

## Composants UI — Styles de référence

### Card
```css
bg-white rounded-2xl border border-nd-line shadow-sm
```

### Button primary
```css
bg-nd-sage text-white rounded-full hover:bg-nd-sage-deep
```

### Button secondary
```css
bg-nd-sage-tint text-nd-sage-deep rounded-full hover:bg-nd-sage-wash
```

### Badge "default" (BILAN)
```css
bg-nd-sage-tint text-nd-sage-deep text-xs font-semibold px-2 py-0.5 rounded-full
```

### Badge "info" (SUIVI)
```css
bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full
```

### Nav item actif (sidebar)
```css
bg-nd-sage-tint text-nd-sage-deep
```

### Nav item inactif
```css
text-slate-600 hover:bg-nd-cream hover:text-nd-forest
```

### Avatar utilisateur (topbar)
```css
w-8 h-8 rounded-full bg-nd-sage-tint text-nd-sage-deep text-sm font-semibold
/* Contient les 2 initiales du nom */
```

### Badge messages non lus (sidebar)
```css
bg-nd-sage text-white text-xs font-semibold px-1.5 py-0.5 rounded-full
```

---

## Données de démonstration (pour le mock)

```json
{
  "user": { "name": "Marie Dubois", "email": "marie@cabinet-naturel.fr" },
  "kpis": {
    "patients": 47,
    "appointments": 8,
    "consultations": 3,
    "invoices": 2
  },
  "unreadMessages": [
    {
      "sender": "Sophie Martin",
      "email": "sophie.m@email.fr",
      "preview": "Bonjour, je souhaiterais prendre rendez-vous pour un bilan naturopathique...",
      "date": "Aujourd'hui"
    },
    {
      "sender": "Lucas Bernard",
      "email": "lucas.b@email.fr",
      "preview": "Suite à notre consultation du mois dernier, j'ai une question concernant...",
      "date": "Hier"
    }
  ],
  "appointments": [
    { "patient": "Camille Rousseau", "type": "BILAN", "datetime": "mar. 16 juin, 09:00", "source": "manual" },
    { "patient": "Thomas Petit", "type": "SUIVI", "datetime": "mar. 16 juin, 11:30", "source": "online_booking" },
    { "patient": "Emma Leclerc", "type": "SUIVI", "datetime": "mer. 17 juin, 10:00", "source": "manual" },
    { "patient": "Julien Morin", "type": "BILAN", "datetime": "jeu. 18 juin, 14:00", "source": "online_booking" }
  ]
}
```

---

## Notes d'implémentation importantes

- **Stack** : Next.js 15 App Router, TypeScript strict, Tailwind CSS v4
- **Icônes** : `lucide-react` exclusivement
- **Layout** : Sidebar fixe 256px (`w-64`), contenu principal avec `lg:pl-64`
- **Topbar** : sticky, `z-30`, hauteur `h-16`
- **Responsive** : sidebar masquée sur mobile (toggle hamburger dans topbar)
- Les tokens `nd-*` sont déclarés via `@theme inline` dans `globals.css`, pas en `tailwind.config.ts`
- `rounded-2xl` pour toutes les cards, `rounded-full` pour tous les boutons
- Pas de dark mode — interface claire uniquement
- Police : Geist Sans (via `next/font/google` ou `next/font/local`)
