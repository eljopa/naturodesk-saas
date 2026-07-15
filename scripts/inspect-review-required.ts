import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";

async function main() {
  const articles = await db.blogArticle.findMany({
    where: { locale: "fr" },
    include: { topic: { select: { slug: true, keyword: true } } },
  });

  for (const a of articles) {
    console.log(`\n=== ${a.topic.keyword} (${a.topic.slug}) ===`);
    console.log(`statut=${a.status} score=${a.qualityScore}/100`);
    console.log("errors:", (a.generationLog as { errors?: string[] })?.errors ?? []);
  }
}

main().finally(() => db.$disconnect());
