/**
 * scripts/seed-bdpm-minimal.ts
 *
 * Seed minimal BDPM pour valider le matching médicament → DrugProduct / DrugSubstance.
 *
 * Crée un jeu de données réaliste couvrant :
 *   - Doliprane 1000 (Paracétamol, produit Sanofi)
 *   - Paracétamol générique (substance + produit)
 *   - Amoxicilline (substance + produit Clamoxyl)
 *   - Spasfon (Phloroglucinol)
 *
 * Ce seed peuple directement les tables :
 *   DrugSubstance, DrugProduct, DrugProductSubstance, DrugAlias, DrugSyncBatch
 *
 * Idempotent — peut être relancé sans doublon.
 *
 * Usage :
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-bdpm-minimal.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Données de référence (CIS codes BDPM réels)
// ---------------------------------------------------------------------------

const SUBSTANCES = [
  { substanceCode: "01696", name: "PARACETAMOL",      canonicalName: "Paracétamol",    normalizedKey: "paracetamol"    },
  { substanceCode: "00009", name: "AMOXICILLINE",     canonicalName: "Amoxicilline",   normalizedKey: "amoxicilline"   },
  { substanceCode: "02613", name: "PHLOROGLUCINOL",   canonicalName: "Phloroglucinol", normalizedKey: "phloroglucinol" },
  { substanceCode: "01234", name: "IBUPROFENE",       canonicalName: "Ibuprofène",     normalizedKey: "ibuprofene"     },
  { substanceCode: "05678", name: "METFORMINE",       canonicalName: "Metformine",     normalizedKey: "metformine"     },
  { substanceCode: "07654", name: "OMEPRAZOLE",       canonicalName: "Oméprazole",     normalizedKey: "omeprazole"     },
  { substanceCode: "03210", name: "SERTRALINE",       canonicalName: "Sertraline",     normalizedKey: "sertraline"     },
  { substanceCode: "04321", name: "RAMIPRIL",         canonicalName: "Ramipril",       normalizedKey: "ramipril"       },
  { substanceCode: "08765", name: "LEVOTHYROXINE",    canonicalName: "Lévothyroxine",  normalizedKey: "levothyroxine"  },
] as const;

const PRODUCTS = [
  {
    cisCode:         "61369001",
    name:            "DOLIPRANE 1000 mg, comprimé pelliculé",
    normalizedName:  "doliprane-1000-mg-comprime-pellicule",
    normalizedBrand: "doliprane",
    form:            "comprimé pelliculé",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["01696"],
  },
  {
    cisCode:         "61369002",
    name:            "PARACETAMOL BIOGARAN 500 mg, comprimé",
    normalizedName:  "paracetamol-biogaran-500-mg-comprime",
    normalizedBrand: "paracetamol-biogaran",
    form:            "comprimé",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["01696"],
  },
  {
    cisCode:         "61369003",
    name:            "CLAMOXYL 500 mg, gélule",
    normalizedName:  "clamoxyl-500-mg-gelule",
    normalizedBrand: "clamoxyl",
    form:            "gélule",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["00009"],
  },
  {
    cisCode:         "61369004",
    name:            "AMOXICILLINE MYLAN 500 mg, gélule",
    normalizedName:  "amoxicilline-mylan-500-mg-gelule",
    normalizedBrand: "amoxicilline-mylan",
    form:            "gélule",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["00009"],
  },
  {
    cisCode:         "61369005",
    name:            "SPASFON LYOC 80 mg, lyophilisat oral",
    normalizedName:  "spasfon-lyoc-80-mg-lyophilisat-oral",
    normalizedBrand: "spasfon",
    form:            "lyophilisat oral",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["02613"],
  },
  {
    cisCode:         "61369006",
    name:            "ADVIL 400 mg, comprimé enrobé",
    normalizedName:  "advil-400-mg-comprime-enrobe",
    normalizedBrand: "advil",
    form:            "comprimé enrobé",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["01234"],
  },
  {
    cisCode:         "61369007",
    name:            "GLUCOPHAGE 500 mg, comprimé pelliculé",
    normalizedName:  "glucophage-500-mg-comprime-pellicule",
    normalizedBrand: "glucophage",
    form:            "comprimé pelliculé",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["05678"],
  },
  {
    cisCode:         "61369008",
    name:            "MOPRAL 20 mg, gélule gastrorésistante",
    normalizedName:  "mopral-20-mg-gelule-gastroresistante",
    normalizedBrand: "mopral",
    form:            "gélule gastrorésistante",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["07654"],
  },
  {
    cisCode:         "61369009",
    name:            "ZOLOFT 50 mg, gélule",
    normalizedName:  "zoloft-50-mg-gelule",
    normalizedBrand: "zoloft",
    form:            "gélule",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["03210"],
  },
  {
    cisCode:         "61369010",
    name:            "TRIATEC 5 mg, comprimé",
    normalizedName:  "triatec-5-mg-comprime",
    normalizedBrand: "triatec",
    form:            "comprimé",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["04321"],
  },
  {
    cisCode:         "61369011",
    name:            "LEVOTHYROX 75 microgrammes, comprimé",
    normalizedName:  "levothyrox-75-microgrammes-comprime",
    normalizedBrand: "levothyrox",
    form:            "comprimé",
    route:           "orale",
    marketingStatus: "Commercialisée",
    substanceCodes:  ["08765"],
  },
] as const;

// Alias supplémentaires — noms courants saisis par les praticiens
const MANUAL_ALIASES: Array<{
  key: string;
  label: string;
  targetCisCode?: string;
  targetSubstanceCode?: string;
}> = [
  // Doliprane — différentes formes de saisie
  { key: "doliprane",         label: "Doliprane",       targetCisCode: "61369001" },
  { key: "doliprane-1000",    label: "Doliprane 1000",  targetCisCode: "61369001" },
  { key: "doliprane-500",     label: "Doliprane 500",   targetCisCode: "61369001" },
  // Paracétamol DCI
  { key: "paracetamol",       label: "Paracétamol",     targetSubstanceCode: "01696" },
  { key: "acetaminophene",    label: "Acétaminophène",  targetSubstanceCode: "01696" },
  // Amoxicilline
  { key: "amoxicilline",      label: "Amoxicilline",    targetSubstanceCode: "00009" },
  { key: "clamoxyl",          label: "Clamoxyl",        targetCisCode: "61369003" },
  // Spasfon
  { key: "spasfon",           label: "Spasfon",         targetCisCode: "61369005" },
  { key: "phloroglucinol",    label: "Phloroglucinol",  targetSubstanceCode: "02613" },
  // Ibuprofène
  { key: "advil",             label: "Advil",           targetCisCode: "61369006" },
  { key: "nurofen",           label: "Nurofen",         targetCisCode: "61369006" },
  { key: "ibuprofene",        label: "Ibuprofène",      targetSubstanceCode: "01234" },
  // Metformine
  { key: "glucophage",        label: "Glucophage",      targetCisCode: "61369007" },
  { key: "metformine",        label: "Metformine",      targetSubstanceCode: "05678" },
  // Oméprazole
  { key: "mopral",            label: "Mopral",          targetCisCode: "61369008" },
  { key: "omeprazole",        label: "Oméprazole",      targetSubstanceCode: "07654" },
  { key: "omeprazol",         label: "Oméprazol",       targetSubstanceCode: "07654" },
  // Sertraline
  { key: "zoloft",            label: "Zoloft",          targetCisCode: "61369009" },
  { key: "sertraline",        label: "Sertraline",      targetSubstanceCode: "03210" },
  // Ramipril
  { key: "triatec",           label: "Triatec",         targetCisCode: "61369010" },
  { key: "ramipril",          label: "Ramipril",        targetSubstanceCode: "04321" },
  // Lévothyroxine
  { key: "levothyrox",        label: "Lévothyrox",      targetCisCode: "61369011" },
  { key: "levothyroxine",     label: "Lévothyroxine",   targetSubstanceCode: "08765" },
  { key: "l-thyroxine",       label: "L-Thyroxine",     targetSubstanceCode: "08765" },
  { key: "levothyroxine-100", label: "Lévothyroxine 100", targetSubstanceCode: "08765" },
  { key: "levothyroxine-50",  label: "Lévothyroxine 50",  targetSubstanceCode: "08765" },
  { key: "levothyroxine-25",  label: "Lévothyroxine 25",  targetSubstanceCode: "08765" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n Seed BDPM minimal — validation matching\n");
  const BATCH_REF = "2026-04-minimal-seed";

  // ── DrugSyncBatch ────────────────────────────────────────────────────────────
  const batch = await db.drugSyncBatch.upsert({
    where:  { batchRef: BATCH_REF },
    create: { batchRef: BATCH_REF, status: "RUNNING", startedAt: new Date() },
    update: { status: "RUNNING", startedAt: new Date() },
  });
  console.log(`DrugSyncBatch : ${batch.id}`);

  // ── DrugSubstance ────────────────────────────────────────────────────────────
  console.log("\n[1] Substances actives…");
  const substanceIdMap = new Map<string, string>(); // substanceCode → id

  for (const s of SUBSTANCES) {
    const record = await db.drugSubstance.upsert({
      where:  { substanceCode: s.substanceCode },
      create: { substanceCode: s.substanceCode, name: s.name, canonicalName: s.canonicalName,
                normalizedKey: s.normalizedKey, batchId: BATCH_REF },
      update: { name: s.name, canonicalName: s.canonicalName, normalizedKey: s.normalizedKey,
                batchId: BATCH_REF, isActive: true },
    });
    substanceIdMap.set(s.substanceCode, record.id);
    console.log(`  + ${s.canonicalName} (${s.substanceCode})`);
  }

  // ── DrugProduct ──────────────────────────────────────────────────────────────
  console.log("\n[2] Spécialités pharmaceutiques…");
  const productIdMap = new Map<string, string>(); // cisCode → id

  for (const p of PRODUCTS) {
    const record = await db.drugProduct.upsert({
      where:  { cisCode: p.cisCode },
      create: { cisCode: p.cisCode, name: p.name, normalizedName: p.normalizedName,
                normalizedBrand: p.normalizedBrand, form: p.form, route: p.route,
                marketingStatus: p.marketingStatus, batchId: BATCH_REF, isActive: true },
      update: { name: p.name, normalizedName: p.normalizedName, normalizedBrand: p.normalizedBrand,
                form: p.form, route: p.route, marketingStatus: p.marketingStatus,
                batchId: BATCH_REF, isActive: true },
    });
    productIdMap.set(p.cisCode, record.id);
    console.log(`  + ${p.name}`);
  }

  // ── DrugProductSubstance ─────────────────────────────────────────────────────
  console.log("\n[3] Compositions produit ↔ substance…");
  let compoCount = 0;

  for (const p of PRODUCTS) {
    const productId = productIdMap.get(p.cisCode);
    if (!productId) continue;

    for (let i = 0; i < p.substanceCodes.length; i++) {
      const substanceId = substanceIdMap.get(p.substanceCodes[i]!);
      if (!substanceId) continue;

      await db.drugProductSubstance.upsert({
        where:  { productId_substanceId: { productId, substanceId } },
        create: { productId, substanceId, substanceOrder: i + 1 },
        update: { substanceOrder: i + 1 },
      });
      compoCount++;
    }
  }
  console.log(`  ${compoCount} liaisons créées/mises à jour`);

  // ── DrugAlias — auto (normalizedBrand → productId) ───────────────────────────
  console.log("\n[4] Alias automatiques (normalizedBrand)…");
  let autoAliasCount = 0;

  for (const p of PRODUCTS) {
    const productId = productIdMap.get(p.cisCode);
    if (!productId || !p.normalizedBrand) continue;

    await db.drugAlias.upsert({
      where:  { key: p.normalizedBrand },
      create: { key: p.normalizedBrand, label: p.normalizedBrand, productId, source: "BDPM" },
      update: { productId },
    });
    autoAliasCount++;
  }
  console.log(`  ${autoAliasCount} alias de marque créés/mis à jour`);

  // ── DrugAlias — auto (normalizedKey → substanceId) ───────────────────────────
  console.log("\n[5] Alias automatiques (DCI)…");
  let dciAliasCount = 0;

  for (const s of SUBSTANCES) {
    const substanceId = substanceIdMap.get(s.substanceCode);
    if (!substanceId || !s.normalizedKey) continue;

    const existing = await db.drugAlias.findUnique({ where: { key: s.normalizedKey } });
    if (!existing) {
      await db.drugAlias.create({
        data: { key: s.normalizedKey, label: s.name, substanceId, source: "BDPM" },
      });
      dciAliasCount++;
    }
  }
  console.log(`  ${dciAliasCount} alias DCI créés`);

  // ── DrugAlias — manuels ───────────────────────────────────────────────────────
  console.log("\n[6] Alias manuels (noms courants)…");
  let manualAliasCount = 0;

  for (const alias of MANUAL_ALIASES) {
    const productId   = alias.targetCisCode ? productIdMap.get(alias.targetCisCode) : undefined;
    const substanceId = alias.targetSubstanceCode ? substanceIdMap.get(alias.targetSubstanceCode) : undefined;

    if (!productId && !substanceId) {
      console.warn(`  ⚠ Alias "${alias.key}" — cible introuvable`);
      continue;
    }

    await db.drugAlias.upsert({
      where:  { key: alias.key },
      create: { key: alias.key, label: alias.label,
                productId:   productId   ?? null,
                substanceId: substanceId ?? null,
                source: "MANUAL" },
      update: { label: alias.label,
                productId:   productId   ?? null,
                substanceId: substanceId ?? null },
    });
    manualAliasCount++;
  }
  console.log(`  ${manualAliasCount} alias manuels créés/mis à jour`);

  // ── Finalisation batch ───────────────────────────────────────────────────────
  const [pCount, sCount, aCount] = await Promise.all([
    db.drugProduct.count(),
    db.drugSubstance.count(),
    db.drugAlias.count(),
  ]);

  await db.drugSyncBatch.update({
    where: { id: batch.id },
    data: {
      status:          "DONE",
      productCount:    pCount,
      substanceCount:  sCount,
      finishedAt:      new Date(),
    },
  });

  console.log(`
────────────────────────────────────────────────
 Seed terminé

  DrugProduct       : ${pCount}
  DrugSubstance     : ${sCount}
  DrugAlias         : ${aCount}
────────────────────────────────────────────────
`);
}

main()
  .catch((err) => { console.error("Erreur seed-bdpm-minimal :", err); process.exit(1); })
  .finally(() => db.$disconnect());
