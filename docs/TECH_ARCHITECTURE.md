# Architecture technique — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Stack technique

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| Framework | Next.js App Router | 15.5.12 | SSR, routing, API routes, Server Actions |
| Runtime UI | React | 19.1.0 | Composants, hooks, `useActionState` |
| Langage | TypeScript strict | 5.x | Typage complet, Zod inference |
| Styling | Tailwind CSS | v4 (PostCSS) | Design system, utilitaires CSS |
| ORM | Prisma | 5.22.0 | Accès DB typé, migrations |
| Base de données | PostgreSQL + pgvector | Supabase | Données relationnelles + embeddings |
| Auth | Supabase Auth | @supabase/ssr 0.9 | Email/password, tokens JWT, SSR cookies |
| i18n | next-intl | 4.8.3 | Traductions FR/EN, locale par cookie |
| Validation | Zod | 4.3.6 | Schémas de validation côté serveur |
| Paiement | Stripe | SDK v17 | Checkout, webhooks, billing portal |
| Email | Resend | SDK | Emails transactionnels HTML |
| PDF | pdf-lib | — | Génération PDF A4 côté serveur |
| Icônes | lucide-react | 0.577.0 | SVG icons |

---

## Organisation des dossiers

```
app/
├── (auth)/              → Login, forgot-password, reset-password, onboarding
│   └── layout.tsx       → Layout centré, sans sidebar
├── (dashboard)/         → 15+ pages praticien (protégées requireUser)
│   └── layout.tsx       → DashboardShell + requireUser() guard
├── (admin)/             → 7 pages admin (protégées requireAdmin)
│   └── layout.tsx       → AdminShell + requireAdmin() guard
├── api/
│   ├── stripe/          → webhooks/, checkout/, portal/ (Route Handlers)
│   ├── pdf/             → invoice/[id]/, consultation/[id]/, patient/[id]/
│   └── knowledge/       → Recherche sémantique pgvector
└── auth/callback/       → OAuth callback Supabase

lib/
├── auth.ts              → requireUser(), requireAdmin(), requireSuperAdmin()
├── db.ts                → Singleton Prisma Client
├── stripe.ts            → Stripe lazy singleton (Proxy pattern)
├── utils.ts             → cn() (clsx + tailwind-merge)
├── errors.ts            → AppError, NotFoundError, handleApiError()
├── email/
│   └── index.ts         → Resend client + templates HTML FR/EN
├── pdf/
│   ├── invoice.ts       → generateInvoicePdf()
│   ├── consultation.ts  → generateConsultationPdf()
│   └── patient.ts       → generatePatientPdf()
├── supabase/
│   ├── server.ts        → createSupabaseServerClient(), createSupabaseServiceClient()
│   └── client.ts        → createSupabaseBrowserClient() (browser only)
├── admin/
│   └── audit.ts         → logAdminAction() helper
├── actions/             → 11 fichiers Server Actions
│   ├── auth.ts          → signIn, signOut, forgotPassword, resetPassword
│   ├── patients.ts      → CRUD patients + archive
│   ├── appointments.ts  → CRUD rendez-vous + email confirmation
│   ├── consultations.ts → CRUD consultations + status
│   ├── clinical.ts      → symptoms, medications, supplements, findings
│   ├── analysis.ts      → triggerAnalysis, retryAnalysis
│   ├── invoices.ts      → CRUD factures + email on ISSUED
│   ├── followups.ts     → CRUD suivis inter-séances
│   ├── protocols.ts     → CRUD protocoles
│   ├── subscriptions.ts → createCheckoutSession, openBillingPortal
│   ├── locale.ts        → setLocaleAction
│   └── admin/
│       ├── users.ts     → suspend, reactivate, upsertSubscription
│       └── support.ts   → updateTicket, replyToTicket
└── validators/          → Schémas Zod (patient, appointment, consultation, invoice, followup)

components/
├── ui/                  → 9 primitives (Button, Input, Card, Badge, Select, Textarea…)
├── layout/              → sidebar, topbar, dashboard-shell, nav-config
├── auth/                → login-form, forgot-password-form, reset-password-form
├── admin/               → admin-shell, user-detail-actions, subscription-form, ticket-actions
├── patients/            → patient-form, follow-up-form
├── appointments/        → appointment-form, week-calendar
├── consultations/       → consultation-form, context-editor, symptom-section, medication-section,
│                          supplement-section, finding-section
├── protocols/           → protocol-form
└── invoices/            → invoice-form

prisma/
├── schema.prisma        → 25 modèles, ~710 lignes
└── seed-admin.ts        → Promotion d'un praticien en ADMIN

messages/
├── fr.json              → Traductions françaises (source de vérité)
└── en.json              → Traductions anglaises

docs/                    → Documentation technique (ce dossier)
types/
└── next-intl.d.ts       → Augmentation AppConfig.Messages pour type safety i18n
```

---

## Patterns architecturaux clés

### 1. Server Components par défaut

Toutes les pages sont des `async` Server Components. Les données sont chargées directement dans les composants avec `await db.*` ou `await requireUser()`.

```typescript
// Exemple type — page.tsx
export default async function PatientsPage() {
  const [user, t, locale] = await Promise.all([
    requireUser(),         // Auth guard + données user
    getTranslations("patients"),
    getLocale(),
  ]);
  const patients = await db.patient.findMany({ where: { userId: user.id } });
  return <PatientList patients={patients} />;
}
```

### 2. Server Actions pour les mutations

Les mutations utilisent des Server Actions (`"use server"`) avec :
- Validation Zod sur chaque entrée
- `requireUser()` pour authentification
- `revalidatePath()` pour invalider le cache
- `redirect()` après succès
- Retour d'`errorCode` en cas d'erreur (jamais de messages côté serveur)

```typescript
"use server";
export async function createPatientAction(
  _prev: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const user = await requireUser();
  const parsed = CreatePatientSchema.safeParse({...});
  if (!parsed.success) return { errorCode: "invalid_input" };
  await db.patient.create({...});
  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}
```

### 3. Formulaires Client avec `useActionState`

Les formulaires sont des Client Components qui utilisent `useActionState` (React 19) :

```typescript
"use client";
export function PatientForm({ action }) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errorMsg = state?.errorCode ? t(`errors.${state.errorCode}` as ...) : null;
  return <form action={formAction}>...</form>;
}
```

### 4. Sécurité des données

Chaque accès aux données vérifie l'appartenance via le `userId` de l'utilisateur connecté. Il n'y a pas de middleware global de filtrage — chaque requête Prisma inclut explicitement `where: { userId: user.id }`.

```typescript
// Pattern systématique de vérification d'appartenance
const patient = await db.patient.findUnique({ where: { id } });
if (!patient || patient.userId !== user.id) notFound();
```

**Cas Consultation :** Le modèle `Consultation` n'a pas de `userId` direct. L'ownership se vérifie via le `patient.userId` :
```typescript
const consultation = await db.consultation.findUnique({
  where: { id },
  include: { patient: { select: { userId: true } } },
});
if (consultation.patient.userId !== user.id) notFound();
```

### 5. Gestion de l'i18n

- Les clés d'erreur sont des codes (`"invalid_input"`, `"not_found"`) transmis depuis les Server Actions
- La traduction se fait côté client avec `t(\`errors.${errorCode}\` as Parameters<typeof t>[0])`
- Les Server Components utilisent `getTranslations()`, les Client Components utilisent `useTranslations()`
- La locale est un cookie (`NEXT_LOCALE`) sans préfixe URL

### 6. Chargement parallèle

Les données indépendantes sont toujours chargées en parallèle avec `Promise.all()` :

```typescript
const [user, t, locale, { id }, sp] = await Promise.all([
  requireUser(),
  getTranslations("consultations"),
  getLocale(),
  params,
  searchParams,
]);
```

---

## Schéma de base de données — Vue d'ensemble

```
User ──< Patient ──< Appointment ──< Consultation
                                        ├──< Symptom (vector 1536)
                                        ├──< Medication → KnowledgeDocument
                                        ├──< Supplement
                                        ├──< Finding ──< Citation
                                        ├──< AnalysisRun ──< AnalysisLog
                                        └──< RuleRun ──> Rule

User ──< Invoice ──< InvoiceLine
User ──< FollowUp ──> Appointment (optional)
User ── Subscription → Stripe
User ──< SupportTicket ──< SupportTicketReply
User ──< AdminAuditLog (as admin)
```

---

## Variables d'environnement

```bash
# Database
DATABASE_URL=""          # Pooler pgBouncer (Prisma runtime)
DIRECT_URL=""            # Connexion directe (migrations)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""   # Serveur uniquement

# OpenAI — serveur uniquement
OPENAI_API_KEY=""

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRO_PRICE_ID=""

# Resend — emails
RESEND_API_KEY=""
EMAIL_FROM="NaturoDesk <noreply@naturodesk.fr>"

# App
NEXT_PUBLIC_URL=""          # URL publique (pour redirections Stripe)
NEXT_PUBLIC_APP_URL=""

# n8n
N8N_WEBHOOK_SECRET=""
N8N_BASE_URL=""
```

---

## Contraintes techniques notables

| Contrainte | Détail |
|-----------|--------|
| Prisma 5.x | Node 20.10 — Prisma 6 requiert Node 20.19+ |
| DATABASE_URL | Pooler pgBouncer pour le runtime (transactions) |
| DIRECT_URL | Connexion directe pour `prisma migrate` |
| pgvector | Activé via `previewFeatures = ["postgresqlExtensions"]` |
| Stripe SDK | Types `current_period_start/end` sur Subscription → cast `as any` en 2025-03-31.basil |
| PDF pdf-lib | Retourne `Uint8Array` → convertir via `Buffer.from()` pour `NextResponse` |
| Stripe build | Singleton lazy (Proxy) pour éviter crash si `STRIPE_SECRET_KEY` absent au build |
