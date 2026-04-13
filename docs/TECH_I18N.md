# Internationalisation (i18n) — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Vue d'ensemble

NaturoDesk supporte **2 langues** : Français (FR, défaut) et Anglais (EN), via **next-intl** v4.8.3.

**Caractéristiques :**
- Pas de préfixe URL (`/fr/dashboard` n'existe pas — on utilise `/dashboard`)
- Locale stockée dans un **cookie** `NEXT_LOCALE`
- Type safety complète sur les clés de traduction
- Switching de langue depuis `/settings` sans rechargement de page complet

---

## Configuration

### `i18n/request.ts`

```typescript
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["fr", "en"] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = "fr";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as Locale) ?? defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

### `next.config.ts`

```typescript
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(nextConfig);
```

---

## Type Safety

### `types/next-intl.d.ts`

```typescript
import type messages from "../messages/fr.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messages;
  }
}
```

Cela permet à TypeScript de vérifier que toutes les clés utilisées dans le code existent dans `fr.json`. Si une clé est manquante ou mal tapée → erreur de compilation.

**Pattern pour les clés dynamiques :**

```typescript
// ✅ Cast requis pour les template literals
const msg = t(`errors.${errorCode}` as Parameters<typeof t>[0]);

// ✅ Cast requis pour les clés construites dynamiquement
const badge = t(`status${status.charAt(0) + status.slice(1).toLowerCase()}` as Parameters<typeof t>[0]);
```

---

## Fichiers de traduction

**Localisation :** `messages/fr.json` (source de vérité) et `messages/en.json`

### Structure des namespaces

```json
{
  "metadata": { "appName", "pages.*" },
  "auth": { "login", "forgotPassword", "resetPassword", "errors" },
  "nav": { "sections", "items" },
  "topbar": {},
  "onboarding": {},
  "dashboard": { "greeting", "kpi", "upcoming" },
  "patients": { "form", "detail" },
  "appointments": { "form" },
  "consultations": { "form", "detail", "symptoms", "medications", "supplements", "findings" },
  "protocols": { "categories", "form" },
  "followups": { "form" },
  "invoices": { "form" },
  "knowledge": { "form", "search" },
  "settings": { "profile", "account", "language", "billing", "danger" },
  "pdf": { "downloadInvoice", "downloadConsultation", "downloadPatient" }
}
```

---

## Utilisation

### Server Components & Server Actions

```typescript
import { getTranslations, getLocale } from "next-intl/server";

// Dans une page
const t = await getTranslations("patients");
const locale = await getLocale();

// Utilisation
t("form.submitCreate")
t("detail.tabInfo")
locale  // "fr" | "en"
```

### Client Components

```typescript
import { useTranslations } from "next-intl";

export function PatientForm() {
  const t = useTranslations("patients");
  return <button>{t("form.submitCreate")}</button>;
}
```

### Paramètres dans les chaînes

```json
// messages/fr.json
"renewsOn": "Renouvellement le {date}"
```

```typescript
t("billing.renewsOn", { date: "3 avril 2026" })
// → "Renouvellement le 3 avril 2026"
```

---

## Changer de langue

**Fichier :** `lib/actions/locale.ts`

```typescript
"use server";
export async function setLocaleAction(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/");
}
```

**UI :** Boutons FR/EN dans `/settings` via `<form action={setLocaleAction.bind(null, "fr")}>`.

---

## Emails bilingues

Les templates d'email dans `lib/email/index.ts` ont des fonctions distinctes FR/EN :

```typescript
const html = locale === "fr"
  ? buildAppointmentHtmlFr(data)
  : buildAppointmentHtmlEn(data);
```

La locale est lue via `getLocale()` dans le Server Action qui déclenche l'email.

---

## Périmètre i18n

| Périmètre | i18n |
|-----------|------|
| Dashboard praticien | ✅ FR + EN |
| Auth (login, onboarding) | ✅ FR + EN |
| Emails transactionnels | ✅ FR + EN |
| PDFs générés | ✅ FR + EN |
| Admin backoffice | ❌ FR uniquement (hardcodé — outil interne) |

---

## Règles de développement

1. **Aucun texte hardcodé** dans les pages/composants du dashboard praticien
2. Chaque nouveau texte ajouté doit être dans `fr.json` **et** `en.json`
3. Les codes d'erreur (ex : `"invalid_input"`) viennent des Server Actions — la traduction est côté client
4. Les textes de l'admin backoffice sont exemptés (pas de i18n par décision produit)
5. Tester les types : `npm run build` vérifie la type safety i18n via `tsc`
