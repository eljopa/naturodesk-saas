/**
 * KnowledgeFindingsPanel — Server Component.
 *
 * Charge et affiche les findings knowledge du dernier run d'une consultation.
 * Appelle directement la couche service (pas de fetch HTTP — Server Component).
 *
 * États gérés :
 *   - Chargement (implicite via Suspense en amont)
 *   - Aucun run knowledge (empty state)
 *   - Run existant mais 0 findings
 *   - Run avec findings → délégué à KnowledgeFindingsView (Client Component)
 *   - Erreur DB (error state)
 */

import { AlertTriangle, Brain } from "lucide-react";
import { getLatestKnowledgeRunForConsultation, getActiveKnowledgeRun } from "@/lib/knowledge/read/services/get-run";
import { getFindingsForKnowledgeRun } from "@/lib/knowledge/read/services/get-findings";
import { buildFindingsResponse } from "@/lib/knowledge/read/serializer";
import { KnowledgeFindingsView } from "./knowledge-findings-view";
import { KnowledgeAnalysisPolling } from "./knowledge-analysis-polling";

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface KnowledgeFindingsPanelProps {
  consultationId: string;
}

export async function KnowledgeFindingsPanel({ consultationId }: KnowledgeFindingsPanelProps) {
  // Fetch data directly — Server Component
  let data;
  try {
    // Vérifier d'abord si un run est en cours → polling
    const activeRun = await getActiveKnowledgeRun(consultationId);
    if (activeRun) {
      return <KnowledgeAnalysisPolling />;
    }

    const run      = await getLatestKnowledgeRunForConsultation(consultationId);
    const findings = run ? await getFindingsForKnowledgeRun(run.id) : [];
    data           = buildFindingsResponse(consultationId, run, findings);
  } catch {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-5 text-center">
        <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-red-700">Erreur lors du chargement de l&apos;analyse</p>
        <p className="text-xs text-red-500 mt-1">
          Vérifiez la connexion base de données ou relancez la page.
        </p>
      </div>
    );
  }

  // --- État initial : aucun run ---
  if (!data.meta.hasRun) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <Brain className="w-9 h-9 text-slate-200 mb-3" />
        <p className="text-sm font-medium text-slate-600">
          Aucune analyse knowledge effectuée
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Lancez une analyse depuis l&apos;onglet principal pour visualiser
          les interactions, déplétions et alertes documentées ici.
        </p>
      </div>
    );
  }

  // --- Run en erreur ---
  if (data.meta.hasErrors) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
        <p className="text-sm font-medium text-amber-700">
          La dernière analyse s&apos;est terminée avec des erreurs.
        </p>
        <p className="text-xs text-amber-600 mt-1">
          Relancez l&apos;analyse pour obtenir des résultats complets.
        </p>
      </div>
    );
  }

  // --- Run terminé mais 0 findings ---
  if (data.summary.totalFindings === 0) {
    return (
      <p className="text-sm text-slate-500">
        Aucun finding pertinent trouvé pour cette consultation.
        Les médicaments et compléments ne présentent pas d&apos;interactions
        ou déplétions documentées dans la base actuelle.
      </p>
    );
  }

  // --- Résultat complet — délégué au Client Component ---
  return <KnowledgeFindingsView data={data} />;
}
