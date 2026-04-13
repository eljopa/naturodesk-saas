"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { FollowUpFormState } from "@/lib/actions/followups";

interface Appointment {
  id: string;
  startAt: string; // ISO
}

interface FollowUpFormProps {
  action: (prevState: FollowUpFormState, formData: FormData) => Promise<FollowUpFormState>;
  appointments: Appointment[];
  cancelHref: string;
  locale: string;
  defaultValues?: {
    appointmentId?: string | null;
    symptomEvolution?: string | null;
    protocolAdjustment?: string | null;
    observations?: string | null;
    nextSteps?: string | null;
  };
  submitLabel: string;
}

export function FollowUpForm({
  action,
  appointments,
  cancelHref,
  locale,
  defaultValues,
  submitLabel,
}: FollowUpFormProps) {
  const t = useTranslations("followups");
  const [state, formAction, pending] = useActionState<FollowUpFormState, FormData>(
    action,
    null
  );

  const errorCode = state?.errorCode;

  return (
    <form action={formAction} className="space-y-6">
      {errorCode && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {t(`form.errors.${errorCode}`)}
        </p>
      )}

      {/* Rendez-vous associé */}
      {appointments.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="appointmentId">{t("form.appointmentLabel")}</Label>
          <Select
            id="appointmentId"
            name="appointmentId"
            defaultValue={defaultValues?.appointmentId ?? ""}
          >
            <option value="">{t("form.appointmentNone")}</option>
            {appointments.map((a) => {
              const d = new Date(a.startAt);
              return (
                <option key={a.id} value={a.id}>
                  {d.toLocaleDateString(locale, {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </option>
              );
            })}
          </Select>
        </div>
      )}

      {/* Évolution des symptômes */}
      <div className="space-y-1.5">
        <Label htmlFor="symptomEvolution">{t("form.symptomEvolutionLabel")}</Label>
        <Textarea
          id="symptomEvolution"
          name="symptomEvolution"
          rows={4}
          placeholder={t("form.symptomEvolutionPlaceholder")}
          defaultValue={defaultValues?.symptomEvolution ?? ""}
        />
      </div>

      {/* Ajustement du protocole */}
      <div className="space-y-1.5">
        <Label htmlFor="protocolAdjustment">{t("form.protocolAdjustmentLabel")}</Label>
        <Textarea
          id="protocolAdjustment"
          name="protocolAdjustment"
          rows={4}
          placeholder={t("form.protocolAdjustmentPlaceholder")}
          defaultValue={defaultValues?.protocolAdjustment ?? ""}
        />
      </div>

      {/* Observations */}
      <div className="space-y-1.5">
        <Label htmlFor="observations">{t("form.observationsLabel")}</Label>
        <Textarea
          id="observations"
          name="observations"
          rows={4}
          placeholder={t("form.observationsPlaceholder")}
          defaultValue={defaultValues?.observations ?? ""}
        />
      </div>

      {/* Prochaines étapes */}
      <div className="space-y-1.5">
        <Label htmlFor="nextSteps">{t("form.nextStepsLabel")}</Label>
        <Textarea
          id="nextSteps"
          name="nextSteps"
          rows={3}
          placeholder={t("form.nextStepsPlaceholder")}
          defaultValue={defaultValues?.nextSteps ?? ""}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" size="md" loading={pending}>
          {submitLabel}
        </Button>
        <Button variant="secondary" size="md" asChild>
          <Link href={cancelHref}>{t("form.cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
