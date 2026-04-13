import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import {
  updateAppointmentAction,
  cancelAppointmentAction,
} from "@/lib/actions/appointments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("appointments") };
}

interface EditAppointmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAppointmentPage({
  params,
}: EditAppointmentPageProps) {
  const [user, t, { id }] = await Promise.all([
    requireUser(),
    getTranslations("appointments"),
    params,
  ]);

  const [appointment, patients] = await Promise.all([
    db.appointment.findUnique({
      where: { id },
      include: { patient: true, consultation: { select: { id: true } } },
    }),
    db.patient.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  if (!appointment || appointment.userId !== user.id) notFound();

  // If current patient is archived, still include them so the form doesn't break
  const patientInList = patients.find((p) => p.id === appointment.patientId);
  const patientsForForm =
    patientInList || !appointment.patient
      ? patients
      : [
          {
            id: appointment.patient.id,
            firstName: appointment.patient.firstName,
            lastName: appointment.patient.lastName,
          },
          ...patients,
        ];

  const updateAction = updateAppointmentAction.bind(null, appointment.id);
  const cancelAction = cancelAppointmentAction.bind(null, appointment.id);

  // Format dates as "YYYY-MM-DDTHH:mm" in local time
  function toDateTimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }

  const defaultValues = {
    patientId: appointment.patientId,
    startAt: toDateTimeLocal(appointment.startAt),
    endAt: toDateTimeLocal(appointment.endAt),
    type: appointment.type,
    notes: appointment.notes,
  };

  const patientName = appointment.patient
    ? `${appointment.patient.lastName} ${appointment.patient.firstName}`
    : "";

  const isCancellable = appointment.status === "SCHEDULED";

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

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {t("form.editTitle")}
            </h1>
            {patientName && (
              <p className="text-sm text-slate-500 mt-1">{patientName}</p>
            )}
          </div>

          {isCancellable && (
            <form action={cancelAction}>
              <Button type="submit" variant="destructive" size="sm">
                {t("form.cancelAppointment")}
              </Button>
            </form>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <AppointmentForm
            action={updateAction}
            patients={patientsForForm}
            defaultValues={defaultValues}
            submitLabel={t("form.submitEdit")}
            cancelHref="/appointments"
          />
        </CardContent>
      </Card>

      {/* Link to create a consultation linked to this appointment */}
      {isCancellable && !appointment.consultation && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" asChild>
            <Link
              href={`/consultations/new?patientId=${appointment.patientId}&appointmentId=${appointment.id}`}
            >
              {t("form.createConsultation")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
