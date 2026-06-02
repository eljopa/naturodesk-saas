"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
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
  success?: boolean;
} | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function checkProPlan(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });
  if (!sub) return false;
  return (
    sub.plan === "PRO" &&
    (sub.status === "ACTIVE" || sub.status === "TRIALING")
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

  if (!(await checkProPlan(user.id))) {
    return { errorCode: "pro_plan_required" };
  }

  const parsed = WebPageFormSchema.safeParse({
    slug:               formData.get("slug"),
    heroThemeId:        formData.get("heroThemeId"),
    logoUrl:            formData.get("logoUrl"),
    bio:                formData.get("bio"),
    presentation:       formData.get("presentation"),
    servicesDisplay:    formData.get("servicesDisplay"),
    pricingDisplay:     formData.get("pricingDisplay"),
    address:            formData.get("address"),
    phone:              formData.get("phone"),
    contactEmail:       formData.get("contactEmail"),
    instagram:          formData.get("instagram"),
    facebook:           formData.get("facebook"),
    linkedin:           formData.get("linkedin"),
    website:            formData.get("website"),
    seoTitle:           formData.get("seoTitle"),
    seoDescription:     formData.get("seoDescription"),
    contactFormEnabled: formData.get("contactFormEnabled"),
    appointmentEnabled: formData.get("appointmentEnabled"),
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

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

  if (!(await checkProPlan(user.id))) {
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

  if (!(await checkProPlan(user.id))) {
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
