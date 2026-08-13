# Testing — UDAAN

## Layers

1. **Unit tests** (`tests/unit`, `npm test`) — 84 tests, deterministic, no network:
   - `keypool` — round-robin/failover, RPM buckets, refill math, error-key skipping
   - `mastery` — EWMA convergence, decay, confidence, classification, recommendations, proximity boost
   - `quiz` — scoring with negative marking, multi-select all-or-nothing, fill normalization, guess audit, penalty capping, mini-mock scaling, offline builder
   - `store` — persistence, atomicity, corrupt-file recovery, key masking
   - `markdown` — callout preprocessor (incl. unclosed-block safety), marked tables, DOMPurify XSS stripping + SVG preservation
   - `charts` — donut/bar/radar/sparkline/progress-ring builders + label escaping
   - `report` — template sections, offline fallback honesty
   - `analytics` — streaks, heatmap, radar, trends
   - `utils` — seeded shuffle, JSON-loose parsing, normalization

2. **Real-model integration tests** (`tests/integration`, `RUN_AI=1 GEMINI_API_KEY=... npx vitest run tests/integration`) — 9 tests against live Gemini, cost-conscious per the project brief:
   - `models.list` validity, flash-lite MCQ generation (schema conformance), gemma-4-31b MCQ, outline, flashcards, master rubric scoring, master report-card schema, multi-agent pipeline (slave draft → master validation), orchestrator status.
   - Rate-limit aware: ≤6 flash-lite calls, ≤3 flash calls, 1 gemma call.

3. **Endpoint smoke** (manual, see below) — full lifecycle over HTTP.

## What real-model testing discovered (honest log)

- The provided key is **valid**; `models.list` returns 50+ models.
- `gemini-flash-latest` **hangs** for `generateContent` on this (new-user) account; `gemini-2.5-flash` returns **404 (no longer available to new users)**; `gemini-flash-lite-latest`, `gemma-4-31b-it`, `gemini-3-flash-preview`, `gemini-3.5-flash` work. → Built warm-up probes + fallback chains; verified the app self-heals (report analysis succeeded via fallback).
- Flash-family quota is bursty on this test key; the orchestrator cools models for 10 min and the report pipeline degrades gracefully to offline analysis.
- Search grounding + thinking + schema on small models can hang → search is now opt-in per task (digest only).

## Manual smoke (documented)

```bash
npm run dev &
# 1. dashboard + pages
for p in / /exams /exams/upsc-cse /study /practice /mocks /descriptive /revision /reports /analytics /settings; do
  curl -s -o /dev/null -w "%{http_code} $p\n" localhost:3000$p
done
# 2. offline quiz lifecycle
QID=$(curl -s -X POST localhost:3000/api/quizzes -H 'Content-Type: application/json' -d '{"offline":true,"examId":"ssc-cgl","count":5}' | jq -r .id)
AID=$(curl -s -X POST localhost:3000/api/attempts -H 'Content-Type: application/json' -d "{\"quizId\":\"$QID\"}" | jq -r .id)
# answer + submit -> /reports/$AID renders the markdown card
# 3. AI quiz generation (needs key)
curl -s -X POST localhost:3000/api/ai -H 'Content-Type: application/json' -d '{"task":"quiz","payload":{"examId":"ssc-cgl","count":5,"difficulty":2}}'
```
