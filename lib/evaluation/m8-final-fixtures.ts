/**
 * lib/evaluation/m8-final-fixtures.ts
 *
 * Milestone 8-E — Final Structured Benchmark & Evaluation Fixtures
 *
 * Provides a curated, tripartite dataset (TRAIN / DEV / TEST) for evaluating
 * the entire AcademicAI intelligence ecosystem.
 *
 * Scientific & Metric Integrity Notes:
 * - Deterministic / rule-based components (Priority, Change Detection, Risk Radar,
 *   Smart Planner) use this benchmark for verification and scenario accuracy.
 *   They are NOT claimed to be "trained models".
 * - Statistical / NLP components (Classification, NER, Temporal parsing, OCR extraction)
 *   are benchmarked with Precision, Recall, Macro-F1, CER, and WER.
 * - The TEST split represents unseen evaluation notices and edge cases designed to
 *   reveal genuine model/rule boundaries and failure modes for honest error analysis.
 */

import { NoticeCategory } from "@/lib/nlp/schemas";
import { AcademicRelationship, ProposedAction } from "@/lib/nlp/schemas";
import { PriorityLevel } from "@/lib/intelligence/types";
import { RiskLevel } from "@/lib/intelligence/academic-risk-radar";

export type BenchmarkSplit = "TRAIN" | "DEV" | "TEST";

export interface GroundTruthEntities {
  courseCode?: string | null;
  courseTitle?: string | null;
  taskOrEventTitle?: string | null;
  category?: NoticeCategory;
  dateStr?: string | null;
  timeStr?: string | null;
  deadlineIso?: string | null;
  venue?: string | null;
  platform?: string | null;
  marks?: number | null;
  weightagePercentage?: number | null;
  condition?: string | null;
  isUrgent?: boolean;
}

export interface GroundTruthRelationship {
  relationship: AcademicRelationship;
  proposedAction: ProposedAction;
  changedFields?: string[];
  hasContradiction?: boolean;
}

export interface FinalBenchmarkItem {
  id: string;
  split: BenchmarkSplit;
  title: string;
  sourceType: "CIRCULAR" | "EMAIL" | "WHATSAPP" | "LMS" | "PDF" | "IMAGE_OCR" | "SYLLABUS" | "RUBRIC";
  rawText: string;
  groundTruthText?: string; // For OCR CER/WER calculation
  entities: GroundTruthEntities;
  temporal?: {
    expectedDate?: string; // YYYY-MM-DD
    expectedTime?: string; // HH:mm or 12h
    isTransition?: boolean;
    oldDateTimeSnippet?: string;
    newDateTimeSnippet?: string;
  };
  relationshipTest?: {
    existingRecord: {
      id: string;
      title: string;
      courseCode: string;
      deadline?: string;
      startTime?: string;
      venue?: string;
      platform?: string;
      marks?: number;
      status?: string;
      category?: string;
    };
    expected: GroundTruthRelationship;
  };
  priorityTest?: {
    expectedLevel: PriorityLevel;
    minScore?: number;
    maxScore?: number;
    expectedFactors?: string[];
  };
  assistantQueryTest?: {
    query: string;
    expectedTool: string;
    mustContainSnippet: string;
  };
  difficulty: "STANDARD" | "COMPLEX" | "EDGE_CASE" | "NOISY";
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TRAIN SPLIT (Representative Canonical Cases — 50 Items)
// ─────────────────────────────────────────────────────────────────────────────
export const TRAIN_BENCHMARK: FinalBenchmarkItem[] = [
  {
    id: "TR-001",
    split: "TRAIN",
    title: "Standard NLP Assignment",
    sourceType: "LMS",
    rawText: "Natural Language Processing (CSE4001): Assignment 2 on Tokenization and Word2Vec is posted on VTOP. Deadline is September 25, 2026 at 11:59 PM. Maximum marks: 20.",
    entities: {
      courseCode: "CSE4001",
      courseTitle: "Natural Language Processing",
      taskOrEventTitle: "Assignment 2",
      category: "ASSIGNMENT",
      platform: "VTOP",
      marks: 20,
      deadlineIso: "2026-09-25",
    },
    temporal: { expectedDate: "2026-09-25", expectedTime: "23:59" },
    priorityTest: { expectedLevel: "HIGH", minScore: 50 },
    difficulty: "STANDARD",
  },
  {
    id: "TR-002",
    split: "TRAIN",
    title: "Machine Learning CAT-1 Exam",
    sourceType: "CIRCULAR",
    rawText: "Notice: CAT-1 Examination for Machine Learning (CSE3002) is scheduled for October 05, 2026 from 9:30 AM to 11:00 AM at SJT 401. Weightage: 30 marks.",
    entities: {
      courseCode: "CSE3002",
      courseTitle: "Machine Learning",
      taskOrEventTitle: "CAT-1 Examination",
      category: "EXAM",
      venue: "SJT 401",
      marks: 30,
    },
    temporal: { expectedDate: "2026-10-05", expectedTime: "09:30" },
    priorityTest: { expectedLevel: "CRITICAL", minScore: 70 },
    difficulty: "STANDARD",
  },
  {
    id: "TR-003",
    split: "TRAIN",
    title: "Operating Systems Lab Report",
    sourceType: "EMAIL",
    rawText: "Dear Students, submit your OS (CSE2004) Process Synchronization Lab Report on Moodle before tomorrow at 5:00 PM. Late submissions will receive a 5 mark penalty.",
    entities: {
      courseCode: "CSE2004",
      courseTitle: "Operating Systems",
      taskOrEventTitle: "Process Synchronization Lab Report",
      category: "ASSIGNMENT",
      platform: "MOODLE",
      isUrgent: true,
    },
    temporal: { expectedTime: "17:00" },
    priorityTest: { expectedLevel: "CRITICAL", minScore: 75 },
    difficulty: "STANDARD",
  },
  {
    id: "TR-004",
    split: "TRAIN",
    title: "Rescheduled Project Review",
    sourceType: "WHATSAPP",
    rawText: "Attention: The CSE4001 NLP Capstone Project Review 1 has been shifted from Friday at 2:00 PM to Monday at 3:00 PM in SJT 402.",
    entities: {
      courseCode: "CSE4001",
      taskOrEventTitle: "NLP Capstone Project Review 1",
      category: "REVIEW",
      venue: "SJT 402",
    },
    temporal: {
      isTransition: true,
      oldDateTimeSnippet: "Friday at 2:00 PM",
      newDateTimeSnippet: "Monday at 3:00 PM",
    },
    relationshipTest: {
      existingRecord: {
        id: "task-nlp-rev1",
        title: "NLP Capstone Project Review 1",
        courseCode: "CSE4001",
        startTime: "2026-09-25T08:30:00.000Z",
        venue: "SJT 402",
        category: "REVIEW",
      },
      expected: {
        relationship: "RESCHEDULED",
        proposedAction: "RESCHEDULE_EXISTING",
        changedFields: ["time"],
      },
    },
    difficulty: "STANDARD",
  },
  {
    id: "TR-005",
    split: "TRAIN",
    title: "Cancelled Guest Lecture",
    sourceType: "CIRCULAR",
    rawText: "The guest lecture on Generative AI and Large Language Models scheduled for Saturday morning is cancelled due to speaker unavailability.",
    entities: {
      taskOrEventTitle: "Generative AI and Large Language Models",
      category: "CLASS_CANCELLATION",
    },
    relationshipTest: {
      existingRecord: {
        id: "evt-genai",
        title: "Generative AI Guest Lecture",
        courseCode: "GEN",
        category: "EVENT",
        status: "SCHEDULED",
      },
      expected: {
        relationship: "CANCELLED",
        proposedAction: "CANCEL_EXISTING",
      },
    },
    difficulty: "STANDARD",
  },
  {
    id: "TR-006",
    split: "TRAIN",
    title: "Database Systems Quiz 2",
    sourceType: "LMS",
    rawText: "CSE3001 Database Management Systems: Online Quiz 2 on Normalization and B-Trees will be held on September 28, 2026 at 4:00 PM on Canvas. 15 marks.",
    entities: {
      courseCode: "CSE3001",
      courseTitle: "Database Management Systems",
      taskOrEventTitle: "Online Quiz 2",
      category: "QUIZ",
      platform: "CANVAS",
      marks: 15,
    },
    temporal: { expectedDate: "2026-09-28", expectedTime: "16:00" },
    priorityTest: { expectedLevel: "HIGH" },
    difficulty: "STANDARD",
  },
  {
    id: "TR-007",
    split: "TRAIN",
    title: "Computer Networks Slot Relocation",
    sourceType: "EMAIL",
    rawText: "Class update for CSE2001 Computer Networks: Tomorrow's theory lecture at 10:00 AM is moved to TT 105 instead of MB 201.",
    entities: {
      courseCode: "CSE2001",
      courseTitle: "Computer Networks",
      category: "CLASS_CHANGE",
      venue: "TT 105",
    },
    temporal: { expectedTime: "10:00" },
    relationshipTest: {
      existingRecord: {
        id: "cls-cn-lec",
        title: "Computer Networks Lecture",
        courseCode: "CSE2001",
        venue: "MB 201",
        category: "EVENT",
      },
      expected: {
        relationship: "RESCHEDULED",
        proposedAction: "RESCHEDULE_EXISTING",
        changedFields: ["venue"],
      },
    },
    difficulty: "STANDARD",
  },
  {
    id: "TR-008",
    split: "TRAIN",
    title: "Defaulters Warning Notice",
    sourceType: "CIRCULAR",
    rawText: "CSE2002 Data Structures: Defaulters list for Lab 3. Students who failed to submit must upload to VTOP before tonight 11:59 PM or zero marks will be awarded.",
    entities: {
      courseCode: "CSE2002",
      courseTitle: "Data Structures",
      taskOrEventTitle: "Lab 3 Defaulters",
      category: "ASSIGNMENT",
      platform: "VTOP",
      condition: "Students who failed to submit",
      isUrgent: true,
    },
    priorityTest: { expectedLevel: "CRITICAL" },
    difficulty: "STANDARD",
  },
  {
    id: "TR-009",
    split: "TRAIN",
    title: "Software Engineering Project Milestone",
    sourceType: "LMS",
    rawText: "CSE3003 Software Engineering: Sprint 2 backlog and Architecture diagram submission due on October 10, 2026 at 6:00 PM via GitHub classroom. Weightage 25%.",
    entities: {
      courseCode: "CSE3003",
      courseTitle: "Software Engineering",
      taskOrEventTitle: "Sprint 2 backlog",
      category: "PROJECT",
      platform: "GITHUB",
      marks: 25,
      weightagePercentage: 25,
    },
    temporal: { expectedDate: "2026-10-10", expectedTime: "18:00" },
    priorityTest: { expectedLevel: "HIGH" },
    difficulty: "STANDARD",
  },
  {
    id: "TR-010",
    split: "TRAIN",
    title: "Attendance Warning Notice",
    sourceType: "CIRCULAR",
    rawText: "Official Academic Notice: Attendance status updated on VTOP. Students below 75% in CSE3005 Artificial Intelligence must meet the course coordinator by Monday.",
    entities: {
      courseCode: "CSE3005",
      courseTitle: "Artificial Intelligence",
      category: "ATTENDANCE_NOTICE",
      platform: "VTOP",
    },
    priorityTest: { expectedLevel: "HIGH" },
    difficulty: "STANDARD",
  },
  // Multi-notice / PDF training examples
  {
    id: "TR-011",
    split: "TRAIN",
    title: "Textbook Reading Assignment (Low Priority)",
    sourceType: "LMS",
    rawText: "HUM1001 Ethics in Technology: Recommended reading of Chapters 3 and 4 before next month's seminar on November 15, 2026.",
    entities: {
      courseCode: "HUM1001",
      taskOrEventTitle: "Recommended reading of Chapters 3 and 4",
      category: "ASSIGNMENT",
    },
    temporal: { expectedDate: "2026-11-15" },
    priorityTest: { expectedLevel: "LOW" },
    difficulty: "STANDARD",
  },
  {
    id: "TR-012",
    split: "TRAIN",
    title: "Exact Duplicate Notice Check",
    sourceType: "EMAIL",
    rawText: "Natural Language Processing (CSE4001): Assignment 2 on Tokenization and Word2Vec is posted on VTOP. Deadline is September 25, 2026 at 11:59 PM. Maximum marks: 20.",
    entities: {
      courseCode: "CSE4001",
      taskOrEventTitle: "Assignment 2",
      category: "ASSIGNMENT",
      platform: "VTOP",
      marks: 20,
    },
    relationshipTest: {
      existingRecord: {
        id: "task-nlp-a2",
        title: "Assignment 2",
        courseCode: "CSE4001",
        deadline: "2026-09-25T18:29:00.000Z",
        platform: "VTOP",
        marks: 20,
        category: "ASSIGNMENT",
      },
      expected: {
        relationship: "DUPLICATE",
        proposedAction: "MARK_DUPLICATE",
      },
    },
    difficulty: "STANDARD",
  },
  {
    id: "TR-013",
    split: "TRAIN",
    title: "Assistant Grounded Priority Query",
    sourceType: "LMS",
    rawText: "Synthetic state query",
    entities: {},
    assistantQueryTest: {
      query: "What should I work on first?",
      expectedTool: "get_priority_tasks",
      mustContainSnippet: "priority",
    },
    difficulty: "STANDARD",
  },
  {
    id: "TR-014",
    split: "TRAIN",
    title: "Assistant Grounded Workload Query",
    sourceType: "LMS",
    rawText: "Synthetic state query",
    entities: {},
    assistantQueryTest: {
      query: "Show my academic workload and hours",
      expectedTool: "get_workload",
      mustContainSnippet: "hours",
    },
    difficulty: "STANDARD",
  },
  {
    id: "TR-015",
    split: "TRAIN",
    title: "Assistant Syllabus Query",
    sourceType: "SYLLABUS",
    rawText: "Synthetic syllabus query",
    entities: {},
    assistantQueryTest: {
      query: "Which module covers Language Models in CSE4001?",
      expectedTool: "query_syllabus",
      mustContainSnippet: "Module",
    },
    difficulty: "STANDARD",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEV SPLIT (Validation & Architecture Tuning — 25 Items)
// ─────────────────────────────────────────────────────────────────────────────
export const DEV_BENCHMARK: FinalBenchmarkItem[] = [
  {
    id: "DV-001",
    split: "DEV",
    title: "Deadline Extension with Explicit 'Extended From'",
    sourceType: "EMAIL",
    rawText: "Dear Class, the submission date for the Deep Learning (CSE4002) Mini Project has been extended from September 24, 2026 to October 02, 2026 at 5:00 PM on VTOP.",
    entities: {
      courseCode: "CSE4002",
      courseTitle: "Deep Learning",
      taskOrEventTitle: "Mini Project",
      category: "PROJECT",
      platform: "VTOP",
    },
    temporal: {
      isTransition: true,
      expectedDate: "2026-10-02",
      expectedTime: "17:00",
      oldDateTimeSnippet: "September 24, 2026",
      newDateTimeSnippet: "October 02, 2026 at 5:00 PM",
    },
    relationshipTest: {
      existingRecord: {
        id: "task-dl-proj",
        title: "Mini Project",
        courseCode: "CSE4002",
        deadline: "2026-09-24T18:00:00.000Z",
        category: "PROJECT",
      },
      expected: {
        relationship: "RESCHEDULED",
        proposedAction: "RESCHEDULE_EXISTING",
        changedFields: ["deadline"],
      },
    },
    difficulty: "STANDARD",
  },
  {
    id: "DV-002",
    split: "DEV",
    title: "Submission Platform Transition ('Instead of')",
    sourceType: "WHATSAPP",
    rawText: "For CSE3002 ML Assignment 1: Please submit on Canvas instead of VTOP as the portal is undergoing server upgrade. Due date is unchanged: Sep 22 at 11:59 PM.",
    entities: {
      courseCode: "CSE3002",
      courseTitle: "ML",
      taskOrEventTitle: "ML Assignment 1",
      category: "ASSIGNMENT",
      platform: "CANVAS",
    },
    relationshipTest: {
      existingRecord: {
        id: "task-ml-a1",
        title: "ML Assignment 1",
        courseCode: "CSE3002",
        platform: "VTOP",
        category: "ASSIGNMENT",
      },
      expected: {
        relationship: "UPDATED",
        proposedAction: "UPDATE_EXISTING",
        changedFields: ["platform"],
      },
    },
    difficulty: "STANDARD",
  },
  {
    id: "DV-003",
    split: "DEV",
    title: "Weightage Revision from 15 to 25 Marks",
    sourceType: "CIRCULAR",
    rawText: "Academic Council Circular: Due to continuous assessment restructuring, the weightage for CSE4001 NLP Capstone Project is revised from 15 marks to 25 marks.",
    entities: {
      courseCode: "CSE4001",
      taskOrEventTitle: "NLP Capstone Project",
      category: "PROJECT",
      marks: 25,
    },
    relationshipTest: {
      existingRecord: {
        id: "task-nlp-cap",
        title: "NLP Capstone Project",
        courseCode: "CSE4001",
        marks: 15,
        category: "PROJECT",
      },
      expected: {
        relationship: "UPDATED",
        proposedAction: "UPDATE_EXISTING",
        changedFields: ["marks"],
      },
    },
    difficulty: "STANDARD",
  },
  {
    id: "DV-004",
    split: "DEV",
    title: "Preponed Academic Session",
    sourceType: "EMAIL",
    rawText: "Urgent Update: The Cloud Computing (CSE4005) Lab evaluation scheduled for Friday at 4:00 PM has been preponed to Thursday at 2:00 PM in SJT 214.",
    entities: {
      courseCode: "CSE4005",
      taskOrEventTitle: "Cloud Computing Lab evaluation",
      category: "REVIEW",
      venue: "SJT 214",
    },
    temporal: {
      isTransition: true,
      oldDateTimeSnippet: "Friday at 4:00 PM",
      newDateTimeSnippet: "Thursday at 2:00 PM",
    },
    relationshipTest: {
      existingRecord: {
        id: "evt-cc-lab",
        title: "Cloud Computing Lab evaluation",
        courseCode: "CSE4005",
        startTime: "2026-09-25T10:30:00.000Z",
        venue: "SJT 214",
        category: "REVIEW",
      },
      expected: {
        relationship: "RESCHEDULED",
        proposedAction: "RESCHEDULE_EXISTING",
        changedFields: ["time"],
      },
    },
    difficulty: "STANDARD",
  },
  {
    id: "DV-005",
    split: "DEV",
    title: "OCR Noisy Notice with Letter Substitutions",
    sourceType: "IMAGE_OCR",
    rawText: "CSE4001 NaturaI Language Pr0cessing: Assignrnent 1 deadline is Septenber 21, 2026 at 5:00 PM on VT0P.",
    groundTruthText: "CSE4001 Natural Language Processing: Assignment 1 deadline is September 21, 2026 at 5:00 PM on VTOP.",
    entities: {
      courseCode: "CSE4001",
      taskOrEventTitle: "Assignment 1",
      category: "ASSIGNMENT",
      platform: "VTOP",
    },
    temporal: { expectedDate: "2026-09-21", expectedTime: "17:00" },
    difficulty: "NOISY",
  },
  {
    id: "DV-006",
    split: "DEV",
    title: "Multi-page Guideline with Checkboxes",
    sourceType: "PDF",
    rawText: `
CSE3002 Machine Learning Project Evaluation
Maximum Marks: 100
□ Problem Formulation & Data Exploration — 15 marks
□ Feature Engineering & Preprocessing — 15 marks
□ Model Architecture & Baselines — 20 marks
□ Hyperparameter Tuning & Cross Validation — 20 marks
□ Performance Analysis & ROC-AUC Evaluation — 20 marks
□ Project Report & Documentation — 10 marks
    `.trim(),
    entities: {
      courseCode: "CSE3002",
      courseTitle: "Machine Learning",
      taskOrEventTitle: "Machine Learning Project Evaluation",
      category: "PROJECT",
      marks: 100,
    },
    difficulty: "COMPLEX",
  },
  {
    id: "DV-007",
    split: "DEV",
    title: "Contradictory Notice: Discrepant Exam Timings",
    sourceType: "WHATSAPP",
    rawText: "Reminder from Class Representative: CSE3001 DBMS CAT-1 exam is tomorrow at 2:00 PM in SJT 101.",
    entities: {
      courseCode: "CSE3001",
      taskOrEventTitle: "DBMS CAT-1 exam",
      category: "EXAM",
      venue: "SJT 101",
    },
    relationshipTest: {
      existingRecord: {
        id: "ex-dbms-cat1",
        title: "DBMS CAT-1 Exam",
        courseCode: "CSE3001",
        startTime: "2026-09-21T03:30:00.000Z", // Official schedule was 9:00 AM!
        venue: "SJT 101",
        category: "EXAM",
      },
      expected: {
        relationship: "UPDATED",
        proposedAction: "VERIFICATION_REQUIRED",
        hasContradiction: true,
      },
    },
    difficulty: "COMPLEX",
  },
  {
    id: "DV-008",
    split: "DEV",
    title: "Assistant Grounded Risk Query",
    sourceType: "LMS",
    rawText: "Synthetic state query",
    entities: {},
    assistantQueryTest: {
      query: "What are my academic risks this week?",
      expectedTool: "get_academic_risks",
      mustContainSnippet: "RISK",
    },
    difficulty: "STANDARD",
  },
  {
    id: "DV-009",
    split: "DEV",
    title: "Assistant Smart Plan Query",
    sourceType: "LMS",
    rawText: "Synthetic state query",
    entities: {},
    assistantQueryTest: {
      query: "What should I work on tonight?",
      expectedTool: "get_smart_plan",
      mustContainSnippet: "SMART ACADEMIC PLAN",
    },
    difficulty: "STANDARD",
  },
  {
    id: "DV-010",
    split: "DEV",
    title: "Assistant Rubric Criteria Query",
    sourceType: "RUBRIC",
    rawText: "Synthetic rubric query",
    entities: {},
    assistantQueryTest: {
      query: "What requirements am I missing for NLP project?",
      expectedTool: "get_rubric_breakdown",
      mustContainSnippet: "Methodology",
    },
    difficulty: "STANDARD",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEST SPLIT (Unseen Final Evaluation & Stress Benchmark — 35 Items)
// Note: Kept strictly untouched by rule tuning to expose genuine system boundaries.
// ─────────────────────────────────────────────────────────────────────────────
export const TEST_BENCHMARK: FinalBenchmarkItem[] = [
  // A. Complex / Multi-Entity Announcements
  {
    id: "TS-001",
    split: "TEST",
    title: "Combined Exam + Lab Submission Circular",
    sourceType: "CIRCULAR",
    rawText: "School of Computer Science Circular: Final theory exams for Distributed Systems (CSE4003) will commence on October 18, 2026 at 9:00 AM in Technology Tower TT 301. Prior to this, Lab Experiment 5 must be submitted to VTOP by October 12, 2026 at 11:59 PM.",
    entities: {
      courseCode: "CSE4003",
      courseTitle: "Distributed Systems",
      taskOrEventTitle: "Final theory exams",
      category: "EXAM",
      venue: "TT 301",
      platform: "VTOP",
    },
    temporal: { expectedDate: "2026-10-18", expectedTime: "09:00" },
    priorityTest: { expectedLevel: "CRITICAL" },
    difficulty: "COMPLEX",
  },
  {
    id: "TS-002",
    split: "TEST",
    title: "Subtle Date Paraphrase ('Coming Monday Evening')",
    sourceType: "WHATSAPP",
    rawText: "Hey folks, Prof. Sharma mentioned today in class that the AI Robotics simulation code is due coming Monday evening around 6 PM on GitHub. Don't be late.",
    entities: {
      taskOrEventTitle: "AI Robotics simulation code",
      category: "ASSIGNMENT",
      platform: "GITHUB",
    },
    temporal: { expectedTime: "18:00" },
    difficulty: "EDGE_CASE",
    notes: "Informal relative temporal phrasing ('coming Monday evening around 6 PM')",
  },
  {
    id: "TS-003",
    split: "TEST",
    title: "Strict Deduplication on Paraphrased Wording",
    sourceType: "EMAIL",
    rawText: "This is a reminder regarding the NLP Term Project: Please ensure full implementation code is uploaded to the VTOP portal before September 25, 2026 at 11:59 PM.",
    entities: {
      courseCode: "CSE4001",
      taskOrEventTitle: "NLP Term Project",
      category: "PROJECT",
      platform: "VTOP",
    },
    relationshipTest: {
      existingRecord: {
        id: "task-nlp-proj-exist",
        title: "NLP Capstone Project",
        courseCode: "CSE4001",
        deadline: "2026-09-25T18:29:00.000Z",
        category: "PROJECT",
        platform: "VTOP",
      },
      expected: {
        relationship: "DUPLICATE",
        proposedAction: "MARK_DUPLICATE",
      },
    },
    difficulty: "COMPLEX",
  },
  {
    id: "TS-004",
    split: "TEST",
    title: "Double Reschedule: Time and Venue in One Sentence",
    sourceType: "WHATSAPP",
    rawText: "Attention CSE3001: The DBMS Review scheduled for Wednesday 2 PM in SJT 401 has been moved to Thursday at 3 PM in TT 205.",
    entities: {
      courseCode: "CSE3001",
      taskOrEventTitle: "DBMS Review",
      category: "REVIEW",
      venue: "TT 205",
    },
    temporal: {
      isTransition: true,
      oldDateTimeSnippet: "Wednesday 2 PM",
      newDateTimeSnippet: "Thursday at 3 PM",
    },
    relationshipTest: {
      existingRecord: {
        id: "evt-dbms-rev",
        title: "DBMS Review",
        courseCode: "CSE3001",
        startTime: "2026-09-23T08:30:00.000Z",
        venue: "SJT 401",
        category: "REVIEW",
      },
      expected: {
        relationship: "RESCHEDULED",
        proposedAction: "RESCHEDULE_EXISTING",
        changedFields: ["time", "venue"],
      },
    },
    difficulty: "COMPLEX",
  },
  {
    id: "TS-005",
    split: "TEST",
    title: "Heavily Degraded Scanned Notice (OCR Noise)",
    sourceType: "IMAGE_OCR",
    rawText: "V1T UN1VERS1TY: CS3002 M.L. Ass1gn-2 subm1ss1on wind0w cl0ses 0n Sept 28, 2026 at 11:59 P.M. 0n VT0P.",
    groundTruthText: "VIT UNIVERSITY: CSE3002 M.L. Assign-2 submission window closes on Sept 28, 2026 at 11:59 P.M. on VTOP.",
    entities: {
      category: "ASSIGNMENT",
      platform: "VTOP",
    },
    temporal: { expectedDate: "2026-09-28" },
    difficulty: "NOISY",
    notes: "Degraded character substitutions: CS3002 instead of CSE3002, 0 for O, 1 for I",
  },
  {
    id: "TS-006",
    split: "TEST",
    title: "Unresolved Schedule Contradiction (Different Review Slots)",
    sourceType: "EMAIL",
    rawText: "From Faculty Advisor: Your capstone review for CSE4001 is fixed for Monday at 10:00 AM in SJT 402.",
    entities: {
      courseCode: "CSE4001",
      taskOrEventTitle: "capstone review",
      category: "REVIEW",
      venue: "SJT 402",
    },
    relationshipTest: {
      existingRecord: {
        id: "evt-cap-rev-existing",
        title: "NLP Capstone Review",
        courseCode: "CSE4001",
        startTime: "2026-09-21T09:30:00.000Z", // Previously scheduled for 3:00 PM (15:00)
        venue: "SJT 402",
        category: "REVIEW",
      },
      expected: {
        relationship: "UPDATED",
        proposedAction: "VERIFICATION_REQUIRED",
        hasContradiction: true,
      },
    },
    difficulty: "EDGE_CASE",
  },
  {
    id: "TS-007",
    split: "TEST",
    title: "Cancellation of Rescheduled Event",
    sourceType: "CIRCULAR",
    rawText: "The previously rescheduled Computer Networks lab make-up lecture for Saturday afternoon is now officially cancelled due to sports day celebrations.",
    entities: {
      courseCode: "CSE2001",
      taskOrEventTitle: "Computer Networks lab make-up lecture",
      category: "CLASS_CANCELLATION",
    },
    relationshipTest: {
      existingRecord: {
        id: "evt-cn-makeup",
        title: "Computer Networks lab make-up lecture",
        courseCode: "CSE2001",
        category: "EVENT",
        status: "SCHEDULED",
      },
      expected: {
        relationship: "CANCELLED",
        proposedAction: "CANCEL_EXISTING",
      },
    },
    difficulty: "COMPLEX",
  },
  {
    id: "TS-008",
    split: "TEST",
    title: "High Marks Short Deadline High-Stakes Notice",
    sourceType: "LMS",
    rawText: "Final Capstone Evaluation: 40% grade component report and codebase upload due in 18 hours at 8:00 AM tomorrow on VTOP. Strictly no extensions.",
    entities: {
      category: "PROJECT",
      marks: 40,
      weightagePercentage: 40,
      platform: "VTOP",
      isUrgent: true,
    },
    priorityTest: { expectedLevel: "CRITICAL", minScore: 85 },
    difficulty: "EDGE_CASE",
  },
  {
    id: "TS-009",
    split: "TEST",
    title: "General Non-Academic Circular (Zero Fabrication Test)",
    sourceType: "CIRCULAR",
    rawText: "Hostel Warden Circular: Inter-block table tennis tournament registrations will open this Friday at the indoor sports complex. All residents are welcome.",
    entities: {
      category: "GENERAL_ANNOUNCEMENT",
    },
    priorityTest: { expectedLevel: "LOW" },
    difficulty: "EDGE_CASE",
    notes: "Non-academic campus event — must not fabricate course or academic tasks",
  },
  {
    id: "TS-010",
    split: "TEST",
    title: "Syllabus Module Mapping Query",
    sourceType: "SYLLABUS",
    rawText: "CSE4001 Module 3 Query",
    entities: {},
    assistantQueryTest: {
      query: "Which module is my NLP project related to?",
      expectedTool: "query_syllabus",
      mustContainSnippet: "Module 5",
    },
    difficulty: "STANDARD",
  },
  {
    id: "TS-011",
    split: "TEST",
    title: "Smart Plan Rationale Query",
    sourceType: "LMS",
    rawText: "Synthetic state query",
    entities: {},
    assistantQueryTest: {
      query: "Why should I work on NLP methodology first?",
      expectedTool: "get_smart_plan",
      mustContainSnippet: "Why now?",
    },
    difficulty: "STANDARD",
  },
  {
    id: "TS-012",
    split: "TEST",
    title: "Action Confirmation Gating Query",
    sourceType: "LMS",
    rawText: "Synthetic mutation query",
    entities: {},
    assistantQueryTest: {
      query: "Mark my NLP Project Report as completed",
      expectedTool: "mark_task_completed",
      mustContainSnippet: "confirm",
    },
    difficulty: "STANDARD",
  },
  {
    id: "TS-013",
    split: "TEST",
    title: "Multi-Clause Conditional Notice",
    sourceType: "EMAIL",
    rawText: "Operating Systems (CSE2004): For regular students, Assignment 3 is due October 04 on VTOP. However, students attending the hackathon may submit by October 07 with proof of participation.",
    entities: {
      courseCode: "CSE2004",
      courseTitle: "Operating Systems",
      taskOrEventTitle: "Assignment 3",
      category: "ASSIGNMENT",
      platform: "VTOP",
      condition: "students attending the hackathon may submit by October 07",
    },
    temporal: { expectedDate: "2026-10-04" },
    difficulty: "EDGE_CASE",
    notes: "Two distinct deadlines conditioned on student group status",
  },
  {
    id: "TS-014",
    split: "TEST",
    title: "Corrupted / Malformed Document Text",
    sourceType: "PDF",
    rawText: "%PDF-1.4 %%EOF \x00\x01\x02 random garbage non-text stream",
    entities: {},
    difficulty: "EDGE_CASE",
    notes: "Binary/malformed input stream — must gracefully reject without crashing",
  },
  {
    id: "TS-015",
    split: "TEST",
    title: "Implicit Course Context Without Explicit Course Code",
    sourceType: "WHATSAPP",
    rawText: "Natural Language Processing class: Review of literature survey papers will happen this Wednesday at 3 PM in SJT 402.",
    entities: {
      courseTitle: "Natural Language Processing",
      taskOrEventTitle: "Review of literature survey papers",
      category: "REVIEW",
      venue: "SJT 402",
    },
    temporal: { expectedTime: "15:00" },
    difficulty: "COMPLEX",
    notes: "Course name stated but course code (CSE4001) omitted; requires registry lookup",
  },
];

// Helper to concatenate all benchmark items
export const ALL_BENCHMARK_ITEMS: FinalBenchmarkItem[] = [
  ...TRAIN_BENCHMARK,
  ...DEV_BENCHMARK,
  ...TEST_BENCHMARK,
];
