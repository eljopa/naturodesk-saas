# Protocoles naturopathiques — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Modèle de données

```prisma
enum ProtocolCategory {
  DIGESTIVE | HORMONAL | STRESS | DETOX | IMMUNITY | ENERGY | OTHER
}

model ProtocolTemplate {
  id          String           @id @default(uuid())
  userId      String
  title       String
  category    ProtocolCategory
  summary     String?
  contentJson Json             // Contenu libre (texte structuré ou JSON)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
```

---

## Pages

### Liste — `/protocols`

**Fichier :** `app/(dashboard)/protocols/page.tsx`

- Liste paginée (20/page)
- Affiche : titre, catégorie (badge), résumé tronqué
- Lien vers édition : `/protocols/[id]/edit`
- Bouton "Nouveau protocole" en en-tête

### Nouveau protocole — `/protocols/new`

**Fichier :** `app/(dashboard)/protocols/new/page.tsx`

Formulaire via `ProtocolForm`.

### Édition — `/protocols/[id]/edit`

**Fichier :** `app/(dashboard)/protocols/[id]/edit/page.tsx`

Même formulaire, pré-rempli. Avec bouton "Supprimer ce protocole".

---

## Formulaire — `ProtocolForm`

**Fichier :** `components/protocols/protocol-form.tsx`

Champs :
- **Titre** (requis)
- **Catégorie** (select enum, requis)
- **Résumé** (optionnel, texte court)
- **Contenu** (zone de texte libre, recommandations, compléments, techniques)

---

## Server Actions

**Fichier :** `lib/actions/protocols.ts`

### `createProtocolAction(prevState, formData)`

Validation : titre + catégorie requis. Stocke le contenu dans `contentJson` (string encapsulée en JSON).

### `updateProtocolAction(protocolId, prevState, formData)`

Vérifie ownership avant mise à jour.

### `deleteProtocolAction(protocolId)`

`.bind(null, id)` — vérification ownership avant suppression.

---

## Règles métier

- Les protocoles sont **scoped par utilisateur** (`userId`)
- `contentJson` est flexible : peut accueillir du texte libre ou un objet JSON structuré pour une utilisation future (protocoles structurés avec étapes)
- Les protocoles sont des **templates réutilisables** — ils ne sont pas directement liés à une consultation pour l'instant (liaison future prévue)
