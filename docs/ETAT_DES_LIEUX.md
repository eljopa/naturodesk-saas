# État des lieux — NaturoDesk
> Généré le 2026-04-02

---

## 1. ARCHITECTURE ACTUELLE

### Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js App Router | 15.5.12 |
| Runtime UI | React | 19.1.0 |
| Langage | TypeScript strict | 5.x |
| Styling | Tailwind CSS | v4 (PostCSS) |
| ORM | Prisma | 5.22.0 (Node 20.10) |
| Base de données | PostgreSQL + pgvector | via Supabase |
| Auth | Supabase Auth (email/password) | @supabase/ssr 0.9 |
| i18n | next-intl | 4.8.3 |
| Validation | Zod | 4.3.6 |
| Icônes | lucide-react | 0.577.0 |

### Organisation des dossiers

```
app/
├── (auth)/          → login, forgot-password, reset-password
├── (dashboard)/     → 15 pages métier (layout protected)
├── (admin)/         → 7 pages admin (layout protected)
├── auth/callback/   → route.ts OAuth Supabase
└── onboarding/      → création de profil (pont Supabase → Prisma)

lib/
├── auth.ts          → requireUser(), requireAdmin(), requireSuperAdmin()
├── db.ts            → singleton Prisma
├── errors.ts        → AppError, NotFoundError, handleApiError()
├── supabase/        → server.ts / client.ts
├── actions/         → 10 fichiers Server Actions (~1600 lignes)
└── validators/      → 5 schémas Zod

components/
├── ui/              → 9 primitives (Button, Input, Card, Badge…)
├── layout/          → sidebar, topbar, shell, nav-config
├── auth/            → 3 formulaires
├── admin/           → 4 composants
└── [métier]/        → patients, appointments, consultations, protocols (14 fichiers)

prisma/schema.prisma → 710 lignes, 25 modèles
```

### Authentification

- **Supabase Auth** email/password avec refresh de session SSR via `@supabase/ssr`
- **Middleware** (`middleware.ts`) : refresh session sur chaque requête, liste de routes publiques explicite
- **Pont Supabase → Prisma** : à la 1re connexion, `/onboarding` crée l'entrée `User` en DB (authId = UUID Supabase)
- **Guards serveur** : `requireUser()` dans les layouts protégés, `requireAdmin()` / `requireSuperAdmin()` dans les layouts admin

### Gestion des routes

| Type | Chemin | Protection |
|------|--------|-----------|
| Public | `/login`, `/forgot-password`, `/reset-password`, `/auth/callback` | Aucune |
| Privé praticien | `/dashboard/*`, `/patients/*`, `/consultations/*`… | `requireUser()` dans layout |
| Admin | `/admin/*` | `requireAdmin()` dans layout |
| Super-admin | `/admin/subscriptions`, `/admin/audit` | `requireSuperAdmin()` dans la page |

---

## 2. BACKEND / DATA

### Modèles Prisma — liste complète et rôle

#### Cœur métier (exploitables aujourd'hui)

| Modèle | Rôle | Statut |
|--------|------|--------|
| `User` | Praticien (authId Supabase, nom, cabinet, role, isActive) | ✅ Complet |
| `Patient` | Fiche patient avec soft archive, infos contact + médicales | ✅ Complet |
| `Appointment` | RDV avec type (BILAN/SUIVI), status, dates | ✅ Complet |
| `Consultation` | Bilan clinique lié à un patient/RDV, statut de pipeline | ✅ Complet |
| `Symptom` | Symptôme avec intensité + embedding vector(1536) | ✅ Complet |
| `Medication` | Médicament avec dosage, drugKey pour liaison knowledge | ✅ Complet |
| `Supplement` | Complément alimentaire | ✅ Complet |
| `Finding` | Résultat d'analyse (category, confidence, source) | ✅ Complet |
| `Citation` | Référence bibliographique liée à un Finding | ✅ Schéma prêt |
| `FollowUp` | Suivi inter-séances | ✅ Schéma prêt |
| `Invoice` | Facture avec lignes, statut, paiement | ✅ Schéma prêt |
| `InvoiceLine` | Ligne de facture | ✅ Schéma prêt |
| `ProtocolTemplate` | Template de protocole naturo (contentJson) | ✅ Complet |

#### Pipeline IA (schéma prêt, logique non câblée)

| Modèle | Rôle | Statut |
|--------|------|--------|
| `KnowledgeDocument` | Document source (BDPM, ANSM, PubMed…) avec drugKey | ⚠️ Schéma seul |
| `KnowledgeChunk` | Chunk avec embedding vector(1536) | ⚠️ Schéma seul |
| `AnalysisRun` | Run d'analyse IA (idempotency, tokens, status) | ⚠️ Schéma seul |
| `AnalysisLog` | Logs d'un run | ⚠️ Schéma seul |
| `Rule` | Règle clinique (code unique, version, enabled) | ⚠️ Schéma seul |
| `RuleRun` | Résultat d'application d'une règle sur une consultation | ⚠️ Schéma seul |
| `PatternCase` | Cas pour apprentissage ML | ⚠️ Schéma seul |
| `TimelineEvent` | Événements timeline patient | ⚠️ Schéma seul |

#### Admin (exploitables aujourd'hui)

| Modèle | Rôle | Statut |
|--------|------|--------|
| `Subscription` | Plan (FREE/PRO), status, dates, champs Stripe préparés | ✅ Complet |
| `SupportTicket` | Ticket support avec priorité | ✅ Complet |
| `SupportTicketReply` | Réponse praticien/admin | ✅ Complet |
| `AdminAuditLog` | Traçabilité des actions admin | ✅ Complet |

### Relations principales

```
User ──< Patient ──< Appointment ──< Consultation
                                        ├──< Symptom (vector)
                                        ├──< Medication ──> KnowledgeDocument
                                        ├──< Supplement
                                        ├──< Finding ──< Citation
                                        ├──< AnalysisRun ──< AnalysisLog
                                        └──< RuleRun ──> Rule

User ──< Invoice ──< InvoiceLine
User ── Subscription
User ──< SupportTicket ──< SupportTicketReply
```

### Ce qui est exploitable vs préparé

- **Exploitable maintenant** : User, Patient, Appointment, Consultation, Symptom, Medication, Supplement, Finding, ProtocolTemplate, Subscription, SupportTicket, AdminAuditLog
- **Schéma prêt, non câblé** : KnowledgeDocument, KnowledgeChunk, AnalysisRun, Rule, RuleRun, PatternCase, TimelineEvent, Invoice (logique métier manquante), FollowUp (action existe, page manquante)

---

## 3. FRONTEND EXISTANT

### Pages disponibles

#### Auth (100% fonctionnelles)

| Page | Statut |
|------|--------|
| `/login` | ✅ formulaire email/password avec `useActionState` |
| `/forgot-password` | ✅ envoi email reset |
| `/reset-password` | ✅ nouveau mot de passe via lien email |
| `/onboarding` | ✅ création profil (firstName, lastName, cabinetName) |

#### Dashboard praticien

| Page | Fonctionnel | Manques |
|------|-------------|---------|
| `/dashboard` | ✅ Stats (counts) | Pas de graphiques, pas d'actions rapides |
| `/patients` | ✅ Liste + recherche + filtre archivé | Pas de pagination UI |
| `/patients/new` | ✅ Formulaire complet | — |
| `/patients/[id]` | ✅ Tabs info/rdv/consultations/factures | Tab factures = skeleton |
| `/patients/[id]/edit` | ✅ | — |
| `/appointments` | ⚠️ Liste basique | Pas de vue calendrier, pas de création inline |
| `/appointments/new` | ✅ Formulaire | — |
| `/consultations` | ✅ Liste + filtres statuts | — |
| `/consultations/new` | ✅ Sélection patient + RDV | — |
| `/consultations/[id]` | ✅ 5 tabs : contexte, symptômes, médicaments, compléments, findings | Bouton "Lancer analyse" = stub |
| `/protocols` | ✅ Liste | — |
| `/protocols/new` | ✅ Formulaire + catégorie | — |
| `/protocols/[id]/edit` | ✅ | — |
| `/invoices` | ⚠️ Liste vide | Création facture absente |
| `/knowledge` | ❌ Skeleton | Rien d'exploitable |
| `/settings` | ✅ Profil + sélecteur langue | — |

#### Admin (100% fonctionnel)

| Page | Statut |
|------|--------|
| `/admin` | ✅ Dashboard stats, recent users, tickets, audit |
| `/admin/users` | ✅ Liste avec filtres (actif/suspendu, plan FREE/PRO) |
| `/admin/users/[id]` | ✅ Détail + suspend/reactivate + gestion subscription |
| `/admin/subscriptions` | ✅ Vue globale (SUPER_ADMIN only) |
| `/admin/support` | ✅ Liste tickets |
| `/admin/support/[id]` | ✅ Thread de réponses |
| `/admin/audit` | ✅ Logs (SUPER_ADMIN only) |

### Composants réellement utilisables

**UI primitives** — tous production-ready :
`Button` (variants + asChild + loading), `Input`, `Label`, `Card`, `Badge` (6 variants), `Textarea`, `Select`, `PageHeader`, `EmptyState`

**Formulaires métier** — tous câblés avec Server Actions :
`patient-form`, `appointment-form`, `consultation-form`, `context-editor`, `symptom-section`, `medication-section`, `supplement-section`, `finding-section`, `protocol-form`, `onboarding-form`

### Ce qui manque pour avoir un produit utilisable

1. **Factures** — page liste existe mais création/édition/PDF absente
2. **Vue calendrier** — appointments en liste simple, aucune vue calendrier
3. **Analyse IA** — bouton présent dans consultation/[id] mais non câblé
4. **Base de connaissances** — `/knowledge` est un skeleton
5. **FollowUp** — modèle + action existent, aucune page UI
6. **Notifications** — aucun système (email transactionnel, in-app)
7. **Export PDF** — ordonnances, factures, résumés de consultation
8. **Stripe** — champs préparés dans Subscription, aucun webhook ni checkout

---

## 4. MANQUES & PROCHAINES ÉTAPES

### Résumé de l'état actuel

| Dimension | État |
|-----------|------|
| Auth & sécurité | ✅ Production-ready |
| Admin backoffice | ✅ Production-ready |
| Patients + Consultations | ✅ Core fonctionnel |
| Appointments | ⚠️ Liste OK, calendrier manquant |
| Facturation | ❌ Schéma prêt, UI/PDF manquants |
| Analyse IA | ❌ Schéma prêt, pipeline non câblé |
| Base de connaissances | ❌ Vide |
| Stripe / paiement | ❌ Champs préparés, rien d'actif |
| i18n FR/EN | ✅ Complet |

### Plan de développement

---

#### V1-A — Compléter le core métier *(priorité maximale)*

- [ ] **Factures** — page `/invoices/new`, édition, génération PDF
- [ ] **Calendrier** — vue semaine dans `/appointments`
- [ ] **FollowUp** — page `/patients/[id]/followups` + formulaire câblé
- [ ] **Pagination** — listes patients + consultations (curseur Prisma)

---

#### V1-B — Analyse IA *(différenciateur produit)*

- [ ] **Pipeline analyse** — câbler `AnalysisRun` : API route `/api/analysis/[consultationId]`, appel OpenAI, stockage findings
- [ ] **Ingestion knowledge** — script d'import BDPM → `KnowledgeDocument` + chunking + embeddings
- [ ] **Recherche sémantique** — pgvector cosine similarity sur chunks pour enrichir les findings
- [ ] **Rules engine** — définir les premières `Rule` (red flags, interactions, dépletions) + `RuleRun`

---

#### V1-C — Productisation *(nécessaire avant utilisateurs réels)*

- [ ] **Stripe** — checkout, webhooks `invoice.paid` / `customer.subscription.updated`, mise à jour `Subscription`
- [ ] **Export PDF** — résumé consultation, facture, fiche patient
- [ ] **Emails transactionnels** — confirmation RDV, facture envoyée (Resend ou SendGrid)

---

#### V2 — Croissance

- [ ] Notifications in-app (Supabase Realtime)
- [ ] Application mobile (React Native ou PWA)
- [ ] Intégration n8n pour workflows automatisés (rappels RDV, alertes)
- [ ] Timeline patient complète (`TimelineEvent`)
- [ ] Partage dossier patient sécurisé (lien signé)
- [ ] Multi-cabinet
