"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  createInfoSectionAction,
  updateInfoSectionAction,
  deleteInfoSectionAction,
  type InfoSectionFormState,
} from "@/lib/actions/infoSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface InfoSectionData {
  id:           string;
  title:        string;
  description:  string;
  displayOrder: number;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function InfoSectionForm({
  section,
  onCancel,
}: {
  section?: InfoSectionData;
  onCancel: () => void;
}) {
  const t = useTranslations("webpage.infoSections.form");

  const action = section
    ? updateInfoSectionAction.bind(null, section.id)
    : createInfoSectionAction;

  const [state, formAction, isPending] = useActionState<InfoSectionFormState, FormData>(
    action,
    null
  );

  const errorMessage = state?.errorCode
    ? t(`errors.${state.errorCode}` as Parameters<typeof t>[0])
    : null;

  return (
    <form action={formAction} className="space-y-3 pt-2" noValidate>
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`info-title-${section?.id ?? "new"}`} required>
          {t("titleLabel")}
        </Label>
        <Input
          id={`info-title-${section?.id ?? "new"}`}
          name="title"
          defaultValue={section?.title ?? ""}
          placeholder={t("titlePlaceholder")}
          required
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`info-desc-${section?.id ?? "new"}`} required>
          {t("descriptionLabel")}
        </Label>
        <Textarea
          id={`info-desc-${section?.id ?? "new"}`}
          name="description"
          defaultValue={section?.description ?? ""}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
          disabled={isPending}
        />
      </div>

      <input type="hidden" name="displayOrder" value={section?.displayOrder ?? 0} />

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" loading={isPending}>
          {t("submit")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function InfoSectionRow({
  section,
  onEdit,
  onDelete,
}: {
  section: InfoSectionData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{section.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{section.description}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Modifier"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

interface InfoSectionsManagerProps {
  sections: InfoSectionData[];
}

export function InfoSectionsManager({ sections: initial }: InfoSectionsManagerProps) {
  const t = useTranslations("webpage.infoSections");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleDelete = async (id: string) => {
    await deleteInfoSectionAction(id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {!isAdding && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setIsAdding(true); setEditingId(null); }}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("addButton")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 p-4 rounded-lg border border-nd-sage-tint bg-nd-sage-wash">
            <InfoSectionForm onCancel={() => setIsAdding(false)} />
          </div>
        )}

        {initial.length === 0 && !isAdding ? (
          <p className="text-sm text-slate-400 py-4 text-center">{t("emptyTitle")}</p>
        ) : (
          <div>
            {initial.map((section) =>
              editingId === section.id ? (
                <div key={section.id} className="my-2 p-4 rounded-lg border border-nd-sage-tint bg-nd-sage-wash">
                  <InfoSectionForm
                    section={section}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <InfoSectionRow
                  key={section.id}
                  section={section}
                  onEdit={() => { setEditingId(section.id); setIsAdding(false); }}
                  onDelete={() => handleDelete(section.id)}
                />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
