/**
 * Normalisation spécifique BDPM.
 *
 * Les noms BDPM sont en MAJUSCULES avec dosage intégré :
 *   "DOLIPRANE 1000 mg, comprimé pelliculé"
 *   "AMOXICILLINE MYLAN 500 mg, gélule"
 *   "CO-AMOXICLAV BIOGARAN 500 mg/62,5 mg, comprimé"
 *
 * buildBrandSlug() extrait le premier token alphanumérique (avant dosage)
 * pour permettre le matching sur le nom de marque seul.
 */

import { buildNormalizedKey } from "@/lib/knowledge/terms/utils/normalize";
import type { ParsedDosage } from "./types";

/**
 * Extrait le préfixe de marque normalisé depuis une dénomination BDPM complète.
 *
 * Exemples :
 *   "DOLIPRANE 1000 mg"         → "doliprane"
 *   "AMOXICILLINE MYLAN 500 mg" → "amoxicilline"
 *   "CO-AMOXICLAV 500 mg/62,5"  → "co-amoxiclav"
 *   "EFFERALGAN VITAMINE C"     → "efferalgan"
 *
 * Règle : premier token (avant le premier espace), normalisé.
 */
export function buildBrandSlug(bdpmName: string): string {
  const firstToken = bdpmName.trim().split(/\s+/)[0] ?? bdpmName;
  return buildNormalizedKey(firstToken);
}

/**
 * Construit un nom canonique français depuis une DCI BDPM (tout en majuscules).
 *
 * Exemples :
 *   "PARACETAMOL"       → "Paracétamol"   (via table de corrections)
 *   "AMOXICILLINE"      → "Amoxicilline"  (capitalise premier caractère)
 *   "ACIDE ASCORBIQUE"  → "Acide ascorbique"
 */
export function toCanonicalFrench(bdpmDci: string): string {
  const normalized = bdpmDci.trim();
  // Table de corrections manuelles pour les DCI avec accents courants
  const CORRECTIONS: Record<string, string> = {
    "PARACETAMOL":          "Paracétamol",
    "METAMIZOLE SODIQUE":   "Métamizole sodique",
    "IBUPROFENE":           "Ibuprofène",
    "KETOPROFENE":          "Kétoprofène",
    "DICLOFENAC":           "Diclofénac",
    "NAPROXENE":            "Naproxène",
    "CELECOXIB":            "Célécoxib",
    "ETORICOXIB":           "Étoricoxib",
    "METFORMINE":           "Metformine",
    "METFORMINES":          "Metformine",
    "ATORVASTATINE":        "Atorvastatine",
    "SIMVASTATINE":         "Simvastatine",
    "ROSUVASTATINE":        "Rosuvastatine",
    "PRAVASTATINE":         "Pravastatine",
    "LEVOTHYROXINE":        "Lévothyroxine",
    "AMOXICILLINE":         "Amoxicilline",
    "CIPROFLOXACINE":       "Ciprofloxacine",
    "LEVOFLOXACINE":        "Lévofloxacine",
    "OFLOXACINE":           "Ofloxacine",
    "MOXIFLOXACINE":        "Moxifloxacine",
    "DOXYCYCLINE":          "Doxycycline",
    "METRONIDAZOLE":        "Métronidazole",
    "CLARITHROMYCINE":      "Clarithromycine",
    "AZITHROMYCINE":        "Azithromycine",
    "WARFARINE":            "Warfarine",
    "ACENOCOUMAROL":        "Acénocoumarol",
    "FLUINDIONE":           "Fluindione",
    "APIXABAN":             "Apixaban",
    "RIVAROXABAN":          "Rivaroxaban",
    "DABIGATRAN ETEXILATE": "Dabigatran",
    "EDOXABAN":             "Édoxaban",
    "ASPIRINE":             "Aspirine",
    "CLOPIDOGREL":          "Clopidogrel",
    "TICAGRELOR":           "Ticagrélor",
    "PRASUGREL":            "Prasugrel",
    "RAMIPRIL":             "Ramipril",
    "ENALAPRIL":            "Énalapril",
    "LISINOPRIL":           "Lisinopril",
    "PERINDOPRIL":          "Périndopril",
    "CAPTOPRIL":            "Captopril",
    "LOSARTAN":             "Losartan",
    "VALSARTAN":            "Valsartan",
    "IRBESARTAN":           "Irbésartan",
    "CANDESARTAN":          "Candésartan",
    "OLMESARTAN":           "Olmésartan",
    "TELMISARTAN":          "Telmisartan",
    "FLUOXETINE":           "Fluoxétine",
    "SERTRALINE":           "Sertraline",
    "ESCITALOPRAM":         "Escitalopram",
    "PAROXETINE":           "Paroxétine",
    "CITALOPRAM":           "Citalopram",
    "FLUVOXAMINE":          "Fluvoxamine",
    "VENLAFAXINE":          "Venlafaxine",
    "DULOXETINE":           "Duloxétine",
    "MILNACIPRAN":          "Milnacipran",
    "CICLOSPORINE":         "Ciclosporine",
    "TACROLIMUS":           "Tacrolimus",
    "AZATHIOPRINE":         "Azathioprine",
    "METHOTREXATE":         "Méthotrexate",
    "MYCOPHENOLATE MOFETIL": "Mycophénolate mofétil",
    "SIROLIMUS":            "Sirolimus",
    "EVEROLIMUS":           "Évérolimus",
    "OMEPRAZOLE":           "Oméprazole",
    "ESOMEPRAZOLE":         "Ésoméprazole",
    "PANTOPRAZOLE":         "Pantoprazole",
    "LANSOPRAZOLE":         "Lansoprazole",
    "AMLODIPINE":           "Amlodipine",
    "BISOPROLOL":           "Bisoprolol",
    "METOPROLOL":           "Métoprolol",
    "ATENOLOL":             "Aténolol",
    "NIFEDIPINE":           "Nifédipine",
    "SPIRONOLACTONE":       "Spironolactone",
    "FUROSEMIDE":           "Furosémide",
    "HYDROCHLOROTHIAZIDE":  "Hydrochlorothiazide",
    "ALLOPURINOL":          "Allopurinol",
    "COLCHICINE":           "Colchicine",
  };

  if (CORRECTIONS[normalized]) return CORRECTIONS[normalized]!;

  // Fallback : première lettre en majuscule, reste en minuscules
  const lower = normalized.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Parse un dosage brut BDPM.
 *
 * Exemples :
 *   "500 mg"      → { value: 500, unit: "mg" }
 *   "0,5 mg/ml"   → { value: 0.5, unit: "mg/ml" }
 *   "1000 UI"     → { value: 1000, unit: "UI" }
 *   "1 mg/0,5 ml" → { value: 1, unit: "mg/0.5 ml" }
 *   ""            → { value: null, unit: null }
 */
export function parseBdpmDosage(raw: string): ParsedDosage {
  if (!raw.trim()) return { value: null, unit: null };

  // Pattern : nombre (virgule décimale française) + unité
  const match = /^(\d+(?:[.,]\d+)?)\s*([a-zA-ZµéÉ\/.\s%]+?)(?:\s*\/.*)?$/.exec(raw.trim());
  if (!match) return { value: null, unit: raw.trim() || null };

  const value = parseFloat(match[1]!.replace(",", "."));
  const unit  = match[2]!.trim();

  return { value: isNaN(value) ? null : value, unit: unit || null };
}

/**
 * Hash SHA-1 léger pour détecter les changements sur un enregistrement BDPM.
 * Utilise crypto.createHash (Node.js, disponible côté serveur).
 */
export function computeContentHash(parts: string[]): string {
  // Simple hash non-cryptographique — suffisant pour diff de changement
  const str = parts.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
