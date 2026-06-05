/**
 * lib/bdpm/link-substance-terms.ts
 *
 * Maintient la cohérence DrugSubstance → KnowledgeTerm après chaque ingestion BDPM.
 *
 * Problème résolu :
 *   BDPM nomme les substances sous leur forme sel (ex: "CHLORHYDRATE DE SERTRALINE").
 *   Ces substances sont créées par l'ingestion avec knowledgeTermId = null.
 *   Ce module établit le lien vers le KnowledgeTerm DCI correspondant ("sertraline"),
 *   ce qui permet à build-bdpm-context.ts de remonter les KnowledgeFacts.
 *
 * Stratégie :
 *   - Un updateMany par KnowledgeTerm cible (groupement de toutes les formes sel)
 *   - WHERE knowledgeTermId IS NULL — jamais d'écrasement
 *   - Idempotent : relancer n'a aucun effet si déjà lié
 *
 * Appelé automatiquement par webhook-runner après Pipeline A.
 * Disponible aussi comme script CLI : scripts/link-substances-to-terms.ts
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Mapping substanceNormalizedKey → termNormalizedKey
//
// Source : formes salt réellement présentes dans CIS_COMPO_bdpm.txt.
// Chaque clé = normalizedKey d'une DrugSubstance BDPM.
// Chaque valeur = normalizedKey du KnowledgeTerm DCI cible.
//
// Maintenu manuellement — ajouter ici si un nouveau batch introduit une forme
// non couverte (visible dans les logs du re-link : "terme non trouvé").
// ---------------------------------------------------------------------------

export const SUBSTANCE_TO_TERM: Readonly<Record<string, string>> = {

  // ── Statines ───────────────────────────────────────────────────────────────
  "atorvastatine-calcique":                     "atorvastatine",
  "atorvastatine-calcique-trihydratee":          "atorvastatine",
  "simvastatine":                               "simvastatine",
  "rosuvastatine":                              "rosuvastatine",
  "rosuvastatine-calcique":                     "rosuvastatine",
  "rosuvastatine-zincique":                     "rosuvastatine",
  "pravastatine-sodique":                       "pravastatine",

  // ── IPP ───────────────────────────────────────────────────────────────────
  "omeprazole":                                 "omeprazole",
  "omeprazole-magnesium":                       "omeprazole",
  "omeprazole-sodique":                         "omeprazole",
  "esomeprazole-magnesique":                    "esomeprazole",
  "esomeprazole-magnesique-dihydrate":          "esomeprazole",
  "esomeprazole-magnesique-trihydrate":         "esomeprazole",
  "esomeprazole-sodique":                       "esomeprazole",
  "lansoprazole":                               "lansoprazole",
  "pantoprazole-sodique-anhydre":               "pantoprazole",
  "pantoprazole-sodique-sesquihydrate":         "pantoprazole",

  // ── Biguanides ────────────────────────────────────────────────────────────
  "metformine":                                 "metformine",
  "chlorhydrate-de-metformine":                 "metformine",
  "metformine-embonate-de":                     "metformine",

  // ── Thyroïde ──────────────────────────────────────────────────────────────
  "levothyroxine":                              "levothyroxine",
  "levothyroxine-sodique":                      "levothyroxine",

  // ── Diurétiques ───────────────────────────────────────────────────────────
  "furosemide":                                 "furosemide",

  // ── Corticostéroïdes ──────────────────────────────────────────────────────
  "prednisone":                                 "prednisone",
  "prednisolone":                               "prednisolone",
  "acetate-de-prednisolone":                    "prednisolone",
  "caproate-de-prednisolone":                   "prednisolone",
  "pivalate-de-prednisolone":                   "prednisolone",
  "metasulfobenzoate-sodique-de-prednisolone":  "prednisolone",

  // ── AINS ──────────────────────────────────────────────────────────────────
  "ibuprofene":                                 "ibuprofene",
  "ibuprofene-sodique-dihydrate":               "ibuprofene",
  "lysinate-dibuprofene":                       "ibuprofene",

  // ── Bétahistine ───────────────────────────────────────────────────────────
  "dichlorhydrate-de-betahistine":              "betahistine",
  "betahistine-mesilate-de":                    "betahistine",

  // ── Calcium antagoniste ───────────────────────────────────────────────────
  "besilate-damlodipine":                       "amlodipine",

  // ── ISRS ──────────────────────────────────────────────────────────────────
  "sertraline":                                 "sertraline",
  "chlorhydrate-de-sertraline":                 "sertraline",
  "chlorhydrate-de-fluoxetine":                 "fluoxetine",
  "chlorhydrate-de-paroxetine-anhydre":         "paroxetine",
  "chlorhydrate-de-paroxetine-hemihydrate":     "paroxetine",
  "mesilate-de-paroxetine":                     "paroxetine",
  "oxalate-descitalopram":                      "escitalopram",

  // ── Anticoagulants ────────────────────────────────────────────────────────
  "apixaban":                                   "apixaban",

};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinkResult {
  linked:      number;   // liaisons créées (knowledgeTermId NULL → rempli)
  alreadySet:  number;   // substances déjà liées (non touchées)
  termsMissing: string[]; // termNormalizedKey non trouvé en DB (à créer si besoin)
  durationMs:  number;
}

// ---------------------------------------------------------------------------
// linkSubstanceTerms
// ---------------------------------------------------------------------------

/**
 * Lie les DrugSubstance aux KnowledgeTerm correspondants.
 *
 * - Un updateMany par KnowledgeTerm cible (~16 requêtes batch)
 * - Seules les substances avec knowledgeTermId = null sont touchées
 * - Idempotent
 */
export async function linkSubstanceTerms(): Promise<LinkResult> {
  const start = Date.now();

  // ── 1. Charger les KnowledgeTerm cibles (une seule requête) ─────────────
  const targetTermKeys = [...new Set(Object.values(SUBSTANCE_TO_TERM))];

  const terms = await db.knowledgeTerm.findMany({
    where:  { normalizedKey: { in: targetTermKeys } },
    select: { id: true, normalizedKey: true },
  });

  const termMap = new Map<string, string>(); // normalizedKey → id
  for (const t of terms) termMap.set(t.normalizedKey, t.id);

  const termsMissing = targetTermKeys.filter((k) => !termMap.has(k));

  // ── 2. Grouper les substanceKeys par termKey ─────────────────────────────
  const byTerm = new Map<string, string[]>(); // termKey → substanceKeys[]
  for (const [substanceKey, termKey] of Object.entries(SUBSTANCE_TO_TERM)) {
    if (!byTerm.has(termKey)) byTerm.set(termKey, []);
    byTerm.get(termKey)!.push(substanceKey);
  }

  // ── 3. Compter les substances déjà liées (pour le rapport) ───────────────
  const allSubstanceKeys = Object.keys(SUBSTANCE_TO_TERM);
  const alreadyLinked = await db.drugSubstance.count({
    where: {
      normalizedKey:   { in: allSubstanceKeys },
      knowledgeTermId: { not: null },
      isActive:        true,
    },
  });

  // ── 4. Un updateMany par KnowledgeTerm ───────────────────────────────────
  let linked = 0;

  for (const [termKey, substanceKeys] of byTerm) {
    const termId = termMap.get(termKey);
    if (!termId) continue; // terme absent de DB — ignoré, déjà dans termsMissing

    const result = await db.drugSubstance.updateMany({
      where: {
        normalizedKey:   { in: substanceKeys },
        knowledgeTermId: null,           // ne jamais écraser un lien existant
        isActive:        true,
      },
      data: { knowledgeTermId: termId },
    });

    linked += result.count;
  }

  return {
    linked,
    alreadySet:   alreadyLinked,
    termsMissing,
    durationMs:   Date.now() - start,
  };
}
