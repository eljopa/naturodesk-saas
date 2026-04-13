"use client";

/**
 * KnowledgeAnalysisPolling — Client Component.
 *
 * Affiché quand un run knowledge est en cours (status = RUNNING).
 * Appelle router.refresh() toutes les POLL_INTERVAL_MS pour rafraîchir
 * les données du Server Component parent, sans rechargement de page.
 *
 * L'arrêt est automatique : quand le run se termine, le Server Component
 * n'affiche plus ce composant (il affiche les résultats à la place).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const POLL_INTERVAL_MS = 5_000;

export function KnowledgeAnalysisPolling() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
      <RefreshCw className="w-7 h-7 text-teal-400 animate-spin" />
      <p className="text-sm font-medium text-slate-600">Analyse documentaire en cours…</p>
      <p className="text-xs text-slate-400 max-w-xs">
        Les résultats s&apos;afficheront automatiquement dès que l&apos;analyse sera terminée.
      </p>
    </div>
  );
}
