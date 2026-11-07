import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient } from "@/lib/supabase/server";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const supabase = createAuthedClient(request.headers.get("authorization"));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { hopCount, timeSeconds, displayName } = (await request.json()) as {
    hopCount?: number;
    timeSeconds?: number;
    displayName?: string;
  };

  if (hopCount === undefined || timeSeconds === undefined || !displayName) {
    return NextResponse.json({ error: "Missing hopCount, timeSeconds, or displayName" }, { status: 400 });
  }

  const { error } = await supabase.from("daily_leaderboard").insert({
    challenge_date: todayUtc(),
    user_id: user.id,
    display_name: displayName,
    hop_count: hopCount,
    time_seconds: timeSeconds,
  });

  // Unique violation (23505) means this user already has today's result —
  // one attempt per day is the intended rule, not a real error.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
