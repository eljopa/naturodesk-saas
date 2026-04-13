# NaturoDesk — Claude Memory

## Project
SaaS for naturopaths. Next.js 15 App Router, TypeScript strict, Tailwind v4, Supabase Auth (email/password only), Prisma 5 (NOT 6 — Node 20.10 incompatible), next-intl (cookie-based, no URL prefix), pgvector.

## Critical constraints
- Prisma 5 only (`prisma@5`, `@prisma/client@5`) — Node 20.10 incompatible with Prisma 6
- DATABASE_URL = pgBouncer pooler (runtime), DIRECT_URL = direct (migrations)
- No magic link, no OAuth for MVP
- Server Actions for mutations, business logic in /lib
- i18n: zero hardcoded UI text, FR + EN, locale from `NEXT_LOCALE` cookie
- Error codes (not strings) returned from Server Actions; translation happens client-side

## Architecture
- `app/(auth)/` — login, forgot-password, reset-password
- `app/(dashboard)/` — protected pages (dashboard, patients, appointments, consultations, protocols, invoices, knowledge, settings)
- `app/onboarding/` — safety net when Supabase user exists but no Prisma profile yet
- `lib/auth.ts` — `requireUser()` redirects to `/onboarding` (not `/login`) if no Prisma profile; `getCurrentUser()` returns null
- `lib/supabase/server.ts` — `createSupabaseServerClient()` (async, SSR), `createSupabaseServiceClient()` (static import, service_role)
- `lib/actions/auth.ts` — signIn/signOut/forgotPassword/resetPassword; return `{ errorCode }` or `{ messageCode }`
- `components/layout/sidebar.tsx` — `NavSection` calls `useTranslations("nav.sections")` unconditionally (hook rule fix applied)
- `components/layout/nav-config.ts` — typed NavSectionKey / NavItemKey unions

## i18n pattern
- Type-safe via `types/next-intl.d.ts` augmenting `AppConfig.Messages` from fr.json
- Record lookup objects (not template literal keys) for nav items/sections
- `i18n/request.ts` — switch-based import (not dynamic template) to load fr.json or en.json

## Phases completed
- PHASE 1 (T1-T6): Foundation — Next.js 15, Prisma schema, Supabase SSR, middleware, auth actions
- PHASE 2 (T7-T9): Auth UI, dashboard layout (sidebar/topbar), 8 skeleton pages
- PHASE 2.1: Full i18n consolidation
- Pre-PHASE 3 audit: 4 bugs fixed (see below)

## Bugs fixed in audit
1. `lib/supabase/server.ts` — replaced `require()` with static `import { createClient } from "@supabase/supabase-js"`
2. `lib/auth.ts` — `requireUser()` now redirects to `/onboarding` when no Prisma profile (avoids loop with middleware)
3. `components/layout/sidebar.tsx` — moved `useTranslations` out of conditional call in `NavSection` (React Rules of Hooks)
4. `app/(dashboard)/dashboard/page.tsx` — replaced hardcoded `à` separator with `toLocaleString()` with combined date+time options

## PHASE 3 completed (T10-T12)

### T10 — Onboarding
- `app/onboarding/page.tsx` — full form, no requireUser() loop
- `components/onboarding/onboarding-form.tsx` — client form
- `lib/actions/onboarding.ts` — createProfileAction, sets name + cabinetName
- `prisma/schema.prisma` — added `cabinetName String?` to User model (needs migration)

### T11 — Patients
- `app/(dashboard)/patients/page.tsx` — list with search (?q=) + filter (?filter=archived)
- `app/(dashboard)/patients/new/page.tsx`
- `app/(dashboard)/patients/[id]/page.tsx` — detail with URL-based tabs (info/appointments/consultations/invoices)
- `app/(dashboard)/patients/[id]/edit/page.tsx`
- `components/patients/patient-form.tsx` — shared create/edit form (sections: Identity, Contact, Clinical)
- `components/patients/patient-search.tsx` — client search with 300ms debounce + useRouter
- `lib/actions/patients.ts` — create, update, archive, unarchive

### T12 — Appointments
- `app/(dashboard)/appointments/page.tsx` — list with filter upcoming/past/all
- `app/(dashboard)/appointments/new/page.tsx` — with ?patientId prefill
- `app/(dashboard)/appointments/[id]/edit/page.tsx` — with cancel button (SCHEDULED only)
- `components/appointments/appointment-form.tsx` — shared form
- `lib/actions/appointments.ts` — create, update, cancel (sets status=CANCELLED)

### New UI components
- `components/ui/textarea.tsx`
- `components/ui/select.tsx`

### Pending before running
- Run `prisma migrate dev --name add_cabinet_name` (adds cabinetName to users table)

## Next: PHASE 4
Consultations module + patient-appointment linking in UI.
