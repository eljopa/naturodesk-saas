"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, BookOpen, CheckCircle, XCircle, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FindingDto } from "@/lib/knowledge/read/types";
import {
  validateFindingAction,
  rejectFindingAction,
  updatePractitionerNoteAction,
} from "@/lib/actions/findings";

// ---------------------------------------------------------------------------
// Risk level → display
// ---------------------------------------------------------------------------

type BadgeVariant = "error" | "warning" | "neutral";

const RISK_META: Record<string, { variant: BadgeVariant; label: string; scoreColor: string }> = {
  CRITICAL:      { variant: "error",   label: "Critique", scoreColor: "text-red-600" },
  HIGH:          { variant: "warning", label: "Élevé",    scoreColor: "text-amber-600" },
  MEDIUM:        { variant: "warning", label: "Modéré",   scoreColor: "text-amber-500" },
  LOW:           { variant: "neutral", label: "Faible",   scoreColor: "text-slate-500" },
  INFORMATIONAL: { variant: "neutral", label: "Info",     scoreColor: "text-slate-400" },
};

// ---------------------------------------------------------------------------
// Note editor sub-component
// ---------------------------------------------------------------------------

function NoteEditor({
  findingId,
  initialNote,
  onClose,
}: {
  findingId: string;
  initialNote: string;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialNote);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function handleSave() {
    setError(false);
    startTransition(async () => {
      const result = await updatePractitionerNoteAction(findingId, text);
      if (result.success) {
        onClose();
      } else {
        setError(true);
      }
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Note personnelle sur ce finding…"
        className="w-full text-sm rounded-md border border-slate-200 px-3 py-2
                   focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                   resize-none text-slate-800 placeholder:text-slate-400"
      />
      {error && (
        <p className="text-xs text-red-500">Erreur lors de l&apos;enregistrement.</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded-md bg-teal-600 text-white font-medium
                     hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600
                     hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FindingCardProps {
  finding: FindingDto;
}

export function FindingCard({ finding }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const risk = RISK_META[finding.riskLevel ?? ""] ?? RISK_META["LOW"]!;
  const confidencePct = Math.round(finding.confidence * 100);

  function handleValidate() {
    setActionError(null);
    startTransition(async () => {
      const result = await validateFindingAction(finding.id);
      if (!result.success) setActionError("Erreur lors de la validation.");
    });
  }

  function handleReject() {
    setActionError(null);
    startTransition(async () => {
      const result = await rejectFindingAction(finding.id);
      if (!result.success) setActionError("Erreur lors du rejet.");
    });
  }

  return (
    <li className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Header row — clickable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Expand chevron */}
        <span className="mt-0.5 shrink-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </span>

        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={risk.variant}>{risk.label}</Badge>

            {finding.validated === true && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle className="w-3 h-3" />
                Validé
              </span>
            )}
            {finding.validated === false && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <XCircle className="w-3 h-3" />
                Rejeté
              </span>
            )}

            <span className={cn("text-xs ml-auto", risk.scoreColor)}>
              {confidencePct}%
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-slate-900 leading-snug">
            {finding.title}
          </p>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pl-11 space-y-3 border-t border-slate-100 pt-3">
          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed">
            {finding.description}
          </p>

          {/* Citations */}
          {finding.citations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Source documentaire
              </p>
              <ul className="space-y-1.5">
                {finding.citations.map((c) => (
                  <li
                    key={c.id}
                    className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-3 py-2"
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
          {editingNote ? (
            <NoteEditor
              findingId={finding.id}
              initialNote={finding.practitionerNote ?? ""}
              onClose={() => setEditingNote(false)}
            />
          ) : (
            <>
              {finding.practitionerNote ? (
                <div className="bg-teal-50 border border-teal-100 rounded-md px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-teal-700 mb-0.5">Note praticien</p>
                      <p className="text-sm text-teal-800">{finding.practitionerNote}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingNote(true)}
                      className="shrink-0 text-teal-500 hover:text-teal-700 transition-colors"
                      title="Modifier la note"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingNote(true)}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Ajouter une note
                </button>
              )}
            </>
          )}

          {/* Validation actions */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={handleValidate}
              disabled={pending || finding.validated === true}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md border font-medium transition-colors",
                finding.validated === true
                  ? "border-green-300 text-green-700 bg-green-50 cursor-default"
                  : "border-green-200 text-green-600 bg-white hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <CheckCircle className="w-3 h-3 inline mr-1" />
              {pending && finding.validated !== true ? "…" : "Valider"}
            </button>

            <button
              type="button"
              onClick={handleReject}
              disabled={pending || finding.validated === false}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md border transition-colors",
                finding.validated === false
                  ? "border-slate-300 text-slate-600 bg-slate-100 cursor-default"
                  : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <XCircle className="w-3 h-3 inline mr-1" />
              {pending && finding.validated !== false ? "…" : "Rejeter"}
            </button>

            {actionError && (
              <span className="text-xs text-red-500">{actionError}</span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
