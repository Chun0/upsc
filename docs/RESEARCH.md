# Research Plan & Findings — UDAAN (Government Exam Intelligence)

**Knowledge cutoff: January 2025.** All exam-pattern claims below were verified via live web research on 2026-08-13 and carry source links. Where sources conflicted, both positions are encoded with a note. Pattern fields are ingested by the app and injected as structured context into every LLM prompt.

## 1. Research plan (executed)

1. Identify the highest-volume Indian government/recruitment exams across five families: Civil Services (UPSC, MPPSC), Staff Selection (SSC CGL/CHSL), Banking (IBPS PO, SBI PO, RBI Grade B), Defence (NDA, CDS, AFCAT), Railways (RRB NTPC, Group D), Academics (UGC NET, CTET).
2. For each exam verify the **current** (2025–26 cycle) stage structure, per-section question/mark/duration split, negative-marking rule, and recent pattern changes.
3. Encode into `content/exams/*.json`: pattern tables, subject/topic syllabus with relative weights (estimates, clearly labelled), PYQ-frequency and difficulty tags, exam trends, sample PYQ-style questions with explanations, official source links, and a study-plan template.
4. These files are the single source of truth for: quiz/mock structure generation, LLM context injection, offline sample questions, mastery weighting, and plan generation.

## 2. Verified patterns (2025–26 cycles)

| Exam | Stage | Structure | Negative marking | Notes |
|---|---|---|---|---|
| UPSC CSE | Prelims | GS-I 100Q×2m (2h) + CSAT 80Q×2.5m (2h) | −1/3 | CSAT qualifying at 33% (66.67/200) |
| SSC CGL | Tier 1 | 100Q/200m/60m (4×25) | −0.50 | Tier 2: 150Q/450m; Section I (Maths 30+Reasoning 30, 1h lock), Section II (English 45+GA 25, 1h lock), Computer 20Q qualifying; −1 mark; Paper 3 removed 2025-26 |
| SSC CHSL | Tier 1 | 100Q/200m/60m (+2) | −0.50 | Tier 2: Section I 180m, Section II 180m (+3/−1), Computer qualifying |
| IBPS PO | Prelims | 100Q/100m/60m, sectional 20m | −0.25 | Mains REVISED 2026: 170Q objective 200m + descriptive 25m (3.5h) |
| SBI PO | Prelims | 100Q/100m/60m (20m sections) | −1/4 | Mains 2026: 170Q/200m (RCA 40/60, DI 30/60, GA/E/B 60/60, English 40/20) + descriptive 30m (reduced from 50) |
| RBI Grade B | Phase 1 | 200Q/200m/120m (Reas 60 45m, Eng 30 25m, Quant 30 25m, GK 80 25m) | −0.25 | Phase 2: ESI (30 obj+6 desc), English (3 desc), FM (30 obj+6 desc); Interview 75 |
| NDA | Written | Maths 120Q×2.5 (2.5h) + GAT 150Q×4 (2.5h) | −1/3 (−0.83 / −1.33) | 25% sectional cutoff each paper; SSB 900 |
| CDS | Written | English 120Q/100m, GK 120Q/100m, Maths 100Q/100m (IMA/INA/AFA), 2h each | −1/3 | OTA: no Maths paper |
| AFCAT | CBT | 100Q/300m/2h: Verbal 25, Numerical 18, Reasoning & Military 32, GA 25 | +3 / −1 | Section split per official-structure sources |
| RRB NTPC | CBT 1 | 100Q/100m/90m (GA 40, Maths 30, Reas 30) | −1/3 | CBT 2: 120Q/120m/90m |
| RRB Group D | CBT | 100Q/100m/90m (GS 25, Maths 25, Reas 30, GA+CA 20) | −1/3 | Then PET → DV/Medical |
| MPPSC | Prelims | GS 100Q×2m (2h) + CSAT 100Q×2m (2h) | 1/3 reported for 2026 (historically none) | CSAT qualifying 33% (2026 analysis); Mains 6 descriptive papers |
| UGC NET | CBT | Paper 1 50Q/100m + Paper 2 100Q/200m, single 3h session | none | 10 fixed Paper-1 units × 5Q |
| CTET | CBT | 150Q/150m/2.5h, Paper 1 & Paper 2 | none | CDP 30, Lang-I 30, Lang-II 30, Maths 30 / EVS 30 (P1); Maths/Sci 60 or SST 60 (P2) |

Sources: SSC CGL (examtarikh.in, adda247), SBI PO (bankopedia.co.in, indianexpress.com, practicemock), RBI Grade B (adda247, prepp.in, edutap.in), MPPSC (drishtiias.com, careerpower.in, govtselection.com), SSC CHSL (careers360, prepp.in), UPSC Prelims (clearias.com, theiashub.com), RRB NTPC (careerpower.in, class24.study), UGC NET (testbook.com, kopykitab.com, freejobalert.com), NDA (oswaalbooks.com, pwonlyias.com), AFCAT (ncaacademy.com, askfilo.com), CDS (pwonlyias.com), RRB Group D (testbook.com, adda247, pw.live), IBPS PO (oliveboard.in, careerpower.in, prepgrind.com), Gemini rate limits (tokenmix.ai, tinkerllm.com, aifreeapi.com).

## 3. Gemini API rate-limit reality (2026)

- Free tier (2026): Flash ~15 RPM / 1,500 RPD / 1M TPM; Flash-Lite ~30 RPM; Pro removed from free tier in April 2026; some sources list 5 RPM for older Flash tiers.
- **UDAAN defaults (conservative, user-tunable in Settings):** flash-family 5 RPM, flash-lite 15 RPM, gemma 30 RPM, pro 2 RPM. These protect against 429s regardless of tier.
- The orchestrator enforces per-(key × model) token buckets + round-robin across keys + 429 backoff, so limits are respected even with multiple keys.

## 4. Nuances that shaped the design

- Banking exams (IBPS/SBI/RBI) use **sectional timers** and sectional cut-offs → mock engine supports per-section countdown & locks.
- SSC Tier-2 uses **section time-locks** (1h per section) → same mechanism.
- UPSC/MPPSC/NDA have **descriptive/mains** phases → dedicated descriptive mode with rubric-based AI scoring.
- Negative marking varies (0, 0.25, 1/3, 0.5, 1) → scoring engine is parameterised per exam/section; the report includes a **guess audit** (questions answered in <8s that were wrong) with break-even math.
- CSAT-type papers are **qualifying** → mini-mocks flag qualifying-vs-merit sections.
- Exams without negative marking (UGC NET, CTET) → strategy copy changes ("attempt everything").


## 5. Corrections after re-verification (2026-08-14)

A second verification pass against live 2025-26 sources (guidely, pw.live, shiksha,
mahendras, adda247, examtarikh, careerpower, sarkariresult.zone, bankersadda,
practicemock, edutap, prepp, ncaacademy) found and fixed these errors:

| Exam | Corrected |
|---|---|
| IBPS PO Mains | 155 objective Q (not 170): RCA 45 / DI 35 / English 35 / GA 40 + 2 descriptive |
| SBI PO Prelims | 40/30/30 (English 40, Quant 30, Reasoning 30) — 2025-26 revision |
| MPPSC Prelims | 3 marks/Q = 300 marks, 1/3 negative introduced 2026 (CSAT qualifying 33% per most sources; some cite 40/30 — both noted) |
| SSC CHSL Tier 2 | 135 Q / 405 marks (Computer 15 Q / 45 m), not 120/360 |
| UPSC CSE Mains | accurate 9-paper split (Essay, GS I-IV, Optional I-II = 1750 + English & Regional qualifying) |
| RBI Grade B Phase 2 | ESI/FM papers are 120 min (30 objective + 90 descriptive) |
| SSC CGL | Quant topic weights normalised to sum 1.0 |

Also: 105 new PYQ-style sample questions added across all 14 exams (offline bank +
AI style anchors); `PatternDef.mode` now distinguishes objective/mixed/descriptive/
interview stages so descriptive papers are never offered as MCQ mocks.


## 6. IFSCA Grade A added (2026-08-14, second audit)

A new exam — **IFSCA Grade A (Assistant Manager)** — was added from the user's
126-PDF research repository (hrkartiktomar-netizen/Exam_preparation: 790 unique
PYQs from 2022/2023/2024 papers) and cross-checked against live pattern sources
(oliveboard, ixambee, practicemock, freejobalert, testbook):

- **Structure**: Phase I (Paper 1 common: GA-financial 25 + English 25 + Quant 25 +
  Reasoning 25 = 100 Q/100 m/60 min; Paper 2 General stream: 50 Q×2 = 100 m/60 min)
  → Phase II (Paper 1 descriptive English 100 m; Paper 2 stream objective 50 Q×2)
  → Interview (15% weightage).
- **Negative marking**: 1/4 of marks in every objective paper; cut-offs 30% (Paper 1)
  and 40% (Paper 2), no sectional cut-off in Paper 1.
- **5 options per MCQ (A–E)** — this exam is the first in the knowledge base with
  `"options": 5`; the quiz engine, AI prompt, hygiene pass and tests were made
  option-count-aware (`exam.options ?? 4`).
- **Eligibility (General)**: Master's in Finance/Economics/Commerce/Econometrics or
  Bachelor's in Commerce/IT/CS/LLB (60%); age 21–30 (2025 cycle: 20 vacancies —
  General 12, Legal 4, IT 4).
- 16 real PYQ-style samples encoded (IFSCA Act, powers transfer 1 Oct 2020, IBU
  capital USD 20 M, IPO minimum USD 15 M, 100% tax holiday for 10/15 years, Deakin
  University, APY 15% equity cap, PM-SYM ₹3,000 at 60, NABARD refinance, etc.).
