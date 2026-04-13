"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { forgotPasswordAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const tErr = useTranslations("auth.errors");

  const [state, formAction, isPending] = useActionState<
    AuthFormState,
    FormData
  >(forgotPasswordAction, null);

  if (state?.messageCode === "password_reset_sent") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-50">
          <CheckCircle className="w-6 h-6 text-teal-600" />
        </div>
        <p className="text-sm text-slate-600">{t("successMessage")}</p>
        <Link
          href="/login"
          className="text-sm text-teal-700 hover:underline font-medium"
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  const errorMessage = state?.errorCode ? tErr(state.errorCode) : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" required>
          {t("emailLabel")}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
          autoFocus
          required
          disabled={isPending}
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

      <Link
        href="/login"
        className="text-center text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        {t("backToLogin")}
      </Link>
    </form>
  );
}
