# Feature list & roadmap

## ✅ Implemented

**Core loop**: onboarding → exam hub → AI/offline quizzes → sectional mock tests → descriptive papers with AI grading → markdown report cards (marked.js) → mastery analytics → spaced-repetition revision.

**AI / agentic**: master+slave model routing, per-lane serial queues, multi-key pool (round-robin/failover), per-(key×model) RPM buckets, 429/backoff/quota handling, model fallback chains with warm-up probes, thinking-level control, Google Search grounding (digest), structured JSON schemas for all outputs, streaming summaries.

**Exams**: 14 exams with verified 2025–26 patterns, syllabus weights, PYQ tags, trends, samples, plan templates, countdown urgency.

**Engine**: negative-marking scoring, sectional timers, mark-for-review, guess audit, EWMA+decay+confidence mastery, weighted recommendations, SM-2-lite flashcards, activity streaks + 60-day heatmap.

**UX**: 3D scroll-panned OMR answer-sheet hero, "Paper & Ink" light design system (ballpoint blue / examiner red on warm paper), custom stroke icon set, Fraunces + Public Sans + JetBrains Mono type, bespoke motion tokens, Rokky mascot + quips, toasts, empty/loading states, print-to-PDF reports, mobile bottom nav.

**Quality**: 84 unit tests, 9 live-model integration tests, typecheck, corrupt-store recovery, XSS sanitization tests.

## 🔭 Roadmap (future ideas, in priority order)

1. **Multi-user auth** (accounts, cloud sync) — currently single-user by design.
2. **Image/DI questions** — vision models for data-interpretation figures.
3. **Question-image rendering** in quiz cards (OCR'd PYQs).
4. **PDF export of study notes** (server-side rendering).
5. **Exam calendar** — auto-updated notification dates from official sites.
6. **Voice coach** — Rokky speaks your daily plan (TTS).
7. **Rapid-fire / flash quiz modes** — 20s-per-question arcade practice.
8. **CSAT/comprehension passage bank** with difficulty laddering.
9. **PYQ corpus import** — paste/upload past papers → structured question bank.
10. **Sectional cutoff simulation** — predict prelims qualification per exam.
11. **PWA/offline caching** for the quiz engine.
12. **Weekly email-style digest export** (markdown → clipboard).
13. **Comparison mode** — attempt the same quiz twice, diff the mistakes.
14. **Time-per-topic heat analytics** — where your seconds actually go.
15. **Multi-agent debate mode** — master vs slave argue over a tricky concept, you judge.
