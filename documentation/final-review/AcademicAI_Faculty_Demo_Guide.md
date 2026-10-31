# AcademicAI — Practical Faculty Demonstration Guide

**Project:** AcademicAI — NLP-Based Academic Intelligence and Personalized Student Assistance Platform  
**Target Course:** CSI4001 — Natural Language Processing and Computational Linguistics (EPJ Component)  
**Evaluator:** Prof. Vijayarajan V, School of Computer Science and Engineering, VIT  
**Anchor Review Date:** October 31, 2026  
**System Status:** 100% Operational (11/11 automated suites passing, zero build warnings)  

---

## 1. Demonstration Setup & Access Credentials

### Local Service Initialization
```bash
# In terminal:
cd "d:\My Projects\nlp\academic ai"
npm start
# Server listens at http://localhost:3000
```

### Pre-Configured Demo Credentials
| Persona | Email / Identifier | Password | Assigned Role & Scoped Courses |
| :--- | :--- | :--- | :--- |
| **Primary Student** | `student@academic.ai` / `21BDS0142` | `student123` | Student: CSE4001, CSE3002, CSE2004 |
| **Primary Faculty (NLP)** | `faculty.raman@academic.ai` | `teacher123` | Faculty Lead: `CSE4001` (Natural Language Processing) |
| **Faculty (ML)** | `faculty.kulkarni@academic.ai` | `teacher123` | Faculty Lead: `CSE3002` (Machine Learning) |
| **Faculty (OS)** | `faculty.swaminathan@academic.ai` | `teacher123` | Faculty Lead: `CSE2004` (Operating Systems) |

---

## 2. 12-Step Step-by-Step Practical Demonstration Protocol

### Step 1: Student Command Dashboard (`/dashboard`)
- **Action:** Open `http://localhost:3000/dashboard` logged in as student.
- **Visual Features to Point Out:**
  - Header greeting displaying current local date: **`Sat, 31 Oct 2026`** in Asia/Kolkata standard time.
  - 4 Key Metrics: Upcoming Deadlines, Active Courses (3), Tasks Pending, Overall Progress.
  - **Today's Prioritized Attention List:** Displays tasks ranked by the additive priority model with explicit factor tags (e.g. Critical, High, Medium).
  - **7-Day Cognitive Workload Chart:** Shows daily task concentration from Today (Oct 31) across the next 7 days, excluding completed or cancelled tasks.
- **What to Say to Faculty:**  
  *"AcademicAI starts by giving the student an actionable overview grounded in the current academic date—October 31, 2026. Every item is prioritized deterministically based on deadline proximity and course weightage, preventing cognitive overload."*

---

### Step 2: Ingesting an Unstructured Academic Notice (`/inbox`)
- **Action:** Navigate to `http://localhost:3000/inbox`. Paste the following authentic text into the analysis box:
  ```text
  School of Computer Science & Engineering Circular:
  All students registered in Natural Language Processing (CSE4001) must submit
  their Capstone Project Interim Report on Canvas by this Wednesday, November 4, 2026
  at 11:59 PM IST. Weightage: 20 marks. Late submissions will incur a 2-mark penalty.
  ```
- **Click:** **"Analyze Notice"**.
- **Visual Output to Verify:**
  - Category Detected: `ASSIGNMENT` / `PROJECT`
  - Course Code: `CSE4001`
  - Submission Platform: `Canvas`
  - Normalized Deadline: `Nov 4, 2026, 11:59 PM IST` (Asia/Kolkata timezone)
  - Notice Relationship: `NEW`
  - Priority Level: `HIGH` (Score: 65 — Base 15 + Approaching Deadline 20 + Weightage 20 + Penalty 10)
- **Click:** **"Confirm & Create Task"**.
- **What to Say to Faculty:**  
  *"The NLP pipeline instantly extracts the academic intent, course code, submission platform, and normalizes the conversational relative deadline into an absolute timestamp in Indian Standard Time, explaining the exact point calculation."*

---

### Step 3: Demonstrating 5-Way Notice Change Intelligence
- **Action:** Stay in `/inbox`. Now paste an updated circular for the exact same assignment:
  ```text
  Attention CSE4001 Students:
  Due to the upcoming placement drive, the Capstone Project Interim Report deadline
  originally due on November 4 has been postponed to Saturday, November 7, 2026 at 5:00 PM IST on Canvas.
  ```
- **Click:** **"Analyze Notice"**.
- **Visual Output to Verify:**
  - Notice Relationship Badge: `RESCHEDULED` (Amber badge)
  - Change Audit Diff: Displays previous deadline (`Nov 4, 2026`) versus new deadline (`Nov 7, 2026`).
  - Proposed Action: Updates existing task in-place instead of creating a confusing duplicate.
- **Click:** **"Apply Reschedule"**.
- **What to Say to Faculty:**  
  *"Notice how AcademicAI doesn't blindly create a duplicate task. Its 5-way change intelligence recognizes this as a reschedule, logs an immutable diff, and updates the student's timeline."*

---

### Step 4: Circular Cancellation & Zero Fabrication Check
- **Action:** In `/inbox`, paste:
  ```text
  CSE4001 Announcement: Tomorrow's guest lecture in SJT 402 has been cancelled due to speaker illness.
  ```
- **Click:** **"Analyze Notice"**.
- **Visual Output to Verify:**
  - Category: `CLASS_CANCELLATION`
  - Relationship: `CANCELLED`
  - Task Status: Automatically marked `CANCELLED` and completely removed from the active workload radar.
- **What to Say to Faculty:**  
  *"When a class or exam is cancelled, the system marks the activity as cancelled and purges it from the cognitive workload radar so the student's daily pressure metric reflects actual pending commitments."*

---

### Step 5: Task Management & Verifiable Evidence Drawer (`/tasks`)
- **Action:** Navigate to `http://localhost:3000/tasks`.
- **Interactions:**
  - Toggle filters between **All**, **Today**, **Upcoming**, and **Completed**.
  - Click on any task row (e.g. `[CSE4001] Capstone Project Interim Report`).
  - Notice the **Evidence Drawer** opening on the right side of the screen.
- **Visual Output to Verify:**
  - Displays the exact verbatim sentence from the original circular where the deadline and penalty were announced.
  - Displays one-click toggle to mark task completed or pending.
- **What to Say to Faculty:**  
  *"Every task in AcademicAI is backed by verifiable provenance. Students and faculty can click any item to see the exact sentence extracted from the professor's circular, ensuring zero hallucination."*

---

### Step 6: Dynamic Syllabus Calendar (`/calendar`)
- **Action:** Navigate to `http://localhost:3000/calendar`.
- **Interactions:**
  - View the **Month View**: Notice October 2026 is rendered with the current date (**Oct 31**) highlighted with a purple `TODAY` badge.
  - Click the **Next Month (`>`)** arrow: Moves smoothly to **November 2026**, displaying the newly scheduled Capstone Report on November 7.
  - Click the **Previous Month (`<`)** arrow: Navigates back to **September 2026**, where historical past commitments remain accessible without being wiped.
  - Switch to **Week View**: Shows the active 7-day week with day labels and event dots.
- **What to Say to Faculty:**  
  *"The calendar is completely dynamic and synchronized with the underlying database. It preserves historical September records while clearly anchoring today as October 31, 2026, and charting upcoming November deadlines."*

---

### Step 7: Cognitive Workload Radar & Risk Assessment (`/analytics`)
- **Action:** Navigate to `http://localhost:3000/analytics`.
- **Visual Features:**
  - **Academic Risk Radar:** Identifies assessment clashes (e.g. exams or projects falling within 48 hours of each other).
  - **Effort Horizon Breakdown:** Separates urgent commitments from distant commitments to preserve student cognitive bandwidth.
  - **Anti-Fatigue Notification Suppression:** Shows which alerts were delivered immediately versus held for the morning digest to respect quiet hours (22:00 to 07:00 IST).
- **What to Say to Faculty:**  
  *"AcademicAI models cognitive bandwidth. By filtering out completed tasks and clustering overlapping deadlines, it advises students on when to start work early to avoid last-minute stress."*

---

### Step 8: Academic Assistant with Grounded Gating (`/assistant`)
- **Action:** Navigate to `http://localhost:3000/assistant`.
- **Query 1:** Ask: *"What are my deadlines for CSE4001 this week?"*
  - The assistant executes a grounded tool call to `getStudentTasks` and returns only the verified tasks with dates.
- **Query 2 (Destructive Gating Test):** Ask: *"Delete all my tasks for tomorrow."*
  - The assistant responds: *"Destructive action requires explicit confirmation. Are you sure you want to delete these tasks? Please confirm."*
- **What to Say to Faculty:**  
  *"The Academic Assistant is strictly grounded. It cannot hallucinate deadlines not in the database, and enforces a mandatory two-step confirmation gating before executing any destructive changes."*

---

### Step 9: Switching to Faculty Portal (`Dr. P. Raman`)
- **Action:** Open `http://localhost:3000/faculty-course-intelligence` (or switch cookie session to `faculty.raman@academic.ai`).
- **Visual Features to Point Out:**
  - Header displays instructor title: **Dr. P. Raman (FAC-NLP-01)**.
  - Course Scoping: Strictly displays **CSE4001 — Natural Language Processing**.
  - **Cohort Overview:** 60 total enrolled students (42 Submitted, 18 Not Submitted, 7 Overdue).
  - Assessment Collision Alert: Warns that 12 students have another exam in Machine Learning (CSE3002) within 48 hours.
- **What to Say to Faculty:**  
  *"Now we switch to the faculty perspective. Notice that Dr. Raman is strictly scoped to his authorized course, CSE4001. He gets immediate analytics on submission compliance and student assessment congestion."*

---

### Step 10: Syllabus & Rubric Management (`/rubrics`, `/syllabus`)
- **Action:** Navigate to `http://localhost:3000/rubrics`.
- **Visual Features:**
  - View the 5-Criterion Rubric for the NLP Capstone:
    1. Problem Formulation & Dataset Preparation (15 marks)
    2. Model Architecture & Transformer Formulation (20 marks)
    3. Quantitative Benchmark & Ablation Study (25 marks)
    4. Code Quality & Evidence Traceability (20 marks)
    5. Documentation & Faculty Report Rigor (20 marks)
  - Criterion Weight Sum Validator: Confirms `Total: 100/100 Marks` (Green checkmark).
- **What to Say to Faculty:**  
  *"Faculty can configure multi-criteria grading rubrics with weighted requirements. The system validates that weights sum to exactly 100% to guarantee fair, standardized evaluation."*

---

### Step 11: AI-Assisted Submission Evaluation with Offline Fallback (`/faculty-review`)
- **Action:** Navigate to `http://localhost:3000/faculty-review`.
- **Interactions:**
  - In the submission queue, select student `21BDS0142` (Capstone Project Report).
  - Click **"Evaluate Submission"**.
- **Visual Output to Verify:**
  - The evaluation completes within 1.2 seconds.
  - Displays **Suggested Score: 82.5 / 100**.
  - Shows criterion-by-criterion breakdown:
    - *Problem Formulation:* 13.5 / 15
    - *Model Architecture:* 17.0 / 20
    - *Benchmark & Ablation:* 20.0 / 25
    - *Code Quality:* 16.0 / 20
    - *Documentation:* 16.0 / 20
  - Under each criterion, displays **Verifiable Evidence Quotes** extracted directly from the student's report text.
  - Model Badge: Labeled transparently as `AcademicAI Deterministic Rubric Evaluator` (or `Gemini 2.5 Flash` if online API key active).
- **What to Say to Faculty:**  
  *"This is our dual-engine evaluation pipeline. It evaluates the student document against each criterion and cites exact sentences from the student's submission. Most importantly, if cloud internet is unavailable, our deterministic offline engine ensures the faculty's grading workflow never breaks."*

---

### Step 12: Faculty Approval and Permanent Grade Commitment
- **Action:**
  - On the evaluation review card, adjust the slider for *Documentation* from 16 to 18 marks.
  - Enter faculty feedback note: *"Strong technical contribution; excellent error analysis."*
  - Click **"Approve & Finalize Grade"**.
- **Visual Output to Verify:**
  - The submission badge changes to a green **`GRADED`** status with final score **84.5 / 100**.
  - Grade is committed permanently to SQLite; student dashboard updates immediately.
- **What to Say to Faculty:**  
  *"AI suggestions are strictly advisory. The professor retains full authority to adjust scores and must explicitly approve the grade before it is published to the student."*

---

## 3. Faculty FAQ & Defensible Talking Points

1. **Q: What happens if an unstructured notice mentions two different dates?**  
   *A:* "AcademicAI uses secondary deliverable extraction. For example, in test sample TS-001 which contained both a final exam date and an earlier lab submission window, both deliverables were extracted to the timeline so neither deadline was missed."

2. **Q: Does the system fabricate dates if a circular doesn't specify a time?**  
   *A:* "No. If a circular says 'due Friday' without a time, the temporal engine snaps to the institutional end-of-day standard (23:59:00 IST). If no date can be grounded, it flags the item as 'Confirmation Required' rather than guessing."

3. **Q: How does the system handle internet failure during faculty review?**  
   *A:* "Our architecture features a built-in deterministic rubric fallback. If the Google Gemini endpoint is unreachable, the system automatically evaluates the submission using grounded keyword and criterion overlap, producing verifiable scores and quotes with zero downtime."

