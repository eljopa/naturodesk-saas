"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ClinicalFormState } from "@/lib/actions/clinical";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface Symptom {
  id: string;
  label: string;
  intensity: number | null;
  duration: string | null;
  category: string | null;
}

interface SymptomSectionProps {
  symptoms: Symptom[];
  addAction: (prevState: ClinicalFormState, formData: FormData) => Promise<ClinicalFormState>;
  deleteAction: (prevState: null, formData: FormData) => Promise<null>;
}

export function SymptomSection({ symptoms, addAction, deleteAction }: SymptomSectionProps) {
  const t = useTranslations("consultations.symptoms");
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
      {symptoms.length === 0 && !showForm && (
        <p className="text-sm text-slate-500">{t("empty")}</p>
      )}

      {symptoms.length > 0 && (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {symptoms.map((s) => (
            <li key={s.id} className="flex items-start gap-3 px-4 py-3 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{s.label}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {s.intensity != null && (
                    <span className="text-xs text-slate-500">
                      {t("intensityField")} : {s.intensity}/10
                    </span>
                  )}
                  {s.duration && (
                    <span className="text-xs text-slate-500">{s.duration}</span>
                  )}
                  {s.category && (
                    <span className="text-xs text-slate-500">{s.category}</span>
                  )}
                </div>
              </div>
              <form action={(fd) => { deleteAction(null, fd); }}>
                <input type="hidden" name="id" value={s.id} />
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
            <Label htmlFor="sym-label" required>{t("labelField")}</Label>
            <Input
              id="sym-label"
              name="label"
              placeholder={t("labelPlaceholder")}
              required
              disabled={isPending}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="sym-intensity">{t("intensityField")}</Label>
              <Input
                id="sym-intensity"
                name="intensity"
                type="number"
                min={1}
                max={10}
                placeholder="1–10"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="sym-duration">{t("durationField")}</Label>
              <Input
                id="sym-duration"
                name="duration"
                placeholder={t("durationPlaceholder")}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="sym-category">{t("categoryField")}</Label>
            <Input
              id="sym-category"
              name="category"
              placeholder={t("categoryPlaceholder")}
              disabled={isPending}
            />
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
