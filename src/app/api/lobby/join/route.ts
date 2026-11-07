import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { joinCode, guestId, displayName } = body as {
    joinCode?: string;
    guestId?: string;
    displayName?: string;
  };

  if (!joinCode || !guestId || !displayName) {
    return NextResponse.json({ error: "Missing joinCode, guestId, or displayName" }, { status: 400 });
  }

  const normalizedCode = joinCode.trim().toUpperCase();

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("id, max_players, status")
    .eq("join_code", normalizedCode)
    .single();

  if (lobbyError || !lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  if (lobby.status !== "waiting") {
    return NextResponse.json({ error: "This race has already started" }, { status: 409 });
  }

  const { count } = await supabase
    .from("lobby_members")
    .select("guest_id", { count: "exact", head: true })
    .eq("lobby_id", lobby.id);

  if (count !== null && count >= lobby.max_players) {
    return NextResponse.json({ error: "Lobby is full" }, { status: 409 });
  }

  const { error: memberError } = await supabase.from("lobby_members").upsert(
    {
      lobby_id: lobby.id,
      guest_id: guestId,
      display_name: displayName,
      is_host: false,
    },
    { onConflict: "lobby_id,guest_id" },
  );

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ joinCode: normalizedCode });
}
