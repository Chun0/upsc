/**
 * Rokky — UDAAN's coach, redrawn as a printed-ink illustration
 * (ballpoint blue body, examiner-red fins, paper-ink shading).
 * Same `size` prop API; used in the sidebar, reports and empty states.
 */
export function RokkyMascot({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Rokky the rocket mascot">
      <defs>
        <linearGradient id="rk-body2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2a4bc0" />
          <stop offset="100%" stopColor="#2241a8" />
        </linearGradient>
      </defs>

      {/* orbit bubble — the OMR motif follows Rokky everywhere */}
      <circle cx="78" cy="22" r="6" fill="none" stroke="#b3261e" strokeWidth="2" opacity="0.55" />
      <circle cx="78" cy="22" r="2.4" fill="#b3261e" opacity="0.85" />
      <circle cx="15" cy="62" r="4.5" fill="none" stroke="#2241a8" strokeWidth="1.8" opacity="0.4" />
      <circle cx="15" cy="62" r="1.8" fill="#2241a8" opacity="0.6" />

      {/* fins (examiner red) */}
      <path d="M26 60 L12 84 L34 74 Z" fill="#b3261e" />
      <path d="M74 60 L88 84 L66 74 Z" fill="#b3261e" />
      <path d="M26 60 L12 84 L34 74 Z" fill="rgba(32,29,22,0.08)" />

      {/* flame */}
      <path className="flame" d="M42 80 Q50 104 58 80 Z" fill="#f2a63b" />
      <path className="flame" d="M46 80 Q50 94 54 80 Z" fill="#b3261e" />

      {/* body */}
      <path
        d="M50 6 C62 17 68 33 68 52 L68 78 Q68 84 62 84 L38 84 Q32 84 32 78 L32 52 C32 33 38 17 50 6 Z"
        fill="url(#rk-body2)"
        stroke="#18307f"
        strokeWidth="1.6"
      />
      {/* printed-ink highlight */}
      <path d="M41 20 C43 26 43 44 40 72" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* window */}
      <circle cx="50" cy="36" r="12" fill="#f4f3ee" stroke="#18307f" strokeWidth="3" />
      {/* eyes */}
      <circle cx="45.5" cy="34" r="2.8" fill="#201d16" />
      <circle cx="54.5" cy="34" r="2.8" fill="#201d16" />
      <circle cx="46.3" cy="33.2" r="0.9" fill="#fff" />
      <circle cx="55.3" cy="33.2" r="0.9" fill="#fff" />
      {/* smile */}
      <path d="M45 40 Q50 44 55 40" stroke="#b3261e" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="42" cy="39" r="1.8" fill="#b3261e" opacity="0.4" />
      <circle cx="58" cy="39" r="1.8" fill="#b3261e" opacity="0.4" />

      {/* stripes — like ruled paper lines */}
      <path d="M35 60 L65 60" stroke="#f4f3ee" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <path d="M37 68 L63 68" stroke="#f4f3ee" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}
