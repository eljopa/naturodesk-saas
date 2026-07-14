"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import type { SupportFormState } from "@/lib/actions/support";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type BoundAction = (prevState: SupportFormState, formData: FormData) => Promise<SupportFormState>;

interface TicketReplyFormProps {
  replyAction: BoundAction;
}

export function TicketReplyForm({ replyAction }: TicketReplyFormProps) {
  const t = useTranslations("support");
  const [state, formAction, pending] = useActionState<SupportFormState, FormData>(replyAction, null);

  return (
    <form action={formAction} className="space-y-3">
      {state?.errorCode && (
        <p className="text-sm text-red-600">{t(`errors.${state.errorCode}` as Parameters<typeof t>[0])}</p>
      )}
      <Textarea name="body" placeholder={t("replyPlaceholder")} rows={4} required disabled={pending} className="resize-none" />
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" loading={pending}>
          <Send className="w-3.5 h-3.5" />
          {t("send")}
        </Button>
      </div>
    </form>
  );
}
