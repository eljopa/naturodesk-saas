import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";

async function main() {
  const rows = await db.blogArticle.findMany({
    where: { status: "PUBLISHED" },
    include: { topic: { select: { slug: true } } },
    orderBy: { publishedAt: "desc" },
  });
  for (const locale of ["fr", "en"]) {
    console.log(`\n--- ${locale} (ordre d'affichage sur /blog) ---`);
    for (const r of rows.filter((r) => r.locale === locale)) {
      console.log(`${r.publishedAt?.toISOString()} — ${r.topic.slug}`);
    }
  }
}

main().finally(() => db.$disconnect());
