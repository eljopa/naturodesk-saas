import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import {
  WeekCalendar,
  type CalendarAppointment,
} from "@/components/appointments/week-calendar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("appointments") };
}

interface AppointmentsPageProps {
  searchParams: Promise<{ date?: string }>;
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

  const weekStart = getWeekStart(sp.date);

  // Week boundaries: Monday 00:00 → next Monday 00:00
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

  // Serialize for the client component (Date → ISO string)
  const appointments: CalendarAppointment[] = rawAppointments.map((a) => ({
    id: a.id,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    type: a.type,
    status: a.status,
    patientFirstName: a.patient.firstName,
    patientLastName: a.patient.lastName,
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

      <WeekCalendar
        appointments={appointments}
        weekStart={weekStart}
        locale={locale}
      />
    </div>
  );
}
