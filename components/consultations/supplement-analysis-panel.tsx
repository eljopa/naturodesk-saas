/**
 * SupplementAnalysisPanel — Server Component.
 *
 * Affiche les résultats de l'analyse supplements V2 pour une consultation :
 *   - Intakes structurés (parsedLabel, variante, dose, parseConfidence, resolutionConfidence)
 *   - Findings enrichis (INTERACTION, SIDE_EFFECT, PROTOCOL, TERRAIN, QUESTION)
 *
 * États gérés :
 *   - Aucun run SUPPLEMENT_ODS → prompt "analyse à lancer"
 *   - Intakes vides → message "aucun supplément saisi"
 *   - Résultats complets → SupplementIntakeRowItem + SupplementFindingsView
 *
 * Chargement direct DB (Server Component) — pas de fetch HTTP.
 */

import { FlaskConical, Pill } from "lucide-react";
import {
  getSupplementIntakes,
  getLatestSupplementRun,
  getSupplementFindings,
} from "@/lib/knowledge/supplements/read/get-supplement-analysis";
import { SupplementIntakeRowItem } from "./supplement-intake-row";
import { SupplementFindingsView } from "./supplement-findings-view";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function RunStrip({ run }: { run: { id: string; createdAt: Date; finishedAt: Date | null } }) {
  const date = run.createdAt.toLocaleDateString("fr-FR", {
    day:    "numeric",
    month:  "long",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });

  const durationMs =
    run.finishedAt
      ? run.finishedAt.getTime() - run.createdAt.getTime()
      : null;

  return (
    <p className="text-xs text-slate-400">
      Dernière analyse le {date}
      {durationMs !== null && ` · ${durationMs}ms`}
      <span className="ml-2 font-mono opacity-50">{run.id.slice(0, 8)}…</span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SupplementAnalysisPanelProps {
  consultationId: string;
}

export async function SupplementAnalysisPanel({
  consultationId,
}: SupplementAnalysisPanelProps) {
  // ── 1. Fetch intakes ─────────────────────────────────────────────────────
  const intakes = await getSupplementIntakes(consultationId);

  if (intakes.length === 0) {
    return null; // Rien à montrer si aucun intake structuré
  }

  // ── 2. Fetch latest run ──────────────────────────────────────────────────
  const run = await getLatestSupplementRun(consultationId);

  // ── 3. Fetch findings (only if run exists) ───────────────────────────────
  const findings = run ? await getSupplementFindings(run.id) : [];

  // ── Stats summary ────────────────────────────────────────────────────────
  const recognizedCount = intakes.filter((i) => i.parseStatus !== "UNRESOLVED").length;
  const variantCount    = intakes.filter((i) => i.variantLabel !== null).length;
  const withDoseCount   = intakes.filter(
    (i) => i.estimatedDailyDoseValue !== null || i.dosePerUnitValue !== null
  ).length;

  return (
    <div className="space-y-6 mt-6">
      {/* ── Section séparateur ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
          <FlaskConical className="w-3.5 h-3.5" />
          Analyse structurée V2
        </div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* ── Run metadata ─────────────────────────────────────────────────── */}
      {run ? (
        <RunStrip run={run} />
      ) : (
        <p className="text-xs text-slate-400 italic">
          Lancez l&apos;analyse principale pour générer les données structurées et les findings suppléments.
        </p>
      )}

      {/* ── Intakes structurés ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Prises identifiées
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              <span className="font-medium text-slate-700">{recognizedCount}</span>/{intakes.length} reconnus
            </span>
            {variantCount > 0 && (
              <span>
                <span className="font-medium text-teal-600">{variantCount}</span> variantes
              </span>
            )}
            {withDoseCount > 0 && (
              <span>
                <span className="font-medium text-slate-700">{withDoseCount}</span> doses
              </span>
            )}
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <ul className="divide-y divide-slate-100">
            {intakes.map((intake) => (
              <SupplementIntakeRowItem key={intake.id} intake={intake} />
            ))}
          </ul>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Confiance</p>
          {[
            { label: "Correspondance exacte", color: "bg-teal-50 text-teal-700 border-teal-200" },
            { label: "Approchée", color: "bg-amber-50 text-amber-700 border-amber-200" },
            { label: "Non reconnu", color: "bg-slate-100 text-slate-500 border-slate-200" },
          ].map(({ label, color }) => (
            <span
              key={label}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${color}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Findings ────────────────────────────────────────────────────────── */}
      {findings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Findings suppléments
            </h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {findings.length}
            </span>
          </div>
          <SupplementFindingsView findings={findings} />
        </div>
      )}
    </div>
  );
}
