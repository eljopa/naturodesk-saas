"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createDocumentAction,
  type KnowledgeFormState,
} from "@/lib/actions/knowledge";

const SOURCE_TYPES = ["MANUAL", "BDPM", "ANSM", "PUBMED"] as const;
const DOC_TYPES = ["MONOGRAPH", "NOTICE", "INTERACTION_SHEET", "STUDY"] as const;

const INITIAL: KnowledgeFormState = {};

export function DocumentForm() {
  const t = useTranslations("knowledge.form");
  const [state, action, pending] = useActionState(createDocumentAction, INITIAL);

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Title */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="title">{t("titleLabel")}</Label>
          <Input
            id="title"
            name="title"
            placeholder={t("titlePlaceholder")}
            required
          />
          {state.fieldErrors?.title && (
            <p className="text-xs text-red-600">{state.fieldErrors.title}</p>
          )}
        </div>

        {/* Drug key */}
        <div className="space-y-1.5">
          <Label htmlFor="drugKey">{t("drugKeyLabel")}</Label>
          <Input
            id="drugKey"
            name="drugKey"
            placeholder={t("drugKeyPlaceholder")}
            required
          />
          {state.fieldErrors?.drugKey && (
            <p className="text-xs text-red-600">{state.fieldErrors.drugKey}</p>
          )}
        </div>

        {/* URL */}
        <div className="space-y-1.5">
          <Label htmlFor="url">{t("urlLabel")}</Label>
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://…"
          />
        </div>

        {/* Source type */}
        <div className="space-y-1.5">
          <Label htmlFor="sourceType">{t("sourceTypeLabel")}</Label>
          <select
            id="sourceType"
            name="sourceType"
            defaultValue="MANUAL"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {SOURCE_TYPES.map((s) => (
              <option key={s} value={s}>
                {t(`sourceType${s}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>

        {/* Doc type */}
        <div className="space-y-1.5">
          <Label htmlFor="docType">{t("docTypeLabel")}</Label>
          <select
            id="docType"
            name="docType"
            defaultValue="MONOGRAPH"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {DOC_TYPES.map((d) => (
              <option key={d} value={d}>
                {t(`docType${d}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <Label htmlFor="content">{t("contentLabel")}</Label>
        <p className="text-xs text-slate-500">{t("contentHint")}</p>
        <textarea
          id="content"
          name="content"
          rows={14}
          required
          placeholder={t("contentPlaceholder")}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
        />
        {state.fieldErrors?.content && (
          <p className="text-xs text-red-600">{state.fieldErrors.content}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
        <p className="text-xs text-slate-500">{t("embedNotice")}</p>
      </div>
    </form>
  );
}
