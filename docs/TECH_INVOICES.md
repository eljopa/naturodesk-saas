# Facturation — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Modèle de données

```prisma
enum InvoiceStatus  { DRAFT | ISSUED | PAID | CANCELLED }
enum PaymentMethod  { CASH | CARD | TRANSFER | CHECK }

model Invoice {
  id            String         @id @default(uuid())
  patientId     String
  userId        String
  number        String         @unique   // Format : FAC-YYYY-XXXX
  status        InvoiceStatus  @default(DRAFT)
  totalAmount   Float
  paymentMethod PaymentMethod?
  issuedAt      DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  patient   Patient       @relation(...)
  user      User          @relation(...)
  lines     InvoiceLine[]
}

model InvoiceLine {
  id          String   @id @default(uuid())
  invoiceId   String
  description String
  quantity    Int
  unitPrice   Float
  total       Float    // quantity * unitPrice (calculé à la création)
}
```

---

## Numérotation automatique

**Format :** `FAC-YYYY-XXXX` (ex : `FAC-2026-0001`)

```typescript
async function generateInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const last = await db.invoice.findFirst({
    where: { userId, number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const seq = last ? parseInt(last.number.replace(prefix, ""), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}
```

La numérotation est **séquentielle par utilisateur par année**. Pas de trous (tant qu'aucune facture n'est supprimée après numérotation).

---

## Cycle de vie des statuts

```
DRAFT ──────────→ ISSUED ──────────→ PAID
  │                  │
  │ (deleteInvoice)  └─────────────→ CANCELLED
  ↓
(suppression physique)
```

Règles :
- Seules les factures `DRAFT` peuvent être supprimées
- `ISSUED` déclenche l'envoi automatique d'un email au patient
- `issuedAt` est auto-renseigné à la première transition vers `ISSUED`

---

## Pages

### Liste — `/invoices`

**Fichier :** `app/(dashboard)/invoices/page.tsx`

- Liste paginée (25/page), filtrée par statut
- Paramètres URL : `?filter=draft|issued|paid`, `?page=n`
- Affiche : numéro (lien), patient, montant TTC, statut, date d'émission

### Nouvelle facture — `/invoices/new`

**Fichier :** `app/(dashboard)/invoices/new/page.tsx`

Paramètre de pré-remplissage : `?patientId=`

### Détail — `/invoices/[id]`

**Fichier :** `app/(dashboard)/invoices/[id]/page.tsx`

**En-tête :**
- Numéro de facture + badge statut
- Lien vers la fiche patient
- Bouton **Télécharger PDF** → `GET /api/pdf/invoice/[id]`
- Boutons d'action selon statut :
  - DRAFT : "Émettre la facture" + "Supprimer"
  - ISSUED : "Marquer comme payée" + "Annuler"

**Contenu :**
- Métadonnées : numéro, date d'émission, mode de paiement, total
- Tableau des lignes de prestation
- Total TTC mis en valeur

---

## Formulaire — `InvoiceForm`

**Fichier :** `components/invoices/invoice-form.tsx`

Client Component avec gestion dynamique des lignes :
- Ajout/suppression de lignes à la volée (`useState`)
- Calcul automatique du total en temps réel
- Les lignes sont sérialisées en JSON dans un champ caché `linesJson`

```typescript
// Sérialisation des lignes avant soumission
<input type="hidden" name="linesJson" value={JSON.stringify(lines)} />
```

Champs du formulaire :
- Patient (select — patients actifs triés par nom)
- Lignes : description, quantité, prix unitaire (calcul automatique du total)
- Mode de paiement (optionnel)
- Date d'émission (optionnel)

---

## Server Actions — `lib/actions/invoices.ts`

### `createInvoiceAction(prevState, formData)`

```
Input  → patientId (UUID, req), linesJson (JSON, min 1 ligne), paymentMethod?, issuedAt?
Output → redirect /invoices/[id] | { errorCode }
```

Traitement :
1. Parse `linesJson` depuis le champ caché
2. Validation Zod (CreateSchema + LineSchema)
3. Vérification appartenance patient
4. `generateInvoiceNumber(userId)` — séquentiel par user/année
5. Calcul `totalAmount = Σ(quantity × unitPrice)`
6. Création `Invoice` + `InvoiceLine[]` en transaction Prisma

### `updateInvoiceStatusAction(invoiceId, status)`

Signature `.bind(null, id, status)` pour `<form action>`.

Comportement sur `ISSUED` :
1. Auto-set `issuedAt = new Date()` si pas encore renseigné
2. Si `patient.email` existe → envoi email facture (Resend, fire-and-forget)

L'email contient le détail des lignes formaté en EUR selon la locale.

### `deleteInvoiceAction(invoiceId)`

- Guard : `status === "DRAFT"` uniquement
- Supprime les `InvoiceLine` puis l'`Invoice`
- Redirige vers `/invoices`

---

## Export PDF

**Route :** `GET /api/pdf/invoice/[id]`
**Fichier :** `app/api/pdf/invoice/[id]/route.ts`

Vérifie ownership, génère le PDF via `lib/pdf/invoice.ts`, retourne `application/pdf`.

Le nom du fichier téléchargé est `{invoiceNumber}.pdf` (ex : `FAC-2026-0001.pdf`).

Voir [TECH_PDF.md](./TECH_PDF.md) pour les détails de génération.

---

## Email automatique — Facture émise

Déclenché lors de `updateInvoiceStatusAction(..., "ISSUED")` si `patient.email` est renseigné :

```typescript
sendInvoiceEmail({
  patientEmail, patientFirstName,
  practitionerName, cabinetName,
  invoiceNumber, invoiceDate,
  invoiceTotal,            // Formatté EUR selon locale
  lines: [...],            // Description, qty, prix, total
  locale,                  // fr | en
})
```

Templates HTML dans `lib/email/index.ts`.

---

## Règles métier

- La numérotation est séquentielle, par praticien, par année civile
- Seules les factures DRAFT peuvent être supprimées (les autres sont annulées)
- Le total est toujours recalculé lors de la création (pas de confiance aux données client)
- L'email est envoyé en fire-and-forget — un échec d'envoi ne bloque pas le changement de statut
