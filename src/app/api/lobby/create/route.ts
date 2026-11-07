import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/lobby/join-code";

const MAX_CODE_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const supabase = createAuthedClient(request.headers.get("authorization"));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { displayName } = (await request.json()) as { displayName?: string };
  if (!displayName) {
    return NextResponse.json({ error: "Missing displayName" }, { status: 400 });
  }

  let joinCode = "";
  let lobbyId = "";

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    joinCode = generateJoinCode();
    const { data, error } = await supabase
      .from("lobbies")
      .insert({ join_code: joinCode, host_user_id: user.id })
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
    user_id: user.id,
    display_name: displayName,
    is_host: true,
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ joinCode });
}
