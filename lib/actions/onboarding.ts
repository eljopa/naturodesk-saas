"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPriceId, PAID_PLANS } from "@/lib/plans";
import type { PaidPlanKey } from "@/lib/plans";
import { createStripeCheckoutUrl } from "@/lib/actions/subscriptions";

export type OnboardingErrorCode =
  | "invalid_input"
  | "already_onboarded"
  | "generic_error";

export type OnboardingFormState = {
  errorCode?: OnboardingErrorCode;
} | null;

const OnboardingSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  cabinetName: z
    .string()
    .max(200)
    .trim()
    .optional()
    .transform((v) => v || null),
  redirectTo: z.string().optional(),
});

export async function createProfileAction(
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  // Idempotency: profile already exists → go to dashboard
  const existing = await db.user.findUnique({
    where: { authId: authUser.id },
  });
  if (existing) redirect("/dashboard");

  const parsed = OnboardingSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    cabinetName: formData.get("cabinetName") || undefined,
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) return { errorCode: "invalid_input" };

  const { firstName, lastName, cabinetName, redirectTo } = parsed.data;
  const dest = redirectTo ?? "/dashboard";
  const safeDest =
    dest.startsWith("/") && !dest.startsWith("//") ? dest : "/dashboard";

  const meta = authUser.user_metadata as Record<string, string | undefined>;
  const termsAcceptedAt = meta?.termsAcceptedAt ? new Date(meta.termsAcceptedAt) : null;
  const privacyAcceptedAt = meta?.privacyAcceptedAt ? new Date(meta.privacyAcceptedAt) : null;

  let newUserId: string;
  try {
    const newUser = await db.user.create({
      data: {
        authId: authUser.id,
        email: authUser.email ?? "",
        name: `${firstName} ${lastName}`.trim(),
        cabinetName: cabinetName ?? null,
        termsAcceptedAt,
        privacyAcceptedAt,
      },
    });
    newUserId = newUser.id;
  } catch {
    return { errorCode: "generic_error" };
  }

  // If redirectTo contains a paid plan upgrade intent → redirect directly to Stripe Checkout.
  // Falls back to safeDest (settings page) if Stripe is unavailable.
  if (safeDest.startsWith("/settings?upgrade=")) {
    const url = new URL(safeDest, "http://localhost");
    const rawPlan = url.searchParams.get("upgrade")?.toUpperCase();
    const rawInterval = url.searchParams.get("interval")?.toUpperCase();

    if (rawPlan && (PAID_PLANS as string[]).includes(rawPlan)) {
      const plan = rawPlan as PaidPlanKey;
      const interval: "MONTHLY" | "YEARLY" = rawInterval === "YEARLY" ? "YEARLY" : "MONTHLY";
      const priceId = getPriceId(plan, interval);
      const checkoutUrl = await createStripeCheckoutUrl(
        newUserId,
        authUser.email ?? "",
        `${firstName} ${lastName}`.trim(),
        priceId
      );
      if (checkoutUrl) redirect(checkoutUrl);
    }
  }

  redirect(safeDest);
}
