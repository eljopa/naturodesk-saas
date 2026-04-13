# Documentation technique — Index — NaturoDesk

> Dernière mise à jour : 2026-04-03
> 
> Ce dossier contient la documentation technique de chaque feature implémentée et fonctionnelle à ce stade du projet.

---

## Documents disponibles

| Document | Contenu | Statut feature |
|----------|---------|----------------|
| [TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md) | Stack, organisation dossiers, patterns, variables d'env | ✅ Complet |
| [TECH_AUTH.md](./TECH_AUTH.md) | Supabase Auth, middleware, guards, rôles, onboarding | ✅ Complet |
| [TECH_PATIENTS.md](./TECH_PATIENTS.md) | CRUD patients, archive, recherche, fiche détail | ✅ Complet |
| [TECH_APPOINTMENTS.md](./TECH_APPOINTMENTS.md) | Calendrier semaine, CRUD RDV, email confirmation | ✅ Complet |
| [TECH_CONSULTATIONS.md](./TECH_CONSULTATIONS.md) | Bilans cliniques, symptômes/médicaments/findings, pipeline IA | ✅ Core complet |
| [TECH_PROTOCOLS.md](./TECH_PROTOCOLS.md) | Templates de protocoles naturopathiques | ✅ Complet |
| [TECH_FOLLOWUPS.md](./TECH_FOLLOWUPS.md) | Suivis inter-séances | ✅ Complet |
| [TECH_INVOICES.md](./TECH_INVOICES.md) | Facturation, numérotation, cycle de vie, email | ✅ Complet |
| [TECH_PDF.md](./TECH_PDF.md) | Export PDF (facture, consultation, patient) via pdf-lib | ✅ Complet |
| [TECH_STRIPE.md](./TECH_STRIPE.md) | Checkout, webhooks, billing portal, abonnements | ✅ Complet |
| [TECH_EMAIL.md](./TECH_EMAIL.md) | Emails transactionnels via Resend (RDV, facture, PRO) | ✅ Complet |
| [TECH_ADMIN.md](./TECH_ADMIN.md) | Backoffice admin : users, support, audit, subscriptions | ✅ Complet |
| [TECH_I18N.md](./TECH_I18N.md) | Internationalisation FR/EN, next-intl, type safety | ✅ Complet |

---

## Autres documents dans ce dossier

| Document | Contenu |
|----------|---------|
| [ETAT_DES_LIEUX.md](./ETAT_DES_LIEUX.md) | Audit complet de l'application (2026-04-02) |
| [BACKLOG_V1.md](./BACKLOG_V1.md) | Backlog de développement V1 |
| [TECH_SPEC_V1.md](./TECH_SPEC_V1.md) | Spécifications techniques V1 |
| [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) | Vue produit |
| [naturodesk_backend_admin_cdc.md](./naturodesk_backend_admin_cdc.md) | Cahier des charges backoffice admin |

---

## Résumé de l'état d'avancement

### Features complètes et production-ready

- **Auth & sécurité** — Supabase SSR, middleware, guards multi-niveaux, soft delete
- **Dashboard praticien** — Stats, KPIs, prochains RDV
- **Patients** — CRUD complet, archive, recherche, fiche détail avec tabs, export PDF
- **Rendez-vous** — Calendrier semaine, CRUD, email confirmation patient, liaison consultation
- **Consultations** — Bilan clinique complet, 5 tabs de données, pipeline IA (statuts)
- **Données cliniques** — Symptômes, médicaments, compléments, findings (CRUD)
- **Protocoles** — Templates réutilisables par catégorie
- **Suivis inter-séances** — FollowUp lié aux patients et RDV
- **Facturation** — Numérotation auto, cycle de vie complet, email envoi, export PDF
- **Export PDF** — Facture A4, résumé consultation multi-pages, fiche patient
- **Stripe** — Checkout hosted, webhooks (subscription lifecycle), billing portal
- **Emails transactionnels** — Confirmation RDV, facture émise, activation PRO (Resend)
- **Admin backoffice** — Dashboard, users, support, subscriptions, audit (SUPER_ADMIN)
- **i18n FR/EN** — Complet sur tout le dashboard praticien + emails + PDFs

### Features en cours / partielles

- **Pipeline IA** — Statuts câblés, logique LLM dans `lib/analysis/` (hors scope V1-C)
- **Base de connaissances** — Schéma + vectorisation OK, UI `/knowledge` skeleton
- **FollowUp PDF** — Pas encore de route `/api/pdf/followup/[id]`

### Variables d'environnement à configurer

```bash
# Obligatoires pour la production
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
RESEND_API_KEY=
EMAIL_FROM=
NEXT_PUBLIC_URL=
```

---

## Conventions de développement

| Convention | Valeur |
|------------|--------|
| Aucun texte hardcodé (dashboard) | Utiliser `messages/fr.json` + `messages/en.json` |
| Logique IA | Serveur uniquement — jamais côté client |
| Server Actions | Validation Zod + `requireUser()` + `revalidatePath()` |
| Codes d'erreur | Toujours des string codes (`"invalid_input"`), jamais de messages serveur |
| Vérification ownership | Explicite dans chaque action (pas de middleware global) |
| PDF | `Buffer.from(Uint8Array)` pour `NextResponse` |
| Stripe build | Singleton lazy via Proxy — ne jamais throw au module init |
