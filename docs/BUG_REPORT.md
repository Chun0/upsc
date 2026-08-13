# Bug Report & Fix Log — 3-Step Verification

*Unbiased verification of the whole codebase before the PR. Every entry: symptom → root cause → fix → verification.*

## Step 1 — Logic re-review (fresh-eyes, no test results consulted first)

| # | Severity | Symptom | Root cause | Fix |
|---|---|---|---|---|
| 1 | 🔴 Critical | V8 "invalid size error" crash rendering a markdown doc with an unclosed `:::` callout | `preprocessCallouts` cleanup loop never popped the stack — infinite push → memory blow-up | `stack.pop()` before pushing `</div>`; regression test added ("handles unclosed callouts") |
| 2 | 🔴 Critical | `/quiz/[id]` flow broken: runner fetched `/api/attempts/{quizId}` — always "attempt not found" | Id-domain confusion: route param is a quiz id, runner treated it as attempt id | Runner now POSTs `/api/attempts {quizId}` to resolve/create, then loads the attempt; dashboard "Continue" links use quizId |
| 3 | 🟠 High | Sectional mock timers ran slower than wall-clock (only counted time spent interacting) | Section countdown summed per-question `timeSpentMs` instead of real elapsed seconds | Wall-clock per-section countdown in the runner (ref-held seconds per section, 1s tick, preserved across navigation) |
| 4 | 🟠 High | Raw API keys exposed to the client | `/api/analytics` returned the entire db object including `keys[].key` | Keys masked in that response; keys endpoint already returned masked records |
| 5 | 🟠 High | Answer key visible during an in-progress attempt (devtools peek) | `GET /api/attempts/[id]` returned full questions incl. `answerIndex` | While `status === "in-progress"`, answer fields are stripped from the response; restored after submission for review |
| 6 | 🟡 Medium | Settings → Reset left stale in-memory db (old data reappeared on next request) | File deleted but module-level cache not invalidated | `reloadDb()` after `rmSync` |
| 7 | 🟡 Medium | Mastery "wrong-on-easy" signal was inverted (rewarding failure on easy questions) | Formula `0.18·(1.15 − 0.05d)` increases with easier difficulty | Corrected to `0.18·(0.85 + 0.05d)`; unit test now asserts wrong-on-easy < wrong-on-hard |
| 8 | 🟡 Medium | First master-lane task could hang 2.5 min (dead alias) every process | No health probe; long timeout before fallback | 25s warm-up probe marks hanging models dead instantly; fallback chains per lane |
| 9 | 🟡 Medium | Small models hung when search grounding was combined with thinking + JSON schema | Search tool applied by default to every task | Search is now opt-in per task (digest only) |
| 10 | 🟢 Low | Vitest forks pool crashed V8 in this sandbox | Pool/worker memory interaction | Threads pool, sequential files, fresh worker per file |
| 11 | 🟢 Low | Client bundle tried to import `fs` (content loader) | `lib/content/exams.ts` used fs and was imported by client components | Static JSON imports — registry works in client/RSC/tests |
| 12 | 🟢 Low | Revision page JSX artifact; dead code in settings; toast kind mismatch | Editing slip-ups | Cleaned; toast `warn` kind added |

## Step 2 — Dynamic verification results

- `npm run typecheck` — clean (strict mode).
- `npm test` — **80/80 unit tests pass** (9 files): keypool, mastery, quiz engine, store, markdown+DOMPurify, charts, report, analytics, utils.
- `RUN_AI=1` integration — **9/9 live-model tests pass** (flash-lite, gemma-4-31b, flash master via fallback; multi-agent pipeline verified).
- `next build` — compiles, 34 routes, 10 static pages.
- HTTP smoke — 12 pages 200; offline quiz → attempt → submit → report lifecycle verified; AI quiz generation verified end-to-end through the app; AI report analysis verified with real fallback chain (`aiUsed: true`, 10.4 KB report card).
- XSS test: script/event-handler injection stripped from LLM output while SVG charts survive.

## Step 3 — Patch audit

- Secret scan: provided Gemini key & GitHub token appear **nowhere** outside gitignored `data/` (verified by grep).
- `git check-ignore` confirms `data/db.json`, `node_modules`, `.next` excluded.
- Diff review: all committed files reviewed for accidental junk — none; `.env.example` contains no real values.
- Report templates escape labels; DOMPurify allowlist keeps SVG, forbids scripts/iframes/forms.

## Round-2 verification (2026-08-14) — new findings & fixes

| # | Severity | Symptom | Root cause | Fix |
|---|---|---|---|---|
| 13 | 🟠 High | First master-lane call in a fresh process could still hang 90s (warm-up silently skipped) | `warmUp` checked `pool.usableKeys()` before the pool had ever been synced — empty pool → probe skipped | `syncPool()` at the top of `warmUp` |
| 14 | 🟡 Medium | Transient 429/quota during the warm-up probe permanently blacklisted an otherwise healthy model | `warmUp` marked any probe failure as dead (cooldown 0 = permanent) | Rate/quota-class errors skip warming only; only structural failures blacklist |
| 15 | 🟡 Medium | "Section time over" toast spammed every second when the LAST section expired (no section left to advance to) | Toast fired before the target-exists check | Toast moved inside the `target < questions.length` branch |
| 16 | 🟢 Low | Palette showed "unseen" for questions the user had merely viewed (no answer interaction) | `firstSeenAt` set only on answer changes | Visited-marker effect fires when a question is shown |
| 17 | 🟡 Medium | Settings "temperature" existed in the model but was never wired | Orchestrator read only per-call overrides, never `settings.temperature` | Orchestrator falls back to `settings.temperature`; UI control added (Default/0.4/0.7/1.0) |
| 18 | 🟢 Low | Offline mini-mock sections pulled a generic sample mix (quant section could show English samples) | Section→subject matching used naive substring logic | Keyword hint table maps section names to syllabus subjects; falls back to full pool only when unmappable (3 regression tests) |
| 19 | 🟢 Low | Push script's scope check created a junk issue on the repo | Issue-create as a write-scope probe | Removed — the push itself is the scope test |
| 20 | 🟢 Low | Dashboard 500 during verification | `next build` ran while `next dev` held `.next` (dev/prod cache collision — tooling, not app code) | Cleared `.next`, restarted dev, all 12 pages 200; procedure documented (never build while dev runs) |

## Known limitations (honest)

1. `gemini-flash-latest` hangs on this (new-user) API key; `gemini-2.5-flash` is 404. The orchestrator self-heals via fallback chains — for best speed set Master model to `gemini-3-flash-preview` (or `gemma-4-31b-it`) in Settings → Models & Keys.
2. The provided test key has a small quota; when exhausted the app degrades gracefully (offline reports, sample quizzes) and auto-recovers.
3. Mini mocks scale the real pattern proportionally (AI can't reliably emit 100-question papers in one call) — documented in-app.
4. Section timers reset if the page is reloaded mid-mock (resume keeps the total timer and answers).
5. Single-user, local-first by design (multi-user is roadmap #1 in `docs/FEATURES.md`).
