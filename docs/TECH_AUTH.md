# Authentification & Sécurité — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Vue d'ensemble

L'authentification repose sur **Supabase Auth** (email/password) avec un pont vers **Prisma/PostgreSQL** pour le profil applicatif. Deux identités coexistent :

| Identité | Stockage | Rôle |
|---------|----------|------|
| `auth.users` (UUID) | Supabase | Auth provider — sessions, tokens, reset password |
| `User` (Prisma) | PostgreSQL | Profil applicatif — nom, cabinet, rôle, données métier |

Le lien entre les deux est `User.authId = auth.users.id`.

---

## Flux d'authentification

### 1. Connexion (`/login`)

```
User → LoginForm → signInAction()
  → supabase.auth.signInWithPassword()
  → session cookie SSR
  → redirect /dashboard
```

**Fichiers :**
- `app/(auth)/login/page.tsx`
- `components/auth/login-form.tsx` — Client Component, `useActionState`
- `lib/actions/auth.ts` → `signInAction()`

**Codes d'erreur :** `invalid_credentials`, `invalid_input`, `generic_error`

### 2. Onboarding (1ère connexion)

Après la 1ère connexion Supabase, si aucun profil Prisma n'existe, `requireUser()` redirige vers `/onboarding`.

```
requireUser() → user not found in Prisma → redirect /onboarding
User → OnboardingForm → createUserProfileAction()
  → db.user.create({ authId, email, name, cabinetName })
  → redirect /dashboard
```

**Fichiers :**
- `app/onboarding/page.tsx`
- `components/auth/onboarding-form.tsx`
- `lib/actions/auth.ts` → `createUserProfileAction()`

**Données collectées :** prénom, nom, nom du cabinet (optionnel)

### 3. Réinitialisation mot de passe

```
/forgot-password → forgotPasswordAction()
  → supabase.auth.resetPasswordForEmail()
  → email Supabase avec lien signé

/reset-password → resetPasswordAction()
  → supabase.auth.updateUser({ password })
```

### 4. Déconnexion

```
signOutAction() → supabase.auth.signOut() → redirect /login
```

---

## Middleware de session

**Fichier :** `middleware.ts`

Le middleware tourne sur **chaque requête** (sauf assets statiques) et :
1. **Rafraîchit la session** Supabase via `@supabase/ssr` (cookies)
2. **Redirige** les non-authentifiés vers `/login`
3. **Redirige** les utilisateurs connectés sur les routes publiques vers `/dashboard`

```typescript
// Routes publiques — pas de redirection
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const response = createServerResponse();
  const supabase = createSupabaseServerClient(request, response);
  const { data: { session } } = await supabase.auth.getSession();
  // refresh + redirect logic...
}
```

**Matcher :** Exclut `_next/`, `favicon.ico`, images — appliqué sur toutes les routes `/(.*)`

---

## Guards côté serveur

Fichier : `lib/auth.ts`

### `requireUser() → User`

Utilisé dans les layouts et pages du dashboard. Enchaîne :
1. `getAuthUser()` — vérifie la session Supabase
2. `db.user.findUnique({ where: { authId } })` — vérifie le profil Prisma
3. Check `deletedAt === null` — bloque les comptes soft-deleted

Redirections automatiques :
- Non connecté → `/login`
- Pas de profil Prisma → `/onboarding`
- Compte supprimé → `/login`

### `requireAdmin() → User`

Comme `requireUser()` + vérifie `role === ADMIN || role === SUPER_ADMIN`. Redirect `/dashboard` sinon.

### `requireSuperAdmin() → User`

Comme `requireAdmin()` + vérifie `role === SUPER_ADMIN`. Redirect `/admin` si ADMIN simple.

### `getCurrentUser() → User | null`

Version sans redirection — pour les layouts qui gèrent l'état non-connecté.

---

## Système de rôles

```typescript
enum UserRole {
  PRACTITIONER   // Accès dashboard praticien uniquement
  ADMIN          // Accès admin : users, support, tickets
  SUPER_ADMIN    // Accès total : billing, audit, suspensions
}
```

| Route | Guard | Accès minimum |
|-------|-------|---------------|
| `/dashboard/**` | `requireUser()` | PRACTITIONER |
| `/patients/**` | `requireUser()` | PRACTITIONER |
| `/invoices/**` | `requireUser()` | PRACTITIONER |
| `/admin/**` | `requireAdmin()` | ADMIN |
| `/admin/subscriptions` | `requireSuperAdmin()` dans la page | SUPER_ADMIN |
| `/admin/audit` | `requireSuperAdmin()` dans la page | SUPER_ADMIN |

La double protection admin (layout + page) garantit que même en cas de bug sur le layout, la page vérifie elle-même.

---

## Clients Supabase

### Côté serveur — `lib/supabase/server.ts`

```typescript
// Utilisé dans Server Components, Server Actions, API Routes
createSupabaseServerClient()       // Lit/écrit les cookies (session SSR)
createSupabaseServiceClient()      // Service role — contourne RLS (admin uniquement)
```

### Côté client — `lib/supabase/client.ts`

```typescript
// Utilisé dans Client Components uniquement
createSupabaseBrowserClient()      // Accès limité (anon key)
```

**⚠️ Important :** `SUPABASE_SERVICE_ROLE_KEY` est uniquement utilisé côté serveur. Il n'est jamais exposé au client.

---

## Callback OAuth

**Route :** `app/auth/callback/route.ts`

Gère le retour du lien email Supabase (reset password, magic link). Échange le `code` contre une session et redirige vers `/dashboard` ou affiche une erreur.

---

## Soft delete utilisateurs

Les comptes ne sont pas supprimés physiquement. Le champ `User.deletedAt` permet la suppression logique :
- `deletedAt !== null` → compte supprimé
- `requireUser()` bloque l'accès et redirige vers `/login`
- L'espace admin peut voir/gérer les comptes supprimés

---

## Promotion admin

**Script :** `prisma/seed-admin.ts`

```bash
npx ts-node --project tsconfig.json prisma/seed-admin.ts <email>
```

Promeut un praticien existant en ADMIN ou SUPER_ADMIN directement en base.
