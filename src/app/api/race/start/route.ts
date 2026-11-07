import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient } from "@/lib/supabase/server";

type StartBody = {
  lobbyId?: string;
  startTitle?: string;
  destinationTitle?: string;
};

export async function POST(request: NextRequest) {
  const supabase = createAuthedClient(request.headers.get("authorization"));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { lobbyId, startTitle, destinationTitle } = (await request.json()) as StartBody;

  if (!lobbyId || !startTitle || !destinationTitle) {
    return NextResponse.json({ error: "Missing lobbyId or titles" }, { status: 400 });
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

  await supabase.from("lobbies").update({ status: "in_progress" }).eq("id", lobbyId);

  return NextResponse.json({ raceId: race.id });
}
