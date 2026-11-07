import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

type HopBody = {
  raceId?: string;
  guestId?: string;
  fromTitle?: string;
  toTitle?: string;
};

function sameArticle(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const { raceId, guestId, fromTitle, toTitle } = (await request.json()) as HopBody;

  if (!raceId || !guestId || !fromTitle || !toTitle) {
    return NextResponse.json({ error: "Missing raceId, guestId, fromTitle, or toTitle" }, { status: 400 });
  }

  const { data: race, error: raceError } = await supabase
    .from("races")
    .select("destination_title")
    .eq("id", raceId)
    .single();

  if (raceError || !race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const { data: participant, error: participantError } = await supabase
    .from("race_participants")
    .select("hop_count, status")
    .eq("race_id", raceId)
    .eq("guest_id", guestId)
    .single();

  if (participantError || !participant) {
    return NextResponse.json({ error: "Not a participant in this race" }, { status: 404 });
  }

  if (participant.status !== "racing") {
    return NextResponse.json({ error: "Already finished or surrendered" }, { status: 409 });
  }

  const nextHopCount = participant.hop_count + 1;
  const finished = sameArticle(toTitle, race.destination_title);

  await supabase.from("race_hops").insert({
    race_id: raceId,
    guest_id: guestId,
    from_title: fromTitle,
    to_title: toTitle,
    hop_index: nextHopCount,
  });

  let finishRank: number | null = null;
  if (finished) {
    const { count } = await supabase
      .from("race_participants")
      .select("guest_id", { count: "exact", head: true })
      .eq("race_id", raceId)
      .eq("status", "finished");
    finishRank = (count ?? 0) + 1;
  }

  const { error: updateError } = await supabase
    .from("race_participants")
    .update({
      hop_count: nextHopCount,
      current_title: toTitle,
      ...(finished
        ? { status: "finished", finished_at: new Date().toISOString(), finish_rank: finishRank }
        : {}),
    })
    .eq("race_id", raceId)
    .eq("guest_id", guestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ hopCount: nextHopCount, finished, finishRank });
}
