/**
 * scripts/test-drug-matching.ts
 *
 * Valide la chaîne complète : input → matching BDPM → substances → knowledge.
 *
 * Usage :
 *   npx tsx scripts/test-drug-matching.ts "doliprane"
 *   npx tsx scripts/test-drug-matching.ts "Lévothyroxine 100 mcg le matin"
 *   npx tsx scripts/test-drug-matching.ts "metformine 850mg"
 *
 * Sans argument → lance une batterie de cas représentatifs.
 *
 * Affiche :
 *   - parsing du label (extraction marque / DCI)
 *   - match principal (produit ou substance, méthode, confiance)
 *   - substances actives du produit
 *   - KnowledgeTerm + KnowledgeFacts liés à chaque substance
 *   - top-3 autres produits partageant la même marque (si pertinent)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation (inline — pas d'alias @/ pour compatibilité tsx)
// ─────────────────────────────────────────────────────────────────────────────

function normalizeKey(s: string): string {
  return s
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing du label (extrait la marque et la DCI d'une saisie libre)
// ─────────────────────────────────────────────────────────────────────────────

function parseLabel(raw: string): { label: string | null; brand: string | null } {
  let work = raw.trim();

  // Marque entre parenthèses ex: "paracétamol (doliprane)"
  const brandMatch = /\(([^)]{2,40})\)/i.exec(work);
  let brand: string | null = null;
  if (brandMatch) { brand = brandMatch[1]!.trim(); work = work.replace(brandMatch[0], " "); }

  // Suppression : durée, fréquence, galénique, dosage, timing
  work = work
    .replace(/(?:pendant|pour|durée\s*:|traitement\s*de)\s+\d+\s*(?:jour[s]?|semaine[s]?|mois|an[s]?)\b/i, " ")
    .replace(/(?:\d+\s*(?:x|fois)\s*\/\s*(?:j|jour|jours?)\b)|(?:toutes\s+les\s+\d+\s*h(?:eures?)?)\b/i, " ")
    .replace(/\b\d+\s*(?:gélule[s]?|comprimé[s]?|capsule[s]?|cp|cachet[s]?|ampoule[s]?)\s*(?:\/\s*(?:j|jour[s]?)\b|(?:le\s+)?(?:matin(?:\s+et\s+soir)?|soir|midi|au\s+coucher|au\s+réveil)\b)?/i, " ")
    .replace(/\b(?:le\s+)?(?:matin(?:\s+et\s+soir)?|le\s+soir|soir|midi|au\s+coucher|au\s+réveil|matin\s*,?\s*midi\s*et\s*soir)\b/i, " ")
    .replace(/\b(gélule[s]?|comprimé[s]?|capsule[s]?|cp|cachet[s]?|ampoule[s]?|sirop|patch|pommade|suppositoire[s]?|sachet[s]?)\b/i, " ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|g|IU|UI|U\.I\.?|ml)\b(?:\/\d+\s*h)?/gi, " ")
    .replace(/[,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { label: work || null, brand };
}

// ─────────────────────────────────────────────────────────────────────────────
// Matching
// ─────────────────────────────────────────────────────────────────────────────

type MatchedBy = "alias" | "product_name" | "product_brand" | "substance" | "fuzzy" | "none";

interface MatchResult {
  productId:   string | null;
  substanceId: string | null;
  confidence:  number;
  matchedBy:   MatchedBy;
}

const NO_MATCH: MatchResult = { productId: null, substanceId: null, confidence: 0, matchedBy: "none" };

async function matchOne(input: string): Promise<MatchResult> {
  const key = normalizeKey(input);
  if (!key) return NO_MATCH;

  const alias = await db.drugAlias.findUnique({ where: { key }, select: { productId: true, substanceId: true } });
  if (alias?.productId)   return { productId: alias.productId,   substanceId: null, confidence: 1.0, matchedBy: "alias" };
  if (alias?.substanceId) return { productId: null, substanceId: alias.substanceId, confidence: 1.0, matchedBy: "alias" };

  const byName = await db.drugProduct.findFirst({ where: { normalizedName: key, isActive: true }, select: { id: true } });
  if (byName) return { productId: byName.id, substanceId: null, confidence: 0.95, matchedBy: "product_name" };

  const byBrand = await db.drugProduct.findFirst({ where: { normalizedBrand: key, isActive: true }, select: { id: true } });
  if (byBrand) return { productId: byBrand.id, substanceId: null, confidence: 0.90, matchedBy: "product_brand" };

  const bySub = await db.drugSubstance.findFirst({ where: { normalizedKey: key, isActive: true }, select: { id: true } });
  if (bySub) return { productId: null, substanceId: bySub.id, confidence: 0.90, matchedBy: "substance" };

  const fuzzy = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM drug_products
    WHERE "isActive" = true AND "normalizedName" ILIKE ${"%" + key + "%"}
    LIMIT 1
  `;
  if (fuzzy[0]) return { productId: fuzzy[0].id, substanceId: null, confidence: 0.70, matchedBy: "fuzzy" };

  return NO_MATCH;
}

async function match(label: string | null, brand: string | null): Promise<MatchResult> {
  if (brand) { const r = await matchOne(brand); if (r.matchedBy !== "none") return r; }
  if (label) { const r = await matchOne(label); if (r.matchedBy !== "none") return r; }
  return NO_MATCH;
}

// ─────────────────────────────────────────────────────────────────────────────
// Affichage d'un résultat complet
// ─────────────────────────────────────────────────────────────────────────────

async function displayResult(result: MatchResult, input: string): Promise<void> {
  const confPct = `${Math.round(result.confidence * 100)}%`;

  if (result.productId) {
    // ── Produit ───────────────────────────────────────────────────────────────
    const product = await db.drugProduct.findUnique({
      where: { id: result.productId },
      select: {
        cisCode: true, name: true, form: true,
        marketingStatus: true, normalizedBrand: true,
        substances: {
          orderBy: { substanceOrder: "asc" },
          select: {
            dosageValue: true, dosageUnit: true,
            substance: {
              select: {
                id: true, substanceCode: true, canonicalName: true,
                normalizedKey: true, knowledgeTermId: true,
              },
            },
          },
        },
      },
    });

    if (!product) { console.log("  Produit introuvable en base."); return; }

    console.log(`\n  Match : ${result.matchedBy.padEnd(14)} | confiance : ${confPct}`);
    console.log(`\n  Produit : ${product.name}`);
    console.log(`  CIS     : ${product.cisCode}`);
    if (product.form)            console.log(`  Forme   : ${product.form}`);
    if (product.marketingStatus) console.log(`  Statut  : ${product.marketingStatus}`);

    if (product.substances.length === 0) {
      console.log("\n  Substances : aucune liaison trouvée");
    } else {
      console.log("\n  Substances actives :");
      for (const ps of product.substances) {
        const s = ps.substance;
        const dosage = ps.dosageValue != null && ps.dosageUnit
          ? ` — ${ps.dosageValue} ${ps.dosageUnit}`
          : ps.dosageUnit ? ` — ${ps.dosageUnit}` : "";
        console.log(`    • ${s.canonicalName}${dosage}  (code BDPM: ${s.substanceCode})`);

        // KnowledgeTerm + KnowledgeFacts
        const termId = s.knowledgeTermId
          ?? (await db.knowledgeTerm.findFirst({ where: { normalizedKey: s.normalizedKey }, select: { id: true } }))?.id
          ?? null;

        if (termId) {
          const term = await db.knowledgeTerm.findUnique({
            where: { id: termId },
            select: {
              normalizedKey: true,
              factsAsSubject: {
                select: { predicate: true, object: true, qualifier: true, confidence: true },
                orderBy: { confidence: "desc" },
                take: 5,
              },
            },
          });
          if (term) {
            const factCount = term.factsAsSubject.length;
            console.log(`      KnowledgeTerm : ${term.normalizedKey}  →  ${factCount} fait(s)`);
            for (const f of term.factsAsSubject) {
              const conf = `(conf ${f.confidence.toFixed(2)})`;
              console.log(`        ↳ ${f.predicate.padEnd(28)} → ${f.object}  ${conf}`);
            }
          }
        } else {
          console.log(`      KnowledgeTerm : non lié`);
        }
      }
    }

    // Autres produits partageant la même marque (top 3)
    if (product.normalizedBrand) {
      const others = await db.drugProduct.findMany({
        where: {
          normalizedBrand: product.normalizedBrand,
          isActive: true,
          id: { not: result.productId },
        },
        select: { cisCode: true, name: true },
        take: 3,
      });
      if (others.length > 0) {
        console.log(`\n  Autres produits "${product.normalizedBrand}" (top 3) :`);
        for (const o of others) console.log(`    • ${o.name}  (CIS: ${o.cisCode})`);
      }
    }

  } else if (result.substanceId) {
    // ── Substance directe ─────────────────────────────────────────────────────
    const s = await db.drugSubstance.findUnique({
      where: { id: result.substanceId },
      select: {
        substanceCode: true, canonicalName: true,
        normalizedKey: true, knowledgeTermId: true,
        products: {
          take: 3,
          include: { product: { select: { cisCode: true, name: true, marketingStatus: true } } },
        },
      },
    });

    if (!s) { console.log("  Substance introuvable en base."); return; }

    console.log(`\n  Match : ${result.matchedBy.padEnd(14)} | confiance : ${confPct}`);
    console.log(`\n  Substance : ${s.canonicalName}  (code BDPM: ${s.substanceCode})`);

    // KnowledgeTerm + KnowledgeFacts
    const termId = s.knowledgeTermId
      ?? (await db.knowledgeTerm.findFirst({ where: { normalizedKey: s.normalizedKey }, select: { id: true } }))?.id
      ?? null;

    if (termId) {
      const term = await db.knowledgeTerm.findUnique({
        where: { id: termId },
        select: {
          normalizedKey: true,
          factsAsSubject: {
            select: { predicate: true, object: true, qualifier: true, confidence: true },
            orderBy: { confidence: "desc" },
            take: 5,
          },
        },
      });
      if (term) {
        const factCount = term.factsAsSubject.length;
        console.log(`  KnowledgeTerm : ${term.normalizedKey}  →  ${factCount} fait(s)`);
        for (const f of term.factsAsSubject) {
          const conf = `(conf ${f.confidence.toFixed(2)})`;
          console.log(`    ↳ ${f.predicate.padEnd(28)} → ${f.object}  ${conf}`);
        }
      }
    } else {
      console.log(`  KnowledgeTerm : non lié`);
    }

    if (s.products.length > 0) {
      console.log(`\n  Produits contenant cette substance (top 3) :`);
      for (const ps of s.products) {
        console.log(`    • ${ps.product.name}  (CIS: ${ps.product.cisCode})`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batterie de tests rapide (mode sans argument)
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_CASES = [
  "Doliprane 1000",
  "Paracétamol",
  "Levothyrox 75 mcg le matin",
  "Lévothyroxine",
  "Metformine 850mg",
  "Oméprazole 20mg",
  "Sertraline 50mg",
  "Atorvastatine",
  "Amoxicilline 500mg",
  "Médicament inconnu XYZ99",
];

async function runBatch(): Promise<void> {
  const [pCount, sCount, aCount] = await Promise.all([
    db.drugProduct.count(),
    db.drugSubstance.count(),
    db.drugAlias.count(),
  ]);

  console.log("\n════════════════════════════════════════════");
  console.log("  Batterie matching — NaturoDesk BDPM");
  console.log("════════════════════════════════════════════");
  console.log(`\n  Base : ${pCount.toLocaleString("fr-FR")} produits · ${sCount.toLocaleString("fr-FR")} substances · ${aCount.toLocaleString("fr-FR")} alias\n`);

  const col = 42;
  console.log(`  ${"Input".padEnd(col)} ${"Méthode".padEnd(15)} ${"Conf".padEnd(6)} Résolu`);
  console.log("  " + "─".repeat(100));

  let found = 0;
  for (const input of BATCH_CASES) {
    const { label, brand } = parseLabel(input);
    const result = await match(label, brand);

    let resolved = "—";
    if (result.productId) {
      const p = await db.drugProduct.findUnique({ where: { id: result.productId }, select: { name: true } });
      resolved = p?.name ?? "—";
    } else if (result.substanceId) {
      const s = await db.drugSubstance.findUnique({ where: { id: result.substanceId }, select: { canonicalName: true } });
      resolved = s ? `[DCI] ${s.canonicalName}` : "—";
    }

    const icon = result.matchedBy !== "none" ? "✓" : "✗";
    const conf = result.matchedBy !== "none" ? `${Math.round(result.confidence * 100)}%` : "—";
    const label_ = `"${input}"`;
    console.log(`  ${icon} ${label_.padEnd(col)} ${result.matchedBy.padEnd(15)} ${conf.padEnd(6)} ${resolved.slice(0, 50)}`);
    if (result.matchedBy !== "none") found++;
  }

  console.log("  " + "─".repeat(100));
  console.log(`\n  ${found}/${BATCH_CASES.length} matchés`);
  console.log("\n  Pour un détail complet : npx tsx scripts/test-drug-matching.ts \"<nom>\"");
  console.log("════════════════════════════════════════════\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const arg = process.argv[2]?.trim();

  if (!arg) {
    await runBatch();
    return;
  }

  const { label, brand } = parseLabel(arg);

  console.log("\n════════════════════════════════════════════");
  console.log(`  Matching : "${arg}"`);
  console.log("════════════════════════════════════════════");
  console.log(`\n  Label parsé : ${label ?? "—"}`);
  console.log(`  Marque      : ${brand ?? "—"}`);

  const result = await match(label, brand);

  if (result.matchedBy === "none") {
    console.log("\n  ✗ Aucun match trouvé.\n");

    // Suggestions fuzzy top 3
    const key = normalizeKey(label ?? arg);
    const suggestions = await db.$queryRaw<Array<{ name: string; cisCode: string }>>`
      SELECT name, "cisCode" FROM drug_products
      WHERE "isActive" = true AND "normalizedName" ILIKE ${"%" + key.slice(0, 6) + "%"}
      LIMIT 3
    `;
    if (suggestions.length > 0) {
      console.log("  Suggestions (prefix fuzzy) :");
      for (const s of suggestions) console.log(`    • ${s.name}  (CIS: ${s.cisCode})`);
    }
    console.log("");
  } else {
    await displayResult(result, arg);
    console.log("");
  }
}

main()
  .catch((err) => { console.error("\n  Erreur :", err instanceof Error ? err.message : String(err)); process.exit(1); })
  .finally(() => db.$disconnect());
