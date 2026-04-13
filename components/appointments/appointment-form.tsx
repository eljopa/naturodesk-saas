"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AppointmentFormState } from "@/lib/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface AppointmentFormDefaults {
  patientId?: string;
  startAt?: string; // "YYYY-MM-DDTHH:mm"
  endAt?: string;   // "YYYY-MM-DDTHH:mm"
  type?: "BILAN" | "SUIVI";
  notes?: string | null;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface AppointmentFormProps {
  action: (prevState: AppointmentFormState, formData: FormData) => Promise<AppointmentFormState>;
  patients: Patient[];
  defaultValues?: AppointmentFormDefaults;
  submitLabel: string;
  cancelHref: string;
  showCancelButton?: boolean;
  cancelAction?: (appointmentId: string) => Promise<void>;
}

export function AppointmentForm({
  action,
  patients,
  defaultValues,
  submitLabel,
  cancelHref,
}: AppointmentFormProps) {
  const t = useTranslations("appointments.form");
  const tErr = useTranslations("appointments.form.errors");

  const [state, formAction, isPending] = useActionState<
    AppointmentFormState,
    FormData
  >(action, null);

  const errorMessage = state?.errorCode ? tErr(state.errorCode) : null;

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Patient */}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="patientId" required>
            {t("patientLabel")}
          </Label>
          <Select
            id="patientId"
            name="patientId"
            defaultValue={defaultValues?.patientId ?? ""}
            required
            disabled={isPending}
            error={!!errorMessage}
          >
            <option value="" disabled>
              {t("patientPlaceholder")}
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName} {p.firstName}
              </option>
            ))}
          </Select>
        </div>

        {/* Type */}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="type" required>
            {t("typeLabel")}
          </Label>
          <Select
            id="type"
            name="type"
            defaultValue={defaultValues?.type ?? "BILAN"}
            required
            disabled={isPending}
          >
            <option value="BILAN">{t("typeBilan")}</option>
            <option value="SUIVI">{t("typeSuivi")}</option>
          </Select>
        </div>

        {/* Start */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="startAt" required>
            {t("startAtLabel")}
          </Label>
          <Input
            id="startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={defaultValues?.startAt}
            required
            disabled={isPending}
          />
        </div>

        {/* End */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="endAt" required>
            {t("endAtLabel")}
          </Label>
          <Input
            id="endAt"
            name="endAt"
            type="datetime-local"
            defaultValue={defaultValues?.endAt}
            required
            disabled={isPending}
          />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-2 sm:col-span-2">
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

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="md" loading={isPending}>
          {submitLabel}
        </Button>
        <Button variant="secondary" size="md" asChild>
          <Link href={cancelHref}>{t("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
