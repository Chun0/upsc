export function RokkyMascot({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Rokky the rocket mascot">
      <defs>
        <linearGradient id="rk-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eef2ff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
        <linearGradient id="rk-fin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb020" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      {/* fins */}
      <path d="M28 62 L16 84 L36 76 Z" fill="url(#rk-fin)" />
      <path d="M72 62 L84 84 L64 76 Z" fill="url(#rk-fin)" />
      {/* flame */}
      <path className="flame" d="M42 82 Q50 104 58 82 Z" fill="#22d3ee" opacity="0.9" />
      <path className="flame" d="M46 82 Q50 94 54 82 Z" fill="#ffb020" />
      {/* body */}
      <path d="M50 8 C62 18 68 34 68 52 L68 78 Q68 84 62 84 L38 84 Q32 84 32 78 L32 52 C32 34 38 18 50 8 Z" fill="url(#rk-body)" stroke="#a5b4d0" strokeWidth="1.5" />
      {/* window */}
      <circle cx="50" cy="38" r="12" fill="#0b1024" stroke="#22d3ee" strokeWidth="3" />
      {/* eyes */}
      <circle cx="45.5" cy="36" r="3" fill="#eef2ff" />
      <circle cx="54.5" cy="36" r="3" fill="#eef2ff" />
      <circle cx="45.5" cy="36" r="1.4" fill="#060913" />
      <circle cx="54.5" cy="36" r="1.4" fill="#060913" />
      {/* smile */}
      <path d="M45 43 Q50 47 55 43" stroke="#22d3ee" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="42" cy="42" r="2" fill="#fb7185" opacity="0.55" />
      <circle cx="58" cy="42" r="2" fill="#fb7185" opacity="0.55" />
      {/* stripes */}
      <path d="M35 62 L65 62" stroke="#6d5cff" strokeWidth="3" strokeLinecap="round" />
      <path d="M37 70 L63 70" stroke="#6d5cff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
