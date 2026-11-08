"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import ArticleView from "@/components/ArticleView";
import { supabase } from "@/lib/supabase/client";
import { ensureUserId, getAuthHeader } from "@/lib/auth/session";
import { getDisplayName } from "@/lib/display-name";

type DailyChallengeViewProps = {
  date: string;
  startTitle: string;
  destinationTitle: string;
};

type LeaderboardRow = {
  display_name: string;
  hop_count: number;
  time_seconds: number;
};

function formatTime(totalSeconds: number): string {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function DailyChallengeView({ date, startTitle, destinationTitle }: DailyChallengeViewProps) {
  const [phase, setPhase] = useState<"checking" | "racing" | "done">("checking");
  const [articleTitle, setArticleTitle] = useState(startTitle);
  const [articleHtml, setArticleHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [hopCount, setHopCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [myResult, setMyResult] = useState<LeaderboardRow | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const userId = await ensureUserId();
      const { data } = await supabase
        .from("daily_leaderboard")
        .select("display_name, hop_count, time_seconds")
        .eq("challenge_date", date)
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setMyResult(data);
        setPhase("done");
        loadLeaderboard();
      } else {
        setStartedAt(Date.now());
        setPhase("racing");
        fetchArticle(startTitle);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "racing") return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [phase, startedAt]);

  async function loadLeaderboard() {
    const { data } = await supabase
      .from("daily_leaderboard")
      .select("display_name, hop_count, time_seconds")
      .eq("challenge_date", date)
      .order("time_seconds", { ascending: true })
      .limit(20);
    setLeaderboard(data ?? []);
  }

  async function fetchArticle(title: string) {
    setLoading(true);
    setError("");
    window.scrollTo(0, 0);
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
    if (loading) return;
    const nextHopCount = hopCount + 1;
    setHopCount(nextHopCount);

    if (toTitle.trim().toLowerCase() === destinationTitle.trim().toLowerCase()) {
      const timeSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const result: LeaderboardRow = { display_name: getDisplayName(), hop_count: nextHopCount, time_seconds: timeSeconds };
      setMyResult(result);
      setPhase("done");
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });

      await fetch("/api/daily/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: await getAuthHeader() },
        body: JSON.stringify({ hopCount: nextHopCount, timeSeconds, displayName: getDisplayName() }),
      });
      await loadLeaderboard();
      return;
    }

    await fetchArticle(toTitle);
  }

  if (phase === "checking") {
    return (
      <div className="brand-bg flex min-h-screen items-center justify-center">
        <p className="font-body text-brand-navy/60">...جاري التحميل</p>
      </div>
    );
  }

  if (phase === "done" && myResult) {
    return (
      <div className="brand-bg min-h-screen px-4 py-8">
        <div className="mx-auto max-w-md">
          <h1 className="text-center font-display text-3xl text-brand-navy">تحدي اليوم</h1>
          <div className="btn-primary mt-4 animate-bounce rounded-2xl px-5 py-4 text-center font-display text-xl text-white shadow-md">
            🎉 خلصت! {formatTime(myResult.time_seconds)} — {myResult.hop_count} نقلة
          </div>

          <div className="brand-card mt-5 rounded-2xl bg-white p-4 shadow-md">
            <h2 className="font-display text-lg text-brand-navy">المتصدرين اليوم</h2>
            <div className="mt-3 flex flex-col gap-2">
              {leaderboard.map((row, i) => (
                <div
                  key={`${row.display_name}-${i}`}
                  className="flex items-center justify-between rounded-xl bg-brand-cream px-3 py-2 font-body text-sm text-brand-navy"
                >
                  <span>{i + 1}. {row.display_name}</span>
                  <span className="text-brand-navy/60">
                    {formatTime(row.time_seconds)} · {row.hop_count} نقلة
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-bg min-h-screen px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="brand-card flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-md">
          <span className="font-display text-2xl text-brand-navy">{formatTime(elapsed)}</span>
          <span className="font-body text-sm text-brand-navy/70">
            الهدف: <span className="font-bold text-brand-orange">{destinationTitle}</span>
          </span>
          <span className="font-body text-sm text-brand-navy/70">{hopCount} نقلة</span>
        </div>

        {error && <p className="font-body text-sm text-red-600">{error}</p>}

        <h1 className="font-display text-3xl text-brand-navy">{articleTitle}</h1>
        {loading && !articleHtml ? (
          <p className="font-body text-brand-navy/60">...جاري التحميل</p>
        ) : (
          <ArticleView html={articleHtml} onLinkClick={handleLinkClick} />
        )}
      </div>
    </div>
  );
}
