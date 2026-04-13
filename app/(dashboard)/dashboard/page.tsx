import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  Calendar,
  ClipboardList,
  FileText,
  ArrowRight,
  Clock,
} from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("dashboard") };
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  href: string;
  color: "teal" | "blue" | "violet" | "amber";
}) {
  const colorClasses = {
    teal: "bg-teal-50 text-teal-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <Link href={href} className="block group">
      <Card className="hover:border-slate-300 hover:shadow-md transition-all duration-150">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl ${colorClasses[color]}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {value}
            </p>
            <p className="text-sm text-slate-500 mt-1">{title}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
        include: { patient: true },
        orderBy: { startAt: "asc" },
        take: 5,
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

  return (
    <div>
      {/* Entête */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {t(`greeting.${greetingKey}`, { name: firstName })}
        </h1>
        <p className="text-sm text-slate-500 mt-1 capitalize">{dateLabel}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t("kpi.activePatients")}
          value={patientCount}
          icon={Users}
          href="/patients"
          color="teal"
        />
        <StatCard
          title={t("kpi.upcomingAppointments")}
          value={upcomingAppointmentCount}
          icon={Calendar}
          href="/appointments"
          color="blue"
        />
        <StatCard
          title={t("kpi.ongoingConsultations")}
          value={pendingConsultationCount}
          icon={ClipboardList}
          href="/consultations"
          color="violet"
        />
        <StatCard
          title={t("kpi.draftInvoices")}
          value={draftInvoiceCount}
          icon={FileText}
          href="/invoices"
          color="amber"
        />
      </div>

      {/* Prochains rendez-vous */}
      <Card>
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t("upcoming.title")}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {t("upcoming.description")}
            </p>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/appointments">{t("upcoming.seeAll")}</Link>
          </Button>
        </div>

        <CardContent className="pt-0">
          {upcomingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-900">
                {t("upcoming.emptyTitle")}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t("upcoming.emptyDescription")}
              </p>
              <Button variant="primary" size="sm" className="mt-4" asChild>
                <Link href="/appointments">{t("upcoming.newAppointment")}</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingAppointments.map((appt) => (
                <li
                  key={appt.id}
                  className="flex items-center justify-between py-3 gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-50 text-teal-600 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {appt.patient.firstName} {appt.patient.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {appt.startAt.toLocaleString(locale, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={appt.type === "BILAN" ? "default" : "info"}>
                    {appt.type === "BILAN"
                      ? t("upcoming.typeBilan")
                      : t("upcoming.typeSuivi")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
