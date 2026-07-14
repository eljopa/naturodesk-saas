"use client";

import { useActionState } from "react";
import { generateBlogArticleNowAction, type AdminBlogFormState } from "@/lib/actions/admin/blog";
import { Button } from "@/components/ui/button";

export function BlogGenerateNowButton() {
  const [state, formAction, pending] = useActionState<AdminBlogFormState, FormData>(generateBlogArticleNowAction, null);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <Button type="submit" variant="primary" size="md" loading={pending}>
        Générer maintenant
      </Button>
      {state?.errorCode && <span className="text-xs text-red-600">{state.errorCode}</span>}
      {state?.success && <span className="text-xs text-emerald-600">Génération lancée</span>}
    </form>
  );
}
