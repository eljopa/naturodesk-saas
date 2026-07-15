import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";

async function main() {
  const rows = await db.blogArticle.findMany({
    where: { status: "PUBLISHED" },
    select: { title: true, locale: true, heroImageUrl: true, images: true },
  });
  for (const r of rows) {
    const count = Array.isArray(r.images) ? r.images.length : 0;
    console.log(`[${r.locale}] ${r.title} — hero: ${!!r.heroImageUrl} — images: ${count}`);
  }
}

main().finally(() => db.$disconnect());
