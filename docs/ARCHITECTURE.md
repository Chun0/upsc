# Architecture — UDAAN

## High-level flow

```
content/exams/*.json ──► exam context (injected into every prompt)
                              │
Client (React) ──► API routes ──► Orchestrator ──► GoogleGenAI
      ▲                  │              │
      └── marked.js + DOMPurify          │
                                          ▼
                                   KeyPool (multi-key, RPM buckets)
                                   LaneQueues (master / slave serial FIFO)
                                   Model fallback chains + warm-up probes
                                          │
                              lib/engine/* (deterministic, AI-free)
                              lib/report/* (predesigned markdown + SVG charts)
                              lib/store/db.ts (atomic JSON, gitignored)
```

## The agentic system (`lib/ai/orchestrator.ts`)

- **Two lanes**: `master` (hard tasks: descriptive scoring, report analysis, plans, digests, quiz validation) and `slave` (light tasks: quiz drafts, outlines, flashcards, explanations). Each lane is a serial FIFO queue — tasks in a lane never race each other, and a pipeline step can `await` a task on the *other* lane ("queue and wait").
- **Key pool** (`lib/ai/keypool.ts`): multiple API keys; round-robin or failover rotation; a token bucket per (key × model) that refills continuously at the configured RPM (defaults: flash 5, flash-lite 15, gemma 30 — editable in Settings). Exhausted buckets yield `waitMs` and the call waits for the next slot; 429s back off exponentially; hard quota (429 "quota/billing") cools the model down for 10 min; 401/403 marks the key as errored.
- **Self-healing models**: on first use in a process, the master model gets a 25 s warm-up ping; hanging models are marked dead instantly. Timeouts/404/5xx/quota fail over along the lane fallback chain (`gemini-3-flash-preview → gemini-flash-lite-latest → gemini-3.5-flash` for master; `gemini-3.1-flash-lite → gemma-4-31b-it` for slave).
- **Structured outputs** (`lib/ai/schemas.ts`): every JSON task uses `responseMimeType: application/json` + a `responseSchema` built with the SDK `Type` enum. `thinkingLevel: HIGH` (user-tunable) and Google Search grounding is opt-in per task (digest only) because search + thinking + schema can hang smaller models.
- **Prompts** (`lib/ai/prompts.ts`): every prompt = persona (Rokky) + compact exam context (pattern, sections, negative marking, syllabus with PYQ/difficulty tags, trends) + task rules + explicit schema recap + "return only JSON".

## Quiz lifecycle

1. **Generation** — `/api/ai` task `quiz`: slave drafts N MCQs (schema-constrained); master validates and returns corrected replacements; a deterministic hygiene pass (option count, answer bounds, dedupe) runs last. Offline path assembles bundled PYQ-style samples.
2. **Attempt** — `/quiz/[quizId]` resolves/creates an in-progress attempt; answers persist debounced via PATCH; per-section timers lock sections; timeout auto-submits.
3. **Submission** — `/api/attempts/[id]/submit`: (a) deterministic scoring with negative marking + guess audit (<8 s answers); (b) mastery-map update; (c) master-lane AI analysis into the report schema; (d) `buildReportMarkdown()` merges score + LLM data into the predesigned markdown card with embedded SVG charts. AI failure degrades gracefully to an honest offline report.

## Mastery algorithm (`lib/engine/mastery.ts`)

- Per-question **performance signal** in [0,1.15]: correct = `(0.8 + 0.05·difficulty)·timeFactor` (hard-correct counts more); wrong = `0.18·(0.85 + 0.05·difficulty)` (wrong-on-easy hurts more); fast-correct boosts, unattempted gives no signal.
- **Adaptive EWMA**: `m ← m + α·(x − m)` with `α = 1/(1+n)` — early evidence moves fast, later evidence refines.
- **Forgetting decay**: `m·e^(−Δt/30d)` applied at read time (not stored), so a neglected topic decays naturally.
- **Confidence**: `1 − e^(−n/5)`; **readiness** = decayed mastery × (0.65 + 0.35·confidence) — unproven mastery is discounted.
- **Classification**: strong ≥ 72% (with ≥55% confidence), weak < 45%, else developing; n=0 → unrated.
- **Recommendations** = `(1 − readiness) × topic weight × exam-proximity boost (≤120 days) × weak-streak boost × PYQ factor` — ranked, with human-readable reasons.

## Storage (`lib/store/db.ts`)

Single `data/db.json` (gitignored). Writes are serialized through a promise chain and atomic (tmp file + rename). Corrupt files are backed up and reset. `DATA_DIR` env overrides the location (used by tests). The env `GEMINI_API_KEY` is treated as an extra fallback key.

## Report pipeline (`lib/report/`)

- `charts.ts` — pure SVG string builders (donut, bar, radar, sparkline, progress ring, stat chips); labels are HTML-escaped.
- `template.ts` — the predesigned markdown card: score header, accuracy donut, section bars, topic radar, LLM sections (verdict, strengths, weaknesses, topic map chips, action plan, reality check, motivation), and a data-driven topic scorecard table.
- Rendering: `MarkdownView` (client) runs `marked.js` + a `:::callout` preprocessor + DOMPurify with an SVG-preserving allowlist (scripts/event-handlers stripped — covered by tests). Print stylesheet → PDF export.

## Exam knowledge base (`content/exams/*.json`)

Each exam file: stages, patterns (sections/questions/marks/durations/negative), syllabus (subject+ topic weights, PYQ frequency 1–5, difficulty 1–5, subtopics), trends, sources, sample questions with explanations, and a plan template. Used for: prompt context, mini-mock scaling, offline quizzes, mastery weighting, recommendations, plan templates.
