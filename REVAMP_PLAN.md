# Revamp Plan — UDAAN frontend rebuild

> Living document. Updated before and after every phase. Read the whole brief in
> `uploads/FRONTEND_REVAMP_MASTER_PROMPT.md` — its prime directive, phases 0–7 and
> the anti-AI-slop checklist are the binding contract for this work.

## Status
- Current phase: **7 — COMPLETE** (all pages built-critiqued, quality floor passed)
- Last updated: 2026-08-14
- Branch: `frontend-revamp`
- Hard constraint from client: **do not touch backend, API routes, engines, AI
  orchestration or storage logic.** Only presentation (JSX markup, CSS, SVG,
  chart color literals, copy) changes. Every fetch/logic line stays byte-identical.
  (Chart color literals in `lib/report/*` were the only "logic-adjacent" edit —
  colors only, signatures/math untouched, regression-tested.)

## Phase 5 completion record (one line per page)
- `/` Dashboard — built ✓ / critiqued ✓ — admit-card strip + OMR tally + red-margin priorities. Fixes audit #3,#4,#8.
- `/exams` — register ✓ — family-grouped serial ledger. Fixes audit #4.
- `/exams/[id]` — gazette masthead + numbered stepper ✓. Fixes audit #4,#9.
- `/study` — request form + notebook index ✓. Fixes audit #4,#8.
- `/study/[id]` — reader pane with margin line ✓. Fixes audit #4.
- `/practice` — question-paper cover sheet ✓. Fixes audit #4,#8.
- `/mocks` — scaled-paper breakdown ✓. Fixes audit #4.
- `/descriptive` — answer booklet + red-pen remarks ✓. Fixes audit #4,#8.
- `/revision` — ruled index cards ✓. Fixes audit #4,#11.
- `/reports` — marksheet ledger ✓. Fixes audit #4,#8.
- `/reports/[id]` — marksheet stamp header + re-inked card ✓. Fixes audit #2,#4.
- `/analytics` — progress report, re-colored charts ✓. Fixes audit #2.
- `/settings` — control register ✓. Fixes audit #4,#8.
- `/more` — ruled index ✓.
- `/quiz/[id]` — OMR palette + "hand in paper" ✓. Fixes audit #5.
- Shell/Hero/Mascot/Icon/Markdown/Charts — rebuilt ✓. Fixes audit #1,#2,#5,#6,#7.

## Phase 7 quality floor
- [x] Responsive to 360px (register rows, palette, hero all collapse).
- [x] `:focus-visible` on every control.
- [x] `prefers-reduced-motion` honored globally + per-scene.
- [x] Contrast ≥ AA (ink-2, red, amber, tick, ball checked on paper/sheet).
- [x] No specificity collisions (structural vs utility) — verified by build + smoke.
- [x] Hero scroll is single-rAF + `will-change`; no new deps; First Load JS ≈103 kB.
- [x] Audit items fixed are named per page above.
- [x] Plan-critique changes recorded (Phase 2 Pass B + per-page plan critiques).

---

## Phase 0 — Discovery & Audit

### Stack / structure summary
- **Next.js 15 (App Router, React 19)** + TypeScript strict. CSS: one global
  stylesheet `app/globals.css` (~680 lines) + scattered inline `style` props.
  No component library, no Tailwind, no GSAP/Lottie, no R3F. Client interactivity
  is plain React hooks. Markdown via `marked` + `DOMPurify`. Charts are server-built
  SVG strings in `lib/report/charts.ts`.
- Routing: 14 `app/*` pages + API routes. Server components (`force-dynamic`)
  read `data/db.json` via `lib/store/db.ts`; client components fetch `/api/*`.
- Design tokens live only as CSS custom properties in `:root` of `globals.css`.

### Page / route inventory (the revamp surface)
| Route | Job today |
|---|---|
| `/` | Dashboard — 3D hero + stat grid + continue + priorities + reports/heatmap |
| `/exams` | Exam index (14 exams, uniform 3-col cards) |
| `/exams/[id]` | Exam "notification" — process, patterns, syllabus, trends, sources |
| `/study` | Note generator + library + study plan |
| `/study/[id]` | Reading a summary doc (markdown) |
| `/practice` | Quiz builder (exam/subject/topics/count/difficulty) |
| `/mocks` | Mini-mock builder (stage + scale) |
| `/descriptive` | Mains-style paper + AI rubric scoring |
| `/revision` | Flashcards (SM-2-lite) with flip |
| `/reports` | Report list |
| `/reports/[id]` | Report card (markdown + SVG charts) |
| `/analytics` | Readiness/radar/donut/trend/accuracy |
| `/settings` | Profile, models & keys, orchestration, data |
| `/more` | Overflow index for mobile |
| `/quiz/[id]` | QuizRunner (options, palette, timers, submit) |
| `components/…` | Shell, Hero3D, Mascot, DashboardGrid, OnboardingModal, QuizRunner, MarkdownView, SvgChart, SyllabusExplorer, PlanView, ReaderActions, SummaryGenerator, QuestionReview, ReportReview, Tilt, Toast, Modal |

### Existing tokens found
Dark "deep space" theme: `#060913/#0b1024/#101736` backgrounds, purple→cyan
gradient `#6d5cff→#22d3ee`, Inter font stack, glassmorphism (`backdrop-filter`,
`rgba` panels), 16px radius everywhere, one glow/shadow language, emoji icons.

### Constraints
- Single-user, local-first. Must keep 60fps scroll for the 3D hero on mid laptops,
  degrade gracefully on mobile; **no new heavy deps** (no three.js/GSAP/Lottie —
  CSS 3D transform scene is the sanctioned fallback in the brief §4).
- `lib/report/*.svg` strings are embedded in markdown and sanitized — keep them
  self-contained (no external refs).
- Print-to-PDF of report cards must keep working on a light background.
- Accessibility: keyboard focus, `prefers-reduced-motion`, contrast ≥ AA.

### Boring-UI audit (baseline to design against)
1. ✅ Generic **Inter/system-ui** as the entire type system, no display face.
2. ✅ **Purple→cyan gradient** hero + primary buttons everywhere.
3. ✅ **Centered headline + subhead + two CTA buttons + floating chips** hero.
4. ✅ **Rows of identical glass cards** (same padding/radius/shadow) on every page.
5. ✅ Default **emoji iconography** used as-is with no brand relationship.
6. ✅ **Glassmorphism** (`backdrop-filter` panels) applied decoratively.
7. ✅ Single shadow/radius/glow scale applied uniformly → sameness.
8. ✅ Generic copy: "Your mission control…", "Launch a Practice Quiz",
   "Take a Mini Mock", "Powerful features"-adjacent phrasing.
9. ✅ Motion = only `heroFloat`/`chipFloat`/fade, identical everywhere.
10. ✅ Empty/loading states are a gray box + emoji + sentence.
11. ✅ Pages converge on the same `split`/`grid cols-3` skeleton (practice,
    mocks, revision, study share one layout).

---

## Phase 1 — Concept

- **Subject**: UDAAN — a single-user, local-first AI copilot for Indian
  government exam preparation (UPSC, SSC, Banking, Railways, Defence, State PSC).
  It generates pattern-faithful quizzes/mocks/descriptive papers, scores them,
  and writes honest, chart-backed report cards + a per-topic mastery map.
- **Audience**: one aspirant, often in a tier-2/3 Indian city, studying alone on
  a phone or budget laptop; anxious about cutoffs, negative marking and whether
  they're "on track". They want honesty and momentum, not gamified noise.
- **Personality adjectives** (specific enough to exclude):
  **Earnest · Rooted · Precise · Propulsive.**
  (Excludes: playful/cartoonish, corporate-SaaS-polished, frantic, vague.)
- **Product vernacular — the distinctive material world**: the **OMR answer
  sheet** (bubble grid, Roll No., the red margin line), the **examiner's red pen
  and blue ballpoint**, the **admit card / gazette notification** (serif
  masthead, serial numbers, ruled tables), the **marksheet / rank list**, the
  **notebook rule line**, and **flight** ("UDAAN" = उड़ान, taking off). These are
  the product's own objects — no SaaS template shares them.
- **Brand story (one sentence)**: *UDAAN believes an aspirant doesn't need another
  cheerleader — they need an honest copilot who keeps the score in ink, respects
  the real exam pattern, and lifts them off the ground one bubble at a time.*

**Why cream paper is not a cliché here**: the OMR sheet is literally printed on
off-white paper — `#f4f3ee` is the *material*, not decorative pastel. Accents are
**ballpoint blue + examiner red**, never terracotta.

---

## Phase 2 — Token System

### Palette — "Paper & Ink"
| Token | Hex | Role |
|---|---|---|
| `--paper` | `#f4f3ee` | page (OMR off-white) |
| `--sheet` | `#ffffff` | card surface |
| `--ink` | `#201d16` | primary text |
| `--ink-2` | `#5a5344` | secondary text |
| `--ink-3` | `#7d7566` | faint/captions |
| `--hair` | `rgba(32,29,22,.14)` | hairline rule |
| `--hair-2` | `rgba(32,29,22,.30)` | strong rule |
| `--ball` | `#2241a8` | ballpoint blue — primary, links, filled bubble |
| `--ball-deep` | `#18307f` | hover |
| `--ball-soft` | `#e9edf8` | blue tint |
| `--red` | `#b3261e` | examiner red — danger/wrong/margin |
| `--red-soft` | `#f9e9e7` | red tint |
| `--tick` | `#1d7a43` | correct green |
| `--tick-soft` | `#e7f3ec` | green tint |
| `--amber` | `#96690c` | warn (dark enough for AA on paper) |
| `--amber-soft` | `#f7eeda` | amber tint |

No gradients as brand carriers. Primary button = flat `--ball`; a "stamp" is a
rounded-rect with ink border + soft paper shadow. Fill transitions use the ink
tints.

### Type system
- **Display — Fraunces** (`--font-display`): wordmark, page H1/H2, hero, report
  card headings. Justification: gazette-notification / printed-paper serif.
- **Body — Public Sans** (`--font-body`): everything else. Humanist, warm, a
  government-design sans (USWDS) — deliberately not Inter/Roboto.
- **Utility — JetBrains Mono** (`--font-mono`): timers, scores, countdowns,
  key masks, serial numbers.
- Scale: display `clamp(2.9rem,8vw,5.2rem)`; H1 `clamp(1.85rem,4vw,2.5rem)`
  (Fraunces 600); H2 `1.3rem` (Fraunces 600); H3 `1.02rem` (Public Sans 700);
  body 15px/1.65; small 12.5px; eyebrow `11px` uppercase +0.14em mono.
  Numeric tabular via `font-variant-numeric: tabular-nums` on `.timer`, `.count-big`, `.tbl td.num`.

### Spacing & grid
8px base (4/8/12/16/20/24/32/48). **Deliberate breaks**: the OMR bubble grid
(hero, quiz palette) ignores the column grid; section rules are a "margin line +
filled bubble" motif, not a bare hairline.

### Elevation / radius
Paper language: borders first, shadows second. Cards = 1px `--hair` border,
`--sheet` bg, radius 12px, shadow `0 1px 2px rgba(32,29,22,.06), 0 10px 30px -18px rgba(32,29,22,.18)`.
Hover = lift `-2px` + slightly deeper shadow. Chips/badges = pill. Bubbles = circle.
No glow.

### Motion tokens
- `--ease-settle: cubic-bezier(.22,1,.36,1)` — stamps, pop-ins, modal, toasts.
- `--ease-ink: cubic-bezier(.65,.05,0,1)` — reveals, sheet pan.
- `--t-fast: 140ms`, `--t-base: 240ms`, `--t-slow: 420ms`.
- Keyframes: `stampIn` (scale 1.06→1), `bubbleFill` (scale 0→1 + tint), `inkReveal`
  (fadeUp 8px), `tickDraw` (stroke-dashoffset check), `bob`, `drift`, `marginDown`.

### Iconography & imagery
Custom inline-SVG icon set (`components/ui/Icon.tsx`) drawn at 2px round-cap
stroke in `--ink-2`, active state `--ball`. Nav (10), plus ~10 feature glyphs.
Emoji retained only as "margin handwriting" in toasts/hints; stripped from nav,
section headers and primary CTAs.

### Signature element
**The OMR sheet in 3D that pans up on scroll** (Phase 3) — a real perspective
grid of answer bubbles; the camera lifts off the sheet as you scroll, a
paper-plane "Rokky" climbs through it, bubbles fill behind it like marks being
made.

### Pass B critique (what changed from Pass A & why)
- First brainstorm reached for `#F4F1EA + Fraunces + clay #C96F4A` — that's the
  exact cliché look the brief bans. **Changed**: accent = ballpoint blue, danger =
  examiner red (from the OMR/exam vernacular), no terracotta anywhere.
- First pass had purple retained "because brand continuity". **Changed**: purple
  is the single most AI-generic choice in the audit; dropped entirely. Continuity
  is carried by "UDAAN/flight" + "Rokky", not by hue.
- First pass used radius-16 glass cards. **Changed** to hairline-bordered paper
  sheets with radius 12 — glassmorphism is audit item #6.
- First pass would've kept a "sun/rocket" icon for every card. **Changed** to the
  bubble/rule/ink motif so icons encode exam state, not decoration.

---

## Phase 3 — 3D Header

- **Concept**: "The answer sheet lifts off." A full-bleed OMR sheet laid out in
  perspective (rows of bubbles receding), red margin rule on the left, a
  "Roll No." strip, some bubbles pre-filled in ink blue along a rising diagonal.
  Rokky (paper-plane + trail) climbs the sheet as you scroll; the camera pans UP
  (rotateX flattens toward the viewer) revealing the dashboard — the requested
  "3D design that pans up", now tied to the product's own object.
- **Interaction model**: idle ambient (slow bubble-fill shimmer + plane bob) →
  scroll-linked pan-up (rAF, one CSS var write) → subtle mouse parallax
  (disabled on touch / reduced-motion).
- **Tech approach**: real perspective via CSS `perspective` + `preserve-3d`,
  layered `translateZ` rows (0/60/120/220px) for depth parallax, `rotateX` driven
  by `--pan`. Bubbles are inline SVG in a CSS grid. No WebGL, no new deps —
  keeps first paint fast and bundle unchanged. **This is the brief's sanctioned
  CSS-3D path (§4)** because the project has no existing 3D stack and the client
  forbids backend/dep changes.
- **Perf/fallbacks**: `content-visibility:auto` + `will-change: transform` on the
  pan layer; single rAF scroll handler (passive); below 700px the sheet is a
  lighter static field with no parallax; `prefers-reduced-motion` → static sheet,
  no fill animation, no parallax, plain fade.

---

## Phase 4 — Motion System

- **Load choreography (dashboard)**: margin line draws → wordmark settles
  (Fraunces, `stampIn`) → bubbles fill in a rising stagger (30ms) → plane bobs in
  → CTAs + stat cards fade up in one group. One orchestrated moment; nothing else
  on the page animates on scroll.
- **Scroll reveals**: used ONLY where content is sequential (report card sections
  after a fresh submit flag, study doc headings). Elsewhere: none.
- **Micro-interactions**: all `.btn` press = `translateY(1px) scale(.99)`;
  all `.card.hoverable` = same lift; `.option` fill = `bubbleFill` on the letter
  bubble; palette answered = bubble fills blue. Distinct families, consistent
  within family.
- **Bespoke SVG moments** (no Lottie, per brief's allowance for SVG+GSAP-less
  equivalents): `tickDraw` success check on report "Analyse" completion, empty
  states get a hand-drawn ink doodle, toast icons are ink glyphs.
- **Reduced motion**: all CSS animations gated on
  `@media (prefers-reduced-motion: no-preference)`; fallback = opacity cross-fade,
  no transform travel.

---

## Phase 5 — Per-Page Plans

### `/` Dashboard
- Layout concept: hero (OMR 3D) → "admit card" strip (name/roll/centre/exam date)
  → OMR tally stat cards → continue strip → priorities (red-margin "corrections")
  → recent reports + 60-day activity heatmap.
- Hero thesis: *"You fill the bubbles; UDAAN keeps the score."*
- Signature: the 3D OMR sheet itself + the admit-card strip (unique to dashboard).
- Plan critique: first draft re-used the old stat-grid + 3-col cards; changed to
  admit-card + tally so it can't be mistaken for a generic analytics home.

### `/exams` index
- Layout: a **hall-ticket register** — grouped by family (Civil Services, SSC,
  Banking, Defence, Railways, Academics) with a serial number per exam, exam icon
  as a "seal", pattern readout as a ruled row. Replaces the uniform 3-col grid.
- Hero thesis: *"Every exam knows its own pattern — here's the register."*
- Plan critique: avoided the "identical icon-on-top cards" audit item by making
  the list a register with serials + family sections.

### `/exams/[id]` detail
- Layout: **gazette notification** masthead (org, exam name, "advt." meta) →
  selection-process stepper (numbered genuinely — it IS a sequence) → pattern
  tables with ruled rows → syllabus explorer (bubbles for PYQ/difficulty) →
  trends/sources as two-column "notes".
- Signature: the masthead + stepper.

### `/study`
- Layout: generator as a "notes request form" (left, with a ruled form aesthetic);
  library as a **notebook index** (right); plan below as a phase timeline.
- Signature: the ruled notebook index.

### `/study/[id]`
- Layout: reading pane styled like **question-paper text** with a left margin
  line, reading progress tick on the edge, action rail.
- Signature: margin line + progress rule.

### `/practice`
- Layout: builder as a "paper-setting form"; the pattern summary as a **question
  paper cover sheet** (subject/…/time/negative marking block).
- Signature: the cover-sheet.

### `/mocks`
- Layout: same form family as practice but the preview is the **scaled paper
  table** (sections as ruled rows + total row), deliberately different structure.
- Signature: the scaled-paper breakdown.

### `/descriptive`
- Layout: "answer booklet" — ruled textareas, word-count in the margin, examiner
  red-pen feedback block, band stamp on results.
- Signature: ruled booklet + red-pen feedback.

### `/revision`
- Layout: flashcards as **physical ruled index cards** with a fold; scheduler as
  deck controls; review buttons as the 3 SM-2 verdicts.
- Signature: the ruled flip-card.

### `/reports`
- Layout: a **marksheet ledger** — rows with serial, paper, date, obtained/max,
  verdict seal.
- Signature: ledger rows with seal.

### `/reports/[id]`
- Layout: THE **report card / marksheet**. Restyled markdown: score header as an
  ink stamp block, donut/bars/radar re-inked, callouts as "Examiner's Remarks"
  (red rule) and "Rokky Says" (blue rule), topic chips as filled/unfilled bubbles.
  Print CSS tuned for a white sheet.
- Signature: the marksheet header stamp.

### `/analytics`
- Layout: "progress report" — stat tallies, radar + donut, trend sparkline, type
  accuracy bars, priorities as red-margin corrections list. Charts re-colored to
  ink palette.
- Signature: the corrections list.

### `/settings`
- Layout: a **form / control register** with tabs (Profile · Models & Keys ·
  Orchestration · Data). Keys listed as masked serial entries; model selects as
  register fields; orchestration shows live lane log.
- Signature: masked-key register entries.

### `/more`
- Layout: a simple "index" of deep links as a column of ruled rows.

### `/quiz/[id]`
- Layout: options as **OMR rows** (letter bubble + text); palette is a literal
  mini OMR grid; timer in mono; header = "paper in hand" strip; submit = "Hand in
  paper".
- Signature: the OMR palette.

### Copy pass
- Hero sub → *"One copilot for every government exam — pattern-faithful papers,
  honest scores, and a plan that lifts you, one bubble at a time."*
- CTAs → **"Fill today's bubbles"** / **"Set a full paper"** (not "Launch/Learn").
- Shell sub → "Your admit card, your marksheet, your coach."
- Empty states get direction + the ink doodle (Phase 6 rewrite throughout).

---

## Phase 7 — Quality Floor (per page)
Checklist applied to every page before "done":
- [ ] Responsive to 360px (hero, sheets, tables, palette).
- [ ] `:focus-visible` visible on every control.
- [ ] `prefers-reduced-motion` honored everywhere motion exists.
- [ ] Contrast ≥ AA on `--paper`/`--sheet` (ink-2 ≥ 4.5:1, red ≥ 4.5:1, amber ≥ 4.5:1).
- [ ] No specificity collisions (structural vs utility selectors).
- [ ] 60fps hero scroll; no layout thrash.
- [ ] Audit items fixed are named in the page's plan.
- [ ] Plan-critique change recorded above.

## Decision Log
- 2026-08-14 — Light "Paper & Ink" system replaces dark space theme — brief demands
  light base (#f4f3ee) and the OMR material justifies it (Phase 1/2).
- 2026-08-14 — CSS-3D OMR header, no new deps — client forbids backend/dep changes;
  brief §4 sanctions CSS-3D when no 3D stack exists (Phase 3).
- 2026-08-14 — Purple dropped entirely (most AI-generic token) — audit item #2 (Phase 2 Pass B).
- 2026-08-14 — Keep "Rokky the rocket" but redraw as printed-ink illustration —
  preserves established brand continuity while killing the clip-art look (Phase 2).
- 2026-08-14 — Chart/template color literals updated in `lib/report/*` — these are
  presentation strings (design), not logic; signatures & math untouched (Phase 0 constraint).
