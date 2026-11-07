import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { generateJoinCode } from "@/lib/lobby/join-code";

const MAX_CODE_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { guestId, displayName } = body as { guestId?: string; displayName?: string };

  if (!guestId || !displayName) {
    return NextResponse.json({ error: "Missing guestId or displayName" }, { status: 400 });
  }

  let joinCode = "";
  let lobbyId = "";

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    joinCode = generateJoinCode();
    const { data, error } = await supabase
      .from("lobbies")
      .insert({ join_code: joinCode, host_guest_id: guestId })
      .select("id")
      .single();

    if (!error && data) {
      lobbyId = data.id;
      break;
    }
    // 23505 = unique_violation on join_code — collision, try a new code.
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (!lobbyId) {
    return NextResponse.json({ error: "Could not generate a unique join code" }, { status: 500 });
  }

  const { error: memberError } = await supabase.from("lobby_members").insert({
    lobby_id: lobbyId,
    guest_id: guestId,
    display_name: displayName,
    is_host: true,
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ joinCode });
}
