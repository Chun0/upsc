# The Intelligence System — how UDAAN "knows" each exam

*Last updated 2026-08-14. Covers the single source of truth, the offline path,
and the prompt/AI path, plus the 2025-26 corrections made in this audit.*

## 1. One source of truth: `content/exams/*.json`

Every exam's intelligence lives in one JSON file (14 exams today). Nothing else
hardcodes exam facts. Each file carries:

| Field | What it drives |
|---|---|
| `patterns[]` (+ per-pattern `mode`, per-section `mode`) | mock scaling, section timers, negative marking, the mock builder's stage list, prompt context |
| `syllabus[]` (`subject.weight`, `topic.weight`, `pyq` 1-5, `difficulty` 1-5, `sub[]`) | mastery weighting, readiness radar, recommendations, the study-plan generator, prompt context |
| `samples[]` (PYQ-style Q + 4 options + answer + explanation + subject/topic/difficulty) | **offline quiz/mock bank** and the **style-reference anchor** in AI quiz prompts |
| `trends[]`, `sources[]`, `plan{}` | prompt context, exam detail page, plan templates |

`lib/content/exams.ts` exposes `listExams()`, `getExam()`, `allTopics()`,
`examContextText()` — the last one renders the compact **exam context block**
injected into *every* LLM prompt (pattern, sections, negative marking, syllabus
with PYQ/difficulty tags, trends).

## 2. The offline path (works with zero API keys)

`lib/engine/quiz.ts::buildOfflineQuiz()` assembles a quiz purely from
`exam.samples[]`, so the product functions fully offline:

- filter by subject/topic; cap at the bank size; deterministic seeded shuffle;
- marks-per-question and negative fraction come from the pattern (so a UPSC GS
  offline quiz uses +2/−0.66, an AFCAT quiz uses +3/−1);
- for mini-mocks, `SECTION_SUBJECT_HINTS` maps a section name (e.g.
  "Quantitative Aptitude") to matching sample subjects.

That is why the sample bank matters: **offline mode is only as rich as the bank.**
This audit expanded the bank from ~4-6 to 10-16 authentic PYQ-style questions
per exam (105 new, verified against stable facts).

## 3. The AI path (prompt assembly → schema → orchestrator)

`app/api/ai/route.ts` dispatches a task id to a prompt builder in
`lib/ai/prompts.ts`; every prompt = **Rokky persona + `examContextText(exam)` +
task rules + a style-reference anchor (first sample) + explicit schema recap +
"return only JSON"**. Output is constrained by the Gemini `responseSchema`
(`lib/ai/schemas.ts`), and the call runs through the two-lane orchestrator
(`lib/ai/orchestrator.ts`: slave drafts → master validates, serial queues,
multi-key rotation, RPM buckets, fallback chains).

The quiz pipeline (`/api/ai` task `quiz`) is the flagship:
1. slave lane drafts N MCQs (schema-constrained);
2. master lane validates and returns corrected replacements;
3. a deterministic hygiene pass clips options to 4, clamps `answerIndex`, and
   de-duplicates — so the final paper is clean even if a model misbehaves.

Mini-mocks (`app/api/mocks/route.ts`) generate **per-section** on the slave lane
using each section's real proportion, marks and negative fraction.

## 4. What "mode" encodes (added this audit)

Each `PatternDef.mode` is `objective | mixed | descriptive | interview`:

- **objective** — pure MCQ paper (Tier 1 of SSC, Prelims of bank exams, …).
- **mixed** — objective + descriptive in one paper (IBPS PO Mains, RBI Grade B
  Phase 2 ESI/FM). Descriptive sections carry `"mode": "descriptive"`.
- **descriptive** — Mains answer-writing papers (UPSC Mains, RBI English).
- **interview** — personality test.

Consumers: the mock builder and `/api/mocks` only offer objective/mixed stages
and drop descriptive sections (`lib/engine/quiz.ts::miniMockPlan` filters
`s.mode !== "descriptive"`). This fixed a real bug where RBI Grade B's
descriptive Phase-2 papers were offered as MCQ mocks.

## 5. Corrections made this audit (verified 2026-08-14 vs live sources)

| Exam | Was (wrong) | Now (verified) |
|---|---|---|
| IBPS PO Mains | 170 objective Q | **155 objective Q** (RCA 45, DI 35, English 35, GA 40) + 2 descriptive |
| SBI PO Prelims | 30/35/35 | **40/30/30** (English 40, Quant 30, Reasoning 30 — 2025-26 revision) |
| MPPSC Prelims | 100Q×2m=200, no negative | **100Q×3m=300, 1/3 negative (introduced 2026)** |
| SSC CHSL Tier 2 | 120Q/360m, Computer 20Q | **135Q/405m, Computer 15Q/45m** |
| UPSC CSE Mains | "GS I–IV 20Q/250m, Optional 20Q" | accurate 9-paper split (7 merit papers + 2 qualifying), each tagged descriptive |
| RBI Grade B Phase 2 | ESI/FM duration 90 min | **120 min (30 obj + 90 descriptive)**, descriptive sections tagged |
| SSC CGL Quant weights | summed to 1.20 | normalised to 1.00 |

Sources were cross-checked across multiple 2025-26 exam-pattern analyses; where
sources conflict (MPPSC CSAT qualifying 33% vs 40/30%), both positions are
encoded in the JSON notes rather than asserted.

## 6. Honest limits

- `samples[]` are **hand-curated PYQ-style** questions (stable facts), not scraped
  live PYQ PDFs — they seed offline mode and anchor the AI's style, but the AI is
  the primary question generator.
- Volatile current-affairs facts are deliberately avoided in the bank (the daily
  digest covers those with Google Search grounding).
- Exam patterns change; the JSONs carry dated notes and source links so a human
  can re-verify against the official notification before relying on them.
