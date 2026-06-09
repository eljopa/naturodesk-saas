"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signUpAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterFormProps {
  redirectTo: string;
  planLabel?: string;
  loginHref: string;
}

export function RegisterForm({ redirectTo, planLabel, loginHref }: RegisterFormProps) {
  const t = useTranslations("auth.register");
  const tErr = useTranslations("auth.errors");

  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    signUpAction,
    null
  );

  const errorMessage = state?.errorCode
    ? tErr(state.errorCode as Parameters<typeof tErr>[0])
    : null;
  const isConfirmation = state?.messageCode === "confirm_email_sent";

  if (isConfirmation) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-nd-sage-tint flex items-center justify-center mx-auto mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="w-6 h-6 text-nd-sage-deep"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" />
            <path d="m22 6-10 7L2 6" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="font-semibold text-slate-900 mb-2">{t("confirmTitle")}</h2>
        <p className="text-sm text-slate-500">{t("confirmSubtitle")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {planLabel && (
        <div className="rounded-lg bg-nd-sage-tint border border-nd-sage-tint px-4 py-2.5 text-sm text-nd-sage-deep font-medium text-center">
          {t("planSelected")} <span className="font-bold">{planLabel}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName" required>
            {t("firstNameLabel")}
          </Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder={t("firstNamePlaceholder")}
            autoComplete="given-name"
            autoFocus
            required
            disabled={isPending}
            error={!!errorMessage}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName" required>
            {t("lastNameLabel")}
          </Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder={t("lastNamePlaceholder")}
            autoComplete="family-name"
            required
            disabled={isPending}
            error={!!errorMessage}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" required>
          {t("emailLabel")}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
          required
          disabled={isPending}
          error={!!errorMessage}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" required>
          {t("passwordLabel")}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={t("passwordPlaceholder")}
          autoComplete="new-password"
          required
          disabled={isPending}
          error={!!errorMessage}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword" required>
          {t("confirmPasswordLabel")}
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder={t("confirmPasswordPlaceholder")}
          autoComplete="new-password"
          required
          disabled={isPending}
          error={!!errorMessage}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isPending}
        className="w-full mt-1"
      >
        {t("submit")}
      </Button>

      <p className="text-center text-sm text-slate-500">
        {t("alreadyAccount")}{" "}
        <Link
          href={loginHref}
          className="font-medium text-nd-sage-deep hover:text-nd-forest hover:underline transition-colors"
        >
          {t("loginLink")}
        </Link>
      </p>
    </form>
  );
}
