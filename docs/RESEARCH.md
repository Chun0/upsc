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
