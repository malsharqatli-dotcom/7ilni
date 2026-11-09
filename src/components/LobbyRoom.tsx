"use client";

import Image from "next/image";
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
  teamName: string | null;
};

type Deck = {
  id: string;
  slug: string;
  nameAr: string;
  icon: string;
};

type LobbyRoomProps = {
  lobbyId: string;
  joinCode: string;
  maxPlayers: number;
};

type ArticleSuggestion = { title: string; difficultyTier: "easy" | "medium" | "hard" };

const DIFFICULTIES: { id: "easy" | "medium" | "hard"; label: string }[] = [
  { id: "easy", label: "سهل" },
  { id: "medium", label: "متوسط" },
  { id: "hard", label: "صعب" },
];

const DIFFICULTY_LABEL: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };

const DEFAULT_TEAMS = ["الفريق الأول", "الفريق الثاني"];
const STAGE_COUNTS = [2, 3, 4, 5];

function ArticlePicker({
  label,
  value,
  onChange,
  excludeTitle,
}: {
  label: string;
  value: string;
  onChange: (title: string) => void;
  excludeTitle: string;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [rolling, setRolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search-as-you-type against the scored article pool — this
  // effect reacts to the query changing, not to something derivable at
  // render time, so it genuinely needs the async round trip here.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/articles/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data.results ?? []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  // Closes on any tap/click outside the picker. Deliberately not an
  // onBlur on the input: on touch devices, tapping a suggestion blurs
  // the input (and would close the list) before the tap finishes
  // registering as a click, so the suggestion's own onClick never fires —
  // the dropdown silently does nothing on mobile. A document-level
  // listener sidesteps that race entirely.
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const visibleSuggestions = query.trim().length < 2 ? [] : suggestions;

  function pickSuggestion(title: string) {
    setQuery(title);
    onChange(title);
    setOpen(false);
  }

  async function handleRoll() {
    setRolling(true);
    try {
      const res = await fetch(`/api/articles/random?exclude=${encodeURIComponent(excludeTitle)}`);
      const data = await res.json();
      if (res.ok) pickSuggestion(data.title);
    } finally {
      setRolling(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <label className="font-body text-xs font-semibold text-brand-navy/60">{label}</label>
      <div className="mt-1 flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="اكتب اسم مقالة..."
          className="w-full rounded-xl bg-brand-cream px-3 py-2 font-body text-sm text-brand-navy outline-none focus:ring-2 focus:ring-brand-orange"
        />
        <button
          type="button"
          onClick={handleRoll}
          disabled={rolling}
          title="اختيار عشوائي"
          className="shrink-0 rounded-xl bg-brand-navy px-3 py-2 text-lg disabled:opacity-60"
        >
          🎲
        </button>
      </div>
      {open && visibleSuggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg">
          {visibleSuggestions.map((s) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => pickSuggestion(s.title)}
                className="flex w-full items-center justify-between px-3 py-2 text-start font-body text-sm text-brand-navy hover:bg-brand-cream"
              >
                <span>{s.title}</span>
                <span className="text-xs text-brand-navy/50">{DIFFICULTY_LABEL[s.difficultyTier]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LobbyRoom({ lobbyId, joinCode, maxPlayers }: LobbyRoomProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [mode, setMode] = useState<"ffa" | "teams">("ffa");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [deckId, setDeckId] = useState<string | null>(null);
  const [stageCount, setStageCount] = useState(3);
  const [pairingMode, setPairingMode] = useState<"random" | "manual">("random");
  const [manualStart, setManualStart] = useState("");
  const [manualDestination, setManualDestination] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [teamNames, setTeamNames] = useState<string[]>(DEFAULT_TEAMS);
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const selfRef = useRef<Member | null>(null);

  const self = members.find((m) => m.userId === userId) ?? null;
  const isHost = self?.isHost ?? false;

  useEffect(() => {
    selfRef.current = self;
  }, [self]);

  useEffect(() => {
    ensureUserId().then(setUserId);
  }, []);

  useEffect(() => {
    supabase
      .from("category_decks")
      .select("id, slug, name_ar, icon")
      .eq("is_active", true)
      .then(({ data }) => {
        setDecks((data ?? []).map((d) => ({ id: d.id, slug: d.slug, nameAr: d.name_ar, icon: d.icon })));
      });
  }, []);

  const joinRaceAsParticipant = useCallback(
    async (raceId: string, startTitle: string, teamName: string | null) => {
      if (!userId) return;
      await supabase.from("race_participants").insert({
        race_id: raceId,
        user_id: userId,
        display_name: getDisplayName(),
        current_title: startTitle,
        team_name: teamName,
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
          .map((m) => ({ userId: m.userId, displayName: m.displayName, isHost: m.isHost, teamName: m.teamName ?? null }));
        setMembers(list);
      })
      .on("broadcast", { event: "race_start" }, ({ payload }) => {
        // selfRef, not the `self` captured when this effect first ran —
        // the channel subscribes once, but the player's team pick can
        // change after that, so the closure here must read the latest.
        joinRaceAsParticipant(payload.raceId, payload.startTitle, selfRef.current?.teamName ?? null);
      })
      .on("broadcast", { event: "team_renamed" }, ({ payload }) => {
        const { oldName, newName } = payload as { oldName: string; newName: string };
        setTeamNames((prev) => prev.map((name) => (name === oldName ? newName : name)));
        // Team membership lives in presence, which each client owns and
        // tracks for itself — a teammate's rename only reaches my on-screen
        // name tag once I re-track with it, same as picking a team at all.
        if (selfRef.current?.teamName === oldName) {
          channel.track({ ...selfRef.current, teamName: newName });
        }
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;

        // is_host lives in Postgres (set at creation time), not presence —
        // resolve it before the single track() call below, rather than
        // tracking twice, which raced the channel's subscribe handshake.
        const { data } = await supabase
          .from("lobby_members")
          .select("is_host, team_name")
          .eq("lobby_id", lobbyId)
          .eq("user_id", userId)
          .single();

        await channel.track({
          userId,
          displayName: getDisplayName(),
          isHost: data?.is_host ?? false,
          teamName: data?.team_name ?? null,
        });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, userId, joinRaceAsParticipant]);

  async function handlePickTeam(teamName: string) {
    if (!userId) return;
    await supabase.from("lobby_members").update({ team_name: teamName }).eq("lobby_id", lobbyId).eq("user_id", userId);
    await channelRef.current?.track({
      userId,
      displayName: getDisplayName(),
      isHost,
      teamName,
    });
  }

  function startRenamingTeam(index: number) {
    setEditingTeamIndex(index);
    setTeamNameDraft(teamNames[index]);
  }

  async function handleRenameTeam(index: number) {
    const oldName = teamNames[index];
    const newName = teamNameDraft.trim();
    setEditingTeamIndex(null);
    if (!newName || newName === oldName) return;

    // lobby_members' RLS only allows updating your own row, but renaming a
    // team means updating every teammate's row — same reason the race-time
    // team RPCs exist (see 0007_team_advance_functions.sql).
    const { error: renameError } = await supabase.rpc("rename_lobby_team", {
      p_lobby_id: lobbyId,
      p_old_name: oldName,
      p_new_name: newName,
    });
    if (renameError) {
      setError(renameError.message);
      return;
    }

    setTeamNames((prev) => prev.map((name, i) => (i === index ? newName : name)));
    if (self?.teamName === oldName) {
      await channelRef.current?.track({ userId, displayName: getDisplayName(), isHost, teamName: newName });
    }
    await channelRef.current?.send({
      type: "broadcast",
      event: "team_renamed",
      payload: { oldName, newName },
    });
  }

  async function handleStart() {
    setError("");
    setStarting(true);
    try {
      const manual = pairingMode === "manual" && mode === "ffa";
      const res = await fetch("/api/race/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: await getAuthHeader() },
        body: JSON.stringify({
          lobbyId,
          mode,
          difficulty,
          deckId,
          stageCount,
          ...(manual ? { manualStart, manualDestination } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start race");

      await channelRef.current?.send({
        type: "broadcast",
        event: "race_start",
        payload: { raceId: data.raceId, startTitle: data.startTitle },
      });
      await joinRaceAsParticipant(data.raceId, data.startTitle, self?.teamName ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start race");
      setStarting(false);
    }
  }

  const manualValid =
    manualStart.trim().length > 0 &&
    manualDestination.trim().length > 0 &&
    manualStart.trim().toLowerCase() !== manualDestination.trim().toLowerCase();
  const canStart =
    mode === "teams" ? members.every((m) => !!m.teamName) : pairingMode === "random" || manualValid;

  return (
    <div className="brand-bg flex min-h-screen flex-1 flex-col items-center px-4 py-8">
      <div className="flex w-full max-w-md flex-col gap-5">
        <Image src="/logo.png" alt="حلّني" width={1536} height={1024} className="h-auto w-32 max-w-full self-center" />

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

        <div className="brand-card rounded-3xl bg-white p-5 shadow-md">
          <h2 className="font-display text-lg text-brand-navy">طريقة اللعب</h2>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("ffa")}
              className={`flex-1 rounded-xl py-2 font-display text-base transition ${
                mode === "ffa" ? "bg-brand-orange text-white shadow-md" : "bg-brand-cream text-brand-navy/70"
              }`}
            >
              فردي (الكل ضد الكل)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("teams");
                setPairingMode("random");
              }}
              className={`flex-1 rounded-xl py-2 font-display text-base transition ${
                mode === "teams" ? "bg-brand-orange text-white shadow-md" : "bg-brand-cream text-brand-navy/70"
              }`}
            >
              فرق
            </button>
          </div>

          {mode === "teams" && (
            <>
              <h2 className="mt-5 font-display text-lg text-brand-navy">فريقك</h2>
              <div className="mt-2 flex flex-col gap-2">
                {teamNames.map((team, i) => (
                  <div key={i} className="flex gap-2">
                    {editingTeamIndex === i ? (
                      <>
                        <input
                          type="text"
                          value={teamNameDraft}
                          onChange={(e) => setTeamNameDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRenameTeam(i)}
                          autoFocus
                          maxLength={24}
                          className="flex-1 rounded-xl bg-brand-cream px-3 py-2 font-body text-sm text-brand-navy outline-none focus:ring-2 focus:ring-brand-orange"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameTeam(i)}
                          className="shrink-0 rounded-xl bg-brand-orange px-4 py-2 font-body text-sm font-semibold text-white"
                        >
                          حفظ
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePickTeam(team)}
                          className={`flex-1 rounded-xl py-2 font-body text-sm font-semibold transition ${
                            self?.teamName === team ? "bg-brand-navy text-white shadow-md" : "bg-brand-cream text-brand-navy/70"
                          }`}
                        >
                          {team}
                        </button>
                        <button
                          type="button"
                          onClick={() => startRenamingTeam(i)}
                          title="غيّر اسم الفريق"
                          className="shrink-0 rounded-xl bg-brand-cream px-3 py-2 text-base"
                        >
                          ✏️
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <h2 className="mt-5 font-display text-lg text-brand-navy">كم مرحلة؟</h2>
              <div className="mt-2 flex gap-2">
                {STAGE_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setStageCount(count)}
                    className={`flex-1 rounded-xl py-2 font-display text-base transition ${
                      stageCount === count ? "bg-brand-orange text-white shadow-md" : "bg-brand-cream text-brand-navy/70"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "ffa" && (
            <>
              <h2 className="mt-5 font-display text-lg text-brand-navy">البداية والنهاية</h2>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPairingMode("random")}
                  className={`flex-1 rounded-xl py-2 font-display text-base transition ${
                    pairingMode === "random" ? "bg-brand-orange text-white shadow-md" : "bg-brand-cream text-brand-navy/70"
                  }`}
                >
                  عشوائي
                </button>
                <button
                  type="button"
                  onClick={() => setPairingMode("manual")}
                  className={`flex-1 rounded-xl py-2 font-display text-base transition ${
                    pairingMode === "manual" ? "bg-brand-orange text-white shadow-md" : "bg-brand-cream text-brand-navy/70"
                  }`}
                >
                  اختَرها بنفسك
                </button>
              </div>
            </>
          )}

          {mode === "ffa" && pairingMode === "manual" ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-2">
              <ArticlePicker
                label="من"
                value={manualStart}
                onChange={setManualStart}
                excludeTitle={manualDestination}
              />
              <ArticlePicker
                label="إلى"
                value={manualDestination}
                onChange={setManualDestination}
                excludeTitle={manualStart}
              />
            </div>
          ) : (
            <>
              <h2 className="mt-5 font-display text-lg text-brand-navy">مستوى الصعوبة</h2>
              <div className="mt-2 flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    className={`flex-1 rounded-xl py-2 font-display text-base transition ${
                      difficulty === d.id
                        ? "bg-brand-orange text-white shadow-md"
                        : "bg-brand-cream text-brand-navy/70"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <h2 className="mt-5 font-display text-lg text-brand-navy">فئة المقالات</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {decks.map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => setDeckId(deckId === deck.id ? null : deck.id)}
                    className={`rounded-full px-3 py-1.5 font-body text-sm font-semibold transition ${
                      deckId === deck.id
                        ? "bg-brand-navy text-white shadow-md"
                        : "bg-brand-cream text-brand-navy/70"
                    }`}
                  >
                    {deck.icon} {deck.nameAr}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="brand-card rounded-3xl bg-white p-5 shadow-md">
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
                {mode === "teams" && m.teamName && (
                  <span className="text-white/60">· {m.teamName}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {isHost ? (
          <>
            <button
              type="button"
              onClick={handleStart}
              disabled={starting || !canStart}
              className="btn-primary w-full rounded-2xl py-4 font-display text-2xl text-white shadow-xl transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {starting ? "..." : `ابدأ السباق (${members.length}/${maxPlayers})`}
            </button>
            {!canStart && (
              <p className="text-center font-body text-sm text-brand-navy/60">
                {mode === "teams"
                  ? "لازم كل اللاعبين يختاروا فريق قبل البدء"
                  : "لازم تختار مقالة البداية والنهاية (ومختلفتين عن بعض)"}
              </p>
            )}
          </>
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
