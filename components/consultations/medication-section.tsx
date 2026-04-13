"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ClinicalFormState } from "@/lib/actions/clinical";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
}

interface MedicationSectionProps {
  medications: Medication[];
  addAction: (prevState: ClinicalFormState, formData: FormData) => Promise<ClinicalFormState>;
  deleteAction: (prevState: null, formData: FormData) => Promise<null>;
}

export function MedicationSection({ medications, addAction, deleteAction }: MedicationSectionProps) {
  const t = useTranslations("consultations.medications");
  const [showForm, setShowForm] = useState(false);
  const [addState, formAction, isPending] = useActionState<ClinicalFormState, FormData>(
    async (prev, fd) => {
      const result = await addAction(prev, fd);
      if (!result) setShowForm(false);
      return result;
    },
    null
  );

  const errorMessage = addState?.errorCode ? t(`errors.${addState.errorCode}` as Parameters<typeof t>[0]) : null;

  return (
    <div className="space-y-4">
      {medications.length === 0 && !showForm && (
        <p className="text-sm text-slate-500">{t("empty")}</p>
      )}

      {medications.length > 0 && (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {medications.map((m) => (
            <li key={m.id} className="flex items-start gap-3 px-4 py-3 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{m.name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {m.dosage && (
                    <span className="text-xs text-slate-500">{m.dosage}</span>
                  )}
                  {m.frequency && (
                    <span className="text-xs text-slate-500">{m.frequency}</span>
                  )}
                  {m.duration && (
                    <span className="text-xs text-slate-500">{m.duration}</span>
                  )}
                </div>
              </div>
              <form action={(fd) => { deleteAction(null, fd); }}>
                <input type="hidden" name="id" value={m.id} />
                <button
                  type="submit"
                  className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                  title={t("deleteButton")}
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form action={formAction} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor="med-name" required>{t("nameField")}</Label>
            <Input
              id="med-name"
              name="name"
              placeholder={t("namePlaceholder")}
              required
              disabled={isPending}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="med-dosage">{t("dosageField")}</Label>
              <Input
                id="med-dosage"
                name="dosage"
                placeholder={t("dosagePlaceholder")}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="med-frequency">{t("frequencyField")}</Label>
              <Input
                id="med-frequency"
                name="frequency"
                placeholder={t("frequencyPlaceholder")}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="med-duration">{t("durationField")}</Label>
              <Input
                id="med-duration"
                name="duration"
                placeholder={t("durationPlaceholder")}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" variant="primary" size="sm" loading={isPending}>
              {t("submitButton")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              disabled={isPending}
            >
              {t("cancelButton")}
            </Button>
          </div>
        </form>
      )}

      {!showForm && (
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          {t("addButton")}
        </Button>
      )}
    </div>
  );
}
