"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface AppointmentsTabsProps {
  onlineCount?: number;
}

export function AppointmentsTabs({ onlineCount = 0 }: AppointmentsTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const ts = useTranslations("appointments.schedule");
  const ta = useTranslations("appointments");

  const tabs = [
    { key: "calendar",      label: ts("tabCalendar"),        href: "/appointments" },
    { key: "availability",  label: ts("tabAvailability"),    href: "/appointments/schedule" },
    { key: "online",        label: ta("tabOnlineBookings"),  href: "/appointments?view=online", count: onlineCount },
  ] as const;

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6">
      {tabs.map((tab) => {
        let isActive: boolean;
        if (tab.key === "calendar") {
          isActive = pathname === "/appointments" && view !== "online";
        } else if (tab.key === "online") {
          isActive = pathname === "/appointments" && view === "online";
        } else {
          isActive = pathname.startsWith(tab.href);
        }

        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {tab.label}
            {"count" in tab && tab.count > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 leading-none">
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
