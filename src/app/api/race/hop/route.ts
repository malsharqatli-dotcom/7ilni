import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient } from "@/lib/supabase/server";

type HopBody = {
  raceId?: string;
  fromTitle?: string;
  toTitle?: string;
};

type StagePair = { start: string; destination: string };

function sameArticle(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const supabase = createAuthedClient(request.headers.get("authorization"));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { raceId, fromTitle, toTitle } = (await request.json()) as HopBody;

  if (!raceId || !fromTitle || !toTitle) {
    return NextResponse.json({ error: "Missing raceId, fromTitle, or toTitle" }, { status: 400 });
  }

  const { data: race, error: raceError } = await supabase
    .from("races")
    .select("destination_title, stage_pairs")
    .eq("id", raceId)
    .single();

  if (raceError || !race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const { data: participant, error: participantError } = await supabase
    .from("race_participants")
    .select("hop_count, status, team_name, current_stage_index")
    .eq("race_id", raceId)
    .eq("user_id", user.id)
    .single();

  if (participantError || !participant) {
    return NextResponse.json({ error: "Not a participant in this race" }, { status: 404 });
  }

  if (participant.status !== "racing") {
    return NextResponse.json({ error: "Already finished or surrendered" }, { status: 409 });
  }

  const stagePairs = race.stage_pairs as StagePair[] | null;
  const nextHopCount = participant.hop_count + 1;

  await supabase.from("race_hops").insert({
    race_id: raceId,
    user_id: user.id,
    from_title: fromTitle,
    to_title: toTitle,
    hop_index: nextHopCount,
  });

  if (stagePairs) {
    // Teams mode: the whole team shares one current stage. Reaching that
    // stage's destination bumps every teammate to the next stage at once
    // (even ones mid-race on the old one) — the plan the user specified:
    // "a player from team 1 finishes, all his team moves to 2."
    const currentStage = stagePairs[participant.current_stage_index];
    const reachedStageEnd = sameArticle(toTitle, currentStage.destination);

    if (!reachedStageEnd) {
      await supabase
        .from("race_participants")
        .update({ hop_count: nextHopCount, current_title: toTitle })
        .eq("race_id", raceId)
        .eq("user_id", user.id);
      return NextResponse.json({ hopCount: nextHopCount, finished: false, stageAdvanced: false });
    }

    const isLastStage = participant.current_stage_index === stagePairs.length - 1;

    if (!isLastStage) {
      const nextStage = stagePairs[participant.current_stage_index + 1];
      // race_participants' RLS only allows updating your own row — this
      // RPC is security-definer specifically so one finisher can advance
      // every teammate's row, after verifying the caller is on that team.
      const { error: advanceError } = await supabase.rpc("advance_team_stage", {
        p_race_id: raceId,
        p_team_name: participant.team_name,
        p_next_stage_index: participant.current_stage_index + 1,
        p_next_stage_start: nextStage.start,
      });
      if (advanceError) {
        return NextResponse.json({ error: advanceError.message }, { status: 500 });
      }

      return NextResponse.json({
        hopCount: 0,
        finished: false,
        stageAdvanced: true,
        nextStageIndex: participant.current_stage_index + 1,
        nextStageStart: nextStage.start,
      });
    }

    // Last stage done — the whole team finishes together. Rank is per
    // team, not per player, since teammates finish in the same instant.
    const { data: finishedTeams } = await supabase
      .from("race_participants")
      .select("team_name")
      .eq("race_id", raceId)
      .eq("status", "finished");
    const finishRank = new Set((finishedTeams ?? []).map((r) => r.team_name)).size + 1;

    const { error: finishError } = await supabase.rpc("finish_team", {
      p_race_id: raceId,
      p_team_name: participant.team_name,
      p_finish_rank: finishRank,
      p_final_title: toTitle,
    });
    if (finishError) {
      return NextResponse.json({ error: finishError.message }, { status: 500 });
    }

    return NextResponse.json({ hopCount: nextHopCount, finished: true, finishRank });
  }

  // Free-for-all: unchanged from before teams mode existed.
  const finished = sameArticle(toTitle, race.destination_title);

  let finishRank: number | null = null;
  if (finished) {
    const { count } = await supabase
      .from("race_participants")
      .select("user_id", { count: "exact", head: true })
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
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ hopCount: nextHopCount, finished, finishRank });
}
