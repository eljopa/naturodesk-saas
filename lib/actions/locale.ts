"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { locales, type Locale } from "@/i18n/request";

/**
 * Persiste la locale choisie dans un cookie HttpOnly de longue durée.
 * Invalide le cache du layout pour appliquer les nouvelles traductions.
 */
export async function setLocaleAction(
  locale: Locale,
  _formData?: FormData
): Promise<void> {
  if (!(locales as ReadonlyArray<string>).includes(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 an
    sameSite: "lax",
    httpOnly: false, // lisible côté client si besoin
  });

  revalidatePath("/", "layout");
}
