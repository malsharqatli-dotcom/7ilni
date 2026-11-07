/**
 * Floating decorative shapes over the brand gradient — the "confetti"
 * pattern shared by shedhelak.com and seenjeemkw.com. Purely decorative,
 * so it's hidden from assistive tech and never blocks clicks.
 */
export default function DecorativeBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute left-[8%] top-[12%] h-3 w-3 rounded-full bg-brand-yellow/70" />
      <div className="absolute left-[18%] top-[70%] h-4 w-4 rounded-full bg-brand-cream/60" />
      <div className="absolute right-[10%] top-[20%] h-3 w-3 rounded-full bg-brand-cream/60" />
      <div className="absolute right-[20%] top-[78%] h-3 w-3 rounded-full bg-brand-yellow/70" />
      <div className="absolute left-[45%] top-[6%] h-2 w-2 rounded-full bg-brand-cream/50" />

      <svg
        className="absolute right-[6%] top-[10%] h-10 w-10 text-brand-yellow/70"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M4 16 Q8 8 12 14 T20 8" />
      </svg>
      <svg
        className="absolute left-[10%] top-[55%] h-8 w-8 rotate-12 text-brand-cream/60"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M4 16 Q8 8 12 14 T20 8" />
      </svg>

      <svg
        className="absolute right-[18%] bottom-[8%] h-12 w-12 text-brand-cream/50"
        viewBox="0 0 51 48"
        fill="currentColor"
      >
        <path d="M25.5 0 31 18.5 50.5 18.5 34.7 29.5 40.5 48 25.5 36.8 10.5 48 16.3 29.5 0.5 18.5 20 18.5Z" />
      </svg>
      <svg
        className="absolute left-[6%] bottom-[18%] h-8 w-8 text-brand-yellow/60"
        viewBox="0 0 51 48"
        fill="currentColor"
      >
        <path d="M25.5 0 31 18.5 50.5 18.5 34.7 29.5 40.5 48 25.5 36.8 10.5 48 16.3 29.5 0.5 18.5 20 18.5Z" />
      </svg>
    </div>
  );
}
