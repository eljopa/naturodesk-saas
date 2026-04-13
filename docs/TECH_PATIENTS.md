# Gestion des patients — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Modèle de données

```prisma
model Patient {
  id             String    @id @default(uuid())
  userId         String                         // Praticien propriétaire
  firstName      String
  lastName       String
  birthDate      DateTime?
  phone          String?
  email          String?
  address        String?
  profession     String?
  allergies      String?
  medicalHistory String?
  notes          String?                        // Notes internes (non visibles patient)
  isArchived     Boolean   @default(false)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

**Index :** `userId`, `isArchived`

---

## Pages

### Liste — `/patients`

**Fichier :** `app/(dashboard)/patients/page.tsx`

- Liste paginée, filtrée et recherchée côté serveur
- Filtres : Actifs (défaut) / Archivés — param `?filter=archived`
- Recherche fulltext : `?q=` sur `firstName + lastName` (case insensitive, `mode: "insensitive"`)
- Tri : `lastName ASC, firstName ASC`
- Pagination : 20 patients par page, paramètre `?page=n`
- Résumé rapide : nombre de consultations et RDV par patient (via `_count`)

### Nouveau patient — `/patients/new`

**Fichier :** `app/(dashboard)/patients/new/page.tsx`

Formulaire complet avec 3 sections :
- **Identité :** prénom, nom, date de naissance
- **Contact :** téléphone, email, adresse, profession
- **Données cliniques :** antécédents médicaux, allergies, notes internes

### Détail patient — `/patients/[id]`

**Fichier :** `app/(dashboard)/patients/[id]/page.tsx`

Navigation par tabs via `?tab=` URL param :

| Tab | Défaut | Contenu |
|-----|--------|---------|
| `info` | ✅ | Coordonnées + données cliniques + notes |
| `appointments` | — | Liste des 20 derniers RDV (non annulés) |
| `consultations` | — | Liste des 20 derniers bilans |
| `followups` | — | Liste des 50 derniers suivis |
| `invoices` | — | Liste des 20 dernières factures |

Boutons d'action en-tête :
- **Fiche PDF** → `GET /api/pdf/patient/[id]`
- **Modifier** → `/patients/[id]/edit`
- **Archiver / Réactiver** → Server Action

### Modification — `/patients/[id]/edit`

**Fichier :** `app/(dashboard)/patients/[id]/edit/page.tsx`

Même formulaire que la création, pré-rempli avec les données existantes.

---

## Server Actions

**Fichier :** `lib/actions/patients.ts`

### `createPatientAction(prevState, formData)`

```
Input  → firstName (req), lastName (req), birthDate?, phone?, email?, address?,
         profession?, allergies?, medicalHistory?, notes?
Output → redirect /patients/[id] | { errorCode }
```

Vérification : `userId = requireUser().id`

### `updatePatientAction(patientId, prevState, formData)`

Même champs. Vérifie l'appartenance avant mise à jour.

### `archivePatientAction(patientId)`

`isArchived = true` — bind : `.bind(null, id)`

### `unarchivePatientAction(patientId)`

`isArchived = false`

---

## Formulaire client

**Fichier :** `components/patients/patient-form.tsx`

- Client Component avec `useActionState`
- Affiche les erreurs via codes traduits
- `loading` sur le bouton pendant la soumission

---

## Sécurité

- Toutes les requêtes filtrent `userId = user.id`
- La modification vérifie l'appartenance avant update : patient inexistant ou `userId ≠ user.id` → `unauthorized`
- L'archivage est doux (pas de suppression des données associées)

---

## Règles métier

- Un patient archivé n'apparaît plus dans les listes actives
- Un patient archivé reste lié à ses consultations, RDV et factures
- La recherche porte uniquement sur les patients actifs (ou archivés selon le filtre)
- Les emails des patients sont utilisés pour les emails de confirmation de RDV et factures
