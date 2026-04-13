import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FollowUpForm } from "@/components/followups/followup-form";
import {
  updateFollowUpAction,
  deleteFollowUpAction,
} from "@/lib/actions/followups";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("followups");
  return { title: t("form.editTitle") };
}

interface EditFollowUpPageProps {
  params: Promise<{ id: string; fid: string }>;
}

export default async function EditFollowUpPage({ params }: EditFollowUpPageProps) {
  const [user, t, locale, { id: patientId, fid: followUpId }] = await Promise.all([
    requireUser(),
    getTranslations("followups"),
    getLocale(),
    params,
  ]);

  const [followUp, patient] = await Promise.all([
    db.followUp.findUnique({
      where: { id: followUpId },
      include: { patient: { select: { userId: true, firstName: true, lastName: true } } },
    }),
    db.patient.findUnique({
      where: { id: patientId },
      select: { id: true, userId: true },
    }),
  ]);

  if (
    !followUp ||
    !patient ||
    followUp.patientId !== patientId ||
    followUp.patient.userId !== user.id
  ) {
    notFound();
  }

  // Appointments not linked to other follow-ups (except this one's current link)
  const linkedApptIds = await db.followUp.findMany({
    where: {
      patientId,
      appointmentId: { not: null },
      id: { not: followUpId },
    },
    select: { appointmentId: true },
  });
  const excludedIds = linkedApptIds.map((f) => f.appointmentId!);

  const appointments = await db.appointment.findMany({
    where: {
      patientId,
      status: { in: ["COMPLETED", "SCHEDULED"] },
      id: { notIn: excludedIds.length > 0 ? excludedIds : undefined },
    },
    orderBy: { startAt: "desc" },
    take: 20,
    select: { id: true, startAt: true },
  });

  const updateAction = updateFollowUpAction.bind(null, followUpId, patientId);
  const deleteAction = deleteFollowUpAction.bind(null, followUpId, patientId);
  const cancelHref = `/patients/${patientId}?tab=followups`;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={cancelHref}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {followUp.patient.lastName} {followUp.patient.firstName}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {t("form.editTitle")}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t("createdAt")}{" "}
              {followUp.createdAt.toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <form action={deleteAction}>
            <Button type="submit" variant="destructive" size="sm">
              {t("deleteButton")}
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <FollowUpForm
            action={updateAction}
            appointments={appointments.map((a) => ({
              id: a.id,
              startAt: a.startAt.toISOString(),
            }))}
            cancelHref={cancelHref}
            locale={locale}
            defaultValues={{
              appointmentId: followUp.appointmentId,
              symptomEvolution: followUp.symptomEvolution,
              protocolAdjustment: followUp.protocolAdjustment,
              observations: followUp.observations,
              nextSteps: followUp.nextSteps,
            }}
            submitLabel={t("form.submitEdit")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
