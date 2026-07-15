"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Codes d'erreur et de message — traduits côté client via les clés i18n
// ---------------------------------------------------------------------------

export type AuthErrorCode =
  | "invalid_credentials"
  | "invalid_input"
  | "generic_error"
  | "email_required"
  | "password_mismatch"
  | "password_too_short"
  | "reset_failed"
  | "email_already_exists"
  | "terms_not_accepted";

export type AuthMessageCode = "password_reset_sent" | "confirm_email_sent";

export type AuthFormState = {
  errorCode?: AuthErrorCode;
  messageCode?: AuthMessageCode;
} | null;

// ---------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
});

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined, // null → undefined pour z.string().optional()
  });

  if (!parsed.success) {
    return { errorCode: "invalid_input" };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const isCredentialsError =
      error.message.includes("Invalid login") ||
      error.message.includes("invalid_credentials") ||
      error.message.includes("Email not confirmed");

    return { errorCode: isCredentialsError ? "invalid_credentials" : "generic_error" };
  }

  const destination = parsed.data.redirectTo ?? "/dashboard";
  const safeDest =
    destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/dashboard";

  redirect(safeDest);
}

// ---------------------------------------------------------------------------
// Inscription
// ---------------------------------------------------------------------------

const SignUpSchema = z
  .object({
    firstName: z.string().min(1).max(100).trim(),
    lastName: z.string().min(1).max(100).trim(),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
    acceptTerms: z.literal("on"),
    acceptPrivacy: z.literal("on"),
    redirectTo: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"] });

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = SignUpSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms") ?? undefined,
    acceptPrivacy: formData.get("acceptPrivacy") ?? undefined,
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "confirmPassword") return { errorCode: "password_mismatch" };
    if (path === "password") return { errorCode: "password_too_short" };
    if (path === "acceptTerms" || path === "acceptPrivacy") return { errorCode: "terms_not_accepted" };
    return { errorCode: "invalid_input" };
  }

  const { firstName, lastName, email, password, redirectTo } = parsed.data;
  const name = `${firstName} ${lastName}`.trim();
  const dest = redirectTo ?? "/dashboard";
  const safeDest =
    dest.startsWith("/") && !dest.startsWith("//") ? dest : "/dashboard";

  const supabase = await createSupabaseServerClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const onboardingPath = `/onboarding?redirectTo=${encodeURIComponent(safeDest)}`;
  const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(onboardingPath)}`;

  const acceptedAt = new Date().toISOString();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { termsAcceptedAt: acceptedAt, privacyAcceptedAt: acceptedAt },
    },
  });

  if (error) {
    if (error.status === 422 || error.message.toLowerCase().includes("already")) {
      return { errorCode: "email_already_exists" };
    }
    return { errorCode: "generic_error" };
  }

  // Email auto-confirmé : session active immédiatement → créer le profil Prisma
  if (data.session && data.user) {
    const existing = await db.user.findUnique({ where: { authId: data.user.id } });
    if (!existing) {
      try {
        await db.user.create({
          data: {
            authId: data.user.id,
            email: data.user.email ?? email,
            name,
            termsAcceptedAt: new Date(acceptedAt),
            privacyAcceptedAt: new Date(acceptedAt),
          },
        });
      } catch {
        // Si la création échoue, l'utilisateur passera par /onboarding
      }
    }
    redirect(safeDest);
  }

  // Confirmation email requise
  return { messageCode: "confirm_email_sent" };
}

// ---------------------------------------------------------------------------
// Déconnexion
// ---------------------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Mot de passe oublié
// ---------------------------------------------------------------------------

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { errorCode: "email_required" };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password` }
  );

  if (error) {
    return { errorCode: "generic_error" };
  }

  // Réponse générique — ne pas confirmer si l'email existe
  return { messageCode: "password_reset_sent" };
}

// ---------------------------------------------------------------------------
// Réinitialisation du mot de passe
// ---------------------------------------------------------------------------

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
  });

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "confirmPassword") return { errorCode: "password_mismatch" };
    return { errorCode: "password_too_short" };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { errorCode: "reset_failed" };
  }

  redirect("/dashboard");
}
