/**
 * Seed des variantes cliniques de suppléments (KnowledgeTermVariant).
 *
 * Usage :
 *   npx tsx scripts/seed-supplement-variants.ts
 *
 * Idempotent : upsert par normalizedKey (@unique).
 * Prérequis : seed-supplement-terms doit avoir été exécuté.
 */

import { PrismaClient } from "@prisma/client";
import { SUPPLEMENT_VARIANT_SEEDS } from "../lib/knowledge/seeds/supplement-variants";

const db = new PrismaClient();

async function main() {
  console.log("=".repeat(60));
  console.log("Seed — KnowledgeTermVariant");
  console.log("=".repeat(60));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const seed of SUPPLEMENT_VARIANT_SEEDS) {
    // Résoudre le parent
    const parent = await db.knowledgeTerm.findUnique({
      where:  { normalizedKey: seed.parentNormalizedKey },
      select: { id: true, canonicalName: true },
    });

    if (!parent) {
      console.warn(`  ✗ Parent introuvable : "${seed.parentNormalizedKey}" — variante "${seed.normalizedKey}" ignorée`);
      errors.push(`Parent not found: ${seed.parentNormalizedKey}`);
      skipped++;
      continue;
    }

    const existing = await db.knowledgeTermVariant.findUnique({
      where:  { normalizedKey: seed.normalizedKey },
      select: { id: true },
    });

    if (existing) {
      await db.knowledgeTermVariant.update({
        where: { id: existing.id },
        data: {
          label:       seed.label,
          aliases:     seed.aliases,
          variantType: seed.variantType,
          notes:       seed.notes ?? null,
          termId:      parent.id,
        },
      });
      console.log(`  ↺ Mis à jour : ${seed.label} (parent: ${parent.canonicalName})`);
      updated++;
    } else {
      await db.knowledgeTermVariant.create({
        data: {
          termId:       parent.id,
          label:        seed.label,
          normalizedKey: seed.normalizedKey,
          aliases:      seed.aliases,
          variantType:  seed.variantType,
          notes:        seed.notes ?? null,
        },
      });
      console.log(`  ✓ Créé : ${seed.label} (parent: ${parent.canonicalName})`);
      created++;
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Résultat : ${created} créé(s), ${updated} mis à jour, ${skipped} ignoré(s)`);
  if (errors.length > 0) {
    console.log(`Erreurs : ${errors.join(", ")}`);
  }
  console.log("─".repeat(60));
}

main()
  .catch((err) => {
    console.error("Erreur critique :", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
