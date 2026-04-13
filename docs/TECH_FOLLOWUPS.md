# Suivis inter-séances — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Modèle de données

```prisma
model FollowUp {
  id                  String    @id @default(uuid())
  patientId           String
  appointmentId       String?   @unique  // RDV associé (one-to-one, optionnel)
  symptomEvolution    String?            // Évolution des symptômes depuis la dernière séance
  protocolAdjustment  String?            // Modifications apportées au protocole
  observations        String?            // Observations cliniques intermédiaires
  nextSteps           String?            // Prochaines actions / objectifs
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  patient     Patient      @relation(fields: [patientId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])
}
```

**Validation métier :** Au moins un des 4 champs texte doit être renseigné.

---

## Pages

Les suivis sont **scoped dans la fiche patient** via le tab `followups`.

### Tab Suivis — `/patients/[id]?tab=followups`

Affiché dans `app/(dashboard)/patients/[id]/page.tsx`.

Affiche les 50 derniers suivis triés par `createdAt DESC` :
- Date de création
- RDV associé (si lié) avec date/heure formatée
- Extrait de `symptomEvolution` ou `observations`
- Liens vers édition : `/patients/[id]/followups/[fid]/edit`
- Bouton "Nouveau suivi"

### Nouveau suivi — `/patients/[id]/followups/new`

**Fichier :** `app/(dashboard)/patients/[id]/followups/new/page.tsx`

- Liste des RDV disponibles pour association (SCHEDULED ou COMPLETED, sans FollowUp existant)
- Formulaire `FollowUpForm`
- Lien "Annuler" → tab followups du patient

### Édition suivi — `/patients/[id]/followups/[fid]/edit`

**Fichier :** `app/(dashboard)/patients/[id]/followups/[fid]/edit/page.tsx`

- Formulaire pré-rempli
- Affiche la date de création
- Bouton "Supprimer" avec confirmation via Server Action

---

## Formulaire — `FollowUpForm`

**Fichier :** `components/patients/follow-up-form.tsx`

Champs (tous optionnels individuellement, un requis globalement) :
- **Évolution des symptômes** — Textarea
- **Ajustement du protocole** — Textarea
- **Observations cliniques** — Textarea
- **Prochaines étapes** — Textarea
- **RDV associé** — Select (optionnel)

---

## Server Actions

**Fichier :** `lib/actions/followups.ts`

### `createFollowUpAction(patientId, prevState, formData)`

Signature `.bind(null, patientId)`.

```
Input  → appointmentId?, symptomEvolution?, protocolAdjustment?, observations?, nextSteps?
Règle  → Au moins un champ texte non vide (Zod refine)
Output → redirect /patients/[id]?tab=followups | { errorCode }
```

### `updateFollowUpAction(followUpId, patientId, prevState, formData)`

Vérifie ownership (followUp.patient.userId === user.id).

### `deleteFollowUpAction(followUpId, patientId)`

`.bind(null, followUpId, patientId)` — redirige vers tab followups après suppression.

---

## Règles métier

- Un suivi est **optionnellement** lié à un RDV (contrainte unique : un RDV = un seul suivi)
- La liste des RDV disponibles exclut les RDV déjà liés à un autre suivi
- Les suivis ne sont pas liés directement à une consultation — ils représentent le suivi entre deux séances
- Au moins un champ doit être rempli pour créer/modifier un suivi
