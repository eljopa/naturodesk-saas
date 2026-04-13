/**
 * Script de seed : 29 ingrédients suppléments V1
 *
 * Upserte chaque KnowledgeTerm par normalizedKey (unique).
 * Idempotent : peut être relancé sans doublon.
 *
 * Usage :
 *   npx ts-node --project tsconfig.json scripts/seed-supplement-terms.ts
 *
 * Pré-requis : DATABASE_URL défini dans .env
 */

import { PrismaClient } from "@prisma/client";
import { SUPPLEMENT_SEED_TERMS } from "../lib/knowledge/seeds/supplement-terms";

const db = new PrismaClient();

async function main() {
  console.log(`\n🌱 Seed suppléments — ${SUPPLEMENT_SEED_TERMS.length} ingrédients\n`);

  let created = 0;
  let updated = 0;

  for (const term of SUPPLEMENT_SEED_TERMS) {
    const existing = await db.knowledgeTerm.findUnique({
      where: { normalizedKey: term.normalizedKey },
      select: { id: true, canonicalName: true },
    });

    await db.knowledgeTerm.upsert({
      where: { normalizedKey: term.normalizedKey },
      create: {
        canonicalName: term.canonicalName,
        normalizedKey: term.normalizedKey,
        termType:      term.termType,
        category:      term.category,
        odsId:         term.odsId,
        aliases:       term.aliases,
      },
      update: {
        canonicalName: term.canonicalName,
        termType:      term.termType,
        category:      term.category,
        odsId:         term.odsId,
        aliases:       term.aliases,
      },
    });

    if (existing) {
      console.log(`  ↺  ${term.canonicalName.padEnd(25)} [${term.normalizedKey}]`);
      updated++;
    } else {
      console.log(`  +  ${term.canonicalName.padEnd(25)} [${term.normalizedKey}]`);
      created++;
    }
  }

  console.log(`\n✅ Terminé — ${created} créés, ${updated} mis à jour.\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
