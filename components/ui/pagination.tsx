import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;        // 1-indexed
  total: number;       // total record count
  perPage: number;
  buildHref: (page: number) => string;
  className?: string;
}

export function Pagination({ page, total, perPage, buildHref, className }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const linkClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors",
      active
        ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed pointer-events-none"
    );

  return (
    <div className={cn("flex items-center justify-between gap-4 pt-4", className)}>
      <p className="text-sm text-slate-500">
        {from}–{to} sur {total}
      </p>

      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link href={buildHref(page - 1)} className={linkClass(true)}>
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </Link>
        ) : (
          <span className={linkClass(false)}>
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </span>
        )}

        <span className="text-sm text-slate-500 tabular-nums px-1">
          {page} / {totalPages}
        </span>

        {hasNext ? (
          <Link href={buildHref(page + 1)} className={linkClass(true)}>
            Suivant
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className={linkClass(false)}>
            Suivant
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
    </div>
  );
}
