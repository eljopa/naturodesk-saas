"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdviceSheetFormState } from "@/lib/actions/advice-sheets";
import type { AdviceSheetDraft } from "@/lib/advice-sheets/ai-draft";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectionState {
  consultationSummary: string;
  objectives:          string;
  dietaryAdvice:       string;
  supplements:         string;
  phytotherapy:        string;
  aromatherapy:        string;
  micronutrition:      string;
  gemmotherapy:        string;
  bachFlowers:         string;
  lifestyle:           string;
  physicalActivity:    string;
  additionalNotes:     string;
  precautions:         string;
}

type SectionKey = keyof SectionState;

interface AdviceSheetFormProps {
  action: (prevState: AdviceSheetFormState, formData: FormData) => Promise<AdviceSheetFormState>;
  generateDraftAction?: (consultationId: string) => Promise<AdviceSheetDraft | { error: string }>;
  consultationId?: string;
  patientId: string;
  parentId?: string;
  versionMajor?: number;
  versionMinor?: number;
  initialTitle?: string;
  initialSections?: Partial<SectionState>;
  submitLabel: string;
}

// ---------------------------------------------------------------------------
// Textarea component
// ---------------------------------------------------------------------------

function SectionTextarea({
  name,
  label,
  value,
  onChange,
  optional,
}: {
  name: SectionKey;
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {label}
        {optional && (
          <span className="text-xs text-slate-400 font-normal">optionnel</span>
        )}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-xl border border-nd-line bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-nd-sage resize-y"
        placeholder={optional ? "Laisser vide pour masquer cette section dans le PDF" : ""}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export function AdviceSheetForm({
  action,
  generateDraftAction,
  consultationId,
  patientId,
  parentId,
  versionMajor = 1,
  versionMinor = 0,
  initialTitle = "",
  initialSections = {},
  submitLabel,
}: AdviceSheetFormProps) {
  const t = useTranslations("adviceSheets");

  const [formState, formAction, isPending] = useActionState(action, null);

  const [title, setTitle] = useState(initialTitle);
  const [sections, setSections] = useState<SectionState>({
    consultationSummary: initialSections.consultationSummary ?? "",
    objectives:          initialSections.objectives          ?? "",
    dietaryAdvice:       initialSections.dietaryAdvice       ?? "",
    supplements:         initialSections.supplements         ?? "",
    phytotherapy:        initialSections.phytotherapy        ?? "",
    aromatherapy:        initialSections.aromatherapy        ?? "",
    micronutrition:      initialSections.micronutrition      ?? "",
    gemmotherapy:        initialSections.gemmotherapy        ?? "",
    bachFlowers:         initialSections.bachFlowers         ?? "",
    lifestyle:           initialSections.lifestyle           ?? "",
    physicalActivity:    initialSections.physicalActivity    ?? "",
    additionalNotes:     initialSections.additionalNotes     ?? "",
    precautions:         initialSections.precautions         ?? "",
  });

  const [aiPending, startAiTransition] = useTransition();
  const [aiApplied, setAiApplied] = useState(false);

  const set = (key: SectionKey) => (v: string) =>
    setSections((prev) => ({ ...prev, [key]: v }));

  const handleGenerateDraft = () => {
    if (!generateDraftAction || !consultationId) return;
    startAiTransition(async () => {
      const result = await generateDraftAction(consultationId);
      if ("error" in result) return;
      setSections((prev) => ({
        consultationSummary: result.consultationSummary ?? prev.consultationSummary,
        objectives:          result.objectives          ?? prev.objectives,
        dietaryAdvice:       result.dietaryAdvice       ?? prev.dietaryAdvice,
        supplements:         result.supplements         ?? prev.supplements,
        phytotherapy:        result.phytotherapy        ?? prev.phytotherapy,
        aromatherapy:        result.aromatherapy        ?? prev.aromatherapy,
        micronutrition:      result.micronutrition      ?? prev.micronutrition,
        gemmotherapy:        result.gemmotherapy        ?? prev.gemmotherapy,
        bachFlowers:         result.bachFlowers         ?? prev.bachFlowers,
        lifestyle:           result.lifestyle           ?? prev.lifestyle,
        physicalActivity:    result.physicalActivity    ?? prev.physicalActivity,
        additionalNotes:     result.additionalNotes     ?? prev.additionalNotes,
        precautions:         result.precautions         ?? prev.precautions,
      }));
      setAiApplied(true);
    });
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" name="patientId"     value={patientId} />
      <input type="hidden" name="versionMajor"  value={versionMajor} />
      <input type="hidden" name="versionMinor"  value={versionMinor} />
      {consultationId && <input type="hidden" name="consultationId" value={consultationId} />}
      {parentId       && <input type="hidden" name="parentId"       value={parentId} />}

      {/* Titre */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">
          {t("form.titleLabel")}
          <span className="text-xs text-slate-400 font-normal ml-2">optionnel</span>
        </label>
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("form.titlePlaceholder")}
          maxLength={200}
          className="w-full rounded-xl border border-nd-line bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-nd-sage"
        />
      </div>

      {/* Bandeau IA */}
      {generateDraftAction && consultationId && (
        <div className="rounded-xl border border-nd-sage/30 bg-nd-sage-tint/40 p-4 flex items-start gap-4">
          <Sparkles className="w-5 h-5 text-nd-sage-deep mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-nd-sage-deep">{t("ai.bannerTitle")}</p>
            <p className="text-xs text-slate-600 mt-0.5">{t("ai.bannerDescription")}</p>
            {aiApplied && (
              <p className="text-xs text-nd-sage-deep mt-1 font-medium">{t("ai.applied")}</p>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleGenerateDraft}
            disabled={aiPending}
            className="shrink-0"
          >
            {aiPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("ai.generating")}</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> {t("ai.generateButton")}</>
            )}
          </Button>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-5">
        <SectionTextarea name="consultationSummary" label={t("sections.consultationSummary")} value={sections.consultationSummary} onChange={set("consultationSummary")} optional />
        <SectionTextarea name="objectives"          label={t("sections.objectives")}          value={sections.objectives}          onChange={set("objectives")} optional />
        <SectionTextarea name="dietaryAdvice"       label={t("sections.dietaryAdvice")}       value={sections.dietaryAdvice}       onChange={set("dietaryAdvice")} optional />
        <SectionTextarea name="supplements"         label={t("sections.supplements")}         value={sections.supplements}         onChange={set("supplements")} optional />
        <SectionTextarea name="phytotherapy"        label={t("sections.phytotherapy")}        value={sections.phytotherapy}        onChange={set("phytotherapy")} optional />
        <SectionTextarea name="aromatherapy"        label={t("sections.aromatherapy")}        value={sections.aromatherapy}        onChange={set("aromatherapy")} optional />
        <SectionTextarea name="micronutrition"      label={t("sections.micronutrition")}      value={sections.micronutrition}      onChange={set("micronutrition")} optional />
        <SectionTextarea name="gemmotherapy"        label={t("sections.gemmotherapy")}        value={sections.gemmotherapy}        onChange={set("gemmotherapy")} optional />
        <SectionTextarea name="bachFlowers"         label={t("sections.bachFlowers")}         value={sections.bachFlowers}         onChange={set("bachFlowers")} optional />
        <SectionTextarea name="lifestyle"           label={t("sections.lifestyle")}           value={sections.lifestyle}           onChange={set("lifestyle")} optional />
        <SectionTextarea name="physicalActivity"    label={t("sections.physicalActivity")}    value={sections.physicalActivity}    onChange={set("physicalActivity")} optional />
        <SectionTextarea name="additionalNotes"     label={t("sections.additionalNotes")}     value={sections.additionalNotes}     onChange={set("additionalNotes")} optional />
        <SectionTextarea name="precautions"         label={t("sections.precautions")}         value={sections.precautions}         onChange={set("precautions")} optional />
      </div>

      {/* Error */}
      {formState?.errorCode && (
        <p className="text-sm text-red-600">
          {t(`errors.${formState.errorCode}` as Parameters<typeof t>[0])}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" size="md" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
