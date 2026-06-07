"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// ── Grid constants ────────────────────────────────────────────────────────────
const START_HOUR = 7;   // 07:00
const END_HOUR = 21;    // 21:00 (label only, last slot ends at 21:00)
const SLOT_H = 52;      // px per 30-min slot
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;
const TOTAL_H = TOTAL_SLOTS * SLOT_H; // 1456 px

// Hour boundary positions (07:00, 08:00 … 21:00)
const HOUR_TICKS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => ({
  label: `${String(START_HOUR + i).padStart(2, "0")}:00`,
  top: i * 2 * SLOT_H,
}));

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CalendarAppointment {
  id: string;
  startAt: string; // ISO string
  endAt: string;
  type: "BILAN" | "SUIVI";
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  patientFirstName: string;
  patientLastName: string;
  source?: string | null;
}

interface WeekCalendarProps {
  appointments: CalendarAppointment[];
  weekStart: string; // ISO date of the Monday (e.g. "2026-04-06")
  locale: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function currentWeekMonday(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function getTopPx(startAt: Date): number {
  const mins = startAt.getHours() * 60 + startAt.getMinutes();
  const offset = Math.max(mins - START_HOUR * 60, 0);
  return (offset / 30) * SLOT_H;
}

function getHeightPx(startAt: Date, endAt: Date): number {
  const mins = Math.max((endAt.getTime() - startAt.getTime()) / 60000, 30);
  return (mins / 30) * SLOT_H;
}

const APPT_STYLE = {
  BILAN: "bg-nd-sage-tint border-l-[3px] border-nd-sage text-nd-forest hover:bg-nd-sage-wash",
  SUIVI: "bg-blue-50 border-l-[3px] border-blue-500 text-blue-900 hover:bg-blue-100",
  muted: "bg-slate-50 border-l-[3px] border-slate-300 text-slate-400 opacity-60 hover:bg-slate-100",
} as const;

// ── Component ─────────────────────────────────────────────────────────────────
export function WeekCalendar({ appointments, weekStart, locale }: WeekCalendarProps) {
  const t = useTranslations("appointments");
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = currentWeekMonday();
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  // 7 days Mon → Sun
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const iso = addDays(weekStart, i);
        const d = new Date(iso);
        return {
          iso,
          dayName: d.toLocaleDateString(locale, { weekday: "short" }),
          dayNum: d.getDate(),
          isToday: iso === today,
        };
      }),
    [weekStart, locale, today]
  );

  // Group by ISO date
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const a of appointments) {
      const key = a.startAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  // Week label
  const weekLabel = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(addDays(weekStart, 6));
    return `${start.toLocaleDateString(locale, { day: "numeric", month: "long" })} – ${end.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}`;
  }, [weekStart, locale]);

  const isMuted = (status: CalendarAppointment["status"]) =>
    status === "CANCELLED" || status === "NO_SHOW";

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Link
            href={`/appointments?date=${prevWeek}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label={t("prevWeek")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Link
            href={`/appointments?date=${nextWeek}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label={t("nextWeek")}
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
          {weekStart !== thisWeek && (
            <Link
              href="/appointments"
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t("filterToday")}
            </Link>
          )}
          <span className="text-sm font-medium text-slate-700">{weekLabel}</span>
        </div>

        <Link
          href="/appointments/new"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-nd-sage text-white text-sm font-medium hover:bg-nd-sage-deep transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("new")}
        </Link>
      </div>

      {/* ── Desktop grid (hidden on mobile) ── */}
      <div className="hidden sm:block rounded-2xl border border-nd-line bg-white overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200">
          <div className="border-r border-slate-100" />
          {days.map((day) => (
            <div
              key={day.iso}
              className={cn(
                "py-3 px-1 text-center border-r border-slate-100 last:border-r-0",
                day.isToday && "bg-nd-sage-wash"
              )}
            >
              <p className={cn("text-xs font-medium uppercase tracking-wide", day.isToday ? "text-nd-sage" : "text-slate-500")}>
                {day.dayName}
              </p>
              <span
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mt-0.5",
                  day.isToday ? "bg-nd-sage text-white" : "text-slate-900"
                )}
              >
                {day.dayNum}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable grid body */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
          <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: TOTAL_H }}>
            {/* Time labels */}
            <div className="relative border-r border-slate-100 select-none">
              {HOUR_TICKS.map(({ label, top }) => (
                <div
                  key={label}
                  className="absolute right-2 text-[11px] text-slate-400 -translate-y-2"
                  style={{ top }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const appts = byDay.get(day.iso) ?? [];
              return (
                <div
                  key={day.iso}
                  className={cn(
                    "relative border-r border-slate-100 last:border-r-0",
                    day.isToday && "bg-nd-sage-wash"
                  )}
                  style={{ height: TOTAL_H }}
                >
                  {/* Hour lines */}
                  {HOUR_TICKS.map(({ label, top }) => (
                    <div
                      key={label}
                      className="absolute inset-x-0 border-t border-slate-100"
                      style={{ top }}
                    />
                  ))}
                  {/* Half-hour lines */}
                  {HOUR_TICKS.slice(0, -1).map(({ label, top }) => (
                    <div
                      key={`h-${label}`}
                      className="absolute inset-x-0 border-t border-slate-50"
                      style={{ top: top + SLOT_H }}
                    />
                  ))}

                  {/* Appointments */}
                  {appts.map((appt) => {
                    const start = new Date(appt.startAt);
                    const end = new Date(appt.endAt);
                    const topPx = getTopPx(start);
                    const heightPx = getHeightPx(start, end);
                    const style = isMuted(appt.status)
                      ? APPT_STYLE.muted
                      : APPT_STYLE[appt.type];
                    const timeStr = start.toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <Link
                        key={appt.id}
                        href={`/appointments/${appt.id}/edit`}
                        className={cn(
                          "absolute inset-x-1 rounded-md px-2 py-1 text-xs overflow-hidden transition-colors z-10",
                          style
                        )}
                        style={{ top: topPx, height: heightPx }}
                        title={`${appt.patientLastName} ${appt.patientFirstName} — ${timeStr}`}
                      >
                        <p className="font-semibold leading-tight truncate">
                          {appt.patientLastName} {appt.patientFirstName}
                        </p>
                        {heightPx >= 44 && (
                          <p className="leading-tight opacity-70 truncate">{timeStr}</p>
                        )}
                        {appt.source === "online_booking" && heightPx >= 56 && (
                          <span className="inline-flex items-center gap-0.5 leading-tight mt-0.5 text-violet-700 opacity-90">
                            <Globe className="w-2.5 h-2.5 shrink-0" />
                            {t("sourceOnline")}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile list ── */}
      <div className="sm:hidden">
        {appointments.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">
            {t("noAppointmentsThisWeek")}
          </div>
        ) : (
          <ul className="space-y-2">
            {[...appointments]
              .sort((a, b) => a.startAt.localeCompare(b.startAt))
              .map((appt) => {
                const start = new Date(appt.startAt);
                const end = new Date(appt.endAt);
                const muted = isMuted(appt.status);
                return (
                  <li key={appt.id}>
                    <Link
                      href={`/appointments/${appt.id}/edit`}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
                        muted
                          ? "border-slate-200 bg-slate-50 opacity-60"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {appt.patientLastName} {appt.patientFirstName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {start.toLocaleDateString(locale, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          ·{" "}
                          {start.toLocaleTimeString(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" – "}
                          {end.toLocaleTimeString(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {appt.source === "online_booking" && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                            <Globe className="w-3 h-3" />
                            {t("sourceOnline")}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            appt.type === "BILAN"
                              ? "bg-nd-sage-tint text-nd-sage-deep"
                              : "bg-blue-100 text-blue-700"
                          )}
                        >
                          {appt.type === "BILAN" ? t("typeBilan") : t("typeSuivi")}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}
