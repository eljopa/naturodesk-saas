/**
 * lib/clinical/synthesize.ts
 *
 * Étape 6 du pipeline : produit une synthèse textuelle à partir des ScoredItem.
 *
 * Mode "template" (déterministe, sans LLM) :
 *   - Groupement par tier
 *   - Phrases formulées avec précaution (jamais de causalité certaine)
 *   - Niveau de confiance affiché en pourcentage entier
 *   - Corroboration mentionnée globalement si applicable
 *   - Tier 4 : liste les symptômes sans correspondance avec recommandation
 *
 * Mode LLM (optionnel) :
 *   - Non implémenté en Phase 3
 *   - Emplacement réservé dans SynthesisOptions pour Phase 4
 *   - Si activé, il reformule — il ne crée aucune relation clinique
 *
 * Garantie : cette fonction est synchrone et ne peut pas échouer.
 */

import type { ScoredItem } from "./types";

export interface SynthesisOptions {
  mode?: "template"; // "llm" réservé pour Phase 4
}

export interface SynthesisResult {
  summary: string;
  mode: "template";
}

// ---------------------------------------------------------------------------
// Helpers de formatage
// ---------------------------------------------------------------------------

function pct(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function sourceRef(label: string | undefined): string {
  return label ? ` (source : ${label})` : "";
}

// ---------------------------------------------------------------------------
// Synthèse principale
// ---------------------------------------------------------------------------

export function synthesize(
  items: ScoredItem[],
  rawSymptoms: string,
  _options: SynthesisOptions = {},
): SynthesisResult {
  const tier1 = items.filter((i) => i.tier === "TIER_1_DIRECT");
  const tier2 = items.filter((i) => i.tier === "TIER_2_INDIRECT");
  const tier4 = items.filter((i) => i.tier === "TIER_4_UNMATCHED");

  const lines: string[] = [];

  // ── Tier 1 : effets indésirables directs ─────────────────────────────────
  if (tier1.length > 0) {
    lines.push("Effets indésirables documentés (RCP) :");
    for (const item of tier1) {
      const substance = item._meta.substanceName ?? "?";
      const symptom   = item._meta.symptomLabel ?? "?";
      const src       = sourceRef(item._meta.sourceShortLabel);
      const mec       = item._meta.mechanism ? ` — mécanisme : ${item._meta.mechanism}` : "";
      const boost     = item.corroborationBoost > 0 ? " [corroboré]" : "";
      lines.push(
        `• ${substance} peut provoquer ${symptom}` +
        ` — confiance ${pct(item.confidenceScore)}${src}${mec}${boost}`,
      );
    }
  }

  // ── Tier 2 : mécanismes indirects et déplétions ───────────────────────────
  if (tier2.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Mécanismes indirects et déplétions nutritionnelles :");
    for (const item of tier2) {
      const substance = item._meta.substanceName ?? "?";
      const symptom   = item._meta.symptomLabel ?? "?";
      const src       = sourceRef(item._meta.sourceShortLabel);
      const boost     = item.corroborationBoost > 0 ? " [corroboré]" : "";

      if (item.nutrientDepletionId) {
        const nutrient = item._meta.nutrientLabel ?? "?";
        const mec      = item._meta.mechanism ? ` (${item._meta.mechanism})` : "";
        lines.push(
          `• ${substance} peut induire une déplétion en ${nutrient}${mec},` +
          ` pouvant expliquer ${symptom}` +
          ` — confiance ${pct(item.confidenceScore)}${src}${boost}`,
        );
      } else {
        // SECONDARY_MECHANISM via DrugSideEffect
        const mec = item._meta.mechanism ? ` — mécanisme : ${item._meta.mechanism}` : "";
        lines.push(
          `• ${substance} → ${symptom} via mécanisme secondaire documenté` +
          ` — confiance ${pct(item.confidenceScore)}${src}${mec}${boost}`,
        );
      }
    }
  }

  // ── Mention corroboration ─────────────────────────────────────────────────
  const corroborated = items.filter((i) => i.corroborationBoost > 0);
  if (corroborated.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(
      `${corroborated.length} résultat(s) corroboré(s) par la base documentaire` +
      ` (+${(corroborated[0]?.corroborationBoost ?? 0) * 100}% max).`,
    );
  }

  // ── Tier 4 : symptômes sans correspondance ────────────────────────────────
  if (tier4.length > 0) {
    const labels = [
      ...new Set(
        tier4.map((i) => i._meta.symptomLabel ?? i.rawSymptomFragment ?? "?"),
      ),
    ];
    if (lines.length > 0) lines.push("");
    lines.push(
      `Symptômes non documentés dans la base structurée : ${labels.join(", ")}.`,
    );
    lines.push(
      `Ces symptômes n'ont pas de correspondance pour les substances déclarées` +
      ` — investigation complémentaire recommandée.`,
    );
  }

  // ── Aucun résultat ────────────────────────────────────────────────────────
  if (lines.length === 0) {
    return {
      summary:
        `Aucun symptôme n'a pu être analysé (texte brut : "${rawSymptoms}"). ` +
        `Vérifier que les médicaments et symptômes sont correctement renseignés.`,
      mode: "template",
    };
  }

  // ── Avertissement réglementaire ───────────────────────────────────────────
  lines.push("");
  lines.push(
    "Cette analyse est générée automatiquement à partir de données structurées sourcées. " +
    "Elle ne remplace pas l'évaluation clinique du praticien.",
  );

  return {
    summary: lines.join("\n"),
    mode: "template",
  };
}
