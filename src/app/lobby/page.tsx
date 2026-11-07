import DecorativeBackground from "@/components/DecorativeBackground";

const DIFFICULTIES = [
  { id: "easy", label: "سهل" },
  { id: "medium", label: "متوسط" },
  { id: "hard", label: "صعب" },
];

const DECKS = [
  { id: "sports", label: "رياضة", emoji: "⚽" },
  { id: "history", label: "تاريخ", emoji: "🏛️" },
  { id: "geography", label: "جغرافيا", emoji: "🌍" },
  { id: "celebs", label: "مشاهير", emoji: "🌟" },
  { id: "random", label: "عشوائي", emoji: "🎲" },
];

const PLAYERS = [
  { name: "نمر_السريع", isHost: true },
  { name: "صقر_الصحراء", isHost: false },
  { name: "فراشة_ذكية", isHost: false },
];

export default function LobbyPage() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-brand-indigo to-brand-coral px-4 py-8">
      <DecorativeBackground />

      <div className="relative z-10 flex w-full max-w-md flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body text-xs font-semibold text-white/80">
              كود الغرفة
            </p>
            <p className="font-display text-3xl tracking-widest text-white">
              A7X3K
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand-sand/95 px-4 py-2 font-display text-base text-brand-ink shadow-md"
          >
            ادعُ أصحابك
          </button>
        </div>

        <div className="rounded-3xl bg-brand-sand/95 p-5 shadow-xl backdrop-blur">
          <h2 className="font-display text-lg text-brand-ink">
            مستوى الصعوبة
          </h2>
          <div className="mt-2 flex gap-2">
            {DIFFICULTIES.map((d, i) => (
              <button
                key={d.id}
                type="button"
                className={`flex-1 rounded-xl py-2 font-display text-base transition ${
                  i === 1
                    ? "bg-brand-coral text-white shadow-md"
                    : "bg-white/60 text-brand-ink/70"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <h2 className="mt-5 font-display text-lg text-brand-ink">
            فئة المقالات
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {DECKS.map((deck, i) => (
              <button
                key={deck.id}
                type="button"
                className={`rounded-full px-3 py-1.5 font-body text-sm font-semibold transition ${
                  i === 0
                    ? "bg-brand-ink text-white shadow-md"
                    : "bg-white/60 text-brand-ink/70"
                }`}
              >
                {deck.emoji} {deck.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-brand-sand/95 p-5 shadow-xl backdrop-blur">
          <h2 className="font-display text-lg text-brand-ink">اللاعبين</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PLAYERS.map((p) => (
              <span
                key={p.name}
                className="flex items-center gap-1.5 rounded-full bg-brand-ink px-3 py-1.5 font-body text-sm font-semibold text-white"
              >
                {p.isHost && <span>👑</span>}
                {p.name}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="w-full rounded-2xl bg-brand-coral py-4 font-display text-2xl text-white shadow-xl transition hover:brightness-110 active:scale-[0.99]"
        >
          ابدأ السباق (3/8)
        </button>
      </div>
    </div>
  );
}
