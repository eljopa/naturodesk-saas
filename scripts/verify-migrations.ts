/**
 * Vérification post-migration — confirme que les nouvelles tables sont bien
 * créées et interrogeables (sans écrire de données).
 *
 * Exécution :
 *   npx tsx scripts/verify-migrations.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";

async function main() {
  const [blogTopics, blogArticles, notifications, supportTickets, users] = await Promise.all([
    db.blogTopic.count(),
    db.blogArticle.count(),
    db.notification.count(),
    db.supportTicket.count(),
    db.user.count(),
  ]);

  console.log("Tables interrogeables avec succès :");
  console.log(`  blog_topics: ${blogTopics}`);
  console.log(`  blog_articles: ${blogArticles}`);
  console.log(`  notifications: ${notifications}`);
  console.log(`  support_tickets: ${supportTickets}`);
  console.log(`  users: ${users}`);

  const byStatus = await db.blogTopic.groupBy({ by: ["status"], _count: { _all: true } });
  console.log("\nBlogTopic par statut :");
  for (const row of byStatus) console.log(`  ${row.status}: ${row._count._all}`);
}

main()
  .catch((err) => {
    console.error("ÉCHEC:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
