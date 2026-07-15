import type { Metadata } from "next";
import { Users, CalendarDays, Stethoscope, Receipt } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatCards } from "@/components/dashboard/stat-cards";
import { MessagesCard } from "@/components/dashboard/messages-card";
import { AppointmentsCard } from "@/components/dashboard/appointments-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("dashboard") };
}

export default async function DashboardPage() {
  const [user, t, locale] = await Promise.all([
    requireUser(),
    getTranslations("dashboard"),
    getLocale(),
  ]);

  const now = new Date();

  const [
    patientCount,
    upcomingAppointmentCount,
    pendingConsultationCount,
    draftInvoiceCount,
    upcomingAppointments,
    unreadMessages,
  ] = await Promise.all([
    db.patient
      .count({ where: { userId: user.id, isArchived: false } })
      .catch(() => 0),
    db.appointment
      .count({
        where: { userId: user.id, startAt: { gte: now }, status: "SCHEDULED" },
      })
      .catch(() => 0),
    db.consultation
      .count({ where: { patient: { userId: user.id }, status: "DRAFT" } })
      .catch(() => 0),
    db.invoice
      .count({ where: { userId: user.id, status: "DRAFT" } })
      .catch(() => 0),
    db.appointment
      .findMany({
        where: { userId: user.id, startAt: { gte: now }, status: "SCHEDULED" },
        select: {
          id: true,
          startAt: true,
          type: true,
          status: true,
          source: true,
          patient: { select: { firstName: true, lastName: true } },
        },
        orderBy: { startAt: "asc" },
        take: 5,
      })
      .catch(() => []),
    db.contactMessage
      .findMany({
        where: { userId: user.id, status: "UNREAD" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          senderName: true,
          senderEmail: true,
          message: true,
          createdAt: true,
        },
      })
      .catch(() => []),
  ]);

  const hour = now.getHours();
  const greetingKey =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = user.name.split(" ")[0] ?? user.name;

  const dateLabel = now.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = [
    {
      label: t("kpi.activePatients"),
      value: patientCount,
      icon: Users,
      href: "/patients",
      hint: t("kpi.activePatientshint"),
    },
    {
      label: t("kpi.upcomingAppointments"),
      value: upcomingAppointmentCount,
      icon: CalendarDays,
      href: "/appointments",
      hint: t("kpi.upcomingAppointmentshint"),
    },
    {
      label: t("kpi.ongoingConsultations"),
      value: pendingConsultationCount,
      icon: Stethoscope,
      href: "/consultations",
      hint: t("kpi.ongoingConsultationshint"),
    },
    {
      label: t("kpi.draftInvoices"),
      value: draftInvoiceCount,
      icon: Receipt,
      href: "/invoices",
      hint: t("kpi.draftInvoiceshint"),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {t(`greeting.${greetingKey}`, { name: firstName })}
        </h1>
        <p className="text-sm text-nd-muted mt-1 capitalize">{dateLabel}</p>
      </div>

      <StatCards stats={stats} />

      <div className={`grid grid-cols-1 gap-6${unreadMessages.length > 0 ? " lg:grid-cols-2" : ""}`}>
        {unreadMessages.length > 0 && (
          <MessagesCard
            messages={unreadMessages}
            locale={locale}
            labels={{
              title: t("messages.title"),
              description: t("messages.description"),
              seeAll: t("messages.seeAll"),
            }}
          />
        )}
        <AppointmentsCard
          appointments={upcomingAppointments}
          locale={locale}
          labels={{
            title: t("upcoming.title"),
            description: t("upcoming.description"),
            seeAll: t("upcoming.seeAll"),
            typeBilan: t("upcoming.typeBilan"),
            typeSuivi: t("upcoming.typeSuivi"),
            online: t("online"),
            emptyTitle: t("upcoming.emptyTitle"),
            emptyDescription: t("upcoming.emptyDescription"),
            newAppointment: t("upcoming.newAppointment"),
          }}
        />
      </div>
    </div>
  );
}
