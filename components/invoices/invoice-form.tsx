"use client";

import { useActionState, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createInvoiceAction } from "@/lib/actions/invoices";
import type { InvoiceFormState } from "@/lib/actions/invoices";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface InvoiceLine {
  id: string; // local key only
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceFormProps {
  patients: Patient[];
  preselectedPatientId?: string;
}

const DEFAULT_LINE: Omit<InvoiceLine, "id"> = {
  description: "",
  quantity: 1,
  unitPrice: 0,
};

function newLine(): InvoiceLine {
  return { id: crypto.randomUUID(), ...DEFAULT_LINE };
}

export function InvoiceForm({ patients, preselectedPatientId }: InvoiceFormProps) {
  const t = useTranslations("invoices");
  const [state, action, pending] = useActionState<InvoiceFormState, FormData>(
    createInvoiceAction,
    null
  );

  const [lines, setLines] = useState<InvoiceLine[]>([newLine()]);

  const addLine = useCallback(() => setLines((prev) => [...prev, newLine()]), []);

  const removeLine = useCallback(
    (id: string) =>
      setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev)),
    []
  );

  const updateLine = useCallback(
    (id: string, field: keyof Omit<InvoiceLine, "id">, value: string | number) =>
      setLines((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
      ),
    []
  );

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const errorCode = state?.errorCode;

  return (
    <form action={action} className="space-y-8 max-w-2xl">
      {/* Hidden field: serialized lines */}
      <input
        type="hidden"
        name="linesJson"
        value={JSON.stringify(
          lines.map(({ description, quantity, unitPrice }) => ({
            description,
            quantity,
            unitPrice,
          }))
        )}
      />

      {errorCode && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {t(`form.errors.${errorCode}`)}
        </p>
      )}

      {/* Patient */}
      <div className="space-y-1.5">
        <Label htmlFor="patientId">{t("form.patientLabel")}</Label>
        <Select
          id="patientId"
          name="patientId"
          defaultValue={preselectedPatientId ?? ""}
          required
        >
          <option value="" disabled>
            {t("form.patientPlaceholder")}
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.lastName} {p.firstName}
            </option>
          ))}
        </Select>
      </div>

      {/* Lignes de prestation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("form.linesTitle")}
          </h2>
          <Button type="button" variant="secondary" size="sm" onClick={addLine}>
            <Plus className="w-3.5 h-3.5" />
            {t("form.addLine")}
          </Button>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[1fr_60px_110px_32px] gap-2 px-1">
          <span className="text-xs text-slate-500">{t("form.lineDescription")}</span>
          <span className="text-xs text-slate-500 text-center">{t("form.lineQuantity")}</span>
          <span className="text-xs text-slate-500 text-right">{t("form.lineUnitPrice")}</span>
          <span />
        </div>

        {lines.map((line) => (
          <div key={line.id} className="grid grid-cols-[1fr_60px_110px_32px] gap-2 items-center">
            <Input
              placeholder={t("form.lineDescriptionPlaceholder")}
              value={line.description}
              onChange={(e) => updateLine(line.id, "description", e.target.value)}
              required
            />
            <Input
              type="number"
              min={1}
              step={1}
              value={line.quantity}
              onChange={(e) =>
                updateLine(line.id, "quantity", Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className="text-center"
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              value={line.unitPrice}
              onChange={(e) =>
                updateLine(line.id, "unitPrice", parseFloat(e.target.value) || 0)
              }
              className="text-right"
            />
            <button
              type="button"
              onClick={() => removeLine(line.id)}
              disabled={lines.length === 1}
              className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={t("form.removeLine")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Total */}
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            {t("form.totalLabel")} :{" "}
            <span className="text-teal-700">
              {total.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Mode de paiement + date d'émission */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="paymentMethod">{t("form.paymentMethodLabel")}</Label>
          <Select id="paymentMethod" name="paymentMethod" defaultValue="">
            <option value="">{t("form.paymentMethodPlaceholder")}</option>
            <option value="CASH">{t("paymentCash")}</option>
            <option value="CARD">{t("paymentCard")}</option>
            <option value="TRANSFER">{t("paymentTransfer")}</option>
            <option value="CHECK">{t("paymentCheck")}</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="issuedAt">{t("form.issuedAtLabel")}</Label>
          <Input
            id="issuedAt"
            name="issuedAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" size="md" loading={pending}>
          {t("form.submitCreate")}
        </Button>
        <Button type="button" variant="secondary" size="md" asChild>
          <Link href="/invoices">{t("form.cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
