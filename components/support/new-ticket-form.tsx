"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { createTicketAction, type SupportFormState } from "@/lib/actions/support";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewTicketForm() {
  const t = useTranslations("support");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<SupportFormState, FormData>(createTicketAction, null);

  if (!open) {
    return (
      <div className="flex justify-end mb-6">
        <Button variant="primary" size="md" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          {t("newTicket")}
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("newTicketTitle")}</CardTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label={t("cancel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <form action={formAction} className="space-y-4">
          {state?.errorCode && (
            <p className="text-sm text-red-600">{t(`errors.${state.errorCode}` as Parameters<typeof t>[0])}</p>
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor="ticket-title">{t("titleLabel")}</Label>
            <Input id="ticket-title" name="title" placeholder={t("titlePlaceholder")} required disabled={pending} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ticket-body">{t("bodyLabel")}</Label>
            <Textarea id="ticket-body" name="body" placeholder={t("bodyPlaceholder")} rows={5} required disabled={pending} />
          </div>
          <div className="flex flex-col gap-1 max-w-xs">
            <Label htmlFor="ticket-priority">{t("priorityLabel")}</Label>
            <Select id="ticket-priority" name="priority" defaultValue="NORMAL" disabled={pending}>
              <option value="LOW">{t("priorityLow")}</option>
              <option value="NORMAL">{t("priorityNormal")}</option>
              <option value="HIGH">{t("priorityHigh")}</option>
              <option value="URGENT">{t("priorityUrgent")}</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm" loading={pending}>
              {t("submit")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
