"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPlanAtLeast } from "@/lib/plans";
import type { PlanKey } from "@/lib/plans";
import { WebPageFormSchema } from "@/lib/validators/webpage";
import { generateSlug } from "@/lib/utils/slug";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebPageErrorCode =
  | "invalid_input"
  | "pro_plan_required"
  | "slug_taken"
  | "not_found"
  | "generic_error";

export type WebPageFormState = {
  errorCode?: WebPageErrorCode;
  errorDetail?: string;
  success?: boolean;
} | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function checkWebpageAccess(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });
  if (!sub) return false;
  return (
    isPlanAtLeast(sub.plan as PlanKey, "GROWTH") &&
    (sub.status === "ACTIVE" || sub.status === "TRIALING" || sub.status === "PAST_DUE")
  );
}

/** Retourne un slug disponible en ajoutant un suffixe numérique si nécessaire. */
async function findAvailableSlug(
  base: string,
  excludeUserId: string
): Promise<string> {
  let slug = base;
  let attempt = 1;
  for (;;) {
    const conflict = await db.therapistWebPage.findFirst({
      where: { slug, userId: { not: excludeUserId } },
      select: { id: true },
    });
    if (!conflict) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

// ---------------------------------------------------------------------------
// saveWebPageAction
// Crée ou met à jour la page en brouillon.
// Le slug est verrouillé après la première publication (slugLockedAt non null).
// ---------------------------------------------------------------------------

export async function saveWebPageAction(
  _prevState: WebPageFormState,
  formData: FormData
): Promise<WebPageFormState> {
  const user = await requireUser();

  if (!(await checkWebpageAccess(user.id))) {
    return { errorCode: "pro_plan_required" };
  }

  const tValidation = await getTranslations("webpage.validationErrors");

  // formData.get() returns null for missing fields; Zod's .optional() requires undefined, not null
  const get = (key: string) => formData.get(key) ?? undefined;

  const parsed = WebPageFormSchema.safeParse({
    slug:               get("slug"),
    heroThemeId:        get("heroThemeId"),
    heroImageId:        get("heroImageId"),
    logoUrl:            get("logoUrl"),
    bio:                get("bio"),
    presentation:       get("presentation"),
    address:            get("address"),
    phone:              get("phone"),
    contactEmail:       get("contactEmail"),
    instagram:          get("instagram"),
    facebook:           get("facebook"),
    linkedin:           get("linkedin"),
    website:            get("website"),
    seoTitle:           get("seoTitle"),
    seoDescription:     get("seoDescription"),
    contactFormEnabled: get("contactFormEnabled"),
    appointmentEnabled: get("appointmentEnabled"),
  });

  if (!parsed.success) {
    const first  = parsed.error.issues[0];
    const field  = String(first?.path[0] ?? "");
    console.error("[saveWebPageAction] Validation échouée →", field, ":", first?.message);
    const knownFields = [
      "slug", "contactEmail", "bio", "presentation", "servicesDisplay",
      "pricingDisplay", "address", "phone", "seoTitle", "seoDescription",
      "instagram", "facebook", "linkedin", "website",
    ] as const;
    type KnownField = typeof knownFields[number];
    const isKnown = (f: string): f is KnownField => (knownFields as readonly string[]).includes(f);
    const errorDetail = isKnown(field) ? tValidation(field) : tValidation("default");
    return { errorCode: "invalid_input", errorDetail };
  }

  const {
    slug: requestedSlug,
    instagram, facebook, linkedin, website,
    ...rest
  } = parsed.data;

  // Assemble socialLinks JSON — exclut les valeurs null
  const socialLinks: Record<string, string> = {};
  if (instagram) socialLinks.instagram = instagram;
  if (facebook)  socialLinks.facebook  = facebook;
  if (linkedin)  socialLinks.linkedin  = linkedin;
  if (website)   socialLinks.website   = website;

  const existing = await db.therapistWebPage.findUnique({
    where: { userId: user.id },
    select: { id: true, slug: true, slugLockedAt: true },
  });

  try {
    if (!existing) {
      // ── Création ──────────────────────────────────────────────────────────
      const baseSlug = requestedSlug || generateSlug(user.cabinetName ?? user.name);
      const slug = await findAvailableSlug(baseSlug, user.id);

      await db.therapistWebPage.create({
        data: {
          userId: user.id,
          slug,
          socialLinks: Object.keys(socialLinks).length ? socialLinks : undefined,
          ...rest,
        },
      });
    } else {
      // ── Mise à jour ───────────────────────────────────────────────────────
      let slug = existing.slug;

      if (!existing.slugLockedAt && requestedSlug && requestedSlug !== existing.slug) {
        const conflict = await db.therapistWebPage.findFirst({
          where: { slug: requestedSlug, userId: { not: user.id } },
          select: { id: true },
        });
        if (conflict) return { errorCode: "slug_taken" };
        slug = requestedSlug;
      }

      await db.therapistWebPage.update({
        where: { id: existing.id },
        data: {
          slug,
          socialLinks: Object.keys(socialLinks).length ? socialLinks : Prisma.DbNull,
          ...rest,
        },
      });
    }
  } catch {
    return { errorCode: "generic_error" };
  }

  revalidatePath("/webpage");
  return { success: true };
}

// ---------------------------------------------------------------------------
// publishWebPageAction
// Publie la page — verrouille le slug définitivement.
// ---------------------------------------------------------------------------

export async function publishWebPageAction(): Promise<WebPageFormState> {
  const user = await requireUser();

  if (!(await checkWebpageAccess(user.id))) {
    return { errorCode: "pro_plan_required" };
  }

  const page = await db.therapistWebPage.findUnique({
    where: { userId: user.id },
    select: { id: true, publishedAt: true, slugLockedAt: true },
  });
  if (!page) return { errorCode: "not_found" };

  const now = new Date();

  await db.therapistWebPage.update({
    where: { id: page.id },
    data: {
      isPublished:  true,
      publishedAt:  page.publishedAt ?? now,
      slugLockedAt: page.slugLockedAt ?? now,
    },
  });

  revalidatePath("/webpage");
  return { success: true };
}

// ---------------------------------------------------------------------------
// unpublishWebPageAction
// Dépublie la page — slugLockedAt reste intact pour préserver le SEO.
// ---------------------------------------------------------------------------

export async function unpublishWebPageAction(): Promise<WebPageFormState> {
  const user = await requireUser();

  if (!(await checkWebpageAccess(user.id))) {
    return { errorCode: "pro_plan_required" };
  }

  const page = await db.therapistWebPage.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!page) return { errorCode: "not_found" };

  await db.therapistWebPage.update({
    where: { id: page.id },
    data: { isPublished: false },
  });

  revalidatePath("/webpage");
  return { success: true };
}
