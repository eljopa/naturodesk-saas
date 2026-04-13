# Emails transactionnels — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Vue d'ensemble

NaturoDesk envoie des emails transactionnels via **Resend** (service email moderne, API REST). Les emails sont déclenchés automatiquement lors d'événements métier spécifiques.

---

## Configuration

**Variable d'environnement :**

```bash
RESEND_API_KEY=""                              # Clé API depuis resend.com
EMAIL_FROM="NaturoDesk <noreply@naturodesk.fr>"  # Adresse expéditeur
```

Si `RESEND_API_KEY` n'est pas défini, les emails sont silencieusement ignorés (warning en console) — l'application continue de fonctionner normalement.

---

## Client — `lib/email/index.ts`

### Initialisation

```typescript
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;  // null si clé absente → warn + skip
```

### Fonction interne `send()`

```typescript
async function send(opts: { to, subject, html }): Promise<SendResult>
```

Retourne `{ ok: true }` ou `{ ok: false, error: string }`. Ne lève jamais d'exception.

---

## Emails disponibles

### 1. Confirmation de rendez-vous

**Fonction :** `sendAppointmentConfirmationEmail(data)`

**Déclencheur :** `createAppointmentAction()` si `patient.email` est renseigné

**Destinataire :** Email du patient

**Objet :**
- FR : `Confirmation de votre rendez-vous — {date}`
- EN : `Appointment confirmation — {date}`

**Contenu :**

| Champ | Valeur |
|-------|--------|
| Type | Bilan de vitalité / Consultation de suivi |
| Date | Formatée selon locale (ex : lundi 3 avril 2026) |
| Heure | Formatée selon locale (ex : 14:00) |
| Durée | En minutes (calculée depuis `endAt - startAt`) |
| Praticien | `user.name` |

**Données requises :**

```typescript
interface AppointmentConfirmationData {
  patientEmail: string;
  patientFirstName: string;
  practitionerName: string;
  cabinetName: string | null;
  appointmentDate: string;     // Formaté avant appel
  appointmentTime: string;     // Formaté avant appel
  appointmentDuration: number; // Minutes
  appointmentType: "BILAN" | "SUIVI";
  locale: "fr" | "en";
}
```

---

### 2. Envoi de facture

**Fonction :** `sendInvoiceEmail(data)`

**Déclencheur :** `updateInvoiceStatusAction(..., "ISSUED")` si `patient.email` est renseigné

**Destinataire :** Email du patient

**Objet :**
- FR : `Votre facture {number} — {cabinet}`
- EN : `Your invoice {number} — {cabinet}`

**Contenu :**
- Tableau des lignes de prestation (désignation, qté, PU, total)
- Total TTC formaté en EUR

**Données requises :**

```typescript
interface InvoiceSentData {
  patientEmail: string;
  patientFirstName: string;
  practitionerName: string;
  cabinetName: string | null;
  invoiceNumber: string;
  invoiceDate: string;         // Formaté avant appel
  invoiceTotal: string;        // Formaté EUR avant appel
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: string;         // Formaté EUR
    total: string;             // Formaté EUR
  }>;
  locale: "fr" | "en";
}
```

---

### 3. Activation abonnement PRO

**Fonction :** `sendSubscriptionActivatedEmail(opts)`

**Déclencheur :** Webhook `checkout.session.completed` (côté Stripe)

**Destinataire :** Email du **praticien** (pas du patient)

**Objet :**
- FR : `Votre abonnement NaturoDesk PRO est actif`
- EN : `Your NaturoDesk PRO subscription is active`

**Contenu :** Message de confirmation simple avec nom du plan.

---

## Design des templates

Les templates sont des **strings HTML inline** dans `lib/email/index.ts` — pas de moteur de templates externe.

### Structure commune

```html
<body style="font-family:sans-serif;background:#f8fafc;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
    <!-- Header teal -->
    <div style="background:#0f766e;padding:24px 32px;">
      <p style="color:#fff;font-size:20px;font-weight:600;">NaturoDesk</p>
      <p style="color:#99f6e4;font-size:13px;">{cabinetName}</p>
    </div>
    <!-- Corps -->
    <div style="padding:32px;">...</div>
    <!-- Footer -->
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;">NaturoDesk — ...</p>
    </div>
  </div>
</body>
```

Styles **tous inline** (requis pour compatibilité Gmail/Outlook).

### Palette email

| Élément | Couleur |
|---------|---------|
| Header background | `#0f766e` (teal-700) |
| Header texte | `#ffffff` |
| Header sous-titre | `#99f6e4` (teal-100) |
| Texte principal | `#334155` (slate-700) |
| Texte secondaire | `#64748b` (slate-500) |
| Footer texte | `#94a3b8` (slate-400) |
| Bordures | `#e2e8f0` (slate-200) |

---

## Stratégie d'envoi

### Fire-and-forget

Les emails sont envoyés **de façon asynchrone sans bloquer** les Server Actions :

```typescript
// Dans createAppointmentAction — email envoyé AVANT redirect()
sendAppointmentConfirmationEmail({...})
  .catch((e) => console.error("[email] Appointment email failed:", e));
// Puis redirect() — l'email se poursuit en background
```

> **Note :** Dans Node.js, un `Promise` non-awaited continue de s'exécuter après le `redirect()`. Ce n'est pas idéal pour la fiabilité (pas de retry, pas de queue) mais suffit pour un MVP. Une queue d'emails (BullMQ, Upstash QStash) sera nécessaire en production.

### Gestion des erreurs

Un échec d'email :
- N'empêche jamais l'action principale (pas de throw)
- Est loggué en console : `[email] Send error: ...`
- Retourne `{ ok: false, error: "..." }` — ignoré à l'appel

---

## Localisation

Les templates FR/EN sont des fonctions distinctes appelées selon `locale` :

```typescript
const html = isFr
  ? buildAppointmentHtmlFr({ ...data })
  : buildAppointmentHtmlEn({ ...data });
```

La locale est récupérée via `getLocale()` dans le Server Action (cookie `NEXT_LOCALE`).

---

## Conditions d'envoi

| Email | Condition |
|-------|-----------|
| Confirmation RDV | `patient.email` renseigné + `RESEND_API_KEY` défini |
| Facture émise | `patient.email` renseigné + `RESEND_API_KEY` défini + statut → ISSUED |
| Activation PRO | Email du praticien disponible + `RESEND_API_KEY` défini |
