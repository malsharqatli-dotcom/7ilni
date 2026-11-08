"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import ArticleView from "@/components/ArticleView";
import { supabase } from "@/lib/supabase/client";
import { getAuthHeader } from "@/lib/auth/session";

type Participant = {
  user_id: string;
  display_name: string;
  status: "racing" | "finished" | "surrendered";
  hop_count: number;
  finish_rank: number | null;
};

type RaceViewProps = {
  raceId: string;
  startTitle: string;
  destinationTitle: string;
  startedAt: string;
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

export default function RaceView({
  raceId,
  startTitle,
  destinationTitle,
  startedAt,
  initialParticipants,
}: RaceViewProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [raceStarted, setRaceStarted] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(startTitle);
  const [articleTitle, setArticleTitle] = useState(startTitle);
  const [articleHtml, setArticleHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [finishRank, setFinishRank] = useState<number | null>(null);
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

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

      setCurrentTitle(toTitle);
      if (data.finished) {
        setFinished(true);
        setFinishRank(data.finishRank);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-cream">
        <p className="font-body text-lg text-brand-navy/70">الهدف: {destinationTitle}</p>
        <span className="font-display text-9xl text-brand-orange">{countdown}</span>
      </div>
    );
  }

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-brand-cream px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-sm">
            <span className="font-display text-2xl text-brand-navy">
              {minutes}:{seconds}
            </span>
            <span className="font-body text-sm text-brand-navy/70">
              الهدف: <span className="font-bold text-brand-orange">{destinationTitle}</span>
            </span>
          </div>

          {finished && (
            <div className="mb-4 animate-bounce rounded-2xl bg-brand-orange px-5 py-4 text-center font-display text-2xl text-white shadow-md">
              🎉 وصلت! ترتيبك: {finishRank}
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
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-display text-lg text-brand-navy">الترتيب</h2>
            <div className="mt-3 flex flex-col gap-2">
              {sortParticipants(participants).map((p, i) => (
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
