import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createAuthedClient(request.headers.get("authorization"));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { joinCode, displayName } = (await request.json()) as {
    joinCode?: string;
    displayName?: string;
  };

  if (!joinCode || !displayName) {
    return NextResponse.json({ error: "Missing joinCode or displayName" }, { status: 400 });
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
    .select("user_id", { count: "exact", head: true })
    .eq("lobby_id", lobby.id);

  if (count !== null && count >= lobby.max_players) {
    return NextResponse.json({ error: "Lobby is full" }, { status: 409 });
  }

  const { error: memberError } = await supabase.from("lobby_members").upsert(
    {
      lobby_id: lobby.id,
      user_id: user.id,
      display_name: displayName,
      is_host: false,
    },
    { onConflict: "lobby_id,user_id" },
  );

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ joinCode: normalizedCode });
}
