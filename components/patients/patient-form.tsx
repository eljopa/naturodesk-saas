"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PatientFormState } from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PatientFormDefaults {
  firstName?: string;
  lastName?: string;
  birthDate?: string; // "YYYY-MM-DD"
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  profession?: string | null;
  notes?: string | null;
  medicalHistory?: string | null;
  allergies?: string | null;
}

interface PatientFormProps {
  action: (prevState: PatientFormState, formData: FormData) => Promise<PatientFormState>;
  defaultValues?: PatientFormDefaults;
  submitLabel: string;
  cancelHref: string;
}

export function PatientForm({
  action,
  defaultValues,
  submitLabel,
  cancelHref,
}: PatientFormProps) {
  const t = useTranslations("patients.form");
  const tErr = useTranslations("patients.form.errors");

  const [state, formAction, isPending] = useActionState<
    PatientFormState,
    FormData
  >(action, null);

  const errorMessage = state?.errorCode ? tErr(state.errorCode) : null;

  return (
    <form action={formAction} className="space-y-8">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {/* Identité */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          {t("sectionIdentity")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName" required>
              {t("firstNameLabel")}
            </Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={defaultValues?.firstName}
              placeholder={t("firstNamePlaceholder")}
              autoComplete="given-name"
              required
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName" required>
              {t("lastNameLabel")}
            </Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={defaultValues?.lastName}
              placeholder={t("lastNamePlaceholder")}
              autoComplete="family-name"
              required
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="birthDate">{t("birthDateLabel")}</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={defaultValues?.birthDate}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profession">{t("professionLabel")}</Label>
            <Input
              id="profession"
              name="profession"
              defaultValue={defaultValues?.profession ?? ""}
              placeholder={t("professionPlaceholder")}
              disabled={isPending}
            />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          {t("sectionContact")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">{t("phoneLabel")}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={defaultValues?.phone ?? ""}
              placeholder={t("phonePlaceholder")}
              autoComplete="tel"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultValues?.email ?? ""}
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="address">{t("addressLabel")}</Label>
            <Textarea
              id="address"
              name="address"
              defaultValue={defaultValues?.address ?? ""}
              placeholder={t("addressPlaceholder")}
              rows={2}
              disabled={isPending}
            />
          </div>
        </div>
      </section>

      {/* Données cliniques */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          {t("sectionClinical")}
        </h2>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="allergies">{t("allergiesLabel")}</Label>
            <Textarea
              id="allergies"
              name="allergies"
              defaultValue={defaultValues?.allergies ?? ""}
              placeholder={t("allergiesPlaceholder")}
              rows={2}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="medicalHistory">{t("medicalHistoryLabel")}</Label>
            <Textarea
              id="medicalHistory"
              name="medicalHistory"
              defaultValue={defaultValues?.medicalHistory ?? ""}
              placeholder={t("medicalHistoryPlaceholder")}
              rows={3}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">{t("notesLabel")}</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={defaultValues?.notes ?? ""}
              placeholder={t("notesPlaceholder")}
              rows={3}
              disabled={isPending}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isPending}
        >
          {submitLabel}
        </Button>
        <Button variant="secondary" size="md" asChild>
          <Link href={cancelHref}>{t("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
