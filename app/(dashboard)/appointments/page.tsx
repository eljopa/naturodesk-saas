import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarPlus, Globe } from "lucide-react";
import {
  WeekCalendar,
  type CalendarAppointment,
} from "@/components/appointments/week-calendar";
import { AppointmentsTabs } from "@/components/appointments/appointments-tabs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("appointments") };
}

interface AppointmentsPageProps {
  searchParams: Promise<{ date?: string; view?: string }>;
}

/** Returns the ISO date string of the Monday of the week containing `date`. */
function getWeekStart(date?: string): string {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return getWeekStart(undefined);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default async function AppointmentsPage({
  searchParams,
}: AppointmentsPageProps) {
  const [user, t, locale, sp] = await Promise.all([
    requireUser(),
    getTranslations("appointments"),
    getLocale(),
    searchParams,
  ]);

  const now = new Date();
  const isOnlineView = sp.view === "online";

  // Always fetch online booking count for the tab badge
  const onlineBookingCount = await db.appointment.count({
    where: { userId: user.id, source: "online_booking", status: "SCHEDULED", startAt: { gte: now } },
  });

  // ── Online bookings list view ─────────────────────────────────────────────
  if (isOnlineView) {
    const onlineBookings = await db.appointment.findMany({
      where: { userId: user.id, source: "online_booking" },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { startAt: "asc" },
    });

    const upcoming = onlineBookings.filter((a) => a.startAt >= now && a.status === "SCHEDULED");
    const past = onlineBookings.filter((a) => a.startAt < now || a.status !== "SCHEDULED");

    return (
      <div>
        <PageHeader
          title={t("pageTitle")}
          description={t("pageDescription")}
          action={
            <Button variant="primary" size="md" asChild>
              <Link href="/appointments/new">
                <CalendarPlus className="w-4 h-4" />
                {t("new")}
              </Link>
            </Button>
          }
        />

        <AppointmentsTabs onlineCount={onlineBookingCount} />

        {onlineBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-50 text-violet-400 mb-4">
              <Globe className="w-6 h-6" />
            </div>
            <p className="text-base font-medium text-slate-900">
              {t("onlineBookingsEmptyTitle")}
            </p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              {t("onlineBookingsEmptyDescription")}
            </p>
            <Button variant="secondary" size="sm" className="mt-5" asChild>
              <Link href="/webpage">{t("onlineBookingsGoToPage")}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  {t("filterUpcoming")} — {upcoming.length}
                </h2>
                <OnlineBookingList bookings={upcoming} locale={locale} t={t} />
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  {t("filterPast")} — {past.length}
                </h2>
                <OnlineBookingList bookings={past} locale={locale} t={t} muted />
              </section>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Calendar (week) view ──────────────────────────────────────────────────
  const weekStart = getWeekStart(sp.date);
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  const rawAppointments = await db.appointment.findMany({
    where: {
      userId: user.id,
      startAt: { gte: weekStartDate, lt: weekEndDate },
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const appointments: CalendarAppointment[] = rawAppointments.map((a) => ({
    id: a.id,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    type: a.type,
    status: a.status,
    patientFirstName: a.patient.firstName,
    patientLastName: a.patient.lastName,
    source: a.source,
  }));

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        action={
          <Button variant="primary" size="md" asChild>
            <Link href="/appointments/new">
              <CalendarPlus className="w-4 h-4" />
              {t("new")}
            </Link>
          </Button>
        }
      />

      <AppointmentsTabs onlineCount={onlineBookingCount} />

      <WeekCalendar
        appointments={appointments}
        weekStart={weekStart}
        locale={locale}
      />
    </div>
  );
}

// ── Inline list component (Server Component — no separate file needed) ────────

type BookingItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  type: "BILAN" | "SUIVI";
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  patient: { firstName: string; lastName: string };
};

function OnlineBookingList({
  bookings,
  locale,
  t,
  muted = false,
}: {
  bookings: BookingItem[];
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"appointments">>>;
  muted?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {bookings.map((appt) => {
        const start = appt.startAt;
        const end = appt.endAt;
        const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

        return (
          <li key={appt.id}>
            <Link
              href={`/appointments/${appt.id}/edit`}
              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors ${
                muted
                  ? "border-slate-100 bg-slate-50/50 opacity-60"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-50 text-violet-500 shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {appt.patient.lastName} {appt.patient.firstName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {start.toLocaleDateString(locale, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {t("duration", { minutes: durationMin })}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  {t("sourceOnline")}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    appt.type === "BILAN"
                      ? "bg-teal-100 text-teal-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {appt.type === "BILAN" ? t("typeBilan") : t("typeSuivi")}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
