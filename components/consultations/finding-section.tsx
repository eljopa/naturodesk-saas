"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ClinicalFormState } from "@/lib/actions/clinical";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";

const FINDING_CATEGORIES = [
  "SIDE_EFFECT",
  "INTERACTION",
  "DEPLETION",
  "RED_FLAG",
  "TERRAIN",
  "PROTOCOL",
  "QUESTION",
] as const;

type FindingCategory = (typeof FINDING_CATEGORIES)[number];

const CATEGORY_COLORS: Record<FindingCategory, string> = {
  SIDE_EFFECT: "bg-red-100 text-red-700",
  INTERACTION: "bg-orange-100 text-orange-700",
  DEPLETION: "bg-yellow-100 text-yellow-700",
  RED_FLAG: "bg-red-200 text-red-800",
  TERRAIN: "bg-teal-100 text-teal-700",
  PROTOCOL: "bg-blue-100 text-blue-700",
  QUESTION: "bg-slate-100 text-slate-600",
};

interface Finding {
  id: string;
  category: string;
  title: string;
  description: string;
  sourceType: string;
}

interface FindingSectionProps {
  findings: Finding[];
  addAction: (prevState: ClinicalFormState, formData: FormData) => Promise<ClinicalFormState>;
  deleteAction: (prevState: null, formData: FormData) => Promise<null>;
}

export function FindingSection({ findings, addAction, deleteAction }: FindingSectionProps) {
  const t = useTranslations("consultations.findings");
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
      {findings.length === 0 && !showForm && (
        <p className="text-sm text-slate-500">{t("empty")}</p>
      )}

      {findings.length > 0 && (
        <ul className="space-y-2">
          {findings.map((f) => {
            const cat = f.category as FindingCategory;
            const colorClass = CATEGORY_COLORS[cat] ?? "bg-slate-100 text-slate-600";
            const canDelete = f.sourceType === "MANUAL";
            return (
              <li key={f.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                        {t(`categories.${cat}`)}
                      </span>
                      <p className="text-sm font-medium text-slate-900">{f.title}</p>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{f.description}</p>
                  </div>
                  {canDelete && (
                    <form action={(fd) => { deleteAction(null, fd); }}>
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        type="submit"
                        className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                        title={t("deleteButton")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <form action={formAction} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor="find-category" required>{t("categoryField")}</Label>
            <Select id="find-category" name="category" required disabled={isPending}>
              {FINDING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="find-title" required>{t("titleField")}</Label>
            <Input
              id="find-title"
              name="title"
              placeholder={t("titlePlaceholder")}
              required
              disabled={isPending}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="find-description" required>{t("descriptionField")}</Label>
            <Textarea
              id="find-description"
              name="description"
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              required
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
