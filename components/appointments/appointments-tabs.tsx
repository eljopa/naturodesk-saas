"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function AppointmentsTabs() {
  const pathname = usePathname();
  const t = useTranslations("appointments.schedule");

  const tabs = [
    { label: t("tabCalendar"),     href: "/appointments" },
    { label: t("tabAvailability"), href: "/appointments/schedule" },
  ] as const;

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/appointments"
            ? pathname === "/appointments"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
