import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { FollowUpForm } from "@/components/followups/followup-form";
import { createFollowUpAction } from "@/lib/actions/followups";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("followups");
  return { title: t("form.createTitle") };
}

interface NewFollowUpPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewFollowUpPage({ params }: NewFollowUpPageProps) {
  const [user, t, locale, { id: patientId }] = await Promise.all([
    requireUser(),
    getTranslations("followups"),
    getLocale(),
    params,
  ]);

  const patient = await db.patient.findUnique({
    where: { id: patientId },
    select: { id: true, firstName: true, lastName: true, userId: true },
  });

  if (!patient || patient.userId !== user.id) notFound();

  // Recent appointments (COMPLETED or SCHEDULED, last 20) not already linked to a follow-up
  const linkedApptIds = await db.followUp.findMany({
    where: { patientId, appointmentId: { not: null } },
    select: { appointmentId: true },
  });
  const linkedIds = linkedApptIds.map((f) => f.appointmentId!);

  const appointments = await db.appointment.findMany({
    where: {
      patientId,
      status: { in: ["COMPLETED", "SCHEDULED"] },
      id: { notIn: linkedIds.length > 0 ? linkedIds : undefined },
    },
    orderBy: { startAt: "desc" },
    take: 20,
    select: { id: true, startAt: true },
  });

  const action = createFollowUpAction.bind(null, patientId);
  const cancelHref = `/patients/${patientId}?tab=followups`;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={cancelHref}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {patient.lastName} {patient.firstName}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {t("form.createTitle")}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <FollowUpForm
            action={action}
            appointments={appointments.map((a) => ({
              id: a.id,
              startAt: a.startAt.toISOString(),
            }))}
            cancelHref={cancelHref}
            locale={locale}
            submitLabel={t("form.submitCreate")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
