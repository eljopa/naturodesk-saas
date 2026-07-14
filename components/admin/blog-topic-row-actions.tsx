"use client";

import { useActionState } from "react";
import type { AdminBlogFormState } from "@/lib/actions/admin/blog";
import { Button } from "@/components/ui/button";

type BoundAction = (prevState: AdminBlogFormState, formData: FormData) => Promise<AdminBlogFormState>;

interface LocaleActionButtonProps {
  label: string;
  action: BoundAction;
}

function LocaleActionButton({ label, action }: LocaleActionButtonProps) {
  const [, formAction, pending] = useActionState<AdminBlogFormState, FormData>(action, null);
  return (
    <form action={formAction}>
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        {label}
      </Button>
    </form>
  );
}

interface BlogTopicRowActionsProps {
  frAction?: { label: string; action: BoundAction };
  enAction?: { label: string; action: BoundAction };
  regenerateAction: BoundAction;
  deleteAction: BoundAction;
}

export function BlogTopicRowActions({ frAction, enAction, regenerateAction, deleteAction }: BlogTopicRowActionsProps) {
  const [, regenerateFormAction, regeneratePending] = useActionState<AdminBlogFormState, FormData>(regenerateAction, null);
  const [, deleteFormAction, deletePending] = useActionState<AdminBlogFormState, FormData>(deleteAction, null);

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {frAction && <LocaleActionButton label={frAction.label} action={frAction.action} />}
      {enAction && <LocaleActionButton label={enAction.label} action={enAction.action} />}
      <form action={regenerateFormAction}>
        <Button type="submit" variant="secondary" size="sm" loading={regeneratePending}>
          Régénérer images
        </Button>
      </form>
      <form
        action={deleteFormAction}
        onSubmit={(e) => {
          if (!window.confirm("Supprimer définitivement ce sujet et ses articles ?")) {
            e.preventDefault();
          }
        }}
      >
        <Button type="submit" variant="destructive" size="sm" loading={deletePending}>
          Supprimer
        </Button>
      </form>
    </div>
  );
}
