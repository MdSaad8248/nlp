/**
 * lib/evaluation/m8-contradiction-fixtures.ts
 *
 * Milestone 8-B — Academic Contradiction Detection Evaluation Fixtures
 * 16 diverse academic conflict scenarios evaluating:
 * - Schedule conflicts (differing dates/times)
 * - Deadline conflicts (differing due dates without explicit extension)
 * - Venue conflicts (differing classroom/hall locations)
 * - Platform conflicts (VTOP vs Canvas/Moodle)
 * - Marks conflicts (differing weightages or scores)
 * - Exam date/time conflicts
 * - Distinguishing legitimate explicit reschedules/extensions from unverified conflicts
 * - Multi-attribute conflicts (venue + time)
 * - Assistant contradiction queries
 */

import { CandidateExistingRecord } from "../nlp/change-intelligence";

export interface ContradictionScenario {
  id: string;
  name: string;
  category:
    | "SCHEDULE_CONFLICT"
    | "DEADLINE_CONFLICT"
    | "VENUE_CONFLICT"
    | "PLATFORM_CONFLICT"
    | "MARKS_CONFLICT"
    | "EXAM_CONFLICT"
    | "EXPLICIT_RESCHEDULE"
    | "DUPLICATE"
    | "QUERY";
  existingRecord: CandidateExistingRecord;
  incomingNotice: {
    title: string;
    rawText: string;
    channel?: string;
    createdAt?: string;
  };
  expected: {
    hasContradiction: boolean;
    conflictType?: string;
    conflictingField?: string;
    requiresVerification?: boolean;
    expectedStatus?: string;
    query?: string;
  };
}

export const M8_CONTRADICTION_SCENARIOS: ContradictionScenario[] = [
  // ── Scenario 1: Schedule Conflict (Monday 3 PM vs Tuesday 2 PM) ──────────────
  {
    id: "CONTRA-01",
    name: "NLP Project Review: Monday 3 PM vs Tuesday 2 PM (No explicit reschedule)",
    category: "SCHEDULE_CONFLICT",
    existingRecord: {
      id: "event-nlp-rev-1",
      itemType: "EVENT",
      title: "NLP Project Review",
      courseCode: "CSE4001",
      startTime: "2026-09-21T15:00:00.000Z", // Monday 3:00 PM
      endTime: "2026-09-21T16:00:00.000Z",
      venue: "SJT 402",
      status: "PENDING",
    },
    incomingNotice: {
      title: "NLP Project Review Notice",
      rawText: "Students are required to attend the NLP Project Review on Tuesday, September 22, 2026 at 2:00 PM in SJT 402.",
      channel: "ANNOUNCEMENT",
    },
    expected: {
      hasContradiction: true,
      conflictType: "SCHEDULE_CONFLICT",
      conflictingField: "startTime",
      requiresVerification: true,
    },
  },

  // ── Scenario 2: Deadline Conflict (Friday 5 PM vs Saturday 11:59 PM) ────────
  {
    id: "CONTRA-02",
    name: "Assignment Deadline Conflict without Extension Statement",
    category: "DEADLINE_CONFLICT",
    existingRecord: {
      id: "task-ml-asg-2",
      itemType: "TASK",
      title: "Machine Learning Assignment 2",
      courseCode: "CSE3002",
      deadline: "2026-09-25T17:00:00.000Z", // Friday 5:00 PM
      submissionPlatform: "VTOP",
      status: "PENDING",
    },
    incomingNotice: {
      title: "ML Assignment 2 Submission Date",
      rawText: "Reminder: Machine Learning Assignment 2 must be submitted by Saturday, September 26, 2026 at 11:59 PM on VTOP.",
      channel: "CIRCULAR",
    },
    expected: {
      hasContradiction: true,
      conflictType: "DEADLINE_CONFLICT",
      conflictingField: "deadline",
      requiresVerification: true,
    },
  },

  // ── Scenario 3: Venue Conflict (SJT 402 vs TT 301) ──────────────────────────
  {
    id: "CONTRA-03",
    name: "Lecture Venue Discrepancy (SJT 402 vs TT 301)",
    category: "VENUE_CONFLICT",
    existingRecord: {
      id: "event-cn-lec-1",
      itemType: "EVENT",
      title: "Computer Networks Lecture",
      courseCode: "CSE2001",
      startTime: "2026-09-23T03:30:00.000Z", // 9:00 AM IST
      venue: "SJT 402",
      status: "PENDING",
    },
    incomingNotice: {
      title: "Computer Networks Class Room",
      rawText: "The Computer Networks Lecture on September 23, 2026 at 9:00 AM will be held in TT 301.",
      channel: "WHATSAPP",
    },
    expected: {
      hasContradiction: true,
      conflictType: "VENUE_CONFLICT",
      conflictingField: "venue",
      requiresVerification: true,
    },
  },

  // ── Scenario 4: Platform Conflict (VTOP vs Canvas) ──────────────────────────
  {
    id: "CONTRA-04",
    name: "Submission Platform Conflict (VTOP vs Canvas)",
    category: "PLATFORM_CONFLICT",
    existingRecord: {
      id: "task-os-lab-1",
      itemType: "TASK",
      title: "Operating Systems Lab Report",
      courseCode: "CSE2004",
      deadline: "2026-09-24T23:59:00.000Z",
      submissionPlatform: "VTOP",
      status: "PENDING",
    },
    incomingNotice: {
      title: "OS Lab Submission Portal",
      rawText: "All students must submit their Operating Systems Lab Report through Canvas before the deadline.",
      channel: "ANNOUNCEMENT",
    },
    expected: {
      hasContradiction: true,
      conflictType: "PLATFORM_CONFLICT",
      conflictingField: "submissionPlatform",
      requiresVerification: true,
    },
  },

  // ── Scenario 5: Marks Allocation Conflict (20 marks vs 30 marks) ─────────────
  {
    id: "CONTRA-05",
    name: "Marks Discrepancy: 20 marks vs 30 marks",
    category: "MARKS_CONFLICT",
    existingRecord: {
      id: "task-dbms-proj-1",
      itemType: "TASK",
      title: "DBMS Course Project",
      courseCode: "CSE3001",
      deadline: "2026-09-30T23:59:00.000Z",
      marks: 20,
      status: "PENDING",
    },
    incomingNotice: {
      title: "DBMS Project Evaluation Scheme",
      rawText: "The DBMS Course Project carries a maximum evaluation of 30 marks towards continuous assessment.",
      channel: "CIRCULAR",
    },
    expected: {
      hasContradiction: true,
      conflictType: "MARKS_CONFLICT",
      conflictingField: "marks",
      requiresVerification: true,
    },
  },

  // ── Scenario 6: Exam Schedule Conflict (CAT-1 Date/Time) ─────────────────────
  {
    id: "CONTRA-06",
    name: "CAT-1 Exam Schedule Discrepancy (Oct 10 vs Oct 12)",
    category: "EXAM_CONFLICT",
    existingRecord: {
      id: "exam-ai-cat1",
      itemType: "EXAM",
      title: "Artificial Intelligence CAT-1 Exam",
      courseCode: "CSE3005",
      startTime: "2026-10-10T10:00:00.000Z",
      venue: "SJT 101",
      status: "PENDING",
    },
    incomingNotice: {
      title: "AI Examination Circular",
      rawText: "Artificial Intelligence CAT-1 Exam is scheduled for October 12, 2026 at 2:00 PM in SJT 101.",
      channel: "EMAIL",
    },
    expected: {
      hasContradiction: true,
      conflictType: "EXAM_SCHEDULE_CONFLICT",
      conflictingField: "startTime",
      requiresVerification: true,
    },
  },

  // ── Scenario 7: Multiple Discrepancies (Time AND Venue) ──────────────────────
  {
    id: "CONTRA-07",
    name: "Simultaneous Time and Venue Conflict",
    category: "SCHEDULE_CONFLICT",
    existingRecord: {
      id: "event-iot-rev",
      itemType: "EVENT",
      title: "IoT Project Demo",
      courseCode: "ECE3001",
      startTime: "2026-09-24T10:00:00.000Z",
      venue: "SJT 101",
      status: "PENDING",
    },
    incomingNotice: {
      title: "IoT Demo Timings",
      rawText: "The IoT Project Demo will take place at 2:00 PM in MB 205.",
      channel: "ANNOUNCEMENT",
    },
    expected: {
      hasContradiction: true,
      requiresVerification: true,
    },
  },

  // ── Scenario 8: Explicit Legitimate Reschedule (Should NOT be flagged as unverified contradiction) ──
  {
    id: "CONTRA-08",
    name: "Explicit Legitimate Reschedule ('shifted from Monday to Tuesday')",
    category: "EXPLICIT_RESCHEDULE",
    existingRecord: {
      id: "event-nlp-rev-2",
      itemType: "EVENT",
      title: "NLP Project Review",
      courseCode: "CSE4001",
      startTime: "2026-09-21T15:00:00.000Z",
      venue: "SJT 402",
      status: "PENDING",
    },
    incomingNotice: {
      title: "NLP Project Review Rescheduled",
      rawText: "The NLP Project Review has been shifted from Monday at 3 PM to Tuesday, September 22, 2026 at 2:00 PM.",
      channel: "CIRCULAR",
    },
    expected: {
      hasContradiction: false, // Legitimate explicit reschedule!
      requiresVerification: false,
    },
  },

  // ── Scenario 9: Explicit Legitimate Deadline Extension ──────────────────────
  {
    id: "CONTRA-09",
    name: "Explicit Legitimate Deadline Extension ('extended from ... to ...')",
    category: "EXPLICIT_RESCHEDULE",
    existingRecord: {
      id: "task-ml-asg-3",
      itemType: "TASK",
      title: "Machine Learning Assignment 3",
      courseCode: "CSE3002",
      deadline: "2026-09-20T23:59:00.000Z",
      status: "PENDING",
    },
    incomingNotice: {
      title: "ML Assignment 3 Deadline Extension",
      rawText: "The deadline for Machine Learning Assignment 3 has been extended from September 20 to September 25, 2026 at 11:59 PM.",
      channel: "CIRCULAR",
    },
    expected: {
      hasContradiction: false, // Legitimate extension!
      requiresVerification: false,
    },
  },

  // ── Scenario 10: Duplicate Notice (No Contradiction) ─────────────────────────
  {
    id: "CONTRA-10",
    name: "Duplicate Notice Matching Existing Record Identically",
    category: "DUPLICATE",
    existingRecord: {
      id: "event-dbms-lec",
      itemType: "EVENT",
      title: "DBMS Lecture",
      courseCode: "CSE3001",
      startTime: "2026-09-23T04:30:00.000Z", // 10:00 AM IST
      venue: "SJT 402",
      status: "PENDING",
    },
    incomingNotice: {
      title: "DBMS Lecture Reminder",
      rawText: "DBMS Lecture is scheduled for September 23, 2026 at 10:00 AM in SJT 402.",
      channel: "EMAIL",
    },
    expected: {
      hasContradiction: false,
      requiresVerification: false,
    },
  },

  // ── Scenario 11: Exam Venue Conflict (SJT Hall vs TT Auditorium) ─────────────
  {
    id: "CONTRA-11",
    name: "FAT Exam Venue Contradiction",
    category: "VENUE_CONFLICT",
    existingRecord: {
      id: "exam-stats-fat",
      itemType: "EXAM",
      title: "Applied Statistics FAT Exam",
      courseCode: "MAT2001",
      startTime: "2026-11-15T03:30:00.000Z", // 9:00 AM IST
      venue: "SJT 101",
      status: "PENDING",
    },
    incomingNotice: {
      title: "Applied Statistics Seating Notice",
      rawText: "Applied Statistics FAT Exam on November 15, 2026 at 9:00 AM will be held in TT 105.",
      channel: "CIRCULAR",
    },
    expected: {
      hasContradiction: true,
      conflictType: "VENUE_CONFLICT",
      conflictingField: "venue",
      requiresVerification: true,
    },
  },

  // ── Scenario 12: Timing Discrepancy (2:00 PM vs 2:30 PM) ────────────────────
  {
    id: "CONTRA-12",
    name: "30-Minute Schedule Offset Conflict",
    category: "SCHEDULE_CONFLICT",
    existingRecord: {
      id: "event-se-review",
      itemType: "EVENT",
      title: "Software Engineering Review",
      courseCode: "CSE3003",
      startTime: "2026-09-28T14:00:00.000Z", // 2:00 PM
      venue: "MB 102",
      status: "PENDING",
    },
    incomingNotice: {
      title: "SE Review Timing Update",
      rawText: "Please note that the Software Engineering Review is on September 28, 2026 at 2:30 PM in MB 102.",
      channel: "ANNOUNCEMENT",
    },
    expected: {
      hasContradiction: true,
      conflictingField: "startTime",
      requiresVerification: true,
    },
  },

  // ── Scenario 13: Direct Notice-to-Notice Comparison ──────────────────────────
  {
    id: "CONTRA-13",
    name: "Notice A vs Notice B Direct Comparison (Differing Review Dates)",
    category: "SCHEDULE_CONFLICT",
    existingRecord: {
      id: "rec-notice-a",
      itemType: "EVENT",
      title: "Natural Language Processing Review",
      courseCode: "CSE4001",
      startTime: "2026-09-21T15:00:00.000Z",
      status: "PENDING",
    },
    incomingNotice: {
      title: "Notice B (Competing Announcement)",
      rawText: "Natural Language Processing Review is scheduled for Tuesday, September 22 at 2:00 PM.",
      channel: "ANNOUNCEMENT",
    },
    expected: {
      hasContradiction: true,
      requiresVerification: true,
    },
  },

  // ── Scenario 14: Conflicting Deadline Time (5:00 PM vs 11:59 PM) ─────────────
  {
    id: "CONTRA-14",
    name: "Deadline Time Contradiction on Same Day",
    category: "DEADLINE_CONFLICT",
    existingRecord: {
      id: "task-ai-asg-1",
      itemType: "TASK",
      title: "AI Assignment 1",
      courseCode: "CSE3005",
      deadline: "2026-09-25T17:00:00.000Z", // 5:00 PM
      status: "PENDING",
    },
    incomingNotice: {
      title: "AI Assignment 1 Due Notice",
      rawText: "Students must submit AI Assignment 1 before September 25, 2026 at 11:59 PM.",
      channel: "EMAIL",
    },
    expected: {
      hasContradiction: true,
      conflictingField: "deadline",
      requiresVerification: true,
    },
  },

  // ── Scenario 15: Cross-Notice Contradiction in Ingest Pipeline ───────────────
  {
    id: "CONTRA-15",
    name: "Cross-Notice Contradiction with Evidence Grounding",
    category: "SCHEDULE_CONFLICT",
    existingRecord: {
      id: "event-deep-lec",
      itemType: "EVENT",
      title: "Deep Learning Guest Lecture",
      courseCode: "CSE4002",
      startTime: "2026-09-29T11:00:00.000Z",
      venue: "SJT 201",
      status: "PENDING",
    },
    incomingNotice: {
      title: "Guest Lecture Circular",
      rawText: "The Deep Learning Guest Lecture will take place on September 29, 2026 at 3:00 PM in SJT 201.",
      channel: "CIRCULAR",
    },
    expected: {
      hasContradiction: true,
      conflictingField: "startTime",
      requiresVerification: true,
    },
  },

  // ── Scenario 16: Assistant Contradiction Query Grounding ──────────────────────
  {
    id: "CONTRA-16",
    name: "Assistant Query: 'Is there any conflict for my NLP project review?'",
    category: "QUERY",
    existingRecord: {
      id: "event-nlp-rev-query",
      itemType: "EVENT",
      title: "NLP Project Review",
      courseCode: "CSE4001",
      startTime: "2026-09-21T15:00:00.000Z",
      venue: "SJT 402",
      status: "PENDING",
    },
    incomingNotice: {
      title: "Competing Review Announcement",
      rawText: "The NLP Project Review is scheduled for Tuesday, September 22, 2026 at 2:00 PM.",
      channel: "ANNOUNCEMENT",
    },
    expected: {
      query: "Is there any conflict for my NLP project review?",
      hasContradiction: true,
      requiresVerification: true,
    },
  },
];
