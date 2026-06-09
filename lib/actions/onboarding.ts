"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

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

  try {
    await db.user.create({
      data: {
        authId: authUser.id,
        email: authUser.email ?? "",
        name: `${firstName} ${lastName}`.trim(),
        cabinetName: cabinetName ?? null,
      },
    });
  } catch {
    return { errorCode: "generic_error" };
  }

  redirect(safeDest);
}
