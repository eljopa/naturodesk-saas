"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ConsultationFormState } from "@/lib/actions/consultations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface PatientOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface AppointmentOption {
  id: string;
  startAt: Date;
  type: string;
}

interface ConsultationFormProps {
  action: (prevState: ConsultationFormState, formData: FormData) => Promise<ConsultationFormState>;
  patients: PatientOption[];
  appointments?: AppointmentOption[];
  defaultPatientId?: string;
  defaultAppointmentId?: string;
  cancelHref: string;
  locale: string;
}

export function ConsultationForm({
  action,
  patients,
  appointments = [],
  defaultPatientId,
  defaultAppointmentId,
  cancelHref,
  locale,
}: ConsultationFormProps) {
  const t = useTranslations("consultations");
  const tForm = useTranslations("consultations.form");

  const [state, formAction, isPending] = useActionState<ConsultationFormState, FormData>(
    action,
    null
  );

  const errorMessage = state?.errorCode ? tForm(`errors.${state.errorCode}`) : null;

  return (
    <form action={formAction} className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="patientId" required>{tForm("patientLabel")}</Label>
        <Select
          id="patientId"
          name="patientId"
          defaultValue={defaultPatientId ?? ""}
          required
          disabled={isPending}
        >
          <option value="">{tForm("patientPlaceholder")}</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </Select>
      </div>

      {appointments.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="appointmentId">{tForm("appointmentLabel")}</Label>
          <Select
            id="appointmentId"
            name="appointmentId"
            defaultValue={defaultAppointmentId ?? ""}
            disabled={isPending}
          >
            <option value="">{tForm("appointmentNone")}</option>
            {appointments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.startAt.toLocaleString(locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" — "}
                {a.type === "BILAN"
                  ? t("statusDraft") // reuse translation key
                  : a.type}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="context">{tForm("contextLabel")}</Label>
        <Textarea
          id="context"
          name="context"
          placeholder={tForm("contextPlaceholder")}
          rows={5}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="primary" size="md" loading={isPending}>
          {tForm("submitCreate")}
        </Button>
        <Button variant="secondary" size="md" asChild>
          <Link href={cancelHref}>{tForm("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
