/**
 * Hand-drawn-feel stroke icon set for UDAAN ("Paper & Ink").
 * 24×24, 1.8px round-cap stroke, inherits currentColor. Matches the
 * ballpoint-ink language: no clip-art, no emoji defaults.
 */
export type IconName =
  | "dashboard" | "exams" | "study" | "practice" | "mocks" | "descriptive"
  | "revision" | "reports" | "analytics" | "settings" | "more"
  | "arrow" | "arrowUp" | "check" | "spark" | "clock" | "flame" | "book"
  | "pen" | "target" | "key" | "print" | "refresh" | "close" | "brain" | "chart";

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  exams: (
    <>
      <path d="M4 20h16" />
      <path d="M6 20V9l3-3h8l1 1v13" />
      <path d="M10 20v-4h4v4" />
      <path d="M9 9h.01M13 9h.01M9 12.5h.01M13 12.5h.01" />
    </>
  ),
  study: (
    <>
      <path d="M12 6.5C10.2 5.2 7.8 5 4.5 5.6v12.6c3.3-.6 5.7-.4 7.5 1 1.8-1.4 4.2-1.6 7.5-1V5.6c-3.3-.6-5.7-.4-7.5.9z" />
      <path d="M12 6.5v12.7" />
    </>
  ),
  practice: (
    <>
      <path d="M4 20l1.2-4.2L16.5 4.5a1.9 1.9 0 0 1 2.7 0l.3.3a1.9 1.9 0 0 1 0 2.7L8.2 18.8 4 20z" />
      <path d="M14.5 6.5l3 3" />
    </>
  ),
  mocks: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  descriptive: (
    <>
      <path d="M5 4h14v14H5z" rx="1" />
      <path d="M8.5 9.5h7M8.5 12.5h5M8.5 15.5h3" />
      <path d="M14.5 18l-1.5 2.5L16 21.5l1.5-2.5z" fill="currentColor" stroke="none" />
    </>
  ),
  revision: (
    <>
      <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
      <path d="M7 20h10" />
      <path d="M9.5 9.5h5M9.5 12.5h3" />
    </>
  ),
  reports: (
    <>
      <path d="M6 3.5h9l3.5 3.5V20.5H6z" />
      <path d="M15 3.5V7h3.5" />
      <path d="M9.5 15.5v-3M12.5 15.5v-6M15.5 15.5v-2" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20h16" />
      <path d="M6.5 16.5l3.5-4 3 2.5 4.5-6" />
      <circle cx="18" cy="9" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="var(--sheet)" />
      <circle cx="15" cy="12" r="2" fill="var(--sheet)" />
      <circle cx="7" cy="17" r="2" fill="var(--sheet)" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowUp: <path d="M12 20V5M6 11l6-6 6 6" />,
  check: <path d="M5 13l4 4 10-11" />,
  spark: (
    <path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  flame: (
    <path d="M12 3.5c1 3-1 4-1 6.5 0 2.2 1.8 4 4 4 2.5 0 4.5-2 4.5-4.5 0-1-.4-2-1-2.9.3 1.6-.7 2.9-2.3 3.1.4-3-1.8-4.6-1.8-6.6 0-1 .3-1.6.6-2.1C10.8 2.6 8 6 8 9.5 8 14 11 18 15.5 18c3 0 5-2 5-4.5 0-.8-.3-1.5-.8-2.1 0 3-2.4 4.6-4.7 4.6C12.8 16 11 14.6 11 12.6c0-1 .3-1.8.9-2.6C10.6 10.8 10 11.8 10 12.9c0 1.8 1.4 3.1 3.1 3.1h.2C10.6 16.5 8.5 13.5 9.5 9.7c.2-1 .8-2.1 1.6-3.2C11.2 7.8 12 5.9 12 3.5z" />
  ),
  book: (
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21z" />
      <path d="M5 5.5A2.5 2.5 0 0 0 7.5 8H19" />
    </>
  ),
  pen: (
    <path d="M4 20l1.2-4.2L16.5 4.5a1.9 1.9 0 0 1 2.7 0l.3.3a1.9 1.9 0 0 1 0 2.7L8.2 18.8 4 20z" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="M11 12L20 3M16 7l2.5 2.5M13.5 9.5L16 12" />
    </>
  ),
  print: (
    <>
      <path d="M7 8V3.5h10V8" />
      <rect x="3.5" y="8" width="17" height="8" rx="1.5" />
      <path d="M7 13.5h10v7H7z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4h-4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  brain: (
    <>
      <path d="M12 4.5C10.5 3.2 8.8 3 7.3 3.6A3.6 3.6 0 0 0 7 9.7c2.6 1 4.3.2 5-1.2M12 4.5c1.5-1.3 3.2-1.5 4.7-.9a3.6 3.6 0 0 1 .3 6.1c-2.6 1-4.3.2-5-1.2" />
      <path d="M12 8.5V20M8.5 20h7" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-4M11 16V8M15 16v-6M19 16V6" />
    </>
  ),
};

export default function Icon({
  name,
  size = 20,
  className = "",
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
