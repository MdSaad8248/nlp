# AcademicAI — Academic Intelligence & Notice Automation Platform

An academic productivity SaaS application designed for university course management, notice processing, temporal deadline reasoning, syllabus tracking, and assessment rubric intelligence.

Built for pairs of Students and Faculty members to streamline announcements, prevent missed deadlines, detect academic schedule conflicts, and extract deliverables from unstructured text and digital documents.

---

## 1. Project Overview & Core Objectives

University students and faculty frequently exchange academic updates across fragmented communication channels (learning portals, email lists, messaging groups). Important deadlines, rescheduled reviews, classroom swaps, and mark weightages are easily lost in circular noise.

**AcademicAI** solves this by providing:
1. **Multi-Role University Portal**: Separate Student and Teacher dashboards with cryptographic session authentication and strict data isolation.
2. **Academic Notice Ingestion**: Automated classification, entity extraction (course code, venue, platform, marks), and temporal reasoning (relative dates, deadlines, timezones).
3. **Change Intelligence**: Automatic duplicate detection, reschedule tracking (with visual diffs), and event cancellation handling (with reminder suppression).
4. **Persistent Syllabus Intelligence**: Database-persisted syllabus curriculum storage with grounded Q&A and verified source citations.
5. **Rubric & Assessment Intelligence**: Structured grading criteria extraction, total marks calculation, and discrepancy detection.
6. **Adaptive Notification Engine**: Deadline clustering, workload calculation, and cognitive fatigue prevention.

---

## 2. System Architecture & End-to-End Workflow

```
[Academic Notice / Uploaded Document / Circular]
                       │
                       ▼
         [File Validation & Extraction]
       (PDF parser / Tesseract.js OCR)
                       │
                       ▼
          [Academic Notice Ingestion]
  (extractAcademicNoticeWithModel via /api/ingest)
           ┌───────────┴───────────┐
           ▼                       ▼
  [DistilBERT / TF-IDF]    [Rule-Engine Fallback]
           └───────────┬───────────┘
                       │
                       ▼
     [Named Entity & Temporal Extraction]
 (Course codes, venues, platforms, marks, IST clock)
                       │
                       ▼
         [Change & Duplicate Engine]
 (Compares with existing DB records: NEW / DUP / RESCHEDULE / CANCEL)
                       │
                       ▼
         [User Review & Confirmation Gate]
                       │
                       ▼
     [Transactional Database Persistence]
 (Prisma ORM → SQLite dev.db / Scoped to Authenticated User)
                       │
                       ▼
    [Adaptive Notifications & Workload Engine]
  (7-day / 48-hour / 12-hour progressive alerts)
```

---

## 3. Student vs Teacher Roles & Permissions

The application implements role-based access control (RBAC) enforced server-side:

### Student Role
- **Private Data Scoping**: Tasks, notifications, study plans, and assistant conversations are scoped strictly to the authenticated student (`userId`). Student A cannot view Student B's private tasks.
- **Academic Exploration**: Read-only access to published course announcements, syllabi, and rubrics.
- **Personal Submissions**: Can ingest personal academic notices and query course syllabi/rubrics.
- **Access Boundary**: Strictly prohibited from faculty management portals (`/faculty-course-intelligence`, `/faculty-review`).

### Teacher Role (Faculty)
- **Course Management**: Authorized to manage assigned courses mapped via the database relation `CourseFaculty` (e.g., Dr. P. Raman is authorized for `CSE4001`).
- **Syllabus & Rubric Publishing**: Can upload, update, verify, and publish course syllabi and grading rubrics.
- **Announcement Authority**: Can broadcast official course notices and view class-level deliverable status.
- **Access Boundary**: Cannot modify private student tasks or access courses not assigned to their department profile.

---

## 4. NLP, Machine Learning & Rule-Engine Fallback

### Model Inference Path
- Ingestion (`/api/ingest`) invokes `extractAcademicNoticeWithModel()`.
- Machine learning models (`ml/models/baseline_tfidf` and `ml/models/transformer_distilbert`) classify notices into 11 academic categories (`ASSIGNMENT`, `QUIZ`, `EXAM`, `PROJECT`, `PROJECT_REVIEW`, `CLASS_CHANGE`, `CLASS_CANCELLATION`, `ATTENDANCE`, `ACADEMIC_EVENT`, `CIRCULAR`, `GENERAL_ANNOUNCEMENT`).
- **Safe Fallback**: If the ML service is unreachable or prediction confidence falls below threshold, the system automatically falls back to deterministic rule heuristics without downtime.

### Temporal Reasoning & Reference Clock
- Normalizes relative expressions ("tomorrow at 11:59 PM", "next Monday", "in 18 hours") to the official campus timezone (`Asia/Kolkata` / IST).
- Removes static runtime date assumptions. LIVE usage uses `new Date()`. Automated tests utilize an injectable reference clock (`setControllableReferenceClock()`) for reproducibility.

### Honest ML Evaluation Discrepancy
- **Synthetic Benchmark**: TF-IDF and DistilBERT achieve 100% on the template-similar 350-item synthetic dataset.
- **Realistic Noisy Documents (Milestone 7 Benchmark)**: Classification accuracy drops to **75.0%** (15 / 20) under OCR noise and ambiguous multi-clause wording.
- **Zero Fabrication**: The system never hallucinates dates or deliverables. Circulars without deliverables produce zero synthetic tasks.

---

## 5. Syllabus & Rubric Data Provenance

- **Database Persistence**: Saved in the SQLite database via models `Syllabus` and `Rubric`. Survived application restarts and browser refreshes.
- **Grounded Q&A**: Answers to curriculum questions (e.g., *"Which topics are in Module 3?"*) are cited directly from the stored curriculum.
- **Honest Missing Notices**: If a syllabus has not been uploaded for a course, the application explicitly states: *"No official syllabus has been uploaded yet for this course."* Seeded mock data is never silently substituted.
- **Rubric Discrepancy Warnings**: If the sum of criteria marks does not match the stated total (e.g. 110 marks on a 100-mark scale), a prominent discrepancy alert is displayed.

---

## 6. Supported File Types & Document Processing

- **Supported Formats**: Digital PDF (`.pdf`), PNG (`.png`), JPEG/JPG (`.jpg`, `.jpeg`).
- **File Validation**: Validates file size (≤ 10MB), MIME types, and verifies magic bytes (e.g., rejecting executable files renamed with `.pdf` extension).
- **OCR Engine**: Utilizes Tesseract.js for optical character recognition on scanned circulars and screenshots.
- **Limitations**: Hand-written text, extremely low-resolution photos (< 150 DPI), and complex multi-column tables may introduce word errors requiring user review in the confirmation modal.

---

## 7. Prerequisites & Tested Environment

- **Operating System**: Windows 10/11, macOS, or Linux.
- **Node.js**: v18.17.0+ (Tested on Node.js v20+ / v22+).
- **npm**: v9.0.0+.
- **Python** (Optional, for re-evaluating ML scripts): Python 3.10+ with `scikit-learn`, `joblib`.

---

## 8. Installation & Setup Instructions (Windows)

Follow these exact steps to run the application on a clean machine:

### Step 1: Open Terminal in Project Directory
```powershell
cd "D:\My Projects\nlp\academic ai"
```

### Step 2: Install Dependencies
```powershell
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` (or create `.env`):
```powershell
Copy-Item .env.example .env
```
Ensure `.env` contains:
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="academic-ai-demo-secret-key-32-characters-minimum"
PORT=3000
```

### Step 4: Initialize the Database & Seed Demo Records
```powershell
npm run db:push
npm run seed
```

### Step 5: Build and Run
**Production Mode (Recommended for Faculty Review):**
```powershell
npm run build
npm run start
```
**Development Mode:**
```powershell
npm run dev
```

Open your browser and navigate to: **`http://localhost:3000`**

---

## 9. Demo Accounts for Evaluation

Pre-provisioned accounts with cryptographic password verification:

| Role | Name | Email / Roll Number | Password | Authorized Courses |
|:---|:---|:---|:---|:---|
| **Student** | Saad (Student A) | `saad@academic.ai` (or `21BDS0142`) | `student123` | CSE4001, CSE3002, CSE2004 |
| **Student** | Priya (Student B) | `priya@academic.ai` (or `22BCS0218`) | `student123` | CSE4001, CSE3002, MAT2001 |
| **Teacher** | Dr. P. Raman | `faculty.raman@academic.ai` (or `FAC-NLP-01`) | `teacher123` | CSE4001 (NLP) |
| **Teacher** | Dr. S. Kulkarni | `faculty.kulkarni@academic.ai` (or `FAC-ML-02`) | `teacher123` | CSE3002 (ML) |

*(1-click demo login buttons are also provided directly on the landing page at `http://localhost:3000`).*

---

## 10. Automated Test Commands

To verify application correctness, run the following commands:

```powershell
# 1. Master Test Suite (Runs all 10 unit & subsystem test suites)
npm test

# 2. Live 15-Journey End-to-End Acceptance Suite (Runs against active server)
npx tsx scripts/test-live-user-journeys.ts

# 3. Dedicated Authentication, Multi-Role & Data Isolation Test
npm run test:auth

# 4. Comprehensive 15-Component System Evaluation Harness
npm run test:eval

# 5. TypeScript Static Verification
npx tsc --noEmit
```

---

## 11. Troubleshooting

- **Port Conflict (`EADDRINUSE: 3000`)**: If port 3000 is occupied, set `PORT=3001` in `.env` and start with `npm run start -- -p 3001`.
- **Database Lock (`SQLITE_BUSY`)**: Ensure only one server instance is accessing `dev.db`.
- **Database Reset**: To wipe and reset to pristine demo fixtures, run `npm run seed`.

---

## 12. Known Limitations

1. **Third-Party Messaging Gateways**: In-app notifications and scheduled alerts are persisted in SQLite. External WhatsApp/SMS gateways require external carrier API credentials.
2. **Institutional Single Sign-On**: The application runs its own cryptographic authentication and server-side session management. It is not integrated with official institutional LDAP/CAS systems.
3. **Complex Multi-Intent Circulars**: Circulars containing multiple unrelated announcements (e.g. an exam notice and an unrelated guest lecture) are classified under the dominant category.
