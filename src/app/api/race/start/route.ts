import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

type StartBody = {
  lobbyId?: string;
  startTitle?: string;
  destinationTitle?: string;
  members?: { guestId: string; displayName: string }[];
};

export async function POST(request: NextRequest) {
  const { lobbyId, startTitle, destinationTitle, members } = (await request.json()) as StartBody;

  if (!lobbyId || !startTitle || !destinationTitle || !members?.length) {
    return NextResponse.json({ error: "Missing lobbyId, titles, or members" }, { status: 400 });
  }

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

  const { error: participantsError } = await supabase.from("race_participants").insert(
    members.map((m) => ({
      race_id: race.id,
      guest_id: m.guestId,
      display_name: m.displayName,
      current_title: startTitle,
    })),
  );

  if (participantsError) {
    return NextResponse.json({ error: participantsError.message }, { status: 500 });
  }

  await supabase.from("lobbies").update({ status: "in_progress" }).eq("id", lobbyId);

  return NextResponse.json({ raceId: race.id });
}
