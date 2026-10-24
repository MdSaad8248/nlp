/**
 * lib/evaluation/m7-test-fixtures.ts
 *
 * Milestone 7 — Multimodal Academic Document Intelligence
 * Comprehensive Evaluation Suite (M7-G)
 *
 * 26 realistic benchmark scenarios covering:
 * - Text PDF
 * - Scanned PDF
 * - Image screenshot
 * - OCR noise & typographical variations
 * - Multi-page PDF
 * - Multi-notice document
 * - All 5 relationships: NEW, DUPLICATE, UPDATED, RESCHEDULED, CANCELLED
 * - Deadline, time, venue, platform, marks/weightage extraction
 * - Conditional notices & defaulters
 * - Timetable / class change
 * - Attendance notice
 * - Failure modes: unreadable image, empty PDF, corrupted file, oversized file, unsupported extension
 * - Unrelated non-academic circular
 * - Full end-to-end downstream intelligence propagation (M2 -> M3 -> M4 -> M5 -> M6)
 */

import { AcademicRelationship } from "../nlp/schemas";
import { CandidateExistingRecord } from "../nlp/change-intelligence";

// ─── Types ────────────────────────────────────────────────────────────────────

export type M7DocumentType =
  | "TEXT_PDF"
  | "SCANNED_PDF"
  | "IMAGE_SCREENSHOT"
  | "MULTI_PAGE_PDF"
  | "MULTI_NOTICE_PDF"
  | "UNREADABLE_IMAGE"
  | "EMPTY_PDF"
  | "CORRUPTED_FILE"
  | "OVERSIZED_FILE"
  | "UNSUPPORTED_TYPE"
  | "UNRELATED_DOCUMENT";

export interface M7TestCase {
  id: string;
  label: string;
  documentType: M7DocumentType;
  description: string;
  /** Declared filename */
  filename: string;
  /** Whether the file validator should accept this file */
  fileValidationExpected: boolean;
  /** Whether text extraction is expected to yield readable text */
  extractionExpected: boolean;
  /** Simulated file content / buffer for validation tests */
  simulatedBuffer?: Buffer;
  /**
   * Simulated extracted combinedText from pdf-parser.ts or image-ocr.ts.
   * Empty string for empty/unreadable documents.
   */
  extractedDocumentText: string;
  /**
   * Ground truth text before OCR noise was added (used for CER/WER computation).
   */
  groundTruthCleanText?: string;
  /**
   * For multi-page PDFs: per-page text content
   */
  pages?: Array<{
    pageNumber: number;
    text: string;
  }>;
  /** Document source metadata */
  documentSourceMeta: {
    filename: string;
    documentFileType: "PDF" | "IMAGE";
    primaryExtractionMethod: string;
    totalPages: number;
    averageOcrConfidence?: number;
  };
  /** Pre-existing records in DB for relationship check */
  existingRecords: CandidateExistingRecord[];
  /** Expected academic classification category (null if unreadable/failure) */
  expectedClassification?: string | null;
  /** Expected entities */
  expectedEntities?: {
    courseCode?: string | null;
    platform?: string | null;
    venue?: string | null;
    marks?: number | null;
    condition?: string | null;
  };
  /** Expected temporal properties */
  expectedTemporal?: {
    hasDeadline?: boolean;
    hasTime?: boolean;
    hasReschedule?: boolean;
    previousHint?: string;
    newHint?: string;
  };
  /** Expected academic relationship (null if unreadable/failure) */
  expectedRelationship?: AcademicRelationship | null;
  expectedMatchedTitle?: string;
  expectedChangedFields?: string[];
  expectedProposedAction?: string;
  expectedReschedule?: {
    previousHint: string;
    newHint: string;
  };
  /** Expected number of academic deliverables extracted */
  expectedDeliverablesCount?: number;
  /** Flag for end-to-end downstream verification (M4/M5/M6) */
  isEndToEndEcosystemCase?: boolean;
}

// ─── Mathematical Metrics Utilities (WER / CER) ───────────────────────────────

/**
 * Standard Levenshtein distance on token arrays.
 */
export function computeTokenLevenshtein(tokensA: string[], tokensB: string[]): number {
  const m = tokensA.length;
  const n = tokensB.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokensA[i - 1] === tokensB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // Deletion
          dp[i][j - 1] + 1,      // Insertion
          dp[i - 1][j - 1] + 1   // Substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Character Error Rate: Edit distance on character level / ground truth length.
 */
export function computeCER(groundTruth: string, hypothesis: string): number {
  const gtChars = groundTruth.split("");
  const hypChars = hypothesis.split("");
  if (gtChars.length === 0) return hypChars.length === 0 ? 0 : 1.0;
  const dist = computeTokenLevenshtein(gtChars, hypChars);
  return Math.min(1.0, dist / gtChars.length);
}

/**
 * Word Error Rate: Edit distance on word level / ground truth word count.
 */
export function computeWER(groundTruth: string, hypothesis: string): number {
  const gtWords = groundTruth.trim().split(/\s+/).filter(Boolean);
  const hypWords = hypothesis.trim().split(/\s+/).filter(Boolean);
  if (gtWords.length === 0) return hypWords.length === 0 ? 0 : 1.0;
  const dist = computeTokenLevenshtein(gtWords, hypWords);
  return Math.min(1.0, dist / gtWords.length);
}

// ─── Anchor Date ──────────────────────────────────────────────────────────────

export const M7_TEST_ANCHOR_DATE = new Date("2026-09-19T10:00:00+05:30");

// ─── 26 Benchmark Test Fixtures ───────────────────────────────────────────────

export const M7_TEST_FIXTURES: M7TestCase[] = [
  // ── 01. Text PDF: NEW Assignment Notice ───────────────────────────────────
  {
    id: "m7-case-01",
    label: "Uploaded PDF — NEW Assignment Notice",
    documentType: "TEXT_PDF",
    filename: "nlp-assignment-3.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Clean text PDF announcing NLP Assignment 3 released on VTOP.",
    extractedDocumentText: `
SCHOOL OF COMPUTER SCIENCE AND ENGINEERING
Course: Natural Language Processing (CSE4001)
Assignment 3 — Text Classification using BERT

Dear Students,

Assignment 3 has been released. You are required to implement a text
classification pipeline using the BERT transformer model.

Submission Deadline  : October 5, 2026 at 11:59 PM
Submission Platform  : VTOP
Maximum Marks        : 25 marks

Late submissions will not be accepted.

Dr. Ananya Krishnan
    `.trim(),
    documentSourceMeta: {
      filename: "nlp-assignment-3.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE4001", platform: "VTOP", marks: 25 },
    expectedTemporal: { hasDeadline: true },
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 02. Scanned PDF: DUPLICATE Assignment Reminder (with OCR noise) ───────
  {
    id: "m7-case-02",
    label: "Uploaded Image (OCR) — DUPLICATE Assignment Reminder",
    documentType: "SCANNED_PDF",
    filename: "nlp-a2-reminder-scan.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Scanned document reminder for existing NLP Assignment 2 with minor OCR character noise.",
    groundTruthCleanText: `
VIT UNIVERSITY - SCHOOL OF COMPUTER SCIENCE
Natural Language Processing (CSE4001)
REMINDER: NLP Assignment 2 Submission

Dear Students,
This is a reminder that NLP Assignment 2 is due on September 20, 2026 at 11:59 PM via VTOP.
Weightage: 20 marks.
Ensure your code is properly commented.
    `.trim(),
    extractedDocumentText: `
VlT UNlVERSITY - SCHOOL OF COMPUTER SClENCE
NaturaI Language Processing (CSE4001)
REMINDER: NLP Assignment 2 Submissi0n

Dear Students,
This is a reminder that NLP Assignment 2 is due on September 20, 2026 at 11:59 PM via VTOP.
Weightage: 20 marks.
Ensure your c0de is properly commented.
    `.trim(),
    documentSourceMeta: {
      filename: "nlp-a2-reminder-scan.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.91,
    },
    existingRecords: [
      {
        id: "task-nlp-a2",
        itemType: "TASK",
        title: "NLP Assignment 2",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"),
        normalizedDeadline: "September 20, 2026 at 11:59 PM",
        submissionPlatform: "VTOP",
        marks: 20,
        weightage: 20,
        status: "PENDING",
      },
    ],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE4001", platform: "VTOP", marks: 20 },
    expectedRelationship: "DUPLICATE",
    expectedMatchedTitle: "NLP Assignment 2",
    expectedProposedAction: "MARK_DUPLICATE",
  },

  // ── 03. Text PDF: RESCHEDULED Project Review ──────────────────────────────
  {
    id: "m7-case-03",
    label: "Uploaded PDF — RESCHEDULED Project Review",
    documentType: "TEXT_PDF",
    filename: "nlp-project-review-reschedule.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "PDF notice shifting project review from Friday 2 PM to Monday 3 PM.",
    extractedDocumentText: `
SCHOOL OF COMPUTER SCIENCE AND ENGINEERING
Natural Language Processing — CSE4001

RESCHEDULING NOTICE

Dear Students,

Please note that the NLP Project Review scheduled for Friday,
September 19, 2026 at 2:00 PM has been shifted to
Monday, September 22, 2026 at 3:00 PM.

The venue remains SJT 402.

Apologies for the inconvenience.

Dr. Ananya Krishnan
    `.trim(),
    documentSourceMeta: {
      filename: "nlp-project-review-reschedule.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [
      {
        id: "event-nlp-review",
        itemType: "EVENT",
        title: "NLP Project Review",
        category: "REVIEW",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        startTime: new Date("2026-09-19T08:30:00.000Z"), // 2:00 PM IST
        endTime: new Date("2026-09-19T09:30:00.000Z"),
        venue: "SJT 402",
        isRescheduled: false,
      },
    ],
    expectedClassification: "REVIEW",
    expectedEntities: { courseCode: "CSE4001", venue: "SJT 402" },
    expectedTemporal: { hasReschedule: true },
    expectedRelationship: "RESCHEDULED",
    expectedMatchedTitle: "NLP Project Review",
    expectedChangedFields: ["time"],
    expectedProposedAction: "RESCHEDULE_EXISTING",
    expectedReschedule: {
      previousHint: "19 September",
      newHint: "September 22",
    },
  },

  // ── 04. Text PDF: UPDATED Assignment (Marks + Platform) ───────────────────
  {
    id: "m7-case-04",
    label: "Uploaded PDF — UPDATED Assignment (Marks + Platform Change)",
    documentType: "TEXT_PDF",
    filename: "nlp-a2-corrigendum.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Corrigendum updating marks (20->25) and submission platform (VTOP->Moodle).",
    extractedDocumentText: `
SCHOOL OF COMPUTER SCIENCE AND ENGINEERING
Natural Language Processing — CSE4001

CORRIGENDUM: NLP Assignment 2

Dear Students,

Please note the following corrections to the NLP Assignment 2 announcement:

Revised Weightage : 25 marks (previously 20 marks)
Submission Platform: Moodle (changed from VTOP)
Submission Deadline: September 20, 2026 at 11:59 PM (unchanged)

Kindly update your records accordingly.

Dr. Ananya Krishnan
    `.trim(),
    documentSourceMeta: {
      filename: "nlp-a2-corrigendum.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [
      {
        id: "task-nlp-a2",
        itemType: "TASK",
        title: "NLP Assignment 2",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"),
        normalizedDeadline: "September 20, 2026 at 11:59 PM",
        submissionPlatform: "VTOP",
        marks: 20,
        weightage: 20,
        status: "PENDING",
      },
    ],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE4001", marks: 25 },
    expectedRelationship: "UPDATED",
    expectedMatchedTitle: "NLP Assignment 2",
    expectedChangedFields: ["marks", "platform"],
    expectedProposedAction: "UPDATE_EXISTING",
  },

  // ── 05. Image Screenshot: CANCELLED ML Quiz ───────────────────────────────
  {
    id: "m7-case-05",
    label: "Uploaded Image (OCR) — CANCELLED ML Quiz",
    documentType: "IMAGE_SCREENSHOT",
    filename: "ml-quiz3-cancelled-whatsapp.png",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "WhatsApp screenshot announcing ML Quiz 3 is cancelled.",
    extractedDocumentText: `
Machine Learning - CSE3002

Dear Students,

ML Quiz 3 scheduled for September 20, 2026 stands
cancelled due to the faculty development programme.

A rescheduled date will be communicated shortly.

Regards,
Dr. Priya Nair
    `.trim(),
    documentSourceMeta: {
      filename: "ml-quiz3-cancelled-whatsapp.png",
      documentFileType: "IMAGE",
      primaryExtractionMethod: "IMAGE_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.89,
    },
    existingRecords: [
      {
        id: "task-ml-quiz3",
        itemType: "TASK",
        title: "ML Quiz 3",
        category: "QUIZ",
        courseCode: "CSE3002",
        courseTitle: "Machine Learning",
        deadline: new Date("2026-09-20T06:00:00.000Z"),
        status: "PENDING",
      },
    ],
    expectedClassification: "QUIZ",
    expectedEntities: { courseCode: "CSE3002" },
    expectedRelationship: "CANCELLED",
    expectedMatchedTitle: "ML Quiz 3",
    expectedChangedFields: ["status"],
    expectedProposedAction: "CANCEL_EXISTING",
  },

  // ── 06. Multi-Page PDF: Operating Systems Lab Manual ──────────────────────
  {
    id: "m7-case-06",
    label: "Multi-Page PDF — Operating Systems Lab 4",
    documentType: "MULTI_PAGE_PDF",
    filename: "os-lab-4-manual.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "A 2-page lab manual preserving page boundaries and specific page evidence.",
    pages: [
      {
        pageNumber: 1,
        text: "DEPARTMENT OF COMPUTER SCIENCE\nCourse: Operating Systems (CSE2004)\nLab Experiment 4: Multi-threaded Matrix Multiplication\nOverview and CPU scheduling benchmarks.",
      },
      {
        pageNumber: 2,
        text: "Submission Guidelines for Lab 4:\nUpload your code and report to VTOP.\nDeadline: September 27, 2026 at 11:59 PM\nEvaluation: 20 marks total.",
      },
    ],
    extractedDocumentText: `
--- PAGE 1 ---
DEPARTMENT OF COMPUTER SCIENCE
Course: Operating Systems (CSE2004)
Lab Experiment 4: Multi-threaded Matrix Multiplication
Overview and CPU scheduling benchmarks.

--- PAGE 2 ---
Submission Guidelines for Lab 4:
Upload your code and report to VTOP.
Deadline: September 27, 2026 at 11:59 PM
Evaluation: 20 marks total.
    `.trim(),
    documentSourceMeta: {
      filename: "os-lab-4-manual.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 2,
    },
    existingRecords: [],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE2004", platform: "VTOP", marks: 20 },
    expectedTemporal: { hasDeadline: true },
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 07. Multi-Notice Document: Independent Deliverables ───────────────────
  {
    id: "m7-case-07",
    label: "Multi-Notice Document — Circular with Project & Quiz Notices",
    documentType: "MULTI_NOTICE_PDF",
    filename: "combined-weekly-announcements.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "A single circular containing announcements for DBMS Project and Computer Networks Quiz.",
    extractedDocumentText: `
WEEKLY ACADEMIC ANNOUNCEMENTS

Item 1: Database Management Systems (CSE3001)
Project Phase 1 Submission deadline is October 2, 2026 at 11:59 PM via VTOP. Weightage: 15 marks.

Item 2: Computer Networks (CSE2001)
Online Quiz 2 will be conducted on September 25, 2026 at 10:00 AM on CodeTantra. Total 20 marks.
    `.trim(),
    documentSourceMeta: {
      filename: "combined-weekly-announcements.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [],
    expectedDeliverablesCount: 2,
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 08. Scanned PDF: CAT-1 Examination Notice ─────────────────────────────
  {
    id: "m7-case-08",
    label: "Scanned PDF — CAT-1 Examination Circular with Venue & Time",
    documentType: "SCANNED_PDF",
    filename: "cat1-exam-schedule-scan.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Scanned schedule announcing CAT-1 exam with exact room venue and start time.",
    groundTruthCleanText: `
OFFICE OF CONTROLLER OF EXAMINATIONS
Continuous Assessment Test 1 (CAT-1)
Course: Computer Networks (CSE2001)
Date: September 28, 2026
Time: 10:00 AM to 11:30 AM
Venue: SJT 402
    `.trim(),
    extractedDocumentText: `
OFFICE OF CONTROLLER OF EXAMINATIONS
Continuous Assessment Test 1 (CAT-1)
Course: Computer Networks (CSE2001)
Date: September 28, 2026
Time: 10:00 AM to 11:30 AM
Venue: SJT 402
    `.trim(),
    documentSourceMeta: {
      filename: "cat1-exam-schedule-scan.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.94,
    },
    existingRecords: [],
    expectedClassification: "EXAM",
    expectedEntities: { courseCode: "CSE2001", venue: "SJT 402" },
    expectedTemporal: { hasTime: true },
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 09. Image Screenshot: Timetable / Class Change ────────────────────────
  {
    id: "m7-case-09",
    label: "Image Screenshot — Class Swap / Timetable Adjustment",
    documentType: "IMAGE_SCREENSHOT",
    filename: "os-class-swap-notice.png",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Notice regarding operating systems class swap on Wednesday.",
    extractedDocumentText: `
Operating Systems - CSE2004
Dear Students,
Please note that Wednesday's theory lecture at 10:00 AM will be swapped with the lab session in SJT 201.
Kindly attend accordingly.
    `.trim(),
    documentSourceMeta: {
      filename: "os-class-swap-notice.png",
      documentFileType: "IMAGE",
      primaryExtractionMethod: "IMAGE_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.90,
    },
    existingRecords: [],
    expectedClassification: "CLASS_CHANGE",
    expectedEntities: { courseCode: "CSE2004" },
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 10. Text PDF: Attendance Shortage Warning ─────────────────────────────
  {
    id: "m7-case-10",
    label: "Text PDF — Attendance Shortage Notice",
    documentType: "TEXT_PDF",
    filename: "ai-attendance-warning.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Official circular regarding students having attendance below 75% in Artificial Intelligence.",
    extractedDocumentText: `
SCHOOL OF COMPUTER SCIENCE
Artificial Intelligence (CSE3005)
ATTENDANCE SHORTAGE NOTICE

Students with attendance below 75% are hereby warned. Defaulters will not be permitted to appear for CAT-2.
Meet the faculty coordinator before September 24, 2026.
    `.trim(),
    documentSourceMeta: {
      filename: "ai-attendance-warning.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [],
    expectedClassification: "ATTENDANCE_NOTICE",
    expectedEntities: { courseCode: "CSE3005" },
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 11. Image Screenshot: Conditional Notice (with OCR noise) ─────────────
  {
    id: "m7-case-11",
    label: "Image Screenshot — Conditional Defaulters Notice (with OCR noise)",
    documentType: "IMAGE_SCREENSHOT",
    filename: "dsa-defaulters-condition.png",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Notice with conditional submission clause targeted at students who have not submitted.",
    groundTruthCleanText: `
Data Structures and Algorithms (CSE2002)
Only for students who have not submitted Assignment 1:
Final submission window open on VTOP until September 21, 2026 at 5:00 PM.
Defaulters will be penalized with zero marks.
    `.trim(),
    extractedDocumentText: `
Data Structures and Algorithms (CSE2002)
Only for students who have not submItted Assignment 1:
FinaI submissi0n wind0w open on VTOP until September 21, 2026 at 5:00 PM.
Defaulters wiII be penalized with zero marks.
    `.trim(),
    documentSourceMeta: {
      filename: "dsa-defaulters-condition.png",
      documentFileType: "IMAGE",
      primaryExtractionMethod: "IMAGE_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.88,
    },
    existingRecords: [],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE2002", platform: "VTOP" },
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 12. Text PDF: Extended Project Deadline ───────────────────────────────
  {
    id: "m7-case-12",
    label: "Text PDF — Extended Project Deadline",
    documentType: "TEXT_PDF",
    filename: "dbms-project-extension.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Notice extending project deadline from September 20 to September 30.",
    extractedDocumentText: `
Database Management Systems — CSE3001
Project Deliverable Phase 1

The deadline for DBMS Project Phase 1 has been extended from September 20, 2026 to September 30, 2026 at 11:59 PM.
Upload your ER diagrams on VTOP.
    `.trim(),
    documentSourceMeta: {
      filename: "dbms-project-extension.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [
      {
        id: "task-dbms-proj",
        itemType: "TASK",
        title: "DBMS Project",
        category: "PROJECT",
        courseCode: "CSE3001",
        courseTitle: "Database Management Systems",
        deadline: new Date("2026-09-20T18:29:00.000Z"),
        normalizedDeadline: "September 20, 2026 at 11:59 PM",
        submissionPlatform: "VTOP",
        status: "PENDING",
      },
    ],
    expectedClassification: "PROJECT",
    expectedEntities: { courseCode: "CSE3001", platform: "VTOP" },
    expectedRelationship: "RESCHEDULED",
    expectedMatchedTitle: "DBMS Project",
    expectedProposedAction: "RESCHEDULE_EXISTING",
  },

  // ── 13. Image Screenshot: Marks & Weightage Breakdown ─────────────────────
  {
    id: "m7-case-13",
    label: "Image Screenshot — Marks & Weightage Notice",
    documentType: "IMAGE_SCREENSHOT",
    filename: "dl-lab-weightage.png",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Screenshot detailing numeric marks and percentage weightage for Deep Learning Lab.",
    extractedDocumentText: `
Deep Learning Lab (CSE4002)
Assessment Component Announcement:
Lab Experiment 3 carries total 30 marks and has 15% weightage towards continuous assessment.
Due date: October 3, 2026 at 11:59 PM via VTOP.
    `.trim(),
    documentSourceMeta: {
      filename: "dl-lab-weightage.png",
      documentFileType: "IMAGE",
      primaryExtractionMethod: "IMAGE_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.93,
    },
    existingRecords: [],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE4002", marks: 30, platform: "VTOP" },
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 14. Text PDF: Submission Platform Change Only ─────────────────────────
  {
    id: "m7-case-14",
    label: "Text PDF — Submission Platform Change Only",
    documentType: "TEXT_PDF",
    filename: "nlp-platform-change.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Update shifting submission portal from VTOP to Canvas.",
    extractedDocumentText: `
Natural Language Processing — CSE4001
Regarding NLP Assignment 1:
Please submit via Canvas instead of VTOP due to maintenance.
The deadline remains September 20, 2026 at 11:59 PM.
    `.trim(),
    documentSourceMeta: {
      filename: "nlp-platform-change.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [
      {
        id: "task-nlp-a1",
        itemType: "TASK",
        title: "NLP Assignment 1",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"),
        normalizedDeadline: "September 20, 2026 at 11:59 PM",
        submissionPlatform: "VTOP",
        status: "PENDING",
      },
    ],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE4001" },
    expectedRelationship: "UPDATED",
    expectedMatchedTitle: "NLP Assignment 1",
    expectedChangedFields: ["platform"],
    expectedProposedAction: "UPDATE_EXISTING",
  },

  // ── 15. Image Screenshot: Relocated Lecture Venue ─────────────────────────
  {
    id: "m7-case-15",
    label: "Image Screenshot — Relocated Lecture Venue",
    documentType: "IMAGE_SCREENSHOT",
    filename: "ml-venue-relocate.png",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Class venue relocated from MB 210 to TT 105.",
    extractedDocumentText: `
Machine Learning (CSE3002)
Notice: Thursday ML Lecture has been moved to venue TT 105.
Class will begin at 9:00 AM on September 24, 2026.
    `.trim(),
    documentSourceMeta: {
      filename: "ml-venue-relocate.png",
      documentFileType: "IMAGE",
      primaryExtractionMethod: "IMAGE_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.92,
    },
    existingRecords: [
      {
        id: "event-ml-lec",
        itemType: "EVENT",
        title: "Machine Learning Lecture",
        category: "LECTURE",
        courseCode: "CSE3002",
        courseTitle: "Machine Learning",
        startTime: new Date("2026-09-24T03:30:00.000Z"),
        venue: "MB 210",
      },
    ],
    expectedClassification: "CLASS_CHANGE",
    expectedEntities: { courseCode: "CSE3002", venue: "TT 105" },
    expectedRelationship: "RESCHEDULED",
    expectedProposedAction: "RESCHEDULE_EXISTING",
  },

  // ── 16. Text PDF: Wording Variation Duplicate ─────────────────────────────
  {
    id: "m7-case-16",
    label: "Text PDF — Wording Variation Duplicate Notice",
    documentType: "TEXT_PDF",
    filename: "nlp-a3-followup.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Different phrasing referring to the exact same deliverable with identical course and date.",
    extractedDocumentText: `
Department of CSE — Natural Language Processing (CSE4001)
Gentle Reminder to all students:
Ensure your Assignment 3 submission is completed on VTOP before October 5, 2026 at 11:59 PM.
Carries 25 marks weightage.
    `.trim(),
    documentSourceMeta: {
      filename: "nlp-a3-followup.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [
      {
        id: "task-nlp-a3",
        itemType: "TASK",
        title: "NLP Assignment 3",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-10-05T18:29:00.000Z"),
        normalizedDeadline: "October 5, 2026 at 11:59 PM",
        submissionPlatform: "VTOP",
        marks: 25,
        status: "PENDING",
      },
    ],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE4001", platform: "VTOP" },
    expectedRelationship: "DUPLICATE",
    expectedMatchedTitle: "NLP Assignment 3",
    expectedProposedAction: "MARK_DUPLICATE",
  },

  // ── 17. Scanned PDF: Heavy OCR Noise Robustness ───────────────────────────
  {
    id: "m7-case-17",
    label: "Scanned PDF — Heavy OCR Noise Robustness",
    documentType: "SCANNED_PDF",
    filename: "noisy-exam-circular.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Degraded scan with numbers substituted for letters, testing NER error tolerance.",
    groundTruthCleanText: `
SCHOOL OF COMPUTER SCIENCE
Natural Language Processing (CSE4001)
Assignment 4 released.
Submission deadline is October 15, 2026 at 11:59 PM via VTOP.
Total 20 marks.
    `.trim(),
    extractedDocumentText: `
SCH00L 0F C0MPUTER SC1ENCE
Natura1 Language Process1ng (CSE4001)
Assignment 4 re1eased.
Submiss1on dead1ine is October 15, 2026 at 11:59 PM v1a VT0P.
Tota1 20 marks.
    `.trim(),
    documentSourceMeta: {
      filename: "noisy-exam-circular.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.82,
    },
    existingRecords: [],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE4001", marks: 20 },
    expectedTemporal: { hasDeadline: true },
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 18. Image Screenshot: Same Title Across Different Course ──────────────
  {
    id: "m7-case-18",
    label: "Image Screenshot — Same Title Across Different Course",
    documentType: "IMAGE_SCREENSHOT",
    filename: "ml-assignment-2.png",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Assignment 2 for Machine Learning (CSE3002) must NOT be confused with NLP Assignment 2 (CSE4001).",
    extractedDocumentText: `
VIT School of Computer Science
Machine Learning (CSE3002)
Assignment 2 Announcement:
Support Vector Machines and Random Forests implementation.
Deadline: September 28, 2026 at 11:59 PM on VTOP.
Total marks: 20.
    `.trim(),
    documentSourceMeta: {
      filename: "ml-assignment-2.png",
      documentFileType: "IMAGE",
      primaryExtractionMethod: "IMAGE_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.95,
    },
    existingRecords: [
      {
        id: "task-nlp-a2",
        itemType: "TASK",
        title: "NLP Assignment 2",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"),
        submissionPlatform: "VTOP",
        marks: 20,
        status: "PENDING",
      },
    ],
    expectedClassification: "ASSIGNMENT",
    expectedEntities: { courseCode: "CSE3002", platform: "VTOP", marks: 20 },
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 19. Text PDF: Preponed Session ────────────────────────────────────────
  {
    id: "m7-case-19",
    label: "Text PDF — Preponed Academic Session",
    documentType: "TEXT_PDF",
    filename: "ai-review-preponed.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "Notice advancing AI Project Review from Friday 4 PM to Thursday 2 PM.",
    extractedDocumentText: `
Artificial Intelligence — CSE3005
URGENT RESCHEDULE NOTICE

The AI Project Review previously scheduled for Friday at 4 PM
has been preponed to Thursday, September 24, 2026 at 2:00 PM.
Venue: SJT 301.

Dr. Ramesh Sundaram
    `.trim(),
    documentSourceMeta: {
      filename: "ai-review-preponed.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [
      {
        id: "event-ai-rev",
        itemType: "EVENT",
        title: "AI Project Review",
        category: "REVIEW",
        courseCode: "CSE3005",
        courseTitle: "Artificial Intelligence",
        startTime: new Date("2026-09-25T10:30:00.000Z"), // Friday 4 PM
        venue: "SJT 301",
      },
    ],
    expectedClassification: "REVIEW",
    expectedEntities: { courseCode: "CSE3005", venue: "SJT 301" },
    expectedRelationship: "RESCHEDULED",
    expectedMatchedTitle: "AI Project Review",
    expectedChangedFields: ["time"],
    expectedProposedAction: "RESCHEDULE_EXISTING",
  },

  // ── 20. Image Screenshot: Unrelated Non-Academic Notice ───────────────────
  {
    id: "m7-case-20",
    label: "Image Screenshot — Unrelated General Announcement",
    documentType: "UNRELATED_DOCUMENT",
    filename: "cafeteria-maintenance.png",
    fileValidationExpected: true,
    extractionExpected: true,
    description: "General campus circular regarding cafeteria maintenance with no deliverables.",
    extractedDocumentText: `
CAMPUS ESTATE OFFICE NOTICE
The food court in Central Block will remain closed for scheduled maintenance this Sunday from 8:00 AM to 4:00 PM.
Alternative dining options will be available at Gazebo food plaza.
    `.trim(),
    documentSourceMeta: {
      filename: "cafeteria-maintenance.png",
      documentFileType: "IMAGE",
      primaryExtractionMethod: "IMAGE_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.96,
    },
    existingRecords: [],
    expectedClassification: "GENERAL_ANNOUNCEMENT",
    expectedDeliverablesCount: 0,
    expectedRelationship: "NEW",
    expectedProposedAction: "CREATE_NEW",
  },

  // ── 21. Failure Mode: Unreadable / Blurry Image ───────────────────────────
  {
    id: "m7-case-21",
    label: "Failure Mode — Unreadable / Blurry Image",
    documentType: "UNREADABLE_IMAGE",
    filename: "blurry-photo.jpg",
    fileValidationExpected: true,
    extractionExpected: false,
    description: "Extremely blurry photo producing no decipherable text or low OCR confidence.",
    extractedDocumentText: "",
    documentSourceMeta: {
      filename: "blurry-photo.jpg",
      documentFileType: "IMAGE",
      primaryExtractionMethod: "IMAGE_OCR",
      totalPages: 1,
      averageOcrConfidence: 0.12,
    },
    existingRecords: [],
    expectedClassification: null,
    expectedDeliverablesCount: 0,
  },

  // ── 22. Failure Mode: Empty / No-text PDF ─────────────────────────────────
  {
    id: "m7-case-22",
    label: "Failure Mode — Empty / No-text PDF",
    documentType: "EMPTY_PDF",
    filename: "blank-document.pdf",
    fileValidationExpected: true,
    extractionExpected: false,
    description: "A blank PDF with zero extractable text.",
    extractedDocumentText: "",
    documentSourceMeta: {
      filename: "blank-document.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [],
    expectedClassification: null,
    expectedDeliverablesCount: 0,
  },

  // ── 23. Failure Mode: Corrupted File / Invalid Magic Bytes ─────────────────
  {
    id: "m7-case-23",
    label: "Failure Mode — Corrupted File with Invalid Magic Bytes",
    documentType: "CORRUPTED_FILE",
    filename: "corrupt.pdf",
    fileValidationExpected: false,
    extractionExpected: false,
    description: "Random binary data not starting with %PDF magic bytes.",
    simulatedBuffer: Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66]),
    extractedDocumentText: "",
    documentSourceMeta: {
      filename: "corrupt.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 0,
    },
    existingRecords: [],
  },

  // ── 24. Failure Mode: Oversized File (> 10MB) ─────────────────────────────
  {
    id: "m7-case-24",
    label: "Failure Mode — Oversized Document (> 10MB)",
    documentType: "OVERSIZED_FILE",
    filename: "huge-report.pdf",
    fileValidationExpected: false,
    extractionExpected: false,
    description: "A 12MB document exceeding the maximum permitted size limit.",
    simulatedBuffer: Buffer.alloc(12 * 1024 * 1024), // 12MB buffer
    extractedDocumentText: "",
    documentSourceMeta: {
      filename: "huge-report.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 0,
    },
    existingRecords: [],
  },

  // ── 25. Failure Mode: Unsupported File Extension ──────────────────────────
  {
    id: "m7-case-25",
    label: "Failure Mode — Unsupported File Extension (.docx)",
    documentType: "UNSUPPORTED_TYPE",
    filename: "assignment.docx",
    fileValidationExpected: false,
    extractionExpected: false,
    description: "A Word document uploaded to the PDF/Image endpoint.",
    simulatedBuffer: Buffer.from("PK\x03\x04WordDocumentData"),
    extractedDocumentText: "",
    documentSourceMeta: {
      filename: "assignment.docx",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 0,
    },
    existingRecords: [],
  },

  // ── 26. Full End-to-End Downstream Intelligence Propagation ───────────────
  {
    id: "m7-case-26",
    label: "End-to-End Integration — Document Ingestion to Downstream Ecosystem",
    documentType: "TEXT_PDF",
    filename: "reschedule-e2e.pdf",
    fileValidationExpected: true,
    extractionExpected: true,
    description:
      "Rescheduled review verified through complete stack: Document -> NLP -> Change -> Priority -> Notification -> Assistant.",
    extractedDocumentText: `
SCHOOL OF COMPUTER SCIENCE AND ENGINEERING
Natural Language Processing — CSE4001

RESCHEDULING NOTICE: NLP Project Review

Dear Students,

Please note that the NLP Project Review scheduled for Friday,
September 19, 2026 at 2:00 PM has been shifted to
Monday, September 22, 2026 at 3:00 PM in SJT 402.

Dr. Ananya Krishnan
    `.trim(),
    documentSourceMeta: {
      filename: "reschedule-e2e.pdf",
      documentFileType: "PDF",
      primaryExtractionMethod: "PDF_TEXT",
      totalPages: 1,
    },
    existingRecords: [
      {
        id: "event-nlp-review-e2e",
        itemType: "EVENT",
        title: "NLP Project Review",
        category: "REVIEW",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        startTime: new Date("2026-09-19T08:30:00.000Z"),
        venue: "SJT 402",
        isRescheduled: false,
      },
    ],
    expectedClassification: "REVIEW",
    expectedEntities: { courseCode: "CSE4001", venue: "SJT 402" },
    expectedRelationship: "RESCHEDULED",
    expectedMatchedTitle: "NLP Project Review",
    expectedChangedFields: ["time"],
    expectedProposedAction: "RESCHEDULE_EXISTING",
    isEndToEndEcosystemCase: true,
  },
];

/**
 * Convenience runner for M7 evaluation.
 */
export async function runM7Evaluation(): Promise<void> {
  const { execSync } = await import("child_process");
  execSync("npx tsx scripts/test-milestone7.ts", { stdio: "inherit" });
}

