"use client";

import { useState, useRef, useTransition } from "react";
import { Search, Loader2, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";

interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  drugKey: string;
  kind: string;
  label: string;
  excerpt: string;
  sectionPath: string | null;
  score: number;
}

export function KnowledgeSearch() {
  const t = useTranslations("knowledge.search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        setError(null);
        try {
          const res = await fetch(
            `/api/knowledge/search?q=${encodeURIComponent(value.trim())}&limit=6`
          );
          if (!res.ok) throw new Error(await res.text());
          const data = (await res.json()) as { results: SearchResult[] };
          setResults(data.results);
        } catch {
          setError(t("error"));
          setResults(null);
        }
      });
    }, 500);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t("placeholder")}
          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {results !== null && results.length === 0 && (
        <p className="text-sm text-slate-500 px-1">{t("noResults")}</p>
      )}

      {results !== null && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li
              key={r.chunkId}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 space-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-teal-700 truncate">
                    {r.documentTitle}
                  </p>
                </div>
                <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                  {(r.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-slate-500">{r.label}</p>
              <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                {r.excerpt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
