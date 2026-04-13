import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FindingCard } from "./finding-card";
import type { FindingDto } from "@/lib/knowledge/read/types";

interface FindingsBucketSectionProps {
  title:        string;
  icon:         ReactNode;
  findings:     FindingDto[];
  /** Tailwind border-color class for the section accent line (e.g. "border-red-200") */
  accentBorder: string;
}

/**
 * Renders one findings bucket (alerts, interactions, warnings, depletions, contextual).
 * Returns null if the bucket is empty — no empty state rendered at section level.
 *
 * Shows a "N à revoir" indicator in the header when pending findings exist.
 * Findings are pre-sorted by the serializer (pending first, then by risk level).
 */
export function FindingsBucketSection({
  title,
  icon,
  findings,
  accentBorder,
}: FindingsBucketSectionProps) {
  if (findings.length === 0) return null;

  const pendingCount = findings.filter((f) => f.validated === null).length;

  return (
    <section>
      {/* Section header */}
      <div className={cn("flex items-center gap-2 pb-2 mb-3 border-b", accentBorder)}>
        <span className="shrink-0">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-800 flex-1">{title}</h3>

        {pendingCount > 0 && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 tabular-nums">
            {pendingCount} à revoir
          </span>
        )}

        <span className="text-xs text-slate-400 font-medium tabular-nums">
          {findings.length}
        </span>
      </div>

      {/* Findings list */}
      <ul className="space-y-2">
        {findings.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
      </ul>
    </section>
  );
}
