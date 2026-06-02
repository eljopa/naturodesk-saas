import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { AppointmentsTabs } from "@/components/appointments/appointments-tabs";
import { ScheduleEditor } from "@/components/appointments/schedule-editor";
import type { TimeBlock } from "@/lib/validators/schedule";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("appointments.schedule");
  return { title: t("pageTitle") };
}

export default async function SchedulePage() {
  const [user, t] = await Promise.all([
    requireUser(),
    getTranslations("appointments"),
  ]);

  const schedule = await db.practitionerSchedule.findUnique({
    where: { userId: user.id },
    select: { scheduleJson: true, timezone: true },
  });

  return (
    <div>
      <PageHeader
        title={t("schedule.pageTitle")}
        description={t("schedule.pageDescription")}
      />

      <AppointmentsTabs />

      <div className="max-w-2xl">
        <ScheduleEditor
          existingScheduleJson={
            schedule
              ? (schedule.scheduleJson as Record<string, TimeBlock[]>)
              : null
          }
          existingTimezone={schedule?.timezone ?? null}
        />
      </div>
    </div>
  );
}
