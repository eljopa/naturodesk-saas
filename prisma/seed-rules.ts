/**
 * Seed the 6 clinical rules into the DB.
 * Run once with: npx ts-node -r tsconfig-paths/register prisma/seed-rules.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const RULES = [
  {
    code: "MISSING_DATA_NO_SYMPTOMS",
    name: "Aucun symptôme renseigné",
    category: "MISSING_DATA" as const,
  },
  {
    code: "MISSING_DATA_NO_CONTEXT",
    name: "Contexte clinique insuffisant",
    category: "MISSING_DATA" as const,
  },
  {
    code: "MEDICATION_LOAD_HIGH",
    name: "Charge médicamenteuse élevée (≥5 médicaments)",
    category: "MEDICATION_LOAD" as const,
  },
  {
    code: "DEPLETION_STATINS_COQ10",
    name: "Déplétion CoQ10 probable sous statine",
    category: "DEPLETION" as const,
  },
  {
    code: "DEPLETION_PPI_B12_MG",
    name: "Risque déplétion B12/Mg sous IPP",
    category: "DEPLETION" as const,
  },
  {
    code: "INTERACTION_ANTICOAG_NATURALS",
    name: "Interaction anticoagulant + fluidifiant naturel",
    category: "PROTOCOL_VIGILANCE" as const,
  },
];

async function main() {
  console.log("Seeding rules...");
  for (const rule of RULES) {
    const result = await db.rule.upsert({
      where: { code: rule.code },
      update: { name: rule.name, category: rule.category, enabled: true },
      create: { ...rule, enabled: true },
    });
    console.log(`  ✓ ${result.code} (id: ${result.id})`);
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
