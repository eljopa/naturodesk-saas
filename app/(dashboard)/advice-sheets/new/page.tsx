import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { AdviceSheetForm } from "@/components/advice-sheets/advice-sheet-form";
import { createAdviceSheetAction, generateAdviceSheetDraftAction } from "@/lib/actions/advice-sheets";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adviceSheets");
  return { title: t("newPageTitle") };
}

interface PageProps {
  searchParams: Promise<{ patientId?: string; consultationId?: string }>;
}

export default async function NewAdviceSheetPage({ searchParams }: PageProps) {
  const [user, t, sp] = await Promise.all([
    requireUser(),
    getTranslations("adviceSheets"),
    searchParams,
  ]);

  // Charger les patients actifs pour le sélecteur
  const patients = await db.patient.findMany({
    where: { userId: user.id, isArchived: false },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Charger les consultations du patient pré-sélectionné
  const preselectedPatientId = sp.patientId ?? "";
  const preselectedConsultationId = sp.consultationId ?? "";

  const consultations = preselectedPatientId
    ? await db.consultation.findMany({
        where: { patientId: preselectedPatientId },
        select: { id: true, createdAt: true, status: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <div className="mb-6">
        <Link href="/advice-sheets" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {t("backToList")}
        </Link>
      </div>

      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{t("newPageTitle")}</h1>
        <p className="text-sm text-slate-500 mb-6">{t("newPageDescription")}</p>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Sélecteurs patient / consultation */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  {t("form.patientLabel")} <span className="text-red-500">*</span>
                </label>
                <select
                  form="advice-sheet-form"
                  name="patientId"
                  defaultValue={preselectedPatientId}
                  required
                  className="w-full rounded-xl border border-nd-line bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-nd-sage"
                >
                  <option value="">{t("form.patientPlaceholder")}</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.lastName} {p.firstName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  {t("form.consultationLabel")}
                  <span className="text-xs text-slate-400 font-normal ml-2">optionnel</span>
                </label>
                {consultations.length > 0 ? (
                  <select
                    form="advice-sheet-form"
                    name="consultationId"
                    defaultValue={preselectedConsultationId}
                    className="w-full rounded-xl border border-nd-line bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-nd-sage"
                  >
                    <option value="">{t("form.consultationPlaceholder")}</option>
                    {consultations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        {" — "}
                        {c.status}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-400 py-2">
                    {preselectedPatientId ? t("form.noConsultations") : t("form.selectPatientFirst")}
                  </p>
                )}
              </div>
            </div>

            <AdviceSheetForm
              action={createAdviceSheetAction}
              generateDraftAction={preselectedConsultationId ? generateAdviceSheetDraftAction : undefined}
              consultationId={preselectedConsultationId || undefined}
              patientId={preselectedPatientId}
              submitLabel={t("form.submitCreate")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
