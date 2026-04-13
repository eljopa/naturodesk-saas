import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { semanticSearch } from "@/lib/knowledge/search";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(20, Math.max(1, parseInt(rawLimit ?? "5", 10) || 5));

  try {
    const results = await semanticSearch(query, limit, 0.45);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
