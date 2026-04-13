# Stripe — Abonnements & Paiement — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Vue d'ensemble

NaturoDesk utilise **Stripe** pour gérer les abonnements des praticiens (plan FREE → PRO). Le flow utilise **Stripe Checkout** (hosted payment page) et **Stripe Billing Portal** (gestion self-service).

---

## Modèle de données

```prisma
enum SubscriptionPlan   { FREE | PRO }
enum SubscriptionStatus { TRIALING | ACTIVE | PAST_DUE | CANCELED | SUSPENDED }

model Subscription {
  id                    String             @id @default(uuid())
  userId                String             @unique
  plan                  SubscriptionPlan   @default(FREE)
  status                SubscriptionStatus @default(TRIALING)

  // Stripe IDs (null tant que non connecté)
  stripeCustomerId      String?            @unique
  stripeSubscriptionId  String?            @unique

  // Périodes de facturation
  trialEndsAt           DateTime?
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean            @default(false)
  canceledAt            DateTime?

  notes                 String?            // Notes admin
}
```

---

## Variables d'environnement requises

```bash
STRIPE_SECRET_KEY=""       # sk_live_... ou sk_test_...
STRIPE_WEBHOOK_SECRET=""   # whsec_... (depuis dashboard Stripe)
STRIPE_PRO_PRICE_ID=""     # price_... (ID du prix mensuel PRO)
NEXT_PUBLIC_URL=""         # URL de l'app (pour les redirections Stripe)
```

---

## Client Stripe — `lib/stripe.ts`

Implémenté via un **Proxy lazy** pour éviter le crash au build si `STRIPE_SECRET_KEY` est absent :

```typescript
// N'instancie le client Stripe que lors du premier appel réel
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});
```

`getStripe()` lève une erreur explicite `"STRIPE_SECRET_KEY is not set"` au runtime si la clé est manquante.

---

## Flux Checkout (upgrade FREE → PRO)

```
Settings page
  → BillingCard: "Passer en PRO" button
  → <form action={createCheckoutSessionAction}>
  → createCheckoutSessionAction() [Server Action]
      1. requireUser()
      2. Récupère/crée Stripe Customer (upsert Subscription.stripeCustomerId)
      3. stripe.checkout.sessions.create({
           mode: "subscription",
           line_items: [{ price: STRIPE_PRO_PRICE_ID }],
           success_url: "/settings?stripe=success",
           cancel_url: "/settings",
           metadata: { userId }
         })
      4. redirect(session.url)  ← redirige vers Stripe hosted checkout
  
  → [Paiement Stripe]

  → redirect /settings?stripe=success
  → [Webhook checkout.session.completed déclenché]
```

**Fichiers :**
- `lib/actions/subscriptions.ts` → `createCheckoutSessionAction()`
- `app/api/stripe/checkout/route.ts` → route POST alternative (non utilisée en prod)

---

## Flux Billing Portal (gestion abonnement)

```
Settings page
  → "Gérer mon abonnement" button (visible si stripeCustomerId existe)
  → <form action={openBillingPortalAction}>
  → openBillingPortalAction() [Server Action]
      1. requireUser()
      2. Récupère stripeCustomerId depuis Subscription
      3. stripe.billingPortal.sessions.create({
           customer: stripeCustomerId,
           return_url: "/settings"
         })
      4. redirect(session.url)  ← redirige vers Stripe portal
```

**Fichier :** `lib/actions/subscriptions.ts` → `openBillingPortalAction()`

---

## Webhooks — `app/api/stripe/webhooks/route.ts`

**Endpoint :** `POST /api/stripe/webhooks`

### Sécurité

Vérification de la signature Stripe sur chaque requête :
```typescript
const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
```

### Événements gérés

#### `checkout.session.completed`

Déclenché après paiement réussi via Checkout.

Actions :
1. Récupère le `stripeSubscriptionId` depuis la session
2. Retrieve la subscription Stripe pour les détails de période
3. `db.subscription.upsert()` avec plan=PRO, status=ACTIVE, IDs Stripe, périodes
4. Envoie email de confirmation d'activation à l'utilisateur

#### `customer.subscription.updated`

Déclenché lors de tout changement (upgrade, downgrade, renouvellement, modification).

Actions :
- Sync `status`, `cancelAtPeriodEnd`, `currentPeriodStart/End`, `canceledAt`
- Mapping des statuts Stripe → statuts DB :

| Stripe | DB |
|--------|-----|
| `trialing` | TRIALING |
| `active` | ACTIVE |
| `past_due` | PAST_DUE |
| `canceled`, `incomplete_expired` | CANCELED |
| `paused`, `unpaid`, `incomplete` | SUSPENDED |

#### `customer.subscription.deleted`

Annulation définitive : plan=FREE, status=CANCELED, canceledAt=now.

#### `invoice.payment_failed`

Paiement échoué : status=PAST_DUE (identifié via `stripeCustomerId`).

### Configuration Stripe Dashboard

Pour le local/staging :
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

Pour la production, configurer l'endpoint dans le Dashboard Stripe :
- URL : `https://votre-domaine.com/api/stripe/webhooks`
- Événements : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## UI — Section Abonnement (`/settings`)

**Fichier :** `app/(dashboard)/settings/page.tsx` → Composant `BillingCard`

Affichage selon l'état de la subscription :

| État | Affichage |
|------|-----------|
| Pas de subscription | Plan FREE, bouton "Passer en PRO" |
| Plan FREE | Badge plan + statut, bouton "Passer en PRO" |
| Plan PRO actif | Badge PRO + "Actif", date de renouvellement, bouton "Gérer" |
| PRO cancel_at_period_end | Date d'annulation en rouge, bouton "Gérer" |
| PRO past_due | Badge "Paiement en retard", bouton "Gérer" |

Banners post-redirection :
- `?stripe=success` → bannière teal "Votre abonnement PRO est maintenant actif"
- `?stripe=cancelled` → bannière amber "L'abonnement n'a pas été activé"

---

## Métadonnées Stripe

**Clé de liaison :** `metadata.userId` est présent sur :
- `checkout.session` (pour retrouver l'utilisateur dans le webhook)
- `subscription_data` (propagé sur la Subscription Stripe pour les webhooks futurs)

---

## Idempotence

- Le `stripeCustomerId` est upserted : si l'utilisateur revient sur Checkout, le même Customer Stripe est réutilisé
- Les mises à jour de Subscription sont par `userId` (updateMany) — pas de doublon possible
