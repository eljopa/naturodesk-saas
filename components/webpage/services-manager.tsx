"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Plus, Clock, Euro } from "lucide-react";
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  type ServiceFormState,
} from "@/lib/actions/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  appointmentType: "BILAN" | "SUIVI";
  displayOrder: number;
}

// ---------------------------------------------------------------------------
// Service form (create ou edit)
// ---------------------------------------------------------------------------

function ServiceForm({
  service,
  onCancel,
}: {
  service?: ServiceData;
  onCancel: () => void;
}) {
  const t = useTranslations("webpage.services.form");

  const action = service
    ? updateServiceAction.bind(null, service.id)
    : createServiceAction;

  const [state, formAction, isPending] = useActionState<ServiceFormState, FormData>(
    action,
    null
  );

  const errorMessage = state?.errorCode ? t(`errors.${state.errorCode}` as Parameters<typeof t>[0]) : null;

  return (
    <form action={formAction} className="space-y-3 pt-2">
      {errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`name-${service?.id ?? "new"}`} required>
            {t("nameLabel")}
          </Label>
          <Input
            id={`name-${service?.id ?? "new"}`}
            name="name"
            defaultValue={service?.name ?? ""}
            placeholder={t("namePlaceholder")}
            required
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`duration-${service?.id ?? "new"}`} required>
            {t("durationLabel")}
          </Label>
          <div className="relative">
            <Input
              id={`duration-${service?.id ?? "new"}`}
              name="durationMinutes"
              type="number"
              min={15}
              max={480}
              step={15}
              defaultValue={service?.durationMinutes ?? 60}
              placeholder={t("durationPlaceholder")}
              required
              disabled={isPending}
              className="pr-10"
            />
            <Clock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`price-${service?.id ?? "new"}`}>
            {t("priceLabel")}
          </Label>
          <div className="relative">
            <Input
              id={`price-${service?.id ?? "new"}`}
              name="price"
              type="number"
              min={0}
              max={99999}
              step={0.01}
              defaultValue={service?.price ?? ""}
              placeholder={t("pricePlaceholder")}
              disabled={isPending}
              className="pr-8"
            />
            <Euro className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`type-${service?.id ?? "new"}`} required>
            {t("typeLabel")}
          </Label>
          <select
            id={`type-${service?.id ?? "new"}`}
            name="appointmentType"
            defaultValue={service?.appointmentType ?? "BILAN"}
            disabled={isPending}
            className="w-full rounded-lg border border-nd-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-nd-sage focus:border-nd-sage disabled:opacity-50"
          >
            <option value="BILAN">Bilan de vitalité</option>
            <option value="SUIVI">Consultation de suivi</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`desc-${service?.id ?? "new"}`}>
            {t("descriptionLabel")}
          </Label>
          <Textarea
            id={`desc-${service?.id ?? "new"}`}
            name="description"
            defaultValue={service?.description ?? ""}
            placeholder={t("descriptionPlaceholder")}
            rows={2}
            disabled={isPending}
          />
        </div>

        <input type="hidden" name="displayOrder" value={service?.displayOrder ?? 0} />
      </div>

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
// Service row
// ---------------------------------------------------------------------------

function ServiceRow({
  service,
  onEdit,
  onDelete,
}: {
  service: ServiceData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{service.name}</p>
        {service.description && (
          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">
            {service.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {service.durationMinutes} min
          </span>
          {service.price !== null && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <Euro className="w-3 h-3" />
              {service.price.toFixed(2).replace(".", ",")}
            </span>
          )}
        </div>
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
// ServicesManager
// ---------------------------------------------------------------------------

interface ServicesManagerProps {
  services: ServiceData[];
}

export function ServicesManager({ services: initial }: ServicesManagerProps) {
  const t = useTranslations("webpage.services");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleDelete = async (id: string) => {
    await deleteServiceAction(id);
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
        {/* Formulaire d'ajout */}
        {isAdding && (
          <div className="mb-4 p-4 rounded-lg border border-nd-sage-tint bg-nd-sage-wash">
            <ServiceForm onCancel={() => setIsAdding(false)} />
          </div>
        )}

        {/* Liste des prestations */}
        {initial.length === 0 && !isAdding ? (
          <p className="text-sm text-slate-400 py-4 text-center">{t("emptyTitle")}</p>
        ) : (
          <div>
            {initial.map((service) =>
              editingId === service.id ? (
                <div key={service.id} className="my-2 p-4 rounded-lg border border-nd-sage-tint bg-nd-sage-wash">
                  <ServiceForm
                    service={service}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <ServiceRow
                  key={service.id}
                  service={service}
                  onEdit={() => { setEditingId(service.id); setIsAdding(false); }}
                  onDelete={() => handleDelete(service.id)}
                />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
