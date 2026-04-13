# Rendez-vous — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Modèle de données

```prisma
enum AppointmentType   { BILAN | SUIVI }
enum AppointmentStatus { SCHEDULED | COMPLETED | CANCELLED | NO_SHOW }

model Appointment {
  id         String            @id @default(uuid())
  patientId  String
  userId     String
  startAt    DateTime
  endAt      DateTime
  type       AppointmentType   @default(BILAN)
  status     AppointmentStatus @default(SCHEDULED)
  notes      String?
  source     String?           // Réservé future intégration agenda externe
  externalId String?           // ID externe (Google Calendar, etc.)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  // Relations one-to-one optionnelles
  consultation Consultation?
  followUp     FollowUp?
}
```

**Index :** `patientId`, `userId`, `startAt`

---

## Pages

### Calendrier — `/appointments`

**Fichier :** `app/(dashboard)/appointments/page.tsx`

Vue semaine avec `WeekCalendar` (Client Component) :
- Affiche 7 jours du lundi au dimanche
- Navigation semaine par semaine via URL param `?date=YYYY-MM-DD`
- `getWeekStart(date)` calcule le lundi de la semaine courante
- Chaque RDV affiché avec : patient, type, heure début/fin, statut
- Lien "Nouveau rendez-vous" vers `/appointments/new`

Les `Date` sont sérialisées en ISO strings avant d'être passées au Client Component.

### Nouveau RDV — `/appointments/new`

**Fichier :** `app/(dashboard)/appointments/new/page.tsx`

Formulaire : patient (select), date/heure début, date/heure fin, type (BILAN/SUIVI), notes.

Support pré-remplissage via URL : `?patientId=` pour pré-sélectionner un patient.

### Édition — `/appointments/[id]/edit`

**Fichier :** `app/(dashboard)/appointments/[id]/edit/page.tsx`

- Formulaire pré-rempli
- Bouton "Annuler le RDV" (action distincte)
- Bouton "Créer un bilan" → `/consultations/new?patientId=&appointmentId=` si le RDV n'a pas encore de consultation

---

## Server Actions

**Fichier :** `lib/actions/appointments.ts`

### `createAppointmentAction(prevState, formData)`

```
Input  → patientId (req), startAt (req), endAt (req), type (req), notes?
Output → redirect /appointments/[id]/edit | { errorCode }
```

Validations :
- `startAt` et `endAt` sont des dates valides
- `endAt > startAt` (sinon `end_before_start`)
- Le patient appartient bien à l'utilisateur

**Email :** Si le patient a une adresse email, envoie une confirmation de RDV via Resend (fire-and-forget — ne bloque pas la redirection).

### `updateAppointmentAction(appointmentId, prevState, formData)`

Même validations. Vérifie l'appartenance du RDV.

### `cancelAppointmentAction(appointmentId)`

`status = CANCELLED` — bind : `.bind(null, id)`

---

## Formulaire client

**Fichier :** `components/appointments/appointment-form.tsx`

- `useActionState` pour les retours d'erreur
- Inputs `datetime-local` pour les dates
- Select patient parmi les patients actifs du praticien

---

## Composant calendrier

**Fichier :** `components/appointments/week-calendar.tsx`

Client Component qui :
- Reçoit les RDV de la semaine (format sérialisé)
- Affiche la grille semaine
- Navigation avec `router.push` pour changer de semaine (URL param `?date=`)
- Met en avant le jour courant
- Affiche l'heure de début et la durée calculée

---

## Email de confirmation

Déclenché dans `createAppointmentAction` si `patient.email` est renseigné :

```typescript
sendAppointmentConfirmationEmail({
  patientEmail, patientFirstName,
  practitionerName, cabinetName,
  appointmentDate,   // formatté selon locale
  appointmentTime,   // formatté selon locale
  appointmentDuration,  // en minutes
  appointmentType,   // BILAN | SUIVI
  locale,            // fr | en
})
```

Templates HTML dans `lib/email/index.ts` — bilingues FR/EN.

---

## Règles métier

- Un RDV annulé reste en base (soft status)
- Un RDV peut être lié à une consultation (one-to-one) et à un suivi (one-to-one)
- La création du bilan de consultation se fait depuis la page d'édition du RDV
- Le calcul de durée : `(endAt - startAt) / 60 000` ms → minutes
- Les RDV annulés n'apparaissent pas dans les tabs patient (filtrés par `status: { not: "CANCELLED" }`)
