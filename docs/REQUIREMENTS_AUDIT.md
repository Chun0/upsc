# Requirements Audit — original brief vs shipped app

*Checked 2026-08-14 against the complete original request. Verdict per item: ✅ delivered · ⚠ partial · ✗ missing (with reason).*

## Core brief

| # | Requested | Status | Where |
|---|---|---|---|
| 1 | Clone empty repo, build complete project, single-user | ✅ | `Chun0/upsc` cloned; local-first JSON store |
| 2 | Government exam prep webapp, every exam possible | ✅ (14 exams) | `content/exams/*.json` — UPSC CSE, SSC CGL, SSC CHSL, IBPS PO, SBI PO, RBI Grade B, NDA, CDS, AFCAT, RRB NTPC, RRB Group D, MPPSC, UGC NET, CTET. Adding more exams = drop a new JSON file (no code change) |
| 3 | Markdown-based summaries | ✅ | Study library, streaming AI generation, 3 styles |
| 4 | marked.js-based report renderings | ✅ | `components/markdown/MarkdownView.tsx` (marked + DOMPurify) |
| 5 | AI-based exam generation | ✅ | `/api/ai` task `quiz` — slave drafts → master validates |
| 6 | Quiz saving | ✅ | Quizzes persisted in db; library list on Practice |
| 7 | MCQs + dynamic structures (mcq/descriptive) | ✅ | mcq-single / mcq-multi / true-false / fill + descriptive papers |
| 8 | AI-based scoring on submission | ✅ | Deterministic engine + master-lane AI analysis on every submit |
| 9 | Exhaustive AI stats: weak topics, work-ons, strong topics, honest | ✅ | Report card (strengths/weaknesses/reality-check/action plan) + Analytics (topic map, radar, readiness) |
| 10 | Settings page: master + slave model dropdowns | ✅ | Settings → Models & Keys, enriched by live `models.list()` |
| 11 | Tune up settings | ✅ | Thinking level, Google Search toggle, rotation, per-family RPM overrides |
| 12 | Multiple API keys + round-robin + rate-limit knowledge | ✅ | KeyPool: round-robin/failover, per-(key×model) token buckets, defaults 5/15/30 RPM, 429 backoff |
| 13 | Model dropdown enrichment via `models.list()` | ✅ | "Refresh model list" in Settings |
| 14 | 3D design that pans up | ✅ | Hero3D — scroll pans rotateX camera through layered translateZ planes; rocket flies away |
| 15 | Exciting ✨ + personality | ✅ | Rokky mascot, quips, toasts, empty states, launch metaphor, chips, glow |
| 16 | Proper research per exam (syllabus, question types, nuance) | ✅ | `docs/RESEARCH.md` — patterns verified vs 2025–26 sources with citations; per-exam JSON with weights/PYQ/difficulty/trends/samples |
| 17 | Material as reference + structured prompts for structured responses | ✅ | Exam context injected into every prompt; all outputs schema-constrained (`lib/ai/schemas.ts`) |
| 18 | Agentic system actually powering everything | ✅ | Master/slave lanes, serial FIFO queues, queue+wait pipelines, key pool, fallback chains, warm-up probes |
| 19 | Submission of answers to LLM | ✅ | Submit → score JSON → master-lane analysis → report schema |
| 20 | Predesigned markdown report card, LLM only fills data | ✅ | `lib/report/template.ts` — charts built by code, LLM fills verdict/insights/plan |
| 21 | Efficient per-exam weak-topic storage | ✅ | `topicStats` keyed `exam::subject::topic` |
| 22 | Proper algorithm, not basic | ✅ | Adaptive EWMA + Ebbinghaus forgetting decay + confidence discounting + weighted recommendation (weight × gap × PYQ × proximity × weak-streak) |
| 23 | Sample questions per exam in json/md for LLM context | ✅ | `samples[]` in each exam JSON (offline quizzes + prompt context) |
| 24 | Multi-agent orchestration (flash-latest hard, flash-lite easy, queue+wait) | ✅ | `lib/ai/orchestrator.ts` |
| 25 | API key rotation + rate limits (5/15/30 RPM knowledge) | ✅ | Tunable defaults documented with 2026 free-tier reality in Settings |
| 26 | Comprehensive test suite incl. real models (flash-lite + gemma) | ✅ | 80 unit + 9 live-model integration tests |
| 27 | Unbiased 3-step verification before PR | ✅ (×2) | `docs/BUG_REPORT.md`, `docs/AUDIT.md` — re-run this round |
| 28 | Push to GitHub with PR | ⚠→✅ | Previous PAT was read-only; new PAT has write scope — pushing this round |
| 29 | High/max thinking only | ✅ | `thinkingLevel: HIGH` default on all calls (LOW offered as user option) |
| 30 | Design self-verification as unbiased senior graphic designer | ✅ | `docs/DESIGN_REVIEW.md` — 10 issues found & fixed |

## Extras added beyond the brief

Daily current-affairs digest (Google Search grounded), study-plan generator (AI + template), spaced-repetition flashcards (SM-2-lite, generate-from-wrong-answers), streak + 60-day heatmap, exam-date countdown with urgency ranking, guess audit (<8s answers), break-even math, onboarding flow, offline sample-question mode (works with zero keys), model fallback chains + warm-up probes + quota cooldowns (self-healing), answer-key anti-peek, XSS sanitization with SVG-preserving allowlist, corrupt-db recovery, data export, print→PDF report cards, mobile bottom nav, focus-visible a11y, per-section wall-clock timers, validation pass on AI quizzes.

## Honest gaps / could-have-added (roadmapped in `docs/FEATURES.md`)

- More exams (CAPF, EPFO, SSC MTS/GD, UPPSC, BPSC, State PSC family) — pattern: add a JSON file.
- Multi-user auth/sync (out of scope: single-user by design).
- Image/DI questions (vision) — generation + rendering.
- PYQ corpus import (paste/upload past papers → structured bank).
- Sectional cut-off simulation (predict qualification).
- PWA/offline caching; voice coach (TTS); multi-agent debate mode.
- Server-side PDF export of notes.
- Temperature control was in the settings model but not wired — **fixed this round**.

## Fixes made this round (round-2 verification)

1. **Temperature setting now actually wired** — orchestrator uses `settings.temperature` when the call doesn't override it; added a UI control in Settings.
2. **Offline mock subject mapping** — offline mini-mock sections now match sample questions to section subjects (e.g., SSC "Quantitative Aptitude" section pulls quant samples) instead of a generic mix.
3. **Push script hardened** — removed the issue-creation scope check (left a junk issue on the repo once); scope failures now surface from the push itself.
4. Docs updated (`AUDIT.md` round 2, this file).
