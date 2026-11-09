import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createAuthedClient } from "@/lib/supabase/server";
import { getArticle } from "@/lib/wiki/fetch-article";

type StartBody = {
  lobbyId?: string;
  mode?: "ffa" | "teams";
  difficulty?: "easy" | "medium" | "hard";
  deckId?: string;
  stageCount?: number;
  manualStart?: string;
  manualDestination?: string;
};

// Below this many candidates, a deck+difficulty combo doesn't have enough
// possible pairs to feel varied (e.g. exactly 2 candidates means there's
// only ever one possible pair) — widen to the whole deck instead.
const MIN_POOL_FOR_VARIETY = 5;
const RECENT_RACES_TO_AVOID = 10;
// 5s, not 3s — testing showed even a couple hundred ms of navigation/
// broadcast latency between "race created" and "client viewing the page"
// can eat most of a 3s window, leaving an inconsistently short countdown.
const COUNTDOWN_MS = 5000;

function pickTwoDistinct(titles: string[], avoid: Set<string>): [string, string] | null {
  const unique = [...new Set(titles)];
  const fresh = unique.filter((t) => !avoid.has(t));
  // Only avoid recent titles if doing so still leaves enough to pick
  // from — otherwise a small pool could get filtered down to nothing.
  const pool = fresh.length >= 2 ? fresh : unique;
  if (pool.length < 2) return null;
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

// A pair where the destination happens to sit as a direct in-article link
// on the start page solves in a single click regardless of either
// article's own difficulty tier (e.g. neighboring countries' articles
// routinely link straight to each other) — difficulty scoring is about
// each article's own length/link density, not the graph distance between
// a specific pair, so it can't catch this on its own. Reusing getArticle
// means this is normally a cache hit (the pool is pre-warmed), not a live
// Wikipedia fetch on every race start.
const MAX_PAIR_REROLLS = 8;

async function isDirectLink(fromTitle: string, toTitle: string): Promise<boolean> {
  try {
    const article = await getArticle(fromTitle);
    const target = toTitle.trim().toLowerCase();
    const $ = cheerio.load(article.html);
    let found = false;
    $("[data-wiki-title]").each((_, el) => {
      if (($(el).attr("data-wiki-title") ?? "").trim().toLowerCase() === target) found = true;
    });
    return found;
  } catch {
    // Can't verify (rare fetch failure) — don't block race creation over
    // a quality heuristic, just accept the pair as picked.
    return false;
  }
}

async function pickNonTrivialPair(titles: string[], avoid: Set<string>): Promise<[string, string] | null> {
  let lastPair: [string, string] | null = null;
  for (let attempt = 0; attempt < MAX_PAIR_REROLLS; attempt++) {
    const pair = pickTwoDistinct(titles, avoid);
    if (!pair) return null;
    lastPair = pair;
    if (!(await isDirectLink(pair[0], pair[1]))) return pair;
  }
  // Exhausted re-rolls — small pool, or these articles are just heavily
  // interlinked. A direct-link pair is still a valid race, just an easy
  // one; better than failing to create a race at all.
  return lastPair;
}

export async function POST(request: NextRequest) {
  const supabase = createAuthedClient(request.headers.get("authorization"));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { lobbyId, mode, difficulty, deckId, stageCount, manualStart, manualDestination } =
    (await request.json()) as StartBody;
  if (!lobbyId) {
    return NextResponse.json({ error: "Missing lobbyId" }, { status: 400 });
  }

  const isTeams = mode === "teams";

  if (manualStart && manualDestination) {
    // Manual picks are scoped to FFA (one start/destination), and only to
    // titles the host actually picked from the scored pool — same guarantee
    // the difficulty tiers give the random flow, so there's no dead-end
    // stub page and no need for a separate custom-pair difficulty estimate.
    if (isTeams) {
      return NextResponse.json({ error: "Manual picks aren't supported in teams mode" }, { status: 400 });
    }
    if (manualStart.trim().toLowerCase() === manualDestination.trim().toLowerCase()) {
      return NextResponse.json({ error: "لازم تختار مقالة بداية ونهاية مختلفتين عن بعض" }, { status: 400 });
    }

    // Case-insensitive match against the scored pool, rather than an exact
    // .in() — free-typed text that doesn't exactly match the stored casing
    // (most likely if someone typed instead of picking a dropdown
    // suggestion) still resolves correctly here, using the pool's own
    // canonical casing for the race rather than whatever the player typed.
    const [{ data: startMatch }, { data: destMatch }] = await Promise.all([
      supabase.from("article_metadata").select("title").ilike("title", manualStart.trim()).limit(1).maybeSingle(),
      supabase.from("article_metadata").select("title").ilike("title", manualDestination.trim()).limit(1).maybeSingle(),
    ]);
    if (!startMatch || !destMatch) {
      return NextResponse.json(
        { error: "لازم تختار المقالة من القائمة المنسدلة وهي بتكتب، أو تستخدم زر 🎲" },
        { status: 422 },
      );
    }
    const resolvedStart = startMatch.title;
    const resolvedDestination = destMatch.title;

    const { data: race, error: raceError } = await supabase
      .from("races")
      .insert({
        lobby_id: lobbyId,
        start_title: resolvedStart,
        destination_title: resolvedDestination,
        stage_pairs: null,
        started_at: new Date(Date.now() + COUNTDOWN_MS).toISOString(),
      })
      .select("id")
      .single();

    if (raceError || !race) {
      return NextResponse.json({ error: raceError?.message ?? "Failed to create race" }, { status: 500 });
    }

    await supabase.from("lobbies").update({ status: "in_progress" }).eq("id", lobbyId);
    return NextResponse.json({ raceId: race.id, startTitle: resolvedStart });
  }

  let candidates: string[] = [];
  if (deckId) {
    // Combine deck + difficulty when both are picked, but deck sizes are
    // small (9-18 articles) — a specific tier within one deck can easily
    // have too few matches to feel varied. Fall back to the whole deck
    // rather than failing or repeating the same pair every time; topic is
    // the stronger signal of what the host actually wants.
    if (difficulty) {
      const { data } = await supabase
        .from("deck_articles")
        .select("article_title, article_metadata!inner(difficulty_tier)")
        .eq("deck_id", deckId)
        .eq("article_metadata.difficulty_tier", difficulty);
      candidates = (data ?? []).map((row) => row.article_title);
    }
    if (candidates.length < MIN_POOL_FOR_VARIETY) {
      const { data } = await supabase.from("deck_articles").select("article_title").eq("deck_id", deckId);
      candidates = (data ?? []).map((row) => row.article_title);
    }
  } else {
    const { data } = await supabase
      .from("article_metadata")
      .select("title")
      .eq("difficulty_tier", difficulty ?? "medium")
      .limit(50);
    candidates = (data ?? []).map((row) => row.title);
  }

  // Avoid repeating a pair that just got used recently, so the same small
  // deck doesn't feel like it's handing out the identical race back to back.
  const { data: recentRaces } = await supabase
    .from("races")
    .select("start_title, destination_title")
    .order("created_at", { ascending: false })
    .limit(RECENT_RACES_TO_AVOID);
  const avoid = new Set((recentRaces ?? []).flatMap((r) => [r.start_title, r.destination_title]));

  const stagesNeeded = isTeams ? Math.max(2, Math.min(5, stageCount ?? 3)) : 1;

  const stagePairs: { start: string; destination: string }[] = [];
  for (let i = 0; i < stagesNeeded; i++) {
    const pair = await pickNonTrivialPair(candidates, avoid);
    if (!pair) {
      return NextResponse.json({ error: "Not enough articles available for this pick" }, { status: 422 });
    }
    stagePairs.push({ start: pair[0], destination: pair[1] });
  }

  // started_at is set a few seconds in the future, not "now" — RaceView
  // shows a countdown until that moment arrives, which keeps every
  // player's countdown synchronized off one shared timestamp instead of
  // each client just running its own independent 3-second timer.
  const { data: race, error: raceError } = await supabase
    .from("races")
    .insert({
      lobby_id: lobbyId,
      start_title: stagePairs[0].start,
      destination_title: stagePairs[0].destination,
      stage_pairs: isTeams ? stagePairs : null,
      started_at: new Date(Date.now() + COUNTDOWN_MS).toISOString(),
    })
    .select("id")
    .single();

  if (raceError || !race) {
    return NextResponse.json({ error: raceError?.message ?? "Failed to create race" }, { status: 500 });
  }

  await supabase.from("lobbies").update({ status: "in_progress" }).eq("id", lobbyId);

  return NextResponse.json({ raceId: race.id, startTitle: stagePairs[0].start });
}
