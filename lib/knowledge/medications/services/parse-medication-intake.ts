/**
 * Parser clinique pour la saisie libre de médicaments.
 *
 * Extrait de façon déterministe, dans l'ordre :
 *   1. Nom de marque entre parenthèses  → parsedBrandName
 *   2. Durée de traitement              → durationText
 *   3. Fréquence / rythme de prise      → frequencyText
 *   4. Forme galénique                  → galenicForm
 *   5. Dose                             → doseValue + doseUnit
 *   6. Label nettoyé                    → parsedLabel (ce qui reste)
 *
 * Cas nominaux supportés :
 *   "Metformine 500mg, 2 comprimés matin et soir"
 *     → label="Metformine", dose=500mg, galenic="comprimé", freq="matin et soir"
 *   "Warfarine (Coumadine) 5mg, 1 cp/jour, pendant 6 mois"
 *     → label="Warfarine", brand="Coumadine", dose=5mg, duration="pendant 6 mois"
 *   "Ramipril 10mg le matin"
 *     → label="Ramipril", dose=10mg, freq="matin"
 *   "Sertraline 100mg pendant 3 mois"
 *     → label="Sertraline", dose=100mg, duration="pendant 3 mois"
 *   "Ciclosporine 100mg/12h"
 *     → label="Ciclosporine", dose=100mg, freq="toutes les 12h"
 */

import { buildNormalizedKey } from "@/lib/knowledge/terms/utils/normalize";
import type { ParsedMedicationIntake } from "../types";

// ---------------------------------------------------------------------------
// Normalisation d'unités
// ---------------------------------------------------------------------------

const UNIT_ALIASES: Record<string, string> = {
  "mcg": "mcg", "µg": "mcg", "ug": "mcg",
  "mg":  "mg",
  "g":   "g",
  "ml":  "ml", "mL": "ml",
  "iu":  "UI", "IU": "UI", "UI": "UI", "U.I.": "UI",
};

function normalizeUnit(raw: string): string {
  return UNIT_ALIASES[raw] ?? raw.toLowerCase();
}

// ---------------------------------------------------------------------------
// Patterns d'extraction
// ---------------------------------------------------------------------------

/** Nom de marque entre parenthèses : "(Coumadine)", "(Glucophage 500)" */
const RE_BRAND = /\(([^)]{2,40})\)/i;

/** Durée : "pendant 3 mois", "pour 6 semaines", "1 mois de traitement" */
const RE_DURATION =
  /(?:pendant|pour|durée\s*:|traitement\s*de)\s+\d+\s*(?:jour[s]?|semaine[s]?|mois|an[s]?)\b/i;

/** Fréquence périodique : "1x/jour", "2 fois/j", "toutes les 8h", "100mg/12h" */
const RE_FREQ_PERIODIC =
  /(?:\d+\s*(?:x|fois)\s*\/\s*(?:j|jour|jours?)\b)|(?:toutes\s+les\s+\d+\s*h(?:eures?)?)\b/i;

/** Fréquence avec unité gélule/cp : "1 gélule matin et soir", "2 comprimés/j" */
const RE_FREQ_UNIT =
  /\b\d+\s*(?:gélule[s]?|comprimé[s]?|capsule[s]?|cp|cachet[s]?|ampoule[s]?)\s*(?:\/\s*(?:j|jour[s]?)\b|(?:le\s+)?(?:matin(?:\s+et\s+soir)?|soir|midi|au\s+coucher|au\s+réveil|matin\s*,?\s*midi\s*et\s*soir)\b)?/i;

/** Timing seul : "le matin", "matin et soir", "au coucher" */
const RE_TIMING =
  /\b(?:le\s+)?(?:matin(?:\s+et\s+soir)?|le\s+soir|soir|midi|au\s+coucher|au\s+réveil|matin\s*,?\s*midi\s*et\s*soir)\b/i;

/** Forme galénique : "comprimé", "gélule", "cp", "ampoule", "sirop", "patch" */
const RE_GALENIC =
  /\b(gélule[s]?|comprimé[s]?|capsule[s]?|cp|cachet[s]?|ampoule[s]?|sirop|patch|pommade|collyre|suppositoire[s]?|sachet[s]?)\b/i;

/** Dose : "500mg", "1g", "25 mcg", "100 mg/12h" (capture la valeur puis l'unité) */
const RE_DOSE =
  /\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|g|IU|UI|U\.I\.?|ml)\b(?:\/\d+\s*h)?/i;

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function clean(s: string): string {
  return s
    .replace(/[,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------

export function parseMedicationIntake(rawText: string): ParsedMedicationIntake {
  let work = rawText.trim();

  // ── 1. Nom de marque entre parenthèses ──────────────────────────────────
  let parsedBrandName: string | null = null;
  const brandMatch = RE_BRAND.exec(work);
  if (brandMatch) {
    parsedBrandName = brandMatch[1]!.trim();
    work = work.replace(brandMatch[0], " ");
  }

  // ── 2. Durée ────────────────────────────────────────────────────────────
  let durationText: string | null = null;
  const durationMatch = RE_DURATION.exec(work);
  if (durationMatch) {
    durationText = durationMatch[0].trim();
    work = work.replace(durationMatch[0], " ");
  }

  // ── 3. Fréquence ────────────────────────────────────────────────────────
  let frequencyText: string | null = null;

  const freqPeriodicMatch = RE_FREQ_PERIODIC.exec(work);
  if (freqPeriodicMatch) {
    frequencyText = freqPeriodicMatch[0].trim();
    work = work.replace(freqPeriodicMatch[0], " ");
  }

  const freqUnitMatch = RE_FREQ_UNIT.exec(work);
  if (freqUnitMatch) {
    const frag = freqUnitMatch[0].trim();
    frequencyText = frequencyText ? `${frequencyText}, ${frag}` : frag;
    work = work.replace(freqUnitMatch[0], " ");
  }

  if (!frequencyText) {
    const timingMatch = RE_TIMING.exec(work);
    if (timingMatch) {
      frequencyText = timingMatch[0].trim();
      work = work.replace(timingMatch[0], " ");
    }
  }

  // ── 4. Forme galénique ──────────────────────────────────────────────────
  let galenicForm: string | null = null;
  const galenicMatch = RE_GALENIC.exec(work);
  if (galenicMatch) {
    galenicForm = galenicMatch[1]!.toLowerCase().replace(/s$/, ""); // singularise
    work = work.replace(galenicMatch[0], " ");
  }

  // ── 5. Dose ─────────────────────────────────────────────────────────────
  let doseValue: number | null = null;
  let doseUnit:  string | null = null;
  const doseMatch = RE_DOSE.exec(work);
  if (doseMatch) {
    doseValue = parseFloat(doseMatch[1]!.replace(",", "."));
    doseUnit  = normalizeUnit(doseMatch[2]!);
    work = work.replace(doseMatch[0], " ");
  }

  // ── 6. Label nettoyé ────────────────────────────────────────────────────
  const parsedLabel = clean(work) || null;
  const normalizedKey = parsedLabel ? buildNormalizedKey(parsedLabel) : null;

  // ── Qualité ─────────────────────────────────────────────────────────────
  const hasLabel = !!parsedLabel && parsedLabel.length >= 2;
  const hasDose  = doseValue !== null;
  const hasFreq  = !!frequencyText;

  let parseStatus:     ParsedMedicationIntake["parseStatus"];
  let parseConfidence: ParsedMedicationIntake["parseConfidence"];

  if (hasLabel && hasDose && hasFreq) {
    parseStatus     = "PARSED";
    parseConfidence = "HIGH";
  } else if (hasLabel && hasDose) {
    parseStatus     = "PARSED";
    parseConfidence = "MEDIUM";
  } else if (hasLabel) {
    parseStatus     = "PARTIAL";
    parseConfidence = "MEDIUM";
  } else {
    parseStatus     = "UNRESOLVED";
    parseConfidence = "LOW";
  }

  return {
    rawText,
    parsedLabel,
    parsedBrandName,
    normalizedKey,
    doseValue,
    doseUnit,
    frequencyText,
    durationText,
    galenicForm,
    parseStatus,
    parseConfidence,
  };
}
