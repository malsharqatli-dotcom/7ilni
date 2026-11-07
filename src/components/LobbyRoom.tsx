"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { ensureUserId, getAuthHeader } from "@/lib/auth/session";
import { getDisplayName } from "@/lib/display-name";

type Member = {
  userId: string;
  displayName: string;
  isHost: boolean;
};

type LobbyRoomProps = {
  lobbyId: string;
  joinCode: string;
  maxPlayers: number;
};

// Hardcoded for M3/M4 — difficulty tiers and category decks (M5) will
// replace this with a real pick instead of one fixed pair.
const RACE_START_TITLE = "Jordan";
const RACE_DESTINATION_TITLE = "Albert Einstein";

export default function LobbyRoom({ lobbyId, joinCode, maxPlayers }: LobbyRoomProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);

  const self = members.find((m) => m.userId === userId);
  const isHost = self?.isHost ?? false;

  useEffect(() => {
    ensureUserId().then(setUserId);
  }, []);

  const joinRaceAsParticipant = useCallback(
    async (raceId: string, startTitle: string) => {
      if (!userId) return;
      await supabase.from("race_participants").insert({
        race_id: raceId,
        user_id: userId,
        display_name: getDisplayName(),
        current_title: startTitle,
      });
      router.push(`/race/${raceId}`);
    },
    [userId, router],
  );

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`lobby:${lobbyId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Member>();
        const list = Object.values(state)
          .flat()
          .map((m) => ({ userId: m.userId, displayName: m.displayName, isHost: m.isHost }));
        setMembers(list);
      })
      .on("broadcast", { event: "race_start" }, ({ payload }) => {
        joinRaceAsParticipant(payload.raceId, payload.startTitle);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;

        // is_host lives in Postgres (set at creation time), not presence —
        // resolve it before the single track() call below, rather than
        // tracking twice, which raced the channel's subscribe handshake.
        const { data } = await supabase
          .from("lobby_members")
          .select("is_host")
          .eq("lobby_id", lobbyId)
          .eq("user_id", userId)
          .single();

        await channel.track({
          userId,
          displayName: getDisplayName(),
          isHost: data?.is_host ?? false,
        });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, userId, joinRaceAsParticipant]);

  async function handleStart() {
    setError("");
    setStarting(true);
    try {
      const res = await fetch("/api/race/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: await getAuthHeader() },
        body: JSON.stringify({
          lobbyId,
          startTitle: RACE_START_TITLE,
          destinationTitle: RACE_DESTINATION_TITLE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start race");

      await channelRef.current?.send({
        type: "broadcast",
        event: "race_start",
        payload: { raceId: data.raceId, startTitle: RACE_START_TITLE },
      });
      await joinRaceAsParticipant(data.raceId, RACE_START_TITLE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start race");
      setStarting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center bg-brand-cream px-4 py-8">
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body text-xs font-semibold text-brand-navy/60">كود الغرفة</p>
            <p className="font-display text-3xl tracking-widest text-brand-navy">{joinCode}</p>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(joinCode)}
            className="rounded-xl bg-white px-4 py-2 font-display text-base text-brand-navy shadow-sm"
          >
            ادعُ أصحابك
          </button>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg text-brand-navy">اللاعبين</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {members.length === 0 && (
              <p className="font-body text-sm text-brand-navy/50">بانتظار اللاعبين...</p>
            )}
            {members.map((m) => (
              <span
                key={m.userId}
                className="flex items-center gap-1.5 rounded-full bg-brand-navy px-3 py-1.5 font-body text-sm font-semibold text-white"
              >
                {m.isHost && <span>👑</span>}
                {m.displayName}
              </span>
            ))}
          </div>
        </div>

        {isHost ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="w-full rounded-2xl bg-brand-orange py-4 font-display text-2xl text-white shadow-xl transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          >
            {starting ? "..." : `ابدأ السباق (${members.length}/${maxPlayers})`}
          </button>
        ) : (
          <p className="text-center font-body text-sm text-brand-navy/60">
            بانتظار المضيف يبدأ السباق...
          </p>
        )}

        {error && <p className="text-center font-body text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
