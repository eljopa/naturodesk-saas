"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupplementIntakeRow } from "@/lib/knowledge/supplements/read/get-supplement-analysis";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PARSE_CONF_LABEL: Record<string, string> = {
  HIGH:   "Extraction complète",
  MEDIUM: "Extraction partielle",
  LOW:    "Extraction minimale",
};

const RESOLUTION_CONF_LABEL: Record<string, string> = {
  HIGH:   "Correspondance exacte",
  MEDIUM: "Correspondance approchée",
  LOW:    "Correspondance faible",
  NONE:   "Non reconnu",
};

const PARSE_CONF_COLOR: Record<string, string> = {
  HIGH:   "bg-teal-50 text-teal-700 border-teal-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  LOW:    "bg-slate-50 text-slate-500 border-slate-200",
};

const RESOLUTION_CONF_COLOR: Record<string, string> = {
  HIGH:   "bg-teal-50 text-teal-700 border-teal-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW:    "bg-red-50 text-red-600 border-red-200",
  NONE:   "bg-slate-100 text-slate-500 border-slate-200",
};

const VARIANT_TYPE_LABEL: Record<string, string> = {
  CHELATE:     "Chélaté",
  MARINE:      "Marin",
  CITRATE:     "Citrate",
  MALATE:      "Malate",
  OXIDE:       "Oxyde",
  SULFATE:     "Sulfate",
  FUMARATE:    "Fumarate",
  D3:          "D3",
  D2:          "D2",
  EPA_DHA:     "EPA/DHA",
  MULTI_STRAIN:"Multi-souches",
  EXTRACT:     "Extrait",
  OTHER:       "Autre",
};

function ConfBadge({
  label,
  colorClass,
}: {
  label: string;
  colorClass: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border",
        colorClass
      )}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SupplementIntakeRowProps {
  intake: SupplementIntakeRow;
}

export function SupplementIntakeRowItem({ intake }: SupplementIntakeRowProps) {
  const [expanded, setExpanded] = useState(false);

  const isUnresolved = intake.parseStatus === "UNRESOLVED";
  const displayName  = intake.variantLabel ?? intake.canonicalName ?? intake.parsedLabel ?? intake.rawText;
  const parentName   = !isUnresolved && intake.canonicalName && intake.variantLabel
    ? intake.canonicalName
    : null;

  const variantTypeLabel = intake.variantType
    ? (VARIANT_TYPE_LABEL[intake.variantType] ?? intake.variantType)
    : null;

  // Dose summary line
  const doseParts: string[] = [];
  if (intake.estimatedDailyDoseValue !== null && intake.estimatedDailyDoseUnit) {
    doseParts.push(`${intake.estimatedDailyDoseValue} ${intake.estimatedDailyDoseUnit}/j`);
  } else if (intake.dosePerUnitValue !== null && intake.dosePerUnitUnit) {
    doseParts.push(`${intake.dosePerUnitValue} ${intake.dosePerUnitUnit}/prise`);
  }
  if (intake.timingText && !doseParts.some((p) => p.includes(intake.timingText!))) {
    doseParts.push(intake.timingText);
  }

  const resolConf   = intake.resolutionConfidence ?? "NONE";
  const parseConf   = intake.parseConfidence;

  return (
    <li className={cn(
      "border-b border-slate-100 last:border-b-0",
      isUnresolved && "opacity-60"
    )}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="mt-0.5 shrink-0 text-slate-300">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />}
        </span>

        <div className="flex-1 min-w-0">
          {/* Name + variant badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-sm font-medium leading-snug",
              isUnresolved ? "text-slate-500 italic" : "text-slate-900"
            )}>
              {displayName}
            </span>
            {variantTypeLabel && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 border border-teal-200">
                {variantTypeLabel}
              </span>
            )}
            {isUnresolved && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                Non reconnu
              </span>
            )}
          </div>

          {/* Parent + dose summary */}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {parentName && (
              <span className="text-xs text-slate-400">
                {parentName}
              </span>
            )}
            {doseParts.length > 0 && (
              <span className="text-xs text-slate-500 font-medium">
                {doseParts.join(" · ")}
              </span>
            )}
            {doseParts.length === 0 && !isUnresolved && (
              <span className="text-xs text-slate-400 italic">Dose non renseignée</span>
            )}
          </div>
        </div>

        {/* Confidence badges — right-aligned */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <ConfBadge
            label={RESOLUTION_CONF_LABEL[resolConf] ?? resolConf}
            colorClass={RESOLUTION_CONF_COLOR[resolConf] ?? "bg-slate-100 text-slate-500 border-slate-200"}
          />
          <ConfBadge
            label={PARSE_CONF_LABEL[parseConf] ?? parseConf}
            colorClass={PARSE_CONF_COLOR[parseConf] ?? "bg-slate-100 text-slate-500 border-slate-200"}
          />
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 pl-10 space-y-1.5 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide pt-2">
            Saisie brute
          </p>
          <p className="text-xs text-slate-600 font-mono bg-white border border-slate-200 rounded px-2 py-1">
            {intake.rawText}
          </p>

          {/* Full dose detail */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
            {intake.dosePerUnitValue !== null && (
              <>
                <span className="text-[11px] text-slate-400">Dose/unité</span>
                <span className="text-[11px] text-slate-700 font-medium">
                  {intake.dosePerUnitValue} {intake.dosePerUnitUnit ?? ""}
                  {intake.unitsPerIntake != null && ` × ${intake.unitsPerIntake} unité(s)`}
                </span>
              </>
            )}
            {intake.intakesPerDay !== null && (
              <>
                <span className="text-[11px] text-slate-400">Fréquence</span>
                <span className="text-[11px] text-slate-700 font-medium">
                  {intake.intakesPerDay}× / jour
                  {intake.timingText && ` (${intake.timingText})`}
                </span>
              </>
            )}
            {intake.estimatedDailyDoseValue !== null && (
              <>
                <span className="text-[11px] text-slate-400">Dose journalière</span>
                <span className="text-[11px] text-slate-700 font-medium">
                  {intake.estimatedDailyDoseValue} {intake.estimatedDailyDoseUnit ?? ""}
                </span>
              </>
            )}
            <span className="text-[11px] text-slate-400">Statut parsing</span>
            <span className="text-[11px] text-slate-700 font-medium">{intake.parseStatus}</span>
          </div>
        </div>
      )}
    </li>
  );
}
