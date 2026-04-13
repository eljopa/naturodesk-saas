"use client";

import { useActionState } from "react";
import type { AdminUserFormState } from "@/lib/actions/admin/users";
import { Button } from "@/components/ui/button";

interface UserDetailActionsProps {
  isActive: boolean;
  suspendAction: (prevState: AdminUserFormState, formData: FormData) => Promise<AdminUserFormState>;
  reactivateAction: (prevState: AdminUserFormState, formData: FormData) => Promise<AdminUserFormState>;
}

export function UserDetailActions({
  isActive,
  suspendAction,
  reactivateAction,
}: UserDetailActionsProps) {
  const [suspendState, suspendFormAction, suspendPending] = useActionState<
    AdminUserFormState,
    FormData
  >(suspendAction, null);

  const [reactState, reactFormAction, reactPending] = useActionState<
    AdminUserFormState,
    FormData
  >(reactivateAction, null);

  const errorCode = suspendState?.errorCode ?? reactState?.errorCode;

  return (
    <div className="shrink-0 space-y-2">
      {errorCode && (
        <p className="text-xs text-red-600 text-right">{errorCode}</p>
      )}
      {isActive ? (
        <form action={suspendFormAction}>
          <Button type="submit" variant="destructive" size="sm" loading={suspendPending}>
            Suspendre le compte
          </Button>
        </form>
      ) : (
        <form action={reactFormAction}>
          <Button type="submit" variant="secondary" size="sm" loading={reactPending}>
            Réactiver le compte
          </Button>
        </form>
      )}
    </div>
  );
}
