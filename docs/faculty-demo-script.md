# AcademicAI — Faculty Defense & Demonstration Script

**Platform:** Academic Intelligence & Personalized Student Assistance Platform  
**Target Duration:** 8–10 Minutes  
**Demonstration URL:** `/faculty-review` or `/dashboard`  
**Execution Standard:** Zero Fabricated Data · Executable Intelligence Pipeline

---

## Demonstration Overview

This script provides an examiner-ready walkthrough of AcademicAI, showing how unstructured academic inputs (PDF syllabi, messy WhatsApp circulars, portal updates, and scanned notices) are converted into structured state, multi-factor risk scores, and grounded student assistance.

---

### Demo 1: Academic Announcement Ingestion & NLP Extraction
- **Input Given:**
  ```text
  "Guest lecture on Quantum Computing by Dr. Alistair Finch in Room SJT-312 on Friday, Oct 24, 2026 at 10:00 AM. Attendance is mandatory for CSE4001 students."
  ```
- **NLP Components Involved:**
  - Token Density Intent Classifier (`classifyAcademicDocument`)
  - University Named Entity Recognizer (`extractAcademicEntities`)
  - Temporal Resolution Parser in `Asia/Kolkata` (`parseTemporalExpressions`)
- **Structured Result Produced:**
  - Category: `EVENT` / `GENERAL_ANNOUNCEMENT`
  - Course Code: `CSE4001`
  - Venue: `SJT-312`
  - Normalized Timestamp: `2026-10-24T10:00:00+05:30`
- **Downstream Action:**
  - Creates a calendar event tagged with `CSE4001` and marks attendance priority as high.
- **What Faculty Should Observe:**
  - Real-time extraction of implicit course relations without relying on rigid JSON templates.

---

### Demo 2: Duplicate Notice Detection & Spam Suppression
- **Input Given:**
  ```text
  "MAT2001: Reminder - Differential Equations Quiz 2 will take place on Nov 12, 2026 at 10:00 AM in SJT-401."
  ```
- **NLP Components Involved:**
  - Change & Duplicate Intelligence Engine (`checkAcademicChanges`)
  - N-gram Cosine & Jaccard Lexical Overlap Evaluator
- **Structured Result Produced:**
  - Relationship: `DUPLICATE`
  - Matched Record: `Differential Equations Quiz 2 (event-mat2001-q2)`
  - Similarity Score: `> 0.88`
- **Downstream Action:**
  - Action: `MARK_DUPLICATE`. Suppresses redundant task creation and prevents duplicate student notifications.
- **What Faculty Should Observe:**
  - The system recognizes this as an announcement rebroadcast rather than creating a second quiz on the student's calendar.

---

### Demo 3: Rescheduled Notice with Previous vs. New Transition
- **Input Given:**
  ```text
  "CSE4001 Update: Project Phase 1 deadline has been shifted from Oct 10, 2026 at 5:00 PM to Monday, Oct 19, 2026 at 11:59 PM."
  ```
- **NLP Components Involved:**
  - Reschedule Transition Recognizer (`parseTemporalExpressions` + `checkAcademicChanges`)
  - Changed-Field Difference Engine
- **Structured Result Produced:**
  - Relationship: `RESCHEDULED`
  - Changed Fields: `[{ field: "deadline", oldValue: "2026-10-10 17:00", newValue: "2026-10-19 23:59" }]`
- **Downstream Action:**
  - In-place mutation of existing `Project Phase 1` record.
  - Recalculates 7-day cognitive workload pressure and purges obsolete reminders.
- **What Faculty Should Observe:**
  - Explicit tracking of the temporal shift; the old date is not orphaned and the new date takes immediate effect.

---

### Demo 4: Multimodal PDF / Scanned Document Intelligence
- **Input Given:**
  - Uploaded department PDF `CSE3002_Project_Specification.pdf` or camera photo of physical notice board.
- **NLP Components Involved:**
  - Buffer Magic-Byte File Type Validator (`validateDocumentFile`)
  - `pdf-parse` Streaming Text Extractor with Page Attributions
  - Tesseract OCR Engine with Confidence Scoring
- **Structured Result Produced:**
  - Extracted Text linked to `SourceEvidence` with `Page 1` citation.
  - OCR Confidence: `88%` with character noise recovery (`VELL0RE` $\rightarrow$ `VELLORE`).
- **Downstream Action:**
  - Attaches source file metadata directly to created deliverable, allowing 1-click citation verification in Academic Inbox.
- **What Faculty Should Observe:**
  - Zero fabricated OCR text; the exact page number and text span are retained for evidence inspection.

---

### Demo 5: Grounded AI Assistant Tool Execution
- **Input Given (Chat Prompt):**
  ```text
  "When is my next critical deliverable, what is the weightage, and where do I submit it?"
  ```
- **NLP Components Involved:**
  - Intent Router & Tool Selector (`AssistantEngine`)
  - Grounded Academic Tool: `get_upcoming_tasks(filterPriority: "CRITICAL")`
- **Structured Result Produced:**
  - Tool Invoked: `get_upcoming_tasks`
  - Grounded Record: `CSE3002 FAT Exam (40 marks, Oct 23 at 9:30 AM in SJT-401)`
- **Downstream Action:**
  - Synthesizes response citing exact marks, date, and venue with 0% ungrounded statements.
- **What Faculty Should Observe:**
  - Assistant does not make up deadlines; all answers strictly reference database records.

---

### Demo 6: Multi-Factor Academic Risk Radar
- **Input Given:**
  - Triggering workload scenario with FAT Exam (40 marks) and Capstone Submission (30 marks) scheduled within 36 hours.
- **NLP Components Involved:**
  - Multi-Horizon Risk Radar Engine (`analyzeAcademicRisks`)
  - Multi-Factor Collision Detector (`DEADLINE_CLUSTER`, `HIGH_WEIGHTAGE_SHORT_WINDOW`)
- **Structured Result Produced:**
  - Overall Risk: `CRITICAL` (Score: `88/100`)
  - Active Warnings: 2 high-impact assessments due within 48-hour window.
- **Downstream Action:**
  - Activates prominent warning banner on Academic Command Center dashboard with mitigation recommendations.
- **What Faculty Should Observe:**
  - Transparent, explainable scoring criteria rather than an opaque black-box number.

---

### Demo 7: Smart Study Planning with "Why Now?" Rationale
- **Input Given:**
  - Student asks: *"What should I work on right now?"* or clicks *"Generate Smart Plan"*.
- **NLP Components Involved:**
  - Constraint-Satisfaction Study Planner (`generateSmartStudyPlan`)
  - Pedagogical Rationale Synthesizer
- **Structured Result Produced:**
  - Ordered daily time-blocks prioritizing high-weightage and imminent deadlines.
  - Pedagogical Explanation: *"FAT Exam is scheduled first due to 40 marks weightage and 48-hour proximity."*
- **Downstream Action:**
  - Populates student timetable with non-overlapping focus sessions.
- **What Faculty Should Observe:**
  - Complete absence of hallucinated assignments; every block links to an authentic active task.

---

### Demo 8: Rubric & Requirement Gap Analysis
- **Input Given:**
  - Ingested Project Rubric: 4 criteria (Prototype: 30m, Tests: 20m, Benchmarks: 20m, Report: 30m).
  - Student Submission: Prototype + Report completed.
- **NLP Components Involved:**
  - Hierarchical Rubric Parser (`parseRubric`)
  - Requirement Completeness Matcher
- **Structured Result Produced:**
  - Criteria Extracted: 4 (Total: 100 marks)
  - Missing Criteria: `Automated Test Suite (20 marks)` & `Performance Benchmarks (20 marks)`
  - Completeness: `50%` (40 marks at immediate risk)
- **Downstream Action:**
  - Displays missing requirement checklist and alerts student to missing criteria prior to final submission.
- **What Faculty Should Observe:**
  - System extracts itemized rubric criteria from natural text and flags mark-loss risks before deadlines.

---

### Demo 9: Contradictory Notice Detection & Gating
- **Input Given:**
  - Notice A: *"CSE4001 DA2 due Friday, Oct 16 at 5:00 PM on Moodle."*
  - Notice B: *"CSE4001 DA2 due Sunday, Oct 18 at 11:59 PM on Google Classroom."*
- **NLP Components Involved:**
  - Contradiction Detector (`detectContradiction`)
  - Multi-Attribute Conflict Evaluator (Deadline & Platform)
- **Structured Result Produced:**
  - Conflict Detected: `true` (Severity: `HIGH`)
  - Conflicts: `deadline` (Oct 16 vs Oct 18), `submissionPlatform` (Moodle vs Google Classroom)
- **Downstream Action:**
  - Enforces `VERIFICATION_REQUIRED` status; freezes automatic calendar updates and alerts student to seek faculty clarification.
- **What Faculty Should Observe:**
  - Prevents erroneous submissions to incorrect portals or missing earlier deadlines by enforcing an explicit human-in-the-loop verification gate.

---

### Demo 10: Final Evaluation Benchmark & Scientific Integrity
- **Navigation:**
  - Navigate to `/faculty-review` $\rightarrow$ Click **"M8-E Final Evaluation Benchmark"** tab.
- **What to Present to Faculty:**
  1. **Benchmark Size & Split:** 110 real academic items (50 TRAIN / 25 DEV / 35 TEST).
  2. **Scientific Metric Discipline:**
     - Statistical NLP modules report Accuracy, Precision, Recall, and Macro-F1.
     - Deterministic rule engines report Scenario Success and Invariant Compliance.
     - Zero fabricated or approximate percentages.
  3. **Error Analysis Transparency:** Review failure modes documented on the untouched TEST set (slang ambiguity, extreme OCR noise, multi-clause reschedules).
  4. **Exportable Audit:** Click **"Export Log (JSON)"** or **"Export Audit (CSV)"** to demonstrate reproducible verification.
