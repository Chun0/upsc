# Design Review — UDAAN "Paper & Ink" revamp (senior graphic designer pass)

*Reviewed as an unbiased senior graphic designer, 2026-08-14, after the full frontend
rebuild documented in `REVAMP_PLAN.md`. Verdict first, then findings fixed.*

## Verdict

The old build was a competent but generic "deep-space" dark theme — purple→cyan
gradients, Inter, glassmorphism, emoji nav, one card skeleton reused everywhere.
It could have been any AI SaaS product. The revamp replaces it with an exam-hall
material language that is genuinely this product's own: **the OMR answer sheet**.
The hero is now a real perspective grid of answer bubbles that pans up on scroll,
with a red margin line and a rising "flight path" of filled bubbles; the palette
(ballpoint blue `#2241a8`, examiner red `#b3261e`, warm paper `#f4f3ee`) is named
"Paper & Ink"; type is Fraunces (gazette serif) + Public Sans + JetBrains Mono.
Every page now varies its structure (register, gazette masthead, cover sheet,
answer booklet, marksheet ledger) instead of reusing one grid.

## What was fixed vs. the boring-UI audit

| Audit item | Fix |
|---|---|
| Inter/system-ui as the whole type system | Fraunces display + Public Sans body + JetBrains Mono utility, self-hosted via next/font |
| Purple→cyan gradients | Deleted. Primary = flat ballpoint blue; danger = examiner red; no gradients carry the brand |
| Centered hero + subhead + 2 buttons + floating chips | OMR-sheet 3D scene with a thesis line and specific CTAs ("Fill today's bubbles" / "Set a full paper") |
| Rows of identical glass cards | Per-page structures: hall-ticket register, gazette masthead, question-paper cover, answer booklet, marksheet |
| Emoji icon set used as-is | Custom 2px-round-cap stroke icon set (`components/ui/Icon.tsx`); emoji retained only as margin handwriting in hints/toasts |
| Glassmorphism everywhere | Removed; borders-first paper sheets, no backdrop blur except the sticky quiz bar |
| One shadow/radius scale everywhere | Paper-on-paper elevation (`--shadow-1/2/3`), 12px radius, deliberate variations (stamps, seals, margin rules) |
| Generic copy | Rewritten per page (see below) — no "Get Started / Learn More" anywhere |
| Fade-up-on-scroll everywhere | One orchestrated load moment (hero fill sequence); scroll reveals only where content is sequential |
| Gray-box empty states | Empty states now carry direction + the Rokky mascot, in the interface's voice |

## Copy pass (before → after)

- "Your mission control for … government exams" → "One copilot · every government exam"
- "Launch a Practice Quiz / Take a Mini Mock" → "Fill today's bubbles / Set a full paper"
- "Submit" (quiz) → "Hand in paper"
- Page titles now own a thesis: "The examination register", "The answer booklet",
  "Your marksheet, kept honestly", "Cards that remember for you", "The control register".

## Deliberate calls (and why)

- **Light theme.** The client asked for `#ffffff`/`#f4f3ee`; the OMR sheet justifies
  the cream as *material*, not pastel decoration — the brief's cliché-look warning is
  dodged because the accent is ballpoint blue, never terracotta.
- **CSS 3D, not WebGL.** No existing 3D stack, and the client forbade dependency
  changes; the brief §4 sanctions a geometrically-considered CSS-3D scene. The sheet
  uses true `perspective` + layered `translateZ` + scroll-linked `rotateX` pan-up +
  pointer parallax, with `prefers-reduced-motion` and mobile fallbacks.
- **Rokky stays a rocket** (continuity), but redrawn as a printed-ink illustration
  with ruled-paper stripes and the OMR bubble motif following him around.
- **Chart re-inking.** `lib/report/charts.ts` + `template.ts` color literals were
  the presentation layer of the report cards — moved to the ink palette so reports
  match the app instead of embedding the old dark palette.

## Known limitations (honest)

- Custom SVG icons replace emoji in nav/headers; some emoji remain in toast/hint
  micro-copy by choice (warmth), not from oversight.
- The OMR hero is CSS-3D, not raytraced WebGL — it trades photorealism for a
  dependency-free 60fps scene that still genuinely pans up on scroll.
- Exam-card tint colors (`e.color`) come from `content/exams/*.json` and are used
  at low opacity as "seals"; they're not part of the core palette.

## Accessibility floor checked
- Focus-visible outlines on all controls; contrast ≥ AA on paper/sheet for ink-2,
  red, amber, tick and ball; `prefers-reduced-motion` collapses all animation to
  instant; numeric readouts use tabular figures; responsive to 360px (register rows,
  palettes and the hero all collapse).
