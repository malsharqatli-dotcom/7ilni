/**
 * Decorative backdrop for 7ilni: a dotted "race route" tracing a path
 * across the screen with start/finish pins, plus a scatter of small
 * sparkle-stars in the upper "night sky" part of the gradient. Replaces
 * the generic floating-confetti pattern (shedhelak.com/seenjeemkw.com use
 * plain dots, swirls and 5-point stars) with a motif tied to what 7ilni
 * actually is: a race from point A to point B. Purely decorative, so it's
 * hidden from assistive tech and never blocks clicks.
 */
export default function DecorativeBackground() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* dotted race route from start pin to finish pin */}
      <path
        d="M60 120 C 140 220, 90 340, 190 400 S 300 560, 330 660"
        fill="none"
        stroke="var(--brand-sand)"
        strokeOpacity="0.4"
        strokeWidth="4"
        strokeDasharray="2 14"
        strokeLinecap="round"
      />

      {/* start pin */}
      <path
        d="M60 95 C 72 95 72 112 60 128 C 48 112 48 95 60 95 Z"
        fill="var(--brand-gold)"
        opacity="0.5"
      />
      <circle cx="60" cy="106" r="4" fill="var(--brand-indigo)" opacity="0.5" />

      {/* finish pin */}
      <path
        d="M330 635 C 342 635 342 652 330 668 C 318 652 318 635 330 635 Z"
        fill="var(--brand-sand)"
        opacity="0.55"
      />
      <circle cx="330" cy="646" r="4" fill="var(--brand-coral)" opacity="0.55" />

      {/* night-sky sparkles, upper half of the gradient */}
      <g fill="var(--brand-sand)">
        <text x="40" y="60" fontSize="20" opacity="0.5">✦</text>
        <text x="320" y="90" fontSize="14" opacity="0.4">✦</text>
        <text x="250" y="45" fontSize="10" opacity="0.5">✦</text>
        <text x="150" y="110" fontSize="12" opacity="0.35">✦</text>
        <text x="360" y="200" fontSize="16" opacity="0.4">✦</text>
        <text x="20" y="230" fontSize="10" opacity="0.4">✦</text>
      </g>

      {/* a couple of faint sparkles lower down in the coral zone */}
      <g fill="var(--brand-gold)">
        <text x="340" y="520" fontSize="14" opacity="0.3">✦</text>
        <text x="30" y="600" fontSize="10" opacity="0.3">✦</text>
      </g>
    </svg>
  );
}
