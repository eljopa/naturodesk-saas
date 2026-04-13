import type { FindingsSummary } from "@/lib/knowledge/read/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Risk level → badge variant
// ---------------------------------------------------------------------------

type BadgeVariant = "error" | "warning" | "neutral" | "default" | "info" | "success";

const RISK_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  CRITICAL:      { variant: "error",   label: "Critique" },
  HIGH:          { variant: "warning", label: "Élevé" },
  MEDIUM:        { variant: "warning", label: "Modéré" },
  LOW:           { variant: "neutral", label: "Faible" },
  INFORMATIONAL: { variant: "neutral", label: "Informatif" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FindingsSummaryCardsProps {
  summary: FindingsSummary;
}

/**
 * Résumé global de l'analyse :
 *   - Compteurs par bucket (alertes, interactions, vigilances, déplétions)
 *   - Risque maximal détecté
 *   - État de validation praticien (à revoir / validés / rejetés)
 */
export function FindingsSummaryCards({ summary }: FindingsSummaryCardsProps) {
  const stats = [
    {
      label: "Alertes",
      value: summary.alertCount,
      active: summary.alertCount > 0,
      colorActive:   "border-red-200 bg-red-50 text-red-700",
      colorInactive: "border-slate-100 bg-slate-50 text-slate-400",
    },
    {
      label: "Interactions",
      value: summary.interactionCount,
      active: summary.interactionCount > 0,
      colorActive:   "border-orange-200 bg-orange-50 text-orange-700",
      colorInactive: "border-slate-100 bg-slate-50 text-slate-400",
    },
    {
      label: "Vigilances",
      value: summary.warningCount,
      active: summary.warningCount > 0,
      colorActive:   "border-amber-200 bg-amber-50 text-amber-700",
      colorInactive: "border-slate-100 bg-slate-50 text-slate-400",
    },
    {
      label: "Déplétions",
      value: summary.depletionCount,
      active: summary.depletionCount > 0,
      colorActive:   "border-yellow-200 bg-yellow-50 text-yellow-700",
      colorInactive: "border-slate-100 bg-slate-50 text-slate-400",
    },
  ];

  const riskInfo = summary.highestRisk ? RISK_BADGE[summary.highestRisk] : null;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-xl border px-4 py-3",
              s.active ? s.colorActive : s.colorInactive
            )}
          >
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Risque maximal + état validation */}
      <div className="flex items-center gap-4 flex-wrap text-xs rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">

        {/* Risque maximal */}
        {riskInfo ? (
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            Risque max :
            <Badge variant={riskInfo.variant}>{riskInfo.label}</Badge>
          </span>
        ) : (
          <span className="text-slate-400">Aucun risque détecté</span>
        )}

        <span className="hidden sm:block text-slate-200">|</span>

        {/* Validation praticien */}
        <div className="flex items-center gap-3 flex-wrap">
          {summary.pendingCount > 0 && (
            <span className="flex items-center gap-1 font-semibold text-amber-600">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              {summary.pendingCount} à revoir
            </span>
          )}
          {summary.validatedCount > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
              {summary.validatedCount} validé{summary.validatedCount > 1 ? "s" : ""}
            </span>
          )}
          {summary.rejectedCount > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
              {summary.rejectedCount} rejeté{summary.rejectedCount > 1 ? "s" : ""}
            </span>
          )}
          {summary.pendingCount === 0 && summary.totalFindings > 0 && (
            <span className="text-green-600 font-medium">Tous examinés</span>
          )}
        </div>

        <span className="ml-auto text-slate-400">
          {summary.totalFindings} finding{summary.totalFindings > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
