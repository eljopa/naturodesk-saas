import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { PatientForm, type PatientFormDefaults } from "@/components/patients/patient-form";
import { updatePatientAction } from "@/lib/actions/patients";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient) return {};
  return { title: `${patient.lastName} ${patient.firstName}` };
}

interface EditPatientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const [user, t, { id }] = await Promise.all([
    requireUser(),
    getTranslations("patients"),
    params,
  ]);

  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient || patient.userId !== user.id) notFound();

  const action = updatePatientAction.bind(null, patient.id);

  const defaultValues: PatientFormDefaults = {
    firstName: patient.firstName,
    lastName: patient.lastName,
    birthDate: patient.birthDate?.toISOString().split("T")[0],
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    profession: patient.profession,
    notes: patient.notes,
    medicalHistory: patient.medicalHistory,
    allergies: patient.allergies,
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/patients/${patient.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {patient.lastName} {patient.firstName}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {patient.lastName} {patient.firstName}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <PatientForm
            action={action}
            defaultValues={defaultValues}
            submitLabel={t("form.submitEdit")}
            cancelHref={`/patients/${patient.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
