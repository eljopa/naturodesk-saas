"use client";

import { useActionState } from "react";
import type { AdminUserFormState } from "@/lib/actions/admin/users";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SubscriptionData {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  notes: string | null;
}

interface SubscriptionFormProps {
  subscription: SubscriptionData | null;
  updateAction: (
    prevState: AdminUserFormState,
    formData: FormData
  ) => Promise<AdminUserFormState>;
}

function toDateInput(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().split("T")[0] ?? "";
}

export function SubscriptionForm({
  subscription,
  updateAction,
}: SubscriptionFormProps) {
  const [state, formAction, isPending] = useActionState<AdminUserFormState, FormData>(
    updateAction,
    null
  );

  const errorMessage =
    state?.errorCode === "invalid_input"
      ? "Données invalides."
      : state?.errorCode
      ? "Une erreur est survenue."
      : null;

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && (
        <p className="text-xs text-green-600 font-medium">Abonnement mis à jour.</p>
      )}
      {errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="sub-plan">Plan</Label>
        <Select
          id="sub-plan"
          name="plan"
          defaultValue={subscription?.plan ?? "FREE"}
          disabled={isPending}
        >
          <option value="FREE">Gratuit (FREE)</option>
          <option value="STARTER">Starter</option>
          <option value="GROWTH">Growth</option>
          <option value="PRO">Pro</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="sub-status">Statut</Label>
        <Select
          id="sub-status"
          name="status"
          defaultValue={subscription?.status ?? "ACTIVE"}
          disabled={isPending}
        >
          <option value="TRIALING">Essai (TRIALING)</option>
          <option value="ACTIVE">Actif (ACTIVE)</option>
          <option value="PAST_DUE">Impayé (PAST_DUE)</option>
          <option value="CANCELED">Annulé (CANCELED)</option>
          <option value="SUSPENDED">Suspendu (SUSPENDED)</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="sub-trial">Fin d&apos;essai</Label>
        <input
          id="sub-trial"
          name="trialEndsAt"
          type="date"
          defaultValue={toDateInput(subscription?.trialEndsAt ?? null)}
          disabled={isPending}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="sub-period-start">Début de période</Label>
        <input
          id="sub-period-start"
          name="currentPeriodStart"
          type="date"
          defaultValue={toDateInput(subscription?.currentPeriodStart ?? null)}
          disabled={isPending}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="sub-period">Fin de période</Label>
        <input
          id="sub-period"
          name="currentPeriodEnd"
          type="date"
          defaultValue={toDateInput(subscription?.currentPeriodEnd ?? null)}
          disabled={isPending}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="sub-cancel-eop"
          name="cancelAtPeriodEnd"
          type="checkbox"
          value="true"
          defaultChecked={subscription?.cancelAtPeriodEnd ?? false}
          disabled={isPending}
          className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
        />
        <Label htmlFor="sub-cancel-eop" className="cursor-pointer">
          Annuler en fin de période
        </Label>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="sub-notes">Notes admin</Label>
        <Textarea
          id="sub-notes"
          name="notes"
          defaultValue={subscription?.notes ?? ""}
          placeholder="Notes internes…"
          rows={2}
          disabled={isPending}
        />
      </div>

      <Button type="submit" variant="primary" size="sm" loading={isPending}>
        Enregistrer
      </Button>
    </form>
  );
}
