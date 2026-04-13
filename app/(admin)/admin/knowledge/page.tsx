import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AnalysisStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers BDPM
// ---------------------------------------------------------------------------

async function getBdpmStats() {
  const [
    productCount, substanceCount, aliasCount,
    compositionCount, syncRecords, lastBatch,
    intakeTotal, intakeMatched,
  ] = await Promise.all([
    db.drugProduct.count(),
    db.drugSubstance.count(),
    db.drugAlias.count(),
    db.drugProductSubstance.count(),
    db.bdpmSyncRecord.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.drugSyncBatch.findFirst({ orderBy: { createdAt: "desc" } }),
    db.consultationMedicationIntake.count(),
    db.consultationMedicationIntake.count({
      where: { OR: [{ drugProductId: { not: null } }, { drugSubstanceId: { not: null } }] },
    }),
  ]);
  return { productCount, substanceCount, aliasCount, compositionCount,
           syncRecords, lastBatch, intakeTotal, intakeMatched };
}

export const metadata: Metadata = {
  title: "Knowledge — Monitoring — Admin NaturoDesk",
};

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  DONE:    "success",
  RUNNING: "warning",
  ERROR:   "error",
};

const STATUS_LABEL: Record<string, string> = {
  DONE:    "Terminé",
  RUNNING: "En cours",
  ERROR:   "Erreur",
};

const SYNC_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  completed:  "success",
  processing: "warning",
  failed:     "error",
};

export default async function AdminKnowledgePage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const bdpm = await getBdpmStats();

  const page         = Math.max(1, parseInt(sp.page ?? "1", 10));
  const statusFilter = sp.status?.trim() || null;

  const VALID_STATUSES: AnalysisStatus[] = ["RUNNING", "DONE", "ERROR"];
  const typedStatus = statusFilter && VALID_STATUSES.includes(statusFilter as AnalysisStatus)
    ? (statusFilter as AnalysisStatus)
    : null;

  const where = {
    stage: "KNOWLEDGE",
    ...(typedStatus ? { status: typedStatus } : {}),
  };

  const [total, runs] = await Promise.all([
    db.analysisRun.count({ where }),
    db.analysisRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    PAGE_SIZE,
      skip:    (page - 1) * PAGE_SIZE,
      include: {
        _count: { select: { findings: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildHref = (p: number, s?: string | null) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (s) params.set("status", s);
    const q = params.toString();
    return `/admin/knowledge${q ? `?${q}` : ""}`;
  };

  const STATUSES = ["DONE", "RUNNING", "ERROR"];

  const matchRate = bdpm.intakeTotal > 0
    ? `${Math.round((bdpm.intakeMatched / bdpm.intakeTotal) * 100)}%`
    : "—";

  return (
    <div>
      {/* ── Section BDPM ───────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Monitoring Knowledge
        </h1>
        <p className="text-sm text-slate-500 mt-1">Base de connaissances médicamenteuse</p>
      </div>

      <div className="mb-8">
        <h2 className="text-base font-semibold text-slate-700 mb-4">BDPM — Données de matching</h2>

        {/* Stats tables */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Spécialités",   value: bdpm.productCount },
            { label: "Substances DCI", value: bdpm.substanceCount },
            { label: "Alias",          value: bdpm.aliasCount },
            { label: "Compositions",   value: bdpm.compositionCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-2xl font-bold text-slate-800 tabular-nums">
                {value.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Taux matching */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Taux de matching BDPM (consultations)</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {bdpm.intakeMatched} / {bdpm.intakeTotal} intakes médicaments avec résolution BDPM
              </p>
            </div>
            <span className={cn(
              "text-xl font-bold tabular-nums",
              bdpm.intakeTotal === 0 ? "text-slate-300"
              : bdpm.intakeMatched / bdpm.intakeTotal > 0.7 ? "text-teal-600"
              : "text-amber-500"
            )}>
              {matchRate}
            </span>
          </div>
          {bdpm.productCount === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠ Aucune donnée BDPM — exécuter le seed minimal ou déclencher l&apos;ingestion n8n.
            </p>
          )}
        </div>

        {/* Dernier batch Pipeline A */}
        {bdpm.lastBatch && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Dernier batch Pipeline A (/api/bdpm/ingest)
            </p>
            <div className="flex items-center gap-3">
              <Badge variant={bdpm.lastBatch.status === "DONE" ? "success" : bdpm.lastBatch.status === "RUNNING" ? "warning" : "error"}>
                {bdpm.lastBatch.status}
              </Badge>
              <span className="text-sm text-slate-700 font-mono">{bdpm.lastBatch.batchRef}</span>
              <span className="text-xs text-slate-400">
                {bdpm.lastBatch.productCount.toLocaleString("fr-FR")} produits ·{" "}
                {bdpm.lastBatch.substanceCount.toLocaleString("fr-FR")} substances
              </span>
            </div>
            {bdpm.lastBatch.errorMessage && (
              <p className="text-xs text-red-500 mt-2 truncate">{bdpm.lastBatch.errorMessage}</p>
            )}
          </div>
        )}

        {/* BdpmSyncRecord Pipeline B */}
        {bdpm.syncRecords.length > 0 && (
          <Card>
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Lots BDPM — Pipeline B (webhook n8n)
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {bdpm.syncRecords.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-4 text-sm">
                  <Badge variant={SYNC_VARIANT[r.status] ?? "neutral"}>
                    {r.status}
                  </Badge>
                  <span className="font-mono text-slate-700">{r.batchId}</span>
                  <span className="text-xs text-slate-400">
                    {r.filesProcessed != null && `files=${r.filesProcessed} `}
                    {r.documentsCreated != null && `docs=${r.documentsCreated} `}
                    {r.chunksCreated != null && `chunks=${r.chunksCreated}`}
                  </span>
                  {r.errorMessage && (
                    <span className="text-xs text-red-500 truncate max-w-xs" title={r.errorMessage}>
                      {r.errorMessage}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">
                    {r.createdAt.toLocaleDateString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Section AnalysisRun (existant) ─────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Runs d&apos;analyse knowledge</h2>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight sr-only">
          Monitoring Knowledge
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {total} run{total !== 1 ? "s" : ""} knowledge
          {statusFilter && ` · filtre : ${statusFilter}`}
          {totalPages > 1 && ` · page ${page}/${totalPages}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={buildHref(1)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg border transition-colors",
            !statusFilter
              ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          )}
        >
          Tous
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref(1, s)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg border transition-colors",
              statusFilter === s
                ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            {STATUS_LABEL[s] ?? s}
          </Link>
        ))}
      </div>

      <Card>
        {runs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">Aucun run knowledge.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Consultation
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Findings
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Durée
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {runs.map((run) => {
                  const durationMs =
                    run.startedAt && run.finishedAt
                      ? run.finishedAt.getTime() - run.startedAt.getTime()
                      : null;

                  return (
                    <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                      {/* Status */}
                      <td className="px-6 py-3">
                        <Badge variant={STATUS_VARIANT[run.status] ?? "neutral"}>
                          {STATUS_LABEL[run.status] ?? run.status}
                        </Badge>
                        {run.status === "ERROR" && run.errorMessage && (
                          <p
                            className="text-xs text-red-500 mt-1 max-w-xs truncate"
                            title={run.errorMessage}
                          >
                            {run.errorMessage}
                          </p>
                        )}
                      </td>

                      {/* Consultation ID */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/consultations/${run.consultationId}?tab=knowledge`}
                          className="font-mono text-xs text-teal-700 hover:underline"
                        >
                          {run.consultationId.slice(0, 8)}…
                        </Link>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          run {run.id.slice(0, 8)}…
                        </p>
                      </td>

                      {/* Findings count */}
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            run._count.findings > 0 ? "text-slate-800" : "text-slate-300"
                          )}
                        >
                          {run._count.findings}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 text-right text-xs text-slate-500 hidden md:table-cell tabular-nums">
                        {durationMs !== null ? `${durationMs}ms` : "—"}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {run.createdAt.toLocaleString("fr-FR", {
                          day:    "numeric",
                          month:  "short",
                          year:   "numeric",
                          hour:   "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            Page {page} sur {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildHref(page - 1, statusFilter)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ← Précédent
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildHref(page + 1, statusFilter)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Suivant →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
