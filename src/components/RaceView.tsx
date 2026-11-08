"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import ArticleView from "@/components/ArticleView";
import { supabase } from "@/lib/supabase/client";
import { ensureUserId, getAuthHeader } from "@/lib/auth/session";

const RETURN_TO_LOBBY_DELAY_MS = 5000;

type Participant = {
  user_id: string;
  display_name: string;
  status: "racing" | "finished" | "surrendered";
  hop_count: number;
  finish_rank: number | null;
  team_name: string | null;
  current_stage_index: number;
  current_title: string;
};

type StagePair = { start: string; destination: string };

type RaceViewProps = {
  raceId: string;
  joinCode: string | null;
  startTitle: string;
  destinationTitle: string;
  startedAt: string;
  stagePairs: StagePair[] | null;
  initialParticipants: Participant[];
};

function sortParticipants(list: Participant[]): Participant[] {
  return [...list].sort((a, b) => {
    if (a.status === "finished" && b.status === "finished") {
      return (a.finish_rank ?? 0) - (b.finish_rank ?? 0);
    }
    if (a.status === "finished") return -1;
    if (b.status === "finished") return 1;
    return a.hop_count - b.hop_count;
  });
}

function summarizeTeams(list: Participant[]) {
  const teams = new Map<string, { teamName: string; stageIndex: number; finished: boolean; finishRank: number | null; members: Participant[] }>();
  for (const p of list) {
    if (!p.team_name) continue;
    const entry = teams.get(p.team_name) ?? {
      teamName: p.team_name,
      stageIndex: p.current_stage_index,
      finished: false,
      finishRank: null,
      members: [],
    };
    entry.members.push(p);
    entry.stageIndex = Math.max(entry.stageIndex, p.current_stage_index);
    if (p.status === "finished") {
      entry.finished = true;
      entry.finishRank = p.finish_rank;
    }
    teams.set(p.team_name, entry);
  }
  return [...teams.values()].sort((a, b) => {
    if (a.finished && b.finished) return (a.finishRank ?? 0) - (b.finishRank ?? 0);
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.stageIndex - a.stageIndex;
  });
}

export default function RaceView({
  raceId,
  joinCode,
  startTitle,
  destinationTitle,
  startedAt,
  stagePairs,
  initialParticipants,
}: RaceViewProps) {
  const router = useRouter();
  const isTeamsMode = !!stagePairs;
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [raceStarted, setRaceStarted] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(startTitle);
  const [articleTitle, setArticleTitle] = useState(startTitle);
  const [articleHtml, setArticleHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [localFinished, setLocalFinished] = useState(false);
  const [localFinishRank, setLocalFinishRank] = useState<number | null>(null);
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const confettiFiredRef = useRef(false);
  const lastSyncedStageRef = useRef(0);

  // In teams mode, my own progress is whatever the DB says for my row —
  // it can change because of my own hop OR a teammate finishing a stage,
  // so it's derived from the realtime-synced participants list rather
  // than mirrored into separate local state. localFinished/localFinishRank
  // give instant feedback for the hop that caused it (own click, either
  // mode), ahead of the realtime echo confirming the same thing.
  const myParticipant = isTeamsMode ? participants.find((p) => p.user_id === myUserId) ?? null : null;
  const myStageIndex = myParticipant?.current_stage_index ?? 0;
  const teamFinished = isTeamsMode && myParticipant?.status === "finished";
  const finished = localFinished || teamFinished;
  const finishRank = localFinishRank ?? (teamFinished ? myParticipant!.finish_rank : null);

  const currentDestination = isTeamsMode ? stagePairs![myStageIndex].destination : destinationTitle;

  // The moment anyone (or any team) is confirmed rank 1, the race is
  // decided — every connected client sees this via the same realtime
  // participants subscription everything else here already relies on.
  const teams = isTeamsMode ? summarizeTeams(participants) : [];
  const winnerName = isTeamsMode
    ? teams.find((t) => t.finished && t.finishRank === 1)?.teamName ?? null
    : participants.find((p) => p.status === "finished" && p.finish_rank === 1)?.display_name ?? null;
  const raceOver = winnerName !== null;

  useEffect(() => {
    ensureUserId().then(setMyUserId);
  }, []);

  // started_at is a few seconds in the future (set by /api/race/start) so
  // every player's countdown is synced off the same timestamp, instead of
  // each client just running its own independent "wait 3 seconds" timer.
  useEffect(() => {
    const target = new Date(startedAt).getTime();

    function tick() {
      const remaining = target - Date.now();
      if (remaining <= 0) {
        setCountdown(null);
        setRaceStarted(true);
        return false;
      }
      setCountdown(Math.ceil(remaining / 1000));
      return true;
    }

    if (!tick()) return;
    const interval = setInterval(() => {
      if (!tick()) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    if (!raceStarted) return;
    fetchArticle(startTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceStarted]);

  useEffect(() => {
    if (!raceStarted) return;
    const started = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [raceStarted, startedAt]);

  useEffect(() => {
    const channel = supabase
      .channel(`race:${raceId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "race_participants", filter: `race_id=eq.${raceId}` },
        (payload) => {
          const updated = payload.new as Participant;
          setParticipants((prev) =>
            prev.map((p) => (p.user_id === updated.user_id ? { ...p, ...updated } : p)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raceId]);

  // Fires once per race regardless of mode or who triggered the finish —
  // in teams mode this also covers a teammate finishing the last stage
  // (their RPC call bumps my row's status, `finished` flips, this runs).
  useEffect(() => {
    if (!finished || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
  }, [finished]);

  // Teams mode: a teammate finishing the current stage bumps everyone's
  // row server-side (see advance_team_stage RPC) — this effect is what
  // makes MY view follow along when I wasn't the one who triggered it.
  useEffect(() => {
    if (!isTeamsMode || finished) return;
    if (myStageIndex > lastSyncedStageRef.current) {
      lastSyncedStageRef.current = myStageIndex;
      const nextStart = stagePairs![myStageIndex].start;
      setCurrentTitle(nextStart);
      fetchArticle(nextStart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeamsMode, myStageIndex, finished]);

  // Once a winner is decided, the race is over for everyone — send every
  // connected client (winner included) back to the lobby after a short
  // pause so the announcement has time to register.
  useEffect(() => {
    if (!raceOver || !joinCode) return;
    const timeout = setTimeout(() => router.push(`/lobby/${joinCode}`), RETURN_TO_LOBBY_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [raceOver, joinCode, router]);

  async function fetchArticle(title: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/wiki/article?title=${encodeURIComponent(title)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load article");
      setArticleTitle(data.title);
      setArticleHtml(data.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load article");
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkClick(toTitle: string) {
    if (loading || finished) return;

    const fromTitle = currentTitle;
    setLoading(true);
    try {
      const res = await fetch("/api/race/hop", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: await getAuthHeader() },
        body: JSON.stringify({ raceId, fromTitle, toTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to record hop");

      if (data.stageAdvanced) {
        lastSyncedStageRef.current = data.nextStageIndex;
        setCurrentTitle(data.nextStageStart);
        await fetchArticle(data.nextStageStart);
        return;
      }

      setCurrentTitle(toTitle);
      if (data.finished) {
        setLocalFinished(true);
        setLocalFinishRank(data.finishRank);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record hop");
      setLoading(false);
      return;
    }

    await fetchArticle(toTitle);
  }

  if (countdown !== null) {
    return (
      <div className="brand-bg flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="font-body text-lg text-brand-navy/70">الهدف: {currentDestination}</p>
        <span className="font-display text-9xl text-brand-orange">{countdown}</span>
      </div>
    );
  }

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="brand-bg min-h-screen px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="brand-card mb-4 flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-md">
            <span className="font-display text-2xl text-brand-navy">
              {minutes}:{seconds}
            </span>
            {isTeamsMode && (
              <span className="font-body text-sm text-brand-navy/70">
                المرحلة {myStageIndex + 1}/{stagePairs!.length}
              </span>
            )}
            <span className="font-body text-sm text-brand-navy/70">
              الهدف: <span className="font-bold text-brand-orange">{currentDestination}</span>
            </span>
          </div>

          {finished && (
            <div className="btn-primary mb-4 animate-bounce rounded-2xl px-5 py-4 text-center font-display text-2xl text-white shadow-md">
              🎉 {isTeamsMode ? `فريقك وصل! الترتيب: ${finishRank}` : `وصلت! ترتيبك: ${finishRank}`}
              {raceOver && (
                <p className="mt-1 font-body text-sm font-normal opacity-90">جاري الرجوع للغرفة...</p>
              )}
            </div>
          )}

          {raceOver && !finished && (
            <div className="mb-4 rounded-2xl bg-brand-navy px-5 py-4 text-center font-display text-2xl text-white shadow-md">
              🏆 فاز {winnerName}!
              <p className="mt-1 font-body text-sm font-normal opacity-90">جاري الرجوع للغرفة...</p>
            </div>
          )}

          {error && <p className="mb-3 font-body text-sm text-red-600">{error}</p>}

          <h1 className="mb-3 font-display text-3xl text-brand-navy">{articleTitle}</h1>
          {loading && !articleHtml ? (
            <p className="font-body text-brand-navy/60">...جاري التحميل</p>
          ) : (
            <ArticleView html={articleHtml} onLinkClick={handleLinkClick} />
          )}
        </div>

        <div className="w-full shrink-0 lg:w-64">
          <div className="brand-card rounded-2xl bg-white p-4 shadow-md">
            <h2 className="font-display text-lg text-brand-navy">الترتيب</h2>
            <div className="mt-3 flex flex-col gap-2">
              {isTeamsMode
                ? teams.map((t, i) => (
                    <div
                      key={t.teamName}
                      className="flex items-center justify-between rounded-xl bg-brand-cream px-3 py-2 font-body text-sm text-brand-navy"
                    >
                      <span className="flex items-center gap-1.5">
                        {t.finished ? "🏁" : `${i + 1}.`} {t.teamName}
                      </span>
                      <span className="text-brand-navy/60">
                        {t.finished ? `#${t.finishRank}` : `مرحلة ${t.stageIndex + 1}/${stagePairs!.length}`}
                      </span>
                    </div>
                  ))
                : sortParticipants(participants).map((p, i) => (
                    <div
                      key={p.user_id}
                      className="flex items-center justify-between rounded-xl bg-brand-cream px-3 py-2 font-body text-sm text-brand-navy"
                    >
                      <span className="flex items-center gap-1.5">
                        {p.status === "finished" ? "🏁" : `${i + 1}.`} {p.display_name}
                      </span>
                      <span className="text-brand-navy/60">{p.hop_count} نقلة</span>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
