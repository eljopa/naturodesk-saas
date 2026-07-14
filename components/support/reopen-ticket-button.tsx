"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import type { SupportFormState } from "@/lib/actions/support";
import { Button } from "@/components/ui/button";

type BoundAction = (prevState: SupportFormState, formData: FormData) => Promise<SupportFormState>;

interface ReopenTicketButtonProps {
  reopenAction: BoundAction;
}

export function ReopenTicketButton({ reopenAction }: ReopenTicketButtonProps) {
  const t = useTranslations("support");
  const [state, formAction, pending] = useActionState<SupportFormState, FormData>(reopenAction, null);

  return (
    <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm text-blue-900">{t("reopenBanner")}</span>
        </div>
        <form action={formAction}>
          <Button type="submit" variant="secondary" size="sm" loading={pending}>
            {t("reopenButton")}
          </Button>
        </form>
      </div>
      {state?.errorCode && <p className="text-sm text-red-600 mt-2">{t(`errors.${state.errorCode}` as Parameters<typeof t>[0])}</p>}
    </div>
  );
}
