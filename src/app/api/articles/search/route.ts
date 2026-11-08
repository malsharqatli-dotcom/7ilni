import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabase
    .from("article_metadata")
    .select("title, difficulty_tier")
    .ilike("title", `%${q}%`)
    .order("title")
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    results: (data ?? []).map((row) => ({ title: row.title, difficultyTier: row.difficulty_tier })),
  });
}
