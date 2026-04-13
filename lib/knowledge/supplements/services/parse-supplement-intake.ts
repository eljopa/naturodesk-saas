/**
 * Parser riche pour la saisie clinique structurée des suppléments.
 *
 * Produit un ParsedSupplementIntake à partir d'un texte libre,
 * en extrayant dose, unités, fréquence, timing, durée — sans jamais
 * perdre le texte original (rawText).
 *
 * Cas nominaux supportés :
 *   "magnésium bisglycinate 200mg, 1 gélule matin"
 *     → dosePerUnit=200mg, units=1, intakesPerDay=1(matin), estimated=200mg
 *   "Vitamine D3 2000 UI"
 *     → dosePerUnit=2000 UI, label="Vitamine D3"
 *   "magnésium marin 300 mg/jour"
 *     → declaredDaily=300mg, estimated=300mg, label="magnésium marin"
 *   "probiotiques 10 milliards"
 *     → dosePerUnit=10 milliards, label="probiotiques"
 *   "glutamine poudre 5g"
 *     → dosePerUnit=5g, label="glutamine"
 *
 * Règles de prudence :
 *   - Pas de fausse précision : si ambigu → PARTIAL / MEDIUM
 *   - estimatedDailyDose calculée seulement si formule complète ou déclarée
 *   - rawText toujours conservé intégralement
 *
 * Stratégie d'extraction :
 *   Les patterns sont appliqués dans l'ordre sur une copie de travail.
 *   Chaque token extrait est supprimé pour ne pas polluer le label.
 */

import { normalizeInput, buildNormalizedKey } from "@/lib/knowledge/terms/utils/normalize";
import type { ParsedSupplementIntake, IntakeParseStatus, IntakeConfidence } from "../types";

// ---------------------------------------------------------------------------
// Normalisation d'unités
// ---------------------------------------------------------------------------

const UNIT_ALIASES: Record<string, string> = {
  "mcg": "mcg", "µg": "mcg", "ug": "mcg",
  "mg":  "mg",
  "g":   "g",
  "ml":  "ml", "mL": "ml",
  "iu":  "UI", "IU": "UI", "UI": "UI", "U.I.": "UI", "U.I": "UI",
  "milliards": "milliards",
  "millions":  "millions",
};

function normalizeUnit(raw: string): string {
  return UNIT_ALIASES[raw] ?? raw.toLowerCase();
}

// ---------------------------------------------------------------------------
// Patterns d'extraction
// (non-global pour .exec() — utilisés avant suppression via replace global)
// ---------------------------------------------------------------------------

/** Dose journalière déclarée : "300 mg/jour", "300mg par jour" */
const RE_DECLARED_DAILY =
  /(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|g|IU|UI|U\.I\.?|ml)\s*(?:\/j(?:our)?|par\s+jour)\b/i;

/** Nombre d'unités : "1 gélule", "2 comprimés", "3 capsules" */
const RE_UNITS_PER_INTAKE =
  /\b(\d+)\s*(?:gélules?|comprimés?|capsules?|ampoules?|sachets?)\b/i;

/** Fréquence explicite : "2x/jour", "3 fois par jour", "2 prises/j" */
const RE_EXPLICIT_INTAKES =
  /\b(\d+)\s*(?:x\s*\/?\s*j(?:our)?|fois\s+par\s+jour|prises?\s+par\s+jour)\b/i;

/** Dose par unité : "200 mg", "2000 UI", "5 g", "10 milliards" */
const RE_DOSE_PER_UNIT =
  /\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|g|IU|UI|U\.I\.?|ml|milliards?|millions?)\b/i;

/** Durée : "pendant 3 mois", "3 semaines", "6 jours" */
const RE_DURATION =
  /\b(?:pendant\s+)?\d+\s*(?:jours?|semaines?|mois)\b/i;

// Patterns globaux pour le remplacement (strip des tokens après extraction)
const RE_DECLARED_DAILY_G  = /(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|g|IU|UI|U\.I\.?|ml)\s*(?:\/j(?:our)?|par\s+jour)\b/gi;
const RE_UNITS_PER_INTAKE_G = /\b(\d+)\s*(?:gélules?|comprimés?|capsules?|ampoules?|sachets?)\b/gi;
const RE_EXPLICIT_INTAKES_G = /\b(\d+)\s*(?:x\s*\/?\s*j(?:our)?|fois\s+par\s+jour|prises?\s+par\s+jour)\b/gi;
const RE_DOSE_PER_UNIT_G   = /\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|g|IU|UI|U\.I\.?|ml|milliards?|millions?)\b/gi;
const RE_DURATION_G        = /\b(?:pendant\s+)?\d+\s*(?:jours?|semaines?|mois)\b/gi;

/** Formes galéniques à supprimer du label */
const RE_GALENIC_G =
  /\b(?:poudre|gelules?|gélules?|comprimes?|comprimés?|capsules?|ampoules?|spray|liquide|huile|extrait|sachets?)\b/gi;

/** Séparateurs de ratio résiduels */
const RE_RATIO_SUFFIX_G = /\/(?:j|jour|semaine|prise)\b/gi;

/** Nombre isolé en fin de chaîne (résidu) */
const RE_TRAILING_NUMBER = /\s+\d+$/;

/** Timing — global pour capturer toutes les occurrences */
const RE_TIMING_G =
  /\b(?:le\s+)?(?:matin|soir|midi|nuit|au\s+coucher|à\s+jeun|avant\s+les?\s+repas?|après\s+les?\s+repas?|avec\s+les?\s+repas?)\b/gi;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse une saisie libre de supplément et retourne une structure riche.
 *
 * @example
 * parseSupplementIntake("magnésium bisglycinate 200mg, 1 gélule matin")
 *   → { parsedLabel: "magnésium bisglycinate", dosePerUnitValue: 200,
 *       dosePerUnitUnit: "mg", unitsPerIntake: 1, intakesPerDay: 1,
 *       timingText: "matin", estimatedDailyDoseValue: 200,
 *       parseConfidence: "HIGH", parseStatus: "PARSED" }
 */
export function parseSupplementIntake(rawText: string): ParsedSupplementIntake {
  // Normaliser les séparateurs : "/" → " " (EPA/DHA, mg/j géré séparément)
  let w = rawText.replace(/\//g, " ").replace(/\s+/g, " ").trim();

  // ── 1. Dose journalière déclarée ──────────────────────────────────────────
  // Doit être extrait AVANT la dose par unité pour éviter double-match.
  let declaredDailyDoseValue: number | null = null;
  let declaredDailyDoseUnit:  string | null = null;
  const dailyM = RE_DECLARED_DAILY.exec(w);
  if (dailyM) {
    declaredDailyDoseValue = parseFloat(dailyM[1]!.replace(",", "."));
    declaredDailyDoseUnit  = normalizeUnit(dailyM[2]!);
    w = w.replace(RE_DECLARED_DAILY_G, " ");
  }

  // ── 2. Nombre d'unités par prise ─────────────────────────────────────────
  let unitsPerIntake: number | null = null;
  const unitsM = RE_UNITS_PER_INTAKE.exec(w);
  if (unitsM) {
    unitsPerIntake = parseInt(unitsM[1]!, 10);
    w = w.replace(RE_UNITS_PER_INTAKE_G, " ");
  }

  // ── 3. Fréquence explicite ────────────────────────────────────────────────
  let intakesPerDay: number | null = null;
  const intakesM = RE_EXPLICIT_INTAKES.exec(w);
  if (intakesM) {
    intakesPerDay = parseInt(intakesM[1]!, 10);
    w = w.replace(RE_EXPLICIT_INTAKES_G, " ");
  }

  // ── 4. Dose par unité ────────────────────────────────────────────────────
  // Seulement si la dose déclarée n'a pas déjà tout capturé.
  let dosePerUnitValue: number | null = null;
  let dosePerUnitUnit:  string | null = null;
  const doseM = RE_DOSE_PER_UNIT.exec(w);
  if (doseM) {
    dosePerUnitValue = parseFloat(doseM[1]!.replace(",", "."));
    dosePerUnitUnit  = normalizeUnit(doseM[2]!);
    w = w.replace(RE_DOSE_PER_UNIT_G, " ");
  }

  // ── 5. Timing — capture globale ──────────────────────────────────────────
  const timingMatches: string[] = [];
  // Collecter d'abord, puis supprimer
  const timingCollector = new RegExp(RE_TIMING_G.source, "gi");
  let tM: RegExpExecArray | null;
  const wForTiming = w; // snapshot avant modification
  while ((tM = timingCollector.exec(wForTiming)) !== null) {
    timingMatches.push(tM[0].trim().toLowerCase());
  }
  const timingText: string | null =
    timingMatches.length > 0 ? timingMatches.join(", ") : null;
  w = w.replace(RE_TIMING_G, " ");

  // Inférer intakesPerDay depuis le timing si pas encore défini
  if (!intakesPerDay && timingMatches.length > 0) {
    intakesPerDay = inferIntakesPerDay(timingMatches);
  }

  // ── 6. Durée ──────────────────────────────────────────────────────────────
  let durationText: string | null = null;
  const durM = RE_DURATION.exec(w);
  if (durM) {
    durationText = durM[0].trim();
    w = w.replace(RE_DURATION_G, " ");
  }

  // ── 7. Nettoyage final du label ───────────────────────────────────────────
  w = w
    .replace(RE_GALENIC_G, " ")    // formes galéniques
    .replace(RE_RATIO_SUFFIX_G, " ") // "/j", "/semaine"
    .replace(RE_TRAILING_NUMBER, "") // nombre résiduel en fin
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parsedLabel  = w || null;
  const normalizedKey = parsedLabel
    ? buildNormalizedKey(normalizeInput(parsedLabel))
    : null;

  // ── 8. Dose journalière estimée ───────────────────────────────────────────
  let estimatedDailyDoseValue: number | null = null;
  let estimatedDailyDoseUnit:  string | null = null;

  if (declaredDailyDoseValue !== null) {
    // La valeur déclarée est la référence la plus fiable
    estimatedDailyDoseValue = declaredDailyDoseValue;
    estimatedDailyDoseUnit  = declaredDailyDoseUnit;
  } else if (dosePerUnitValue !== null && intakesPerDay !== null) {
    // dosePerUnit × unitsPerIntake (défaut 1) × intakesPerDay
    const units = unitsPerIntake ?? 1;
    estimatedDailyDoseValue =
      Math.round(dosePerUnitValue * units * intakesPerDay * 100) / 100;
    estimatedDailyDoseUnit = dosePerUnitUnit;
  }
  // Pas de calcul si les données sont trop parcellaires → null (pas de fausse précision)

  // ── 9. Qualité ────────────────────────────────────────────────────────────
  const hasLabel    = !!(parsedLabel?.trim());
  const hasDose     = declaredDailyDoseValue !== null || dosePerUnitValue !== null;
  const hasFreq     = intakesPerDay !== null || timingText !== null;

  const parseConfidence: IntakeConfidence =
    hasLabel && hasDose && hasFreq ? "HIGH"   :
    hasLabel && hasDose            ? "MEDIUM" :
    hasLabel                       ? "MEDIUM" : "LOW";

  const parseStatus: IntakeParseStatus =
    hasLabel && hasDose ? "PARSED" : "PARTIAL";

  return {
    rawText,
    parsedLabel,
    normalizedKey,
    dosePerUnitValue,
    dosePerUnitUnit,
    unitsPerIntake,
    intakesPerDay,
    declaredDailyDoseValue,
    declaredDailyDoseUnit,
    estimatedDailyDoseValue,
    estimatedDailyDoseUnit,
    timingText,
    frequencyText: intakesPerDay !== null ? `${intakesPerDay}x/jour` : null,
    durationText,
    parseConfidence,
    parseStatus,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Infère le nombre de prises par jour depuis les mots de timing.
 * Matin ≠ soir → 2. Coucher/nuit assimilé à soir.
 */
function inferIntakesPerDay(timings: string[]): number {
  const hasMatin  = timings.some((t) => t.includes("matin"));
  const hasSoir   = timings.some((t) => t.includes("soir") || t.includes("coucher") || t.includes("nuit"));
  const hasMidi   = timings.some((t) => t.includes("midi"));

  let count = 0;
  if (hasMatin) count++;
  if (hasSoir)  count++;
  if (hasMidi)  count++;

  return Math.max(count, 1);
}
