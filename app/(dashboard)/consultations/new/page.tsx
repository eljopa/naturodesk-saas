import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ConsultationForm } from "@/components/consultations/consultation-form";
import { createConsultationAction } from "@/lib/actions/consultations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("consultations.form");
  return { title: t("createTitle") };
}

interface PageProps {
  searchParams: Promise<{ patientId?: string; appointmentId?: string }>;
}

export default async function NewConsultationPage({ searchParams }: PageProps) {
  const [user, t, tForm, locale, sp] = await Promise.all([
    requireUser(),
    getTranslations("consultations"),
    getTranslations("consultations.form"),
    getLocale(),
    searchParams,
  ]);

  const patients = await db.patient.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  // Load upcoming appointments for the selected patient (if prefilled)
  let appointments: { id: string; startAt: Date; type: string }[] = [];
  if (sp.patientId) {
    const raw = await db.appointment.findMany({
      where: {
        patientId: sp.patientId,
        userId: user.id,
        status: "SCHEDULED",
        consultation: null, // no consultation yet
      },
      orderBy: { startAt: "asc" },
      select: { id: true, startAt: true, type: true },
    });
    appointments = raw;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/consultations"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("detail.backToList")}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {tForm("createTitle")}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ConsultationForm
            action={createConsultationAction}
            patients={patients}
            appointments={appointments}
            defaultPatientId={sp.patientId}
            defaultAppointmentId={sp.appointmentId}
            cancelHref="/consultations"
            locale={locale}
          />
        </CardContent>
      </Card>
    </div>
  );
}
