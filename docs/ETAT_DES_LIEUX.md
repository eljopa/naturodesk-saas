# État des lieux — NaturoDesk
> Généré le 2026-07-15 — remplace la version du 2026-04-02, devenue obsolète (25 modèles → 57, plusieurs modules entiers ajoutés depuis).

Ce document recense ce qui est **en place et fonctionnel** dans le code actuel, organisé par couche (front praticien, front public, admin, back-end). Pour une description fonctionnelle détaillée module par module, voir `docs/FUNCTIONAL_MODULES.md` (état au 17 juin 2026, à rafraîchir séparément si besoin).

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework | Next.js App Router (Turbopack) | 15.5.20 |
| UI | React | 19.1.0 |
| Langage | TypeScript strict | 5.x |
| Style | Tailwind CSS | v4 |
| ORM | Prisma | 5.22.0 (Node 20.10 — Prisma 6 incompatible) |
| Base de données | PostgreSQL + pgvector | via Supabase (pooler runtime / connexion directe migrations) |
| Auth | Supabase Auth (email/password) | @supabase/ssr |
| i18n | next-intl (cookie `NEXT_LOCALE`, pas de préfixe URL) | 4.13.2 |
| Validation | Zod | 4.x |
| Paiements | Stripe (checkout + billing portal + webhooks) | — |
| Emails transactionnels | Resend | — |
| PDF | pdf-lib | — |
| IA | OpenAI (appels REST serveur uniquement, jamais client) | — |

Schéma : `prisma/schema.prisma`, **2023 lignes / 57 modèles**, 14 migrations appliquées.

---

## 1. FRONT — Dashboard praticien (authentifié, `app/(dashboard)/`)

Protégé par `requireUser()` (redirige vers `/login` si non connecté, `/onboarding` si compte Supabase sans profil Prisma).

Navigation (`components/layout/nav-config.ts`) organisée en 4 sections + 2 items bas de page :

**Section Cabinet**
- **Patients** (`/patients`) — CRUD complet, fiche à 5 onglets (infos, RDV, consultations, suivis, factures), recherche, archivage, export PDF fiche patient.
- **Rendez-vous** (`/appointments`) — agenda, 3 onglets : Calendrier / **Disponibilités** (`/appointments/schedule` — éditeur jours/plages horaires/fuseau, alimente la réservation publique) / En ligne (RDV pris via la page publique). Rappel automatique par e-mail J-1 (cron quotidien, ajouté 2026-07-15).
- **Factures** (`/invoices`) — CRUD, export PDF, envoi par e-mail.

**Section Clinique**
- **Consultations** (`/consultations`) — bilans de vitalité structurés, export PDF.
- **Fiches conseil** (`/advice-sheets`) — génération assistée par IA, export PDF.
- **Protocoles** (`/protocols`) — modèles réutilisables (`ProtocolTemplate`).

**Section Ressources**
- **Base de connaissances** (`/knowledge`) — documents, chunks vectorisés (pgvector), termes, synchronisation BDPM (médicaments officiels).

**Section Web**
- **Page professionnelle** (`/webpage`, plan Growth+) — éditeur de la page publique (contenu, thème, SEO, sections d'info), gestion des prestations (`ServiceOffering`).
- **Messages** (`/webpage/messages`) — boîte de réception des messages du formulaire de contact public.

**Bas de page**
- **Support** (`/support`) — tickets côté praticien, réponses, notifications de suivi.
- **Paramètres** (`/settings`) — profil, facturation Stripe (checkout, portail de gestion d'abonnement), choix de langue (FR/EN).

**Autres**
- Cloche de notifications in-app (`components/notifications/`, table `Notification`) — nouvelle réservation, réponse support, etc.
- Onboarding (`/onboarding`) — pont Supabase Auth → profil `User` Prisma à la première connexion.

---

## 2. FRONT — Site public (`app/(marketing)/` + `app/page.tsx`)

- **Home** (`/`) — hero, bandeau de confiance, 3 piliers (Développez votre cabinet / Gagnez du temps / Offrez un meilleur accompagnement), section "pourquoi NaturoDesk", témoignages, tarifs, FAQ, CTA final. Copie FR/EN entièrement réécrite le 2026-07-15 (positionnement bénéfices, pas liste de fonctionnalités).
- **Pages fonctionnalités dédiées** (`/fonctionnalites/*`) — agenda-rendez-vous, assistance-clinique, bilans-vitalite, dossiers-patients, facturation, page-professionnelle, protocoles.
- **Tarifs** (`/tarifs`), **À propos** (`/a-propos`), **Contact** (`/contact`, formulaire → `sendContactMessageEmail`), **FAQ** (`/faq`).
- **Blog** (`/blog`, `/blog/[slug]`) — articles générés automatiquement (voir §5), thématique business de la naturopathie (pas clinique), FR + EN.
- **Ressources** (`/ressources/centre-aide`, `guides`, `roadmap`, `webinaires`).
- **Pages légales** (`/legal/mentions`, `/confidentialite`, `/cookies`, `/cgu`) — rédigées et adaptées à NaturoDesk.
- **Auth** (`/login`, `/register`, `/forgot-password`, `/reset-password`) — Supabase Auth, conservation du plan choisi lors de l'inscription.

## 3. FRONT — Page publique praticien (`app/p/[slug]`)

- Page SEO (Server Component, JSON-LD schema.org) par praticien : présentation, prestations, tarifs, formulaire de contact.
- **Widget de réservation en ligne** multi-étapes (`booking-widget.tsx`) — créneaux calculés en temps réel depuis `PractitionerSchedule` (`lib/public/slots.ts`), création automatique du RDV + du patient si nouveau, emails de confirmation (patient) et de notification (praticien).
- Rate-limiting in-memory sur les endpoints publics (contact, réservation).

---

## 4. ADMIN — Back-office (`app/(admin)/admin/`, `requireAdmin()` / `requireSuperAdmin()`)

Rôles : `PRACTITIONER` / `ADMIN` (gestion utilisateurs + support) / `SUPER_ADMIN` (accès total : billing, suspension, audit).

| Section | Contenu |
|---|---|
| Dashboard (`/admin`) | Vue d'ensemble |
| Utilisateurs (`/admin/users`, `/admin/users/[id]`) | Suspension/réactivation, détail compte |
| Abonnements (`/admin/subscriptions`, SUPER_ADMIN) | Gestion manuelle des abonnements Stripe |
| Support (`/admin/support`, `/admin/support/[id]`) | Traitement des tickets praticiens, réponses |
| Blog (`/admin/blog`) | Pilotage de la génération automatique d'articles ("Générer maintenant", suivi statut/score) |
| Audit (`/admin/audit`, SUPER_ADMIN) | Journal des actions admin (`AdminAuditLog`) |
| Knowledge (`/admin/knowledge`) | Administration base de connaissances / imports BDPM |

Toute action admin sensible passe par `logAdminAction()` (`lib/admin/audit.ts`).

---

## 5. BACK-END — Automatisations & IA

- **Blog automatique** (`app/api/cron/generate-blog-article`, cron Vercel lun/mer/ven 07:00 UTC) — sélection de sujet, génération FR via OpenAI, adaptation EN, système "ADN éditorial" anti-répétition (tons/profondeurs/structures), génération d'images (`gpt-image-1`), stockage Supabase Storage, scoring qualité avant publication.
- **Rappels de rendez-vous** (`app/api/cron/send-appointment-reminders`, cron quotidien 17:00 UTC, ajouté 2026-07-15) — e-mail J-1 aux patients, idempotent (`Appointment.reminderSentAt`).
- **Moteur d'analyse clinique** (`lib/analysis/`, `lib/clinical/`) — vérification interactions plantes/compléments/médicaments à partir de bases officielles (BDPM), jamais un chatbot : outil d'aide à la décision, le praticien reste décisionnaire.
- **Base de connaissances** — ingestion documentaire, chunking, embeddings pgvector, recherche sémantique (`lib/embeddings/`, `lib/knowledge/`).
- **Fiches conseil assistées par IA** (`lib/advice-sheets/ai-draft.ts`).

Les deux crons partagent le même pattern d'auth (header `Authorization: Bearer $CRON_SECRET`) ; un bug de middleware qui les redirigeait vers `/login` avant d'atteindre cette vérification a été corrigé le 2026-07-15.

## 6. BACK-END — Paiements, e-mails, documents

- **Stripe** — checkout multi-plans (Starter 49€ / Growth 69€ / Pro 89€, mensuel ou annuel), billing portal, webhooks (`checkout.session.completed`, `subscription.updated/deleted`, `invoice.payment_failed`). Gating de fonctionnalités par plan (`isPlanAtLeast`, feature-gating booléen — **pas** de système de quota d'usage, jugé non nécessaire tant que l'usage reste borné par la pratique réelle du praticien).
- **E-mails transactionnels** (Resend, `lib/email/index.ts`) — confirmation RDV, rappel RDV, facture, activation abonnement, notification nouvelle réservation, messages support, contact, alertes admin blog.
- **PDF** (pdf-lib, `lib/pdf/`) — facture, consultation, fiche patient, fiche conseil.

## 7. Sécurité & qualité (au 2026-07-15)

- `npm audit` (avec et sans `--omit=dev`) : **0 vulnérabilité**. Les 43 alertes Dependabot visibles sur GitHub concernent des versions déjà corrigées dans le lockfile committé — latence de rescan côté GitHub, pas un problème réel côté code (vérifié alerte par alerte via `gh api`).
- `tsc --noEmit`, `eslint`, `npm run build` : tous verts.
- RLS Supabase activé, `SUPABASE_SERVICE_ROLE_KEY` et `OPENAI_API_KEY` strictement côté serveur.

---

## Ce qui n'est PAS encore fait

- **Portail patient** — accès direct du patient à ses RDV/factures/historique. Aucune brique existante (ni route, ni champ d'auth sur `Patient`, ni doc). Mis en attente : question juridique à trancher avant de démarrer (RGPD, consentement, nature de l'accès aux données de santé).
- Quota d'usage par plan — évalué et écarté pour l'instant (voir §6).
