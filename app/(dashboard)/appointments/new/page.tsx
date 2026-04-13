import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { createAppointmentAction } from "@/lib/actions/appointments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("appointments") };
}

interface NewAppointmentPageProps {
  searchParams: Promise<{ patientId?: string }>;
}

/** Round up to next 30-min slot then add offset (in minutes). */
function nextSlot(offsetMinutes = 0): string {
  const d = new Date();
  const mins = d.getMinutes();
  const rounded = Math.ceil(mins / 30) * 30;
  d.setMinutes(rounded + offsetMinutes, 0, 0);
  // Format as "YYYY-MM-DDTHH:mm" (local time, no timezone suffix)
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export default async function NewAppointmentPage({
  searchParams,
}: NewAppointmentPageProps) {
  const [user, t, params] = await Promise.all([
    requireUser(),
    getTranslations("appointments"),
    searchParams,
  ]);

  const patients = await db.patient.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  const defaultValues = {
    patientId: params.patientId,
    startAt: nextSlot(0),
    endAt: nextSlot(60),
    type: "BILAN" as const,
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("pageTitle")}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {t("form.createTitle")}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <AppointmentForm
            action={createAppointmentAction}
            patients={patients}
            defaultValues={defaultValues}
            submitLabel={t("form.submitCreate")}
            cancelHref="/appointments"
          />
        </CardContent>
      </Card>
    </div>
  );
}
