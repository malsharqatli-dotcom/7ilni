type MascotProps = {
  className?: string;
};

/**
 * Placeholder mascot for 7ilni: a running star character (ties to the
 * seven-pointed star on the Jordanian flag) wearing a gold/sand keffiyeh.
 * Stand-in for real illustration work in M7 — validates the "playful
 * mascot" visual direction without copying shedhelak.com/seenjeemkw.com's
 * brain-character design or their orange/red gameshow coloring.
 */
export default function Mascot({ className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      role="img"
      aria-label="شخصية حلّني"
    >
      {/* motion lines */}
      <g stroke="var(--brand-gold)" strokeWidth="6" strokeLinecap="round" opacity="0.6">
        <path d="M18 120 L48 112" />
        <path d="M10 140 L44 134" />
        <path d="M18 160 L48 156" />
      </g>

      {/* back leg */}
      <path
        d="M118 150 L140 205 L158 205"
        fill="none"
        stroke="var(--brand-ink)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* front leg */}
      <path
        d="M90 150 L78 200 L58 210"
        fill="none"
        stroke="var(--brand-ink)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* back arm */}
      <path
        d="M128 110 L158 95"
        fill="none"
        stroke="var(--brand-ink)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* front arm */}
      <path
        d="M78 112 L48 128"
        fill="none"
        stroke="var(--brand-ink)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* star body */}
      <path
        d="M100 35 L118.8 79.1 L166.6 83.4 L130.4 114.9 L141.2 161.6 L100 137 L58.8 161.6 L69.6 114.9 L33.4 83.4 L81.2 79.1 Z"
        fill="var(--brand-coral)"
        stroke="var(--brand-ink)"
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* keffiyeh draped over the top point */}
      <path
        d="M100 28 L134 72 L110 86 L100 70 L90 86 L66 72 Z"
        fill="var(--brand-sand)"
        stroke="var(--brand-ink)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <g stroke="var(--brand-gold)" strokeWidth="4">
        <path d="M78 55 L90 80" />
        <path d="M100 48 L100 76" />
        <path d="M122 55 L110 80" />
      </g>

      {/* face */}
      <circle cx="82" cy="98" r="9" fill="white" stroke="var(--brand-ink)" strokeWidth="3" />
      <circle cx="118" cy="98" r="9" fill="white" stroke="var(--brand-ink)" strokeWidth="3" />
      <circle cx="83" cy="99" r="3.5" fill="var(--brand-ink)" />
      <circle cx="119" cy="99" r="3.5" fill="var(--brand-ink)" />
      <path
        d="M85 113 Q100 124 115 113"
        fill="none"
        stroke="var(--brand-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
