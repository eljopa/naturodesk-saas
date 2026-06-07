"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { StickyNote, Check, Loader2 } from "lucide-react";
import { saveNoteAction } from "@/lib/actions/messages";

interface NoteEditorProps {
  messageId: string;
  initialNotes: string | null;
}

export function NoteEditor({ messageId, initialNotes }: NoteEditorProps) {
  const t = useTranslations("messages");

  const [state, formAction, isPending] = useActionState(
    async (_prev: { success: boolean } | null, formData: FormData) => {
      const notes = (formData.get("notes") as string) ?? "";
      return saveNoteAction(messageId, notes);
    },
    null
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <StickyNote className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">{t("notesSection")}</h3>
      </div>

      <form action={formAction} className="space-y-3">
        <textarea
          name="notes"
          defaultValue={initialNotes ?? ""}
          placeholder={t("notesPlaceholder")}
          rows={4}
          className="w-full rounded-lg border border-nd-line bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-nd-sage focus:border-nd-sage resize-none transition-colors"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">{t("notesHint")}</p>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : state?.success ? (
              <Check className="w-3.5 h-3.5 text-nd-sage" />
            ) : null}
            {state?.success && !isPending ? t("noteSaved") : t("saveNote")}
          </button>
        </div>
      </form>
    </div>
  );
}
