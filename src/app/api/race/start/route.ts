import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient } from "@/lib/supabase/server";

type StartBody = {
  lobbyId?: string;
  difficulty?: "easy" | "medium" | "hard";
  deckId?: string;
};

function pickTwoDistinct(titles: string[]): [string, string] | null {
  const unique = [...new Set(titles)];
  if (unique.length < 2) return null;
  const shuffled = unique.sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

export async function POST(request: NextRequest) {
  const supabase = createAuthedClient(request.headers.get("authorization"));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { lobbyId, difficulty, deckId } = (await request.json()) as StartBody;
  if (!lobbyId) {
    return NextResponse.json({ error: "Missing lobbyId" }, { status: 400 });
  }

  let candidates: string[];
  if (deckId) {
    const { data } = await supabase
      .from("deck_articles")
      .select("article_title")
      .eq("deck_id", deckId);
    candidates = (data ?? []).map((row) => row.article_title);
  } else {
    const { data } = await supabase
      .from("article_metadata")
      .select("title")
      .eq("difficulty_tier", difficulty ?? "medium")
      .limit(50);
    candidates = (data ?? []).map((row) => row.title);
  }

  const pair = pickTwoDistinct(candidates);
  if (!pair) {
    return NextResponse.json({ error: "Not enough articles available for this pick" }, { status: 422 });
  }
  const [startTitle, destinationTitle] = pair;

  const { data: race, error: raceError } = await supabase
    .from("races")
    .insert({
      lobby_id: lobbyId,
      start_title: startTitle,
      destination_title: destinationTitle,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (raceError || !race) {
    return NextResponse.json({ error: raceError?.message ?? "Failed to create race" }, { status: 500 });
  }

  await supabase.from("lobbies").update({ status: "in_progress" }).eq("id", lobbyId);

  return NextResponse.json({ raceId: race.id, startTitle });
}
