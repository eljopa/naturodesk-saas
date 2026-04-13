/**
 * Script de bootstrap admin — NaturoDesk
 *
 * Usage :
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-admin.ts <email> [--role ADMIN|SUPER_ADMIN]
 *
 * Exemples :
 *   npx ts-node ... prisma/seed-admin.ts admin@naturodesk.fr
 *   npx ts-node ... prisma/seed-admin.ts admin@naturodesk.fr --role SUPER_ADMIN
 *   npx ts-node ... prisma/seed-admin.ts ops@naturodesk.fr --role ADMIN
 *
 * Défaut : SUPER_ADMIN
 * Ce script met à jour un utilisateur existant en rôle ADMIN ou SUPER_ADMIN.
 * L'utilisateur doit avoir été créé via Supabase Auth + onboarding.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  if (!email) {
    console.error("Usage: npx ts-node prisma/seed-admin.ts <email> [--role ADMIN|SUPER_ADMIN]");
    process.exit(1);
  }

  const roleArgIndex = args.indexOf("--role");
  const roleArg = roleArgIndex !== -1 ? args[roleArgIndex + 1] : "SUPER_ADMIN";

  if (roleArg !== "ADMIN" && roleArg !== "SUPER_ADMIN") {
    console.error(`Rôle invalide : "${roleArg}". Valeurs acceptées : ADMIN, SUPER_ADMIN`);
    process.exit(1);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Aucun utilisateur trouvé avec l'email : ${email}`);
    console.error("L'utilisateur doit d'abord s'inscrire et compléter l'onboarding.");
    process.exit(1);
  }

  if (user.role === roleArg) {
    console.log(`✓ ${email} est déjà ${roleArg}.`);
    return;
  }

  await db.user.update({
    where: { email },
    data: { role: roleArg },
  });

  console.log(`✓ Rôle ${roleArg} attribué à : ${email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
