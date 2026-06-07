"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButtonClient({
  email,
  label,
  copied,
}: {
  email: string;
  label: string;
  copied: string;
}) {
  const [didCopy, setDidCopy] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setDidCopy(true);
      setTimeout(() => setDidCopy(false), 2000);
    } catch {
      // Clipboard API non disponible — ignoré silencieusement
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition-colors"
      title={didCopy ? copied : label}
    >
      {didCopy ? (
        <Check className="w-3 h-3 text-teal-600" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {didCopy ? copied : label}
    </button>
  );
}
