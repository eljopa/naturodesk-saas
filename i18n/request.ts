import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const locale: Locale =
    cookieLocale !== undefined &&
    (locales as ReadonlyArray<string>).includes(cookieLocale)
      ? (cookieLocale as Locale)
      : defaultLocale;

  const messages =
    locale === "en"
      ? (await import("../messages/en.json")).default
      : (await import("../messages/fr.json")).default;

  return { locale, messages };
});
