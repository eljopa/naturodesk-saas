"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ProtocolFormState } from "@/lib/actions/protocols";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const PROTOCOL_CATEGORIES = [
  "DIGESTIVE",
  "HORMONAL",
  "STRESS",
  "DETOX",
  "IMMUNITY",
  "ENERGY",
  "OTHER",
] as const;

interface ProtocolFormDefaults {
  title?: string;
  category?: string;
  summary?: string | null;
  content?: string | null;
}

interface ProtocolFormProps {
  action: (prevState: ProtocolFormState, formData: FormData) => Promise<ProtocolFormState>;
  defaultValues?: ProtocolFormDefaults;
  submitLabel: string;
  cancelHref: string;
  deleteAction?: () => Promise<void>;
}

export function ProtocolForm({
  action,
  defaultValues,
  submitLabel,
  cancelHref,
  deleteAction,
}: ProtocolFormProps) {
  const t = useTranslations("protocols.form");
  const tCat = useTranslations("protocols.categories");

  const [state, formAction, isPending] = useActionState<ProtocolFormState, FormData>(
    action,
    null
  );

  const errorMessage = state?.errorCode ? t(`errors.${state.errorCode}`) : null;

  return (
    <div className="space-y-8">
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
          <Label htmlFor="title" required>{t("titleLabel")}</Label>
          <Input
            id="title"
            name="title"
            defaultValue={defaultValues?.title ?? ""}
            placeholder={t("titlePlaceholder")}
            required
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="category" required>{t("categoryLabel")}</Label>
          <Select
            id="category"
            name="category"
            defaultValue={defaultValues?.category ?? ""}
            required
            disabled={isPending}
          >
            <option value="" disabled>—</option>
            {PROTOCOL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tCat(c)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="summary">{t("summaryLabel")}</Label>
          <Textarea
            id="summary"
            name="summary"
            defaultValue={defaultValues?.summary ?? ""}
            placeholder={t("summaryPlaceholder")}
            rows={2}
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="content">{t("contentLabel")}</Label>
          <Textarea
            id="content"
            name="content"
            defaultValue={defaultValues?.content ?? ""}
            placeholder={t("contentPlaceholder")}
            rows={10}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" size="md" loading={isPending}>
            {submitLabel}
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href={cancelHref}>{t("cancel")}</Link>
          </Button>
        </div>
      </form>

      {deleteAction && (
        <div className="pt-6 border-t border-slate-200">
          <form action={deleteAction}>
            <Button type="submit" variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              {t("deleteButton")}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
