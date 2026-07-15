import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";

async function main() {
  const rows = await db.blogArticle.findMany({
    include: { topic: { select: { slug: true } } },
    orderBy: [{ status: "asc" }, { locale: "asc" }],
  });
  for (const r of rows) console.log(`[${r.locale}] ${r.status} — ${r.topic.slug} (score ${r.qualityScore})`);
}

main().finally(() => db.$disconnect());
