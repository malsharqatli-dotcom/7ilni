import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const exclude = request.nextUrl.searchParams.get("exclude")?.trim();

  // The dice button draws from the already-scored article pool, not raw
  // Wikipedia random, so it can't land on an obscure stub/dead-end page —
  // the same guarantee the difficulty tiers give the random-pick flow.
  let query = supabase.from("article_metadata").select("title, difficulty_tier");
  if (exclude) {
    query = query.neq("title", exclude);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No articles available" }, { status: 404 });
  }

  const pick = data[Math.floor(Math.random() * data.length)];
  return NextResponse.json({ title: pick.title, difficultyTier: pick.difficulty_tier });
}
