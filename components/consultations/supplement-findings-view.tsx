"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Zap, AlertCircle, Shield, Leaf, HelpCircle, BookOpen, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validateFindingAction,
  rejectFindingAction,
} from "@/lib/actions/findings";
import type { SupplementFindingRow } from "@/lib/knowledge/supplements/read/get-supplement-analysis";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RISK_META: Record<string, { label: string; dotColor: string; textColor: string }> = {
  CRITICAL:      { label: "Critique",       dotColor: "bg-red-500",    textColor: "text-red-700" },
  HIGH:          { label: "Élevé",           dotColor: "bg-orange-500", textColor: "text-orange-700" },
  MEDIUM:        { label: "Modéré",          dotColor: "bg-amber-400",  textColor: "text-amber-700" },
  LOW:           { label: "Faible",          dotColor: "bg-slate-300",  textColor: "text-slate-600" },
  INFORMATIONAL: { label: "Informatif",      dotColor: "bg-teal-300",   textColor: "text-teal-700" },
};

const EVIDENCE_LABEL: Record<string, string> = {
  DOCUMENTED: "Documenté ODS NIH",
  PARSED:     "Extrait de la saisie",
  CLINICAL:   "Règle clinique",
  ABSENT:     "Aucune source",
};

const EVIDENCE_COLOR: Record<string, string> = {
  DOCUMENTED: "bg-teal-50 text-teal-700 border-teal-100",
  PARSED:     "bg-blue-50 text-blue-700 border-blue-100",
  CLINICAL:   "bg-amber-50 text-amber-700 border-amber-100",
  ABSENT:     "bg-slate-100 text-slate-500 border-slate-200",
};

// ---------------------------------------------------------------------------
// Buckets
//
// Chaque bucket définit un filtre sur les findings.
// Le bucket "Interactions croisées médicaments ↔ suppléments" (sourceType=RULE)
// est distinct du bucket ODS "Interactions" (sourceType=KNOWLEDGE).
// ---------------------------------------------------------------------------

interface BucketDef {
  key:         string;
  label:       string;
  icon:        React.ReactNode;
  borderColor: string;
  headerBg:    string;
  filter:      (f: SupplementFindingRow) => boolean;
}

const BUCKETS: BucketDef[] = [
  {
    key:         "DRUG_SUPPLEMENT",
    label:       "Interactions croisées médicaments ↔ suppléments",
    icon:        <Pill className="w-3.5 h-3.5 text-red-500" />,
    borderColor: "border-red-200",
    headerBg:    "bg-red-50",
    filter:      (f) => f.category === "INTERACTION" && f.sourceType === "RULE",
  },
  {
    key:         "INTERACTION",
    label:       "Interactions (ODS NIH)",
    icon:        <Zap className="w-3.5 h-3.5 text-amber-500" />,
    borderColor: "border-amber-200",
    headerBg:    "bg-amber-50",
    filter:      (f) => f.category === "INTERACTION" && f.sourceType !== "RULE",
  },
  {
    key:         "SIDE_EFFECT",
    label:       "Vigilances",
    icon:        <AlertCircle className="w-3.5 h-3.5 text-orange-400" />,
    borderColor: "border-orange-200",
    headerBg:    "bg-orange-50",
    filter:      (f) => f.category === "SIDE_EFFECT",
  },
  {
    key:         "PROTOCOL",
    label:       "Protocole & posologie",
    icon:        <Shield className="w-3.5 h-3.5 text-teal-500" />,
    borderColor: "border-teal-200",
    headerBg:    "bg-teal-50",
    filter:      (f) => f.category === "PROTOCOL",
  },
  {
    key:         "TERRAIN",
    label:       "Termes reconnus sans données",
    icon:        <Leaf className="w-3.5 h-3.5 text-slate-400" />,
    borderColor: "border-slate-200",
    headerBg:    "bg-slate-50",
    filter:      (f) => f.category === "TERRAIN",
  },
  {
    key:         "QUESTION",
    label:       "Suppléments non reconnus",
    icon:        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />,
    borderColor: "border-slate-200",
    headerBg:    "bg-slate-50",
    filter:      (f) => f.category === "QUESTION",
  },
];

// ---------------------------------------------------------------------------
// Single finding card
// ---------------------------------------------------------------------------

function FindingItem({ finding }: { finding: SupplementFindingRow }) {
  const [expanded, setExpanded]   = useState(false);
  const [pending, startTransition] = useTransition();
  const [actionErr, setActionErr]  = useState<string | null>(null);

  const risk     = RISK_META[finding.riskLevel ?? ""] ?? RISK_META["LOW"]!;
  const evLabel  = finding.evidenceLevel ? (EVIDENCE_LABEL[finding.evidenceLevel] ?? finding.evidenceLevel) : null;
  const evColor  = finding.evidenceLevel ? (EVIDENCE_COLOR[finding.evidenceLevel] ?? "bg-slate-100 text-slate-500 border-slate-200") : null;

  function handleValidate() {
    setActionErr(null);
    startTransition(async () => {
      const r = await validateFindingAction(finding.id);
      if (!r.success) setActionErr("Erreur lors de la validation.");
    });
  }

  function handleReject() {
    setActionErr(null);
    startTransition(async () => {
      const r = await rejectFindingAction(finding.id);
      if (!r.success) setActionErr("Erreur lors du rejet.");
    });
  }

  return (
    <li className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="mt-1 shrink-0 text-slate-300">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {/* Risk dot + label */}
            <span className="inline-flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full shrink-0", risk.dotColor)} />
              <span className={cn("text-xs font-semibold", risk.textColor)}>{risk.label}</span>
            </span>
            {/* Evidence level */}
            {evLabel && evColor && (
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                evColor
              )}>
                {evLabel}
              </span>
            )}
            {/* Validated state */}
            {finding.validated === true && (
              <span className="ml-auto text-[10px] font-medium text-green-600">✓ Validé</span>
            )}
            {finding.validated === false && (
              <span className="ml-auto text-[10px] text-slate-400">✗ Rejeté</span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-900 leading-snug">
            {finding.title}
          </p>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pl-10 border-t border-slate-100 pt-3 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {finding.description}
          </p>

          {/* Citations */}
          {finding.citations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Source documentaire
              </p>
              <ul className="space-y-1">
                {finding.citations.map((c) => (
                  <li
                    key={c.id}
                    className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded px-3 py-2"
                  >
                    <span className="font-medium">{c.reference}</span>
                    {c.excerpt && (
                      <span className="text-slate-400"> — {c.excerpt}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Practitioner note */}
          {finding.practitionerNote && (
            <div className="bg-teal-50 border border-teal-100 rounded px-3 py-2">
              <p className="text-xs font-semibold text-teal-700 mb-0.5">Note praticien</p>
              <p className="text-sm text-teal-800">{finding.practitionerNote}</p>
            </div>
          )}

          {/* Validate / Reject */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleValidate}
              disabled={pending || finding.validated === true}
              className={cn(
                "text-xs px-3 py-1.5 rounded border font-medium transition-colors",
                finding.validated === true
                  ? "border-green-300 text-green-700 bg-green-50 cursor-default"
                  : "border-green-200 text-green-600 bg-white hover:bg-green-50 disabled:opacity-50"
              )}
            >
              ✓ Valider
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={pending || finding.validated === false}
              className={cn(
                "text-xs px-3 py-1.5 rounded border transition-colors",
                finding.validated === false
                  ? "border-slate-300 text-slate-600 bg-slate-100 cursor-default"
                  : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50"
              )}
            >
              ✗ Rejeter
            </button>
            {actionErr && (
              <span className="text-xs text-red-500">{actionErr}</span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SupplementFindingsViewProps {
  findings: SupplementFindingRow[];
}

export function SupplementFindingsView({ findings }: SupplementFindingsViewProps) {
  if (findings.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        Aucun finding généré pour cette analyse.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {BUCKETS.map((bucket) => {
        const bucketFindings = findings.filter(bucket.filter);
        if (bucketFindings.length === 0) return null;

        return (
          <div key={bucket.key}>
            {/* Bucket header */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-t-lg border-l-2 mb-0",
              bucket.headerBg, bucket.borderColor
            )}>
              {bucket.icon}
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                {bucket.label}
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {bucketFindings.length}
              </span>
            </div>
            {/* Findings list */}
            <ul className="space-y-2 pt-2">
              {bucketFindings.map((f) => (
                <FindingItem key={f.id} finding={f} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
