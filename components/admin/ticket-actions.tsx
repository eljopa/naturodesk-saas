"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { AdminSupportFormState } from "@/lib/actions/admin/support";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TicketActionsProps {
  currentStatus: string;
  currentPriority: string;
  updateAction: (
    prevState: AdminSupportFormState,
    formData: FormData
  ) => Promise<AdminSupportFormState>;
  replyAction: (
    prevState: AdminSupportFormState,
    formData: FormData
  ) => Promise<AdminSupportFormState>;
}

export function TicketActions({
  currentStatus,
  currentPriority,
  updateAction,
  replyAction,
}: TicketActionsProps) {
  const [showStatusForm, setShowStatusForm] = useState(false);

  const [replyState, replyFormAction, replyPending] = useActionState<
    AdminSupportFormState,
    FormData
  >(async (prev, fd) => {
    const result = await replyAction(prev, fd);
    return result;
  }, null);

  const [updateState, updateFormAction, updatePending] = useActionState<
    AdminSupportFormState,
    FormData
  >(async (prev, fd) => {
    const result = await updateAction(prev, fd);
    if (result?.success) setShowStatusForm(false);
    return result;
  }, null);

  return (
    <div className="space-y-4">
      {/* Reply form */}
      <Card>
        <CardHeader>
          <CardTitle>Répondre</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form action={replyFormAction} className="space-y-3">
            {replyState?.errorCode && (
              <p className="text-sm text-red-600">
                {replyState.errorCode === "invalid_input"
                  ? "La réponse ne peut pas être vide."
                  : "Une erreur est survenue."}
              </p>
            )}
            {replyState?.success && (
              <p className="text-sm text-green-600">Réponse envoyée.</p>
            )}
            <Textarea
              name="body"
              placeholder="Réponse admin…"
              rows={4}
              required
              disabled={replyPending}
            />
            <Button type="submit" variant="primary" size="sm" loading={replyPending}>
              Envoyer la réponse
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Status / priority update */}
      {!showStatusForm ? (
        <button
          onClick={() => setShowStatusForm(true)}
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          Modifier le statut / la priorité
        </button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Statut &amp; priorité</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form action={updateFormAction} className="space-y-3">
              {updateState?.errorCode && (
                <p className="text-sm text-red-600">Erreur de mise à jour.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ticket-status">Statut</Label>
                  <Select
                    id="ticket-status"
                    name="status"
                    defaultValue={currentStatus}
                    disabled={updatePending}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ticket-priority">Priorité</Label>
                  <Select
                    id="ticket-priority"
                    name="priority"
                    defaultValue={currentPriority}
                    disabled={updatePending}
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" variant="primary" size="sm" loading={updatePending}>
                  Mettre à jour
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStatusForm(false)}
                  disabled={updatePending}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
