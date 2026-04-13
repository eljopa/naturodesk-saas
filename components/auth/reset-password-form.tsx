"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resetPasswordAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const tErr = useTranslations("auth.errors");

  const [state, formAction, isPending] = useActionState<
    AuthFormState,
    FormData
  >(resetPasswordAction, null);

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
        <Label htmlFor="password" required>
          {t("passwordLabel")}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={t("passwordPlaceholder")}
          autoComplete="new-password"
          autoFocus
          required
          minLength={8}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
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
          minLength={8}
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
    </form>
  );
}
