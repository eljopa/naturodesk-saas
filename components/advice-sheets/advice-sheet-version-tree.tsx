"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VersionItem {
  id:           string;
  versionMajor: number;
  versionMinor: number;
  status:       "DRAFT" | "FINAL";
  createdAt:    Date;
  title:        string | null;
}

interface AdviceSheetVersionTreeProps {
  versions:         VersionItem[];
  currentId:        string;
}

export function AdviceSheetVersionTree({ versions, currentId }: AdviceSheetVersionTreeProps) {
  if (versions.length <= 1) return null;

  const sorted = [...versions].sort((a, b) => {
    if (a.versionMajor !== b.versionMajor) return a.versionMajor - b.versionMajor;
    return a.versionMinor - b.versionMinor;
  });

  return (
    <div className="space-y-1">
      {sorted.map((v, i) => {
        const isCurrent = v.id === currentId;
        const isLast = i === sorted.length - 1;
        const label = `V${v.versionMajor}.${v.versionMinor}`;
        const dateStr = v.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

        return (
          <div key={v.id} className="flex items-center gap-2">
            {/* Arbre visuel */}
            <div className="flex flex-col items-center w-4 shrink-0">
              <div className={cn("w-px flex-1 bg-slate-200", i === 0 && "opacity-0")} />
              <div className={cn("w-2 h-2 rounded-full border-2", isCurrent ? "border-nd-sage bg-nd-sage" : "border-slate-300 bg-white")} />
              <div className={cn("w-px flex-1 bg-slate-200", isLast && "opacity-0")} />
            </div>

            {/* Contenu */}
            <div className={cn(
              "flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm",
              isCurrent
                ? "bg-nd-sage-tint border border-nd-sage/30"
                : "hover:bg-slate-50 border border-transparent"
            )}>
              <Link href={`/advice-sheets/${v.id}`} className="flex items-center gap-2 min-w-0">
                <span className={cn("font-medium shrink-0", isCurrent ? "text-nd-sage-deep" : "text-slate-700")}>
                  {label}
                </span>
                <span className="text-xs text-slate-400 shrink-0">{dateStr}</span>
                {v.title && (
                  <span className="text-xs text-slate-500 truncate hidden sm:block">{v.title}</span>
                )}
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={v.status === "FINAL" ? "success" : "neutral"} className="text-xs">
                  {v.status === "FINAL" ? "Final" : "Brouillon"}
                </Badge>
                <a
                  href={`/api/pdf/advice-sheet/${v.id}`}
                  className="text-slate-400 hover:text-nd-sage transition-colors"
                  title="Télécharger PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
