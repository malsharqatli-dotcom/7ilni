import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LobbyRoom from "@/components/LobbyRoom";

export default async function LobbyPage(props: PageProps<"/lobby/[code]">) {
  const { code } = await props.params;
  const joinCode = decodeURIComponent(code).toUpperCase();

  const { data: lobby, error } = await supabase
    .from("lobbies")
    .select("id, join_code, status, max_players")
    .eq("join_code", joinCode)
    .single();

  if (error || !lobby) notFound();

  return (
    <LobbyRoom
      lobbyId={lobby.id}
      joinCode={lobby.join_code}
      maxPlayers={lobby.max_players}
    />
  );
}
