import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PatientForm } from "@/components/patients/patient-form";
import { createPatientAction } from "@/lib/actions/patients";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("patients") };
}

export default async function NewPatientPage() {
  await requireUser();
  const t = await getTranslations("patients");

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/patients"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("detail.backToList")}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {t("form.submitCreate")}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <PatientForm
            action={createPatientAction}
            submitLabel={t("form.submitCreate")}
            cancelHref="/patients"
          />
        </CardContent>
      </Card>
    </div>
  );
}
