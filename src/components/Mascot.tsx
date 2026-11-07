type MascotProps = {
  className?: string;
};

/**
 * 7ilni mark: a hand flicking the star forward, mid-throw. Speed (the
 * flick, the motion trail) plus the star we already seeded into the
 * dotted-route/sparkle details elsewhere, instead of discarding that
 * identity for a generic hand icon. Earlier versions were a star with
 * stick limbs (read as clip art) and then a static medal badge (too
 * static for a game about quick decisions) — this version centers the
 * gesture of flicking something fast toward a target.
 */
export default function Mascot({ className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="شعار حلّني"
    >
      {/* spin arc behind the flying star */}
      <path
        d="M118 38 A 40 40 0 1 1 108 92"
        fill="none"
        stroke="var(--brand-gold)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 10"
        opacity="0.7"
      />

      {/* motion trail from the flick to the star */}
      <g stroke="var(--brand-gold)" strokeWidth="6" strokeLinecap="round" opacity="0.7">
        <path d="M88 118 L115 88" />
        <path d="M78 128 L108 95" />
        <path d="M98 108 L120 82" />
      </g>

      {/* hand, mid-flick */}
      <g transform="translate(60 150) rotate(-15)">
        <ellipse
          cx="0"
          cy="0"
          rx="32"
          ry="28"
          fill="var(--brand-sand)"
          stroke="var(--brand-ink)"
          strokeWidth="7"
        />
        {/* thumb */}
        <path
          d="M-13.8 1.5 L-39.2 23.1 L-48.8 13 L-26.2 -11.5 Z"
          fill="var(--brand-sand)"
          stroke="var(--brand-ink)"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <circle cx="-44" cy="18" r="7" fill="var(--brand-sand)" stroke="var(--brand-ink)" strokeWidth="6" />
        {/* index finger, mid-flick */}
        <path
          d="M9.8 -25.3 L64.5 -60.9 L71.5 -51.1 L20.3 -10.7 Z"
          fill="var(--brand-sand)"
          stroke="var(--brand-ink)"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <circle cx="68" cy="-56" r="6" fill="var(--brand-sand)" stroke="var(--brand-ink)" strokeWidth="6" />
      </g>

      {/* small flying star */}
      <path
        d="M150 30 L159.4 52 L183.3 54.2 L165.2 70 L170.6 93.3 L150 81 L129.4 93.3 L134.8 70 L116.7 54.2 L140.6 52 Z"
        fill="var(--brand-coral)"
        stroke="var(--brand-ink)"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
