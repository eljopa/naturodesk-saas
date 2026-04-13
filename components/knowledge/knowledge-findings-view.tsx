"use client";

/**
 * KnowledgeFindingsView — Client Component.
 *
 * Reçoit les données déjà chargées depuis KnowledgeFindingsPanel (Server Component).
 * Gère :
 *   - Filtrage local des findings (Tous / À revoir / Validés / Rejetés)
 *   - Synthèse praticien déterministe (aucun LLM)
 *   - Affichage des buckets filtrés
 */

import { useState } from "react";
import { AlertTriangle, Zap, AlertCircle, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { FindingsSummaryCards } from "./findings-summary-cards";
import { FindingsBucketSection } from "./findings-bucket-section";
import type { FindingsApiResponse, FindingDto } from "@/lib/knowledge/read/types";

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

type FilterValue = "all" | "pending" | "validated" | "rejected";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all",       label: "Tous" },
  { value: "pending",   label: "À revoir" },
  { value: "validated", label: "Validés" },
  { value: "rejected",  label: "Rejetés" },
];

function applyFilter(findings: FindingDto[], filter: FilterValue): FindingDto[] {
  if (filter === "all")       return findings;
  if (filter === "pending")   return findings.filter((f) => f.validated === null);
  if (filter === "validated") return findings.filter((f) => f.validated === true);
  if (filter === "rejected")  return findings.filter((f) => f.validated === false);
  return findings;
}

// ---------------------------------------------------------------------------
// Deterministic synthesis
// ---------------------------------------------------------------------------

/**
 * Construit une phrase de synthèse courte depuis les findings déjà connus.
 * Purement déterministe — aucun LLM.
 */
function buildSynthesis(data: FindingsApiResponse): string | null {
  const { summary, alerts, interactions, depletions, warnings } = data;
  if (summary.totalFindings === 0) return null;

  const parts: string[] = [];

  // Élément prioritaire : alerte critique ou élevée
  const criticalAlert = [...alerts, ...interactions].find(
    (f) => f.riskLevel === "CRITICAL" || f.riskLevel === "HIGH"
  );
  if (criticalAlert) {
    const level = criticalAlert.riskLevel === "CRITICAL" ? "critique" : "élevé";
    parts.push(`Risque ${level} détecté — ${criticalAlert.title}.`);
  }

  // Compteurs secondaires
  const secondary: string[] = [];
  if (summary.interactionCount > 0 && !criticalAlert) {
    secondary.push(
      `${summary.interactionCount} interaction${summary.interactionCount > 1 ? "s" : ""}`
    );
  }
  if (summary.alertCount > 0 && !criticalAlert) {
    secondary.push(
      `${summary.alertCount} alerte${summary.alertCount > 1 ? "s" : ""}`
    );
  }
  if (summary.depletionCount > 0) {
    secondary.push(
      `${summary.depletionCount} déplétion${summary.depletionCount > 1 ? "s" : ""} nutritionnelle${summary.depletionCount > 1 ? "s" : ""}`
    );
  }
  if (summary.warningCount > 0) {
    secondary.push(
      `${summary.warningCount} vigilance${summary.warningCount > 1 ? "s" : ""}`
    );
  }
  if (secondary.length > 0) {
    parts.push(secondary.join(", ") + " identifié" + (secondary.length > 1 ? "s" : "") + ".");
  }

  // État de validation
  if (summary.pendingCount > 0) {
    parts.push(
      `${summary.pendingCount} finding${summary.pendingCount > 1 ? "s" : ""} à examiner.`
    );
  } else if (summary.totalFindings > 0) {
    parts.push("Tous les findings ont été examinés.");
  }

  return parts.join(" ") || null;
}

// ---------------------------------------------------------------------------
// Run strip (metadata)
// ---------------------------------------------------------------------------

function RunStrip({
  runId,
  createdAt,
  durationMs,
}: {
  runId: string;
  createdAt: string;
  durationMs: number | null;
}) {
  const date = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <p className="text-xs text-slate-400">
      Dernière analyse le {date}
      {durationMs !== null && ` · ${durationMs}ms`}
      <span className="ml-2 font-mono opacity-50">{runId.slice(0, 8)}…</span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface KnowledgeFindingsViewProps {
  data: FindingsApiResponse;
}

export function KnowledgeFindingsView({ data }: KnowledgeFindingsViewProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const synthesis = buildSynthesis(data);

  // Filtered buckets — filter applied independently per bucket
  const filtered = {
    alerts:          applyFilter(data.alerts,          filter),
    interactions:    applyFilter(data.interactions,    filter),
    warnings:        applyFilter(data.warnings,        filter),
    depletions:      applyFilter(data.depletions,      filter),
    contextualNotes: applyFilter(data.contextualNotes, filter),
  };

  const filteredTotal =
    filtered.alerts.length +
    filtered.interactions.length +
    filtered.warnings.length +
    filtered.depletions.length +
    filtered.contextualNotes.length;

  return (
    <div className="space-y-5">
      {/* Run metadata */}
      {data.run && (
        <RunStrip
          runId={data.run.id}
          createdAt={data.run.createdAt}
          durationMs={data.run.durationMs}
        />
      )}

      {/* Summary cards */}
      <FindingsSummaryCards summary={data.summary} />

      {/* Deterministic synthesis */}
      {synthesis && (
        <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
          <p className="text-xs font-semibold text-teal-700 mb-1 uppercase tracking-wide">
            Synthèse
          </p>
          <p className="text-sm text-teal-900 leading-relaxed">{synthesis}</p>
        </div>
      )}

      {/* Filter bar — only show when there's something to filter */}
      {data.summary.totalFindings > 0 &&
        (data.summary.pendingCount > 0 ||
          data.summary.validatedCount > 0 ||
          data.summary.rejectedCount > 0) && (
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map((f) => {
              // Hide filter tabs that would yield 0 results (except "all")
              if (f.value === "pending"   && data.summary.pendingCount   === 0) return null;
              if (f.value === "validated" && data.summary.validatedCount === 0) return null;
              if (f.value === "rejected"  && data.summary.rejectedCount  === 0) return null;

              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors font-medium",
                    filter === f.value
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "border-slate-200 text-slate-500 bg-white hover:border-slate-300 hover:text-slate-700"
                  )}
                >
                  {f.label}
                  {f.value === "pending"   && ` (${data.summary.pendingCount})`}
                  {f.value === "validated" && ` (${data.summary.validatedCount})`}
                  {f.value === "rejected"  && ` (${data.summary.rejectedCount})`}
                </button>
              );
            })}
          </div>
        )}

      {/* Buckets */}
      <div className="space-y-7">
        <FindingsBucketSection
          title="Alertes"
          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
          findings={filtered.alerts}
          accentBorder="border-red-200"
        />
        <FindingsBucketSection
          title="Interactions"
          icon={<Zap className="w-4 h-4 text-orange-500" />}
          findings={filtered.interactions}
          accentBorder="border-orange-200"
        />
        <FindingsBucketSection
          title="Vigilances"
          icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
          findings={filtered.warnings}
          accentBorder="border-amber-200"
        />
        <FindingsBucketSection
          title="Déplétions nutritionnelles"
          icon={<TrendingDown className="w-4 h-4 text-yellow-600" />}
          findings={filtered.depletions}
          accentBorder="border-yellow-200"
        />
        <FindingsBucketSection
          title="Contexte documentaire"
          icon={<Info className="w-4 h-4 text-slate-400" />}
          findings={filtered.contextualNotes}
          accentBorder="border-slate-200"
        />
      </div>

      {/* Empty state when filter yields nothing */}
      {filteredTotal === 0 && filter !== "all" && (
        <p className="text-sm text-slate-400 text-center py-8">
          Aucun finding dans cette catégorie.
        </p>
      )}
    </div>
  );
}
