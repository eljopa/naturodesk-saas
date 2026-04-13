/**
 * scripts/test-drug-matching.ts
 *
 * Teste le matching médicament → DrugProduct / DrugSubstance.
 * Script auto-contenu (pas d'imports @/ pour compatibilité ts-node).
 *
 * Usage :
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-drug-matching.ts
 *
 * Pré-requis : seed-bdpm-minimal.ts exécuté au préalable.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Normalisation (copie de lib/knowledge/terms/utils/normalize.ts)
// ---------------------------------------------------------------------------

function buildNormalizedKey(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Matching (copie de lib/knowledge/medications/services/drug-matcher.ts)
// ---------------------------------------------------------------------------

type DrugMatchedBy = "alias" | "product_name" | "product_brand" | "substance" | "fuzzy" | "none";

interface DrugMatchResult {
  drugProductId:   string | null;
  drugSubstanceId: string | null;
  confidence:      number;
  matchedBy:       DrugMatchedBy;
}

const NO_MATCH: DrugMatchResult = {
  drugProductId: null, drugSubstanceId: null, confidence: 0, matchedBy: "none",
};

async function matchDrug(input: string): Promise<DrugMatchResult> {
  const trimmed = input.trim();
  if (!trimmed) return NO_MATCH;
  const key = buildNormalizedKey(trimmed);
  if (!key) return NO_MATCH;

  // 1. DrugAlias exact
  const alias = await db.drugAlias.findUnique({
    where: { key }, select: { productId: true, substanceId: true },
  });
  if (alias?.productId)   return { drugProductId: alias.productId, drugSubstanceId: null, confidence: 1.0, matchedBy: "alias" };
  if (alias?.substanceId) return { drugProductId: null, drugSubstanceId: alias.substanceId, confidence: 1.0, matchedBy: "alias" };

  // 2. DrugProduct.normalizedName exact
  const byName = await db.drugProduct.findFirst({
    where: { normalizedName: key, isActive: true }, select: { id: true },
  });
  if (byName) return { drugProductId: byName.id, drugSubstanceId: null, confidence: 0.95, matchedBy: "product_name" };

  // 3. DrugProduct.normalizedBrand exact
  const byBrand = await db.drugProduct.findFirst({
    where: { normalizedBrand: key, isActive: true }, select: { id: true },
  });
  if (byBrand) return { drugProductId: byBrand.id, drugSubstanceId: null, confidence: 0.90, matchedBy: "product_brand" };

  // 4. DrugSubstance.normalizedKey exact
  const substance = await db.drugSubstance.findFirst({
    where: { normalizedKey: key, isActive: true }, select: { id: true },
  });
  if (substance) return { drugProductId: null, drugSubstanceId: substance.id, confidence: 0.90, matchedBy: "substance" };

  // 5. Fuzzy ILIKE
  const fuzzy = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "drug_products" WHERE "isActive" = true AND "normalizedName" ILIKE ${"%" + key + "%"} LIMIT 1
  `;
  if (fuzzy.length > 0 && fuzzy[0]) return { drugProductId: fuzzy[0].id, drugSubstanceId: null, confidence: 0.70, matchedBy: "fuzzy" };

  return NO_MATCH;
}

async function matchDrugFromIntake(
  parsedLabel: string | null,
  parsedBrandName: string | null,
): Promise<DrugMatchResult> {
  if (parsedBrandName) {
    const r = await matchDrug(parsedBrandName);
    if (r.matchedBy !== "none") return r;
  }
  if (parsedLabel) {
    const r = await matchDrug(parsedLabel);
    if (r.matchedBy !== "none") return r;
  }
  return NO_MATCH;
}

// ---------------------------------------------------------------------------
// Parser (copie simplifiée de parse-medication-intake.ts)
// ---------------------------------------------------------------------------

const RE_BRAND       = /\(([^)]{2,40})\)/i;
const RE_DURATION    = /(?:pendant|pour|durée\s*:|traitement\s*de)\s+\d+\s*(?:jour[s]?|semaine[s]?|mois|an[s]?)\b/i;
const RE_FREQ_PERIOD = /(?:\d+\s*(?:x|fois)\s*\/\s*(?:j|jour|jours?)\b)|(?:toutes\s+les\s+\d+\s*h(?:eures?)?)\b/i;
const RE_FREQ_UNIT   = /\b\d+\s*(?:gélule[s]?|comprimé[s]?|capsule[s]?|cp|cachet[s]?|ampoule[s]?)\s*(?:\/\s*(?:j|jour[s]?)\b|(?:le\s+)?(?:matin(?:\s+et\s+soir)?|soir|midi|au\s+coucher|au\s+réveil|matin\s*,?\s*midi\s*et\s*soir)\b)?/i;
const RE_TIMING      = /\b(?:le\s+)?(?:matin(?:\s+et\s+soir)?|le\s+soir|soir|midi|au\s+coucher|au\s+réveil|matin\s*,?\s*midi\s*et\s*soir)\b/i;
const RE_GALENIC     = /\b(gélule[s]?|comprimé[s]?|capsule[s]?|cp|cachet[s]?|ampoule[s]?|sirop|patch|pommade|collyre|suppositoire[s]?|sachet[s]?)\b/i;
const RE_DOSE        = /\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|g|IU|UI|U\.I\.?|ml)\b(?:\/\d+\s*h)?/i;

function parseLabel(rawText: string): { parsedLabel: string | null; parsedBrandName: string | null } {
  let work = rawText.trim();
  let parsedBrandName: string | null = null;
  const bm = RE_BRAND.exec(work);
  if (bm) { parsedBrandName = bm[1]!.trim(); work = work.replace(bm[0], " "); }
  const dm = RE_DURATION.exec(work);    if (dm) work = work.replace(dm[0], " ");
  const fp = RE_FREQ_PERIOD.exec(work); if (fp) work = work.replace(fp[0], " ");
  const fu = RE_FREQ_UNIT.exec(work);   if (fu) work = work.replace(fu[0], " ");
  const tm = RE_TIMING.exec(work);      if (tm) work = work.replace(tm[0], " ");
  const gm = RE_GALENIC.exec(work);     if (gm) work = work.replace(gm[0], " ");
  const do_ = RE_DOSE.exec(work);       if (do_) work = work.replace(do_[0], " ");
  const parsedLabel = work.replace(/[,;]+/g, " ").replace(/\s+/g, " ").trim() || null;
  return { parsedLabel, parsedBrandName };
}

// ---------------------------------------------------------------------------
// Cas de test
// ---------------------------------------------------------------------------

const TEST_CASES: Array<{ input: string; expected: "found" | "not_found" }> = [
  { input: "Doliprane 1000",                              expected: "found" },
  { input: "Paracétamol",                                 expected: "found" },
  { input: "Amoxicilline",                                expected: "found" },
  { input: "Spasfon",                                     expected: "found" },
  { input: "Doliprane 500mg 2 comprimés matin et soir",   expected: "found" },
  { input: "Paracétamol 500 mg, 1 comprimé 3x/jour",      expected: "found" },
  { input: "Amoxicilline 500mg pendant 7 jours",          expected: "found" },
  { input: "Clamoxyl 500mg",                              expected: "found" },
  { input: "Advil 400mg",                                 expected: "found" },
  { input: "Ibuprofène 200mg",                            expected: "found" },
  { input: "Glucophage 500mg",                            expected: "found" },
  { input: "Metformine 850mg matin et soir",              expected: "found" },
  { input: "Mopral 20mg",                                 expected: "found" },
  { input: "Oméprazole 20mg",                             expected: "found" },
  { input: "Levothyrox 75 mcg le matin",                  expected: "found" },
  { input: "Lévothyroxine 100",                           expected: "found" },
  { input: "Triatec 5mg",                                 expected: "found" },
  { input: "Ramipril 10mg",                               expected: "found" },
  { input: "Zoloft 50mg",                                 expected: "found" },
  { input: "Sertraline 100mg pendant 3 mois",             expected: "found" },
  { input: "Vitamine C 1000mg",                           expected: "found" }, // BDPM réel contient des médicaments à la Vitamine C
  { input: "Médicament inconnu XYZ",                      expected: "not_found" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const [pCount, sCount, aCount] = await Promise.all([
    db.drugProduct.count(), db.drugSubstance.count(), db.drugAlias.count(),
  ]);

  console.log("\n========================================");
  console.log("  Test Drug Matching — NaturoDesk");
  console.log("========================================");
  console.log(`\n  Base : ${pCount} produits · ${sCount} substances · ${aCount} alias`);

  if (pCount === 0) {
    console.log("\n  ⚠ Aucune donnée BDPM.");
    console.log("  → npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/seed-bdpm-minimal.ts\n");
    return;
  }

  const col1 = 44;
  console.log(`\n  ${"Input".padEnd(col1)} ${"matchedBy".padEnd(14)} ${"conf".padEnd(8)} Résultat`);
  console.log("  " + "─".repeat(105));

  let passed = 0; let failed = 0; let total = 0;

  for (const tc of TEST_CASES) {
    const { parsedLabel, parsedBrandName } = parseLabel(tc.input);
    const result = await matchDrugFromIntake(parsedLabel, parsedBrandName);

    const found = result.matchedBy !== "none";
    const ok    = (found && tc.expected === "found") || (!found && tc.expected === "not_found");

    // Résoudre le nom du produit/substance
    let resolvedName = "—";
    if (result.drugProductId) {
      const p = await db.drugProduct.findUnique({ where: { id: result.drugProductId }, select: { name: true } });
      resolvedName = p ? `Produit : ${p.name}` : "—";
    } else if (result.drugSubstanceId) {
      const s = await db.drugSubstance.findUnique({ where: { id: result.drugSubstanceId }, select: { canonicalName: true } });
      resolvedName = s ? `Substance : ${s.canonicalName}` : "—";
    }

    const icon    = ok ? "✓" : "✗";
    const conf    = found ? `${(result.confidence * 100).toFixed(0).padStart(3)}%` : "  —";
    const matched = found ? result.matchedBy : "none";
    const label   = `"${tc.input}"`;

    console.log(`  ${icon} ${label.padEnd(col1)} ${matched.padEnd(14)} ${conf.padEnd(8)} ${resolvedName}`);

    if (ok) passed++; else failed++;
    total++;
  }

  console.log("  " + "─".repeat(105));
  console.log(`\n  Résultat : ${passed}/${total} tests passés${failed > 0 ? ` · ${failed} échecs` : ""}`);

  if (failed > 0) {
    console.log("\n  Cas en échec :");
    for (const tc of TEST_CASES) {
      const { parsedLabel, parsedBrandName } = parseLabel(tc.input);
      const result = await matchDrugFromIntake(parsedLabel, parsedBrandName);
      const found = result.matchedBy !== "none";
      const ok = (found && tc.expected === "found") || (!found && tc.expected === "not_found");
      if (!ok) {
        const key = buildNormalizedKey(parsedLabel ?? tc.input);
        console.log(`    · "${tc.input}" → attendu="${tc.expected}" obtenu="${result.matchedBy}" key="${key}"`);
      }
    }
  }

  console.log("\n========================================\n");
}

main()
  .catch((err) => { console.error("Erreur test-drug-matching :", err); process.exit(1); })
  .finally(() => db.$disconnect());
