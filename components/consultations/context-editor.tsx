"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ConsultationFormState } from "@/lib/actions/consultations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ContextEditorProps {
  context: string | null;
  updateAction: (prevState: ConsultationFormState, formData: FormData) => Promise<ConsultationFormState>;
}

export function ContextEditor({ context, updateAction }: ContextEditorProps) {
  const t = useTranslations("consultations.detail");
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState<ConsultationFormState, FormData>(
    async (prev, fd) => {
      const result = await updateAction(prev, fd);
      if (!result) setEditing(false);
      return result;
    },
    null
  );

  const errorMessage = state?.errorCode ? t(`errors.${state.errorCode}` as Parameters<typeof t>[0]) : null;

  if (!editing) {
    return (
      <div className="space-y-2">
        {context ? (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{context}</p>
        ) : (
          <p className="text-sm text-slate-400 italic">{t("contextEmpty")}</p>
        )}
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          {t("contextEdit")}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      <Textarea
        name="context"
        defaultValue={context ?? ""}
        rows={6}
        disabled={isPending}
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" loading={isPending}>
          {t("contextSave")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(false)}
          disabled={isPending}
        >
          {t("contextEdit")}
        </Button>
      </div>
    </form>
  );
}
