/**
 * Script de seed : termes médicamenteux (KnowledgeTerm de type DRUG)
 *
 * Upserte chaque terme par normalizedKey (unique).
 * Idempotent : peut être relancé sans doublon.
 *
 * Usage :
 *   npx ts-node --project tsconfig.json scripts/seed-drug-terms.ts
 *
 * Pré-requis : DATABASE_URL défini dans .env, migration appliquée.
 */

import { PrismaClient } from "@prisma/client";
import { DRUG_TERM_SEEDS } from "../lib/knowledge/seeds/drug-terms";

const db = new PrismaClient();

async function main() {
  console.log(`\n Seed médicaments — ${DRUG_TERM_SEEDS.length} termes DRUG\n`);

  let created = 0;
  let updated = 0;

  for (const term of DRUG_TERM_SEEDS) {
    const existing = await db.knowledgeTerm.findUnique({
      where:  { normalizedKey: term.normalizedKey },
      select: { id: true, canonicalName: true },
    });

    await db.knowledgeTerm.upsert({
      where:  { normalizedKey: term.normalizedKey },
      create: {
        canonicalName: term.canonicalName,
        normalizedKey: term.normalizedKey,
        termType:      "DRUG",
        category:      term.category,
        aliases:       term.aliases,
      },
      update: {
        canonicalName: term.canonicalName,
        category:      term.category,
        aliases:       term.aliases,
      },
    });

    if (existing) {
      console.log(`  ~ ${term.canonicalName} (mis à jour)`);
      updated++;
    } else {
      console.log(`  + ${term.canonicalName}`);
      created++;
    }
  }

  console.log(`\nRésultat : ${created} créé(s), ${updated} mis à jour\n`);
}

main()
  .catch((err) => {
    console.error("Erreur seed-drug-terms :", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
