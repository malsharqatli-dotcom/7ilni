type MascotProps = {
  className?: string;
};

/**
 * 7ilni mark: a star (the seven-pointed star on the Jordanian flag) inside
 * a medal-ring, like a race badge. Earlier version gave the star stick
 * arms/legs and a headscarf, which read as amateur clip art rather than a
 * logo. Simplified to a flat, iconic shape — no limbs, no costume — so it
 * holds up at small sizes and doesn't borrow shedhelak.com's
 * character-mascot approach or seenjeemkw.com's pure-wordmark approach.
 */
export default function Mascot({ className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="شعار حلّني"
    >
      {/* speed lines */}
      <g stroke="var(--brand-gold)" strokeWidth="6" strokeLinecap="round" opacity="0.6">
        <path d="M-6 82 L16 78" />
        <path d="M-10 99 L14 99" />
        <path d="M-6 116 L16 120" />
      </g>

      {/* medal ring */}
      <circle cx="100" cy="99" r="82" fill="none" stroke="var(--brand-gold)" strokeWidth="6" />
      <circle
        cx="100"
        cy="99"
        r="68"
        fill="none"
        stroke="var(--brand-sand)"
        strokeWidth="3"
        strokeDasharray="1 11"
        opacity="0.8"
      />

      {/* star body */}
      <path
        d="M100 29 L118.8 73.1 L166.6 77.4 L130.4 108.9 L141.2 155.6 L100 131 L58.8 155.6 L69.6 108.9 L33.4 77.4 L81.2 73.1 Z"
        fill="var(--brand-coral)"
        stroke="var(--brand-ink)"
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* face */}
      <circle cx="82" cy="92" r="9" fill="white" stroke="var(--brand-ink)" strokeWidth="3" />
      <circle cx="118" cy="92" r="9" fill="white" stroke="var(--brand-ink)" strokeWidth="3" />
      <circle cx="83" cy="93" r="3.5" fill="var(--brand-ink)" />
      <circle cx="119" cy="93" r="3.5" fill="var(--brand-ink)" />
      <path
        d="M85 107 Q100 118 115 107"
        fill="none"
        stroke="var(--brand-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
