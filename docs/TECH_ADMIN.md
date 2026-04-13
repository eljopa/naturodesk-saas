# Backoffice administrateur — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Vue d'ensemble

Le backoffice admin est accessible uniquement aux utilisateurs avec le rôle `ADMIN` ou `SUPER_ADMIN`. Il est volontairement **distinct du dashboard praticien** (design, navigation, URLs) et ses textes sont **hardcodés en français** (pas de i18n — outil interne).

---

## Rôles et accès

| Rôle | Dashboard | Users | Support | Subscriptions | Audit |
|------|-----------|-------|---------|---------------|-------|
| ADMIN | ✅ | ✅ | ✅ | ❌ | ❌ |
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |

La double protection est appliquée : `requireAdmin()` dans le layout + `requireSuperAdmin()` dans les pages sensibles (subscriptions, audit).

---

## Design

- **Layout :** Fond `slate-900`, sidebar sombre, accents `teal-400/600`
- **Composant :** `AdminShell` (distinct de `DashboardShell`)
- **Routes :** Préfixe `/admin/**`

---

## Pages

### Dashboard — `/admin`

**Fichier :** `app/(admin)/admin/page.tsx`

**KPIs (4 cartes) :**
- Praticiens : total + actifs + nouveaux ce mois + lien users
- Patients : total non-archivés
- Bilans : total consultations
- Rendez-vous : total

**Alertes :**
- Tickets ouverts > 0 → bannière orange avec lien support
- Utilisateurs suspendus > 0 → bannière rouge avec lien users

**Sections récentes :**
- 5 derniers inscrits (nom, email, plan, statut actif)
- 8 dernières actions audit (action, admin, timestamp)

---

### Gestion utilisateurs — `/admin/users`

**Fichier :** `app/(admin)/admin/users/page.tsx`

**Filtres :**
- `?filter=active|suspended|free|pro` (cumulables)
- Recherche par nom/email : `?q=`

**Affichage :** liste paginée avec nom, email, plan, statut (badge), date inscription.

---

### Détail utilisateur — `/admin/users/[id]`

**Fichier :** `app/(admin)/admin/users/[id]/page.tsx`

**Informations :**
- Profil complet (nom, email, cabinet, rôle)
- Statut compte (actif/suspendu)
- Subscription détaillée (plan, statut, dates, Stripe IDs)
- Compteurs métier (patients, consultations, RDV, factures)

**Actions disponibles :**
- Suspendre le compte (`suspendUserAction`)
- Réactiver le compte (`reactivateUserAction`)
- Gérer l'abonnement manuellement (`upsertSubscriptionAction`)

**Audit :** Toutes les actions sont loggées dans `AdminAuditLog`.

---

### Subscriptions — `/admin/subscriptions` *(SUPER_ADMIN uniquement)*

**Fichier :** `app/(admin)/admin/subscriptions/page.tsx`

Vue globale de toutes les subscriptions actives avec statistiques de revenus et répartition FREE/PRO.

---

### Support — `/admin/support`

**Fichier :** `app/(admin)/admin/support/page.tsx`

Liste des tickets avec filtres par statut et priorité.

### Thread ticket — `/admin/support/[id]`

**Fichier :** `app/(admin)/admin/support/[id]/page.tsx`

Thread complet des messages. Actions : changer statut, changer priorité, répondre.

---

### Audit — `/admin/audit` *(SUPER_ADMIN uniquement)*

**Fichier :** `app/(admin)/admin/audit/page.tsx`

Journal chronologique de toutes les actions admin avec filtres par type d'action et par admin.

---

## Modèles de données admin

### Subscription

```prisma
model Subscription {
  userId               String            @unique
  plan                 SubscriptionPlan  // FREE | PRO
  status               SubscriptionStatus // TRIALING | ACTIVE | PAST_DUE | CANCELED | SUSPENDED
  stripeCustomerId     String?           @unique
  stripeSubscriptionId String?           @unique
  trialEndsAt          DateTime?
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean
  canceledAt           DateTime?
  notes                String?           // Notes libres admin
}
```

### SupportTicket

```prisma
enum TicketStatus   { OPEN | IN_PROGRESS | RESOLVED | CLOSED }
enum TicketPriority { LOW | NORMAL | HIGH | URGENT }

model SupportTicket {
  id          String         @id
  userId      String
  subject     String
  status      TicketStatus   @default(OPEN)
  priority    TicketPriority @default(NORMAL)
  createdAt   DateTime
  replies     SupportTicketReply[]
}

model SupportTicketReply {
  id        String   @id
  ticketId  String
  userId    String
  isAdmin   Boolean  @default(false)
  message   String
  createdAt DateTime
}
```

### AdminAuditLog

```prisma
model AdminAuditLog {
  id         String   @id
  adminId    String                    // User admin qui a effectué l'action
  action     String                    // ex : "user.suspend", "subscription.update"
  targetType String?                   // ex : "User", "Subscription"
  targetId   String?                   // UUID de la cible
  metaJson   Json?                     // Données contextuelles
  createdAt  DateTime @default(now())
}
```

---

## Server Actions admin

**Fichier :** `lib/actions/admin/users.ts`

### `suspendUserAction(userId, prevState, formData)`

1. `requireAdmin()`
2. `db.user.update({ isActive: false })`
3. `logAdminAction({ action: "user.suspend", targetId: userId, ... })`

### `reactivateUserAction(userId, prevState, formData)`

1. `requireAdmin()`
2. `db.user.update({ isActive: true })`
3. `logAdminAction({ action: "user.reactivate", ... })`

### `upsertSubscriptionAction(userId, prevState, formData)`

1. `requireAdmin()`
2. Validation du formulaire (plan, status, dates)
3. `db.subscription.upsert(...)`
4. `logAdminAction({ action: "subscription.update", ... })`

**Fichier :** `lib/actions/admin/support.ts`

### `updateTicketAction(ticketId, prevState, formData)`

Change le statut et/ou la priorité d'un ticket.

### `replyToTicketAction(ticketId, prevState, formData)`

Ajoute une réponse admin (`isAdmin: true`) au thread.

---

## Audit logging — `lib/admin/audit.ts`

```typescript
export async function logAdminAction({
  adminId, action, targetType?, targetId?, meta?
}: LogAdminActionParams): Promise<void>
```

**Fail silently** — ne lève jamais d'exception pour ne pas bloquer l'action principale.

Toutes les actions sensibles DOIVENT appeler `logAdminAction()` :
- Suspension / réactivation d'utilisateur
- Mise à jour manuelle d'abonnement
- Résolution / fermeture de ticket
