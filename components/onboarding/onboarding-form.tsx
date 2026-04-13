"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createProfileAction, type OnboardingFormState } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OnboardingFormProps {
  email?: string;
}

export function OnboardingForm({ email }: OnboardingFormProps) {
  const t = useTranslations("onboarding");
  const tErr = useTranslations("onboarding.errors");

  const [state, formAction, isPending] = useActionState<
    OnboardingFormState,
    FormData
  >(createProfileAction, null);

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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
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

        <div className="flex flex-col gap-2">
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="cabinetName">{t("cabinetNameLabel")}</Label>
        <Input
          id="cabinetName"
          name="cabinetName"
          placeholder={t("cabinetNamePlaceholder")}
          autoComplete="organization"
          disabled={isPending}
        />
        <p className="text-xs text-slate-400">{t("cabinetNameHelp")}</p>
      </div>

      {email && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">Email :</span>{" "}
            {email}
          </p>
        </div>
      )}

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
