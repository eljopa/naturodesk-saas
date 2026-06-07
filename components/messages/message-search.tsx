"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function MessageSearch() {
  const t = useTranslations("messages");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const value = e.target.value;
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="search"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={handleChange}
        placeholder={t("searchPlaceholder")}
        className="w-full sm:w-72 rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors hover:border-slate-400"
      />
    </div>
  );
}
