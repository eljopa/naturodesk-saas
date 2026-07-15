import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";

async function main() {
  const { count } = await db.blogArticle.deleteMany({ where: { locale: "en", status: "REVIEW_REQUIRED" } });
  console.log(`${count} ligne(s) EN REVIEW_REQUIRED supprimée(s) pour reprise.`);
}

main().finally(() => db.$disconnect());
