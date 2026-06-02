"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Copy, Info } from "lucide-react";
import {
  saveScheduleAction,
  type ScheduleFormState,
} from "@/lib/actions/schedule";
import { DAY_KEYS, type DayKey, type TimeBlock } from "@/lib/validators/schedule";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TIMEZONES = [
  { value: "Europe/Paris",          label: "Europe/Paris (UTC+1/+2)" },
  { value: "Europe/London",         label: "Europe/London (UTC+0/+1)" },
  { value: "Europe/Brussels",       label: "Europe/Brussels (UTC+1/+2)" },
  { value: "Europe/Zurich",         label: "Europe/Zurich (UTC+1/+2)" },
  { value: "Europe/Madrid",         label: "Europe/Madrid (UTC+1/+2)" },
  { value: "America/New_York",      label: "America/New York (UTC-5/-4)" },
  { value: "America/Montreal",      label: "America/Montréal (UTC-5/-4)" },
  { value: "America/Los_Angeles",   label: "America/Los Angeles (UTC-8/-7)" },
  { value: "Indian/Reunion",        label: "Indian/Réunion (UTC+4)" },
  { value: "Indian/Mauritius",      label: "Indian/Maurice (UTC+4)" },
  { value: "Pacific/Tahiti",        label: "Pacific/Tahiti (UTC-10)" },
];

// ---------------------------------------------------------------------------
// Types état local
// ---------------------------------------------------------------------------

interface DayState {
  enabled: boolean;
  blocks: TimeBlock[];
}

type ScheduleState = Record<DayKey, DayState>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ScheduleEditorProps {
  existingScheduleJson: Record<string, TimeBlock[]> | null;
  existingTimezone: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildInitialState(
  existing: Record<string, TimeBlock[]> | null
): ScheduleState {
  const init = {} as ScheduleState;
  for (const day of DAY_KEYS) {
    const blocks = existing?.[day] ?? [];
    init[day] = { enabled: blocks.length > 0, blocks };
  }
  return init;
}

function validateDay(blocks: TimeBlock[]): string | null {
  for (const b of blocks) {
    if (b.from >= b.to) return "from_after_to";
  }
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (blocks[i]!.from < blocks[j]!.to && blocks[i]!.to > blocks[j]!.from) {
        return "overlap";
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// TimeBlockRow
// ---------------------------------------------------------------------------

function TimeBlockRow({
  block,
  onUpdate,
  onRemove,
  disabled,
}: {
  block: TimeBlock;
  onUpdate: (field: "from" | "to", value: string) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        value={block.from}
        onChange={(e) => onUpdate("from", e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50 disabled:bg-slate-50"
      />
      <span className="text-slate-400 text-sm">→</span>
      <input
        type="time"
        value={block.to}
        onChange={(e) => onUpdate("to", e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50 disabled:bg-slate-50"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
        title="Supprimer cette plage"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayRow
// ---------------------------------------------------------------------------

function DayRow({
  label,
  state,
  onToggle,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onCopyToAll,
  disabled,
  error,
}: {
  label: string;
  state: DayState;
  onToggle: () => void;
  onAddBlock: () => void;
  onUpdateBlock: (idx: number, field: "from" | "to", value: string) => void;
  onRemoveBlock: (idx: number) => void;
  onCopyToAll: () => void;
  disabled: boolean;
  error: string | null;
}) {
  const t = useTranslations("appointments.schedule");

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        state.enabled ? "border-teal-200 bg-teal-50/30" : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          {/* Toggle */}
          <div
            role="switch"
            aria-checked={state.enabled}
            onClick={!disabled ? onToggle : undefined}
            className={cn(
              "relative w-10 h-6 rounded-full transition-colors cursor-pointer",
              state.enabled ? "bg-teal-600" : "bg-slate-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                state.enabled ? "translate-x-4" : "translate-x-0"
              )}
            />
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              state.enabled ? "text-slate-900" : "text-slate-400"
            )}
          >
            {label}
          </span>
        </label>

        {state.enabled && (
          <button
            type="button"
            onClick={onCopyToAll}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-600 transition-colors disabled:opacity-40"
            title={t("copyToAll")}
          >
            <Copy className="w-3 h-3" />
            {t("copyToAll")}
          </button>
        )}
      </div>

      {state.enabled && (
        <div className="space-y-2 ml-13">
          {state.blocks.map((block, idx) => (
            <TimeBlockRow
              key={idx}
              block={block}
              onUpdate={(field, val) => onUpdateBlock(idx, field, val)}
              onRemove={() => onRemoveBlock(idx)}
              disabled={disabled}
            />
          ))}

          {error && (
            <p className="text-xs text-red-600">{t(`errors.${error}` as Parameters<typeof t>[0])}</p>
          )}

          <button
            type="button"
            onClick={onAddBlock}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 transition-colors disabled:opacity-40 mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("addSlot")}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScheduleEditor
// ---------------------------------------------------------------------------

export function ScheduleEditor({
  existingScheduleJson,
  existingTimezone,
}: ScheduleEditorProps) {
  const t = useTranslations("appointments.schedule");
  const tErr = useTranslations("appointments.schedule.errors");

  const [schedule, setSchedule] = useState<ScheduleState>(() =>
    buildInitialState(existingScheduleJson)
  );
  const [timezone, setTimezone] = useState(
    existingTimezone ?? "Europe/Paris"
  );

  const [state, formAction, isPending] = useActionState<ScheduleFormState, FormData>(
    saveScheduleAction,
    null
  );

  // Errors per day (client-side validation before submit)
  const dayErrors: Partial<Record<DayKey, string>> = {};
  for (const day of DAY_KEYS) {
    if (schedule[day].enabled) {
      const err = validateDay(schedule[day].blocks);
      if (err) dayErrors[day] = err;
    }
  }
  const hasClientErrors = Object.keys(dayErrors).length > 0;

  // ── Handlers ────────────────────────────────────────────────────────────

  const toggleDay = (day: DayKey) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        enabled: !prev[day].enabled,
        blocks:  !prev[day].enabled ? [{ from: "09:00", to: "12:00" }] : [],
      },
    }));
  };

  const addBlock = (day: DayKey) => {
    setSchedule((prev) => {
      const last = prev[day].blocks[prev[day].blocks.length - 1];
      return {
        ...prev,
        [day]: {
          ...prev[day],
          blocks: [...prev[day].blocks, { from: last?.to ?? "14:00", to: "18:00" }],
        },
      };
    });
  };

  const updateBlock = (day: DayKey, idx: number, field: "from" | "to", value: string) => {
    setSchedule((prev) => {
      const blocks = prev[day].blocks.map((b, i) =>
        i === idx ? { ...b, [field]: value } : b
      );
      return { ...prev, [day]: { ...prev[day], blocks } };
    });
  };

  const removeBlock = (day: DayKey, idx: number) => {
    setSchedule((prev) => {
      const blocks = prev[day].blocks.filter((_, i) => i !== idx);
      return { ...prev, [day]: { ...prev[day], blocks } };
    });
  };

  const copyToAll = (sourceDay: DayKey) => {
    const sourceBlocks = schedule[sourceDay].blocks;
    setSchedule((prev) => {
      const next = { ...prev };
      for (const day of DAY_KEYS) {
        if (day !== sourceDay && next[day].enabled) {
          next[day] = { ...next[day], blocks: sourceBlocks.map((b) => ({ ...b })) };
        }
      }
      return next;
    });
  };

  // ── Sérialisation — input contrôlé (même pattern que ThemePicker) ────────

  const scheduleJsonValue = JSON.stringify(
    Object.fromEntries(
      DAY_KEYS.map((day) => [day, schedule[day].enabled ? schedule[day].blocks : []])
    )
  );

  // ── i18n labels des jours ────────────────────────────────────────────────

  const dayLabels: Record<DayKey, string> = {
    monday:    t("days.monday"),
    tuesday:   t("days.tuesday"),
    wednesday: t("days.wednesday"),
    thursday:  t("days.thursday"),
    friday:    t("days.friday"),
    saturday:  t("days.saturday"),
    sunday:    t("days.sunday"),
  };

  const hasAnyDay = DAY_KEYS.some((d) => schedule[d].enabled);

  return (
    <form action={formAction} className="space-y-6">
      {/* Erreur serveur */}
      {state?.errorCode && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {tErr(state.errorCode as Parameters<typeof tErr>[0])}
        </div>
      )}

      {/* Succès */}
      {state?.success && (
        <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-700 font-medium">
          {t("success")}
        </div>
      )}

      {/* Message d'aide */}
      <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-500">{t("help")}</p>
      </div>

      {/* Timezone */}
      <div className="flex flex-col gap-1.5 max-w-xs">
        <Label htmlFor="timezone">{t("timezoneLabel")}</Label>
        <select
          id="timezone"
          name="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          disabled={isPending}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* État vide */}
      {!hasAnyDay && (
        <p className="text-sm text-slate-400 italic">{t("emptyState")}</p>
      )}

      {/* Jours de la semaine */}
      <div className="space-y-3">
        {DAY_KEYS.map((day) => (
          <DayRow
            key={day}
            label={dayLabels[day]}
            state={schedule[day]}
            onToggle={() => toggleDay(day)}
            onAddBlock={() => addBlock(day)}
            onUpdateBlock={(idx, field, val) => updateBlock(day, idx, field, val)}
            onRemoveBlock={(idx) => removeBlock(day, idx)}
            onCopyToAll={() => copyToAll(day)}
            disabled={isPending}
            error={dayErrors[day] ?? null}
          />
        ))}
      </div>

      {/* Input contrôlé — React garantit la valeur courante au moment du submit */}
      <input type="hidden" name="scheduleJson" value={scheduleJsonValue} />

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isPending}
          disabled={hasClientErrors}
        >
          {t("saveButton")}
        </Button>
      </div>
    </form>
  );
}
