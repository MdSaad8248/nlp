import { AcademicRelationship } from "../nlp/schemas";
import { CandidateExistingRecord } from "../nlp/change-intelligence";

export interface Milestone3TestCase {
  id: string;
  label: string;
  categoryCoverage: string;
  description: string;
  existingRecords: CandidateExistingRecord[];
  incomingNoticeText: string;
  expectedRelationship: AcademicRelationship;
  expectedMatchedTitle?: string;
  expectedChangedFields?: string[];
  referenceDate?: Date;
}

// Fixed anchor date for deterministic testing: Friday, Sep 18, 2026, 10:00 AM IST
export const M3_TEST_ANCHOR_DATE = new Date("2026-09-18T10:00:00+05:30");

export const M3_TEST_FIXTURES: Milestone3TestCase[] = [
  // 1. Exact duplicate
  {
    id: "m3-case-01",
    label: "Exact Duplicate Notice",
    categoryCoverage: "exact duplicate",
    description: "Identical notice text and parameters for existing NLP Assignment 2",
    existingRecords: [
      {
        id: "task-nlp-a2",
        itemType: "TASK",
        title: "NLP Assignment 2",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"), // Sep 20, 2026, 11:59 PM IST
        normalizedDeadline: "September 20, 2026 at 11:59 PM",
        submissionPlatform: "VTOP",
        marks: 20,
        status: "PENDING",
      },
    ],
    incomingNoticeText:
      "NLP Assignment 2 is due September 20 at 11:59 PM through VTOP carrying 20 marks.",
    expectedRelationship: "DUPLICATE",
    expectedMatchedTitle: "NLP Assignment 2",
    expectedChangedFields: [],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 2. Wording variation duplicate (Prompt Example B)
  {
    id: "m3-case-02",
    label: "Wording Variation Duplicate (Prompt Example B)",
    categoryCoverage: "wording variation duplicate",
    description: "Reminder notice for existing assignment with identical deadline and platform",
    existingRecords: [
      {
        id: "task-nlp-a2",
        itemType: "TASK",
        title: "NLP Assignment 2",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"), // Sep 20, 2026, 11:59 PM IST
        normalizedDeadline: "September 20, 2026 at 11:59 PM",
        submissionPlatform: "VTOP",
        marks: 20,
        status: "PENDING",
      },
    ],
    incomingNoticeText:
      "Reminder: NLP Assignment 2 is due September 20 at 11:59 PM through VTOP.",
    expectedRelationship: "DUPLICATE",
    expectedMatchedTitle: "NLP Assignment 2",
    expectedChangedFields: [],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 3. Same task with different wording
  {
    id: "m3-case-03",
    label: "Same Task With Different Phrasing",
    categoryCoverage: "same task with different wording",
    description: "Faculty announcement re-stating ML Quiz 1 schedule and platform",
    existingRecords: [
      {
        id: "task-ml-q1",
        itemType: "TASK",
        title: "ML Online Quiz 1",
        category: "QUIZ",
        courseCode: "CSE3002",
        courseTitle: "Machine Learning",
        deadline: new Date("2026-09-22T04:30:00.000Z"), // Sep 22, 2026, 10:00 AM IST
        normalizedDeadline: "September 22, 2026 at 10:00 AM",
        submissionPlatform: "CODETANTRA",
        marks: 15,
        status: "PENDING",
      },
    ],
    incomingNoticeText:
      "Dear Students, please note ML Quiz 1 will take place on September 22 at 10:00 AM via CodeTantra.",
    expectedRelationship: "DUPLICATE",
    expectedMatchedTitle: "ML Online Quiz 1",
    expectedChangedFields: [],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 4. Rescheduled review (Prompt Example A)
  {
    id: "m3-case-04",
    label: "Rescheduled Review (Prompt Example A)",
    categoryCoverage: "rescheduled review",
    description: "Shifted from Friday at 2 PM to Monday at 3 PM",
    existingRecords: [
      {
        id: "event-nlp-rev",
        itemType: "EVENT",
        title: "NLP Project Review",
        category: "REVIEW",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        startTime: new Date("2026-09-25T08:30:00.000Z"), // Friday Sep 25, 2026 at 2:00 PM IST
        endTime: new Date("2026-09-25T09:30:00.000Z"),
        normalizedDeadline: "September 25, 2026 at 2:00 PM",
      },
    ],
    incomingNoticeText:
      "The NLP project review has been shifted from Friday at 2 PM to Monday at 3 PM.",
    expectedRelationship: "RESCHEDULED",
    expectedMatchedTitle: "NLP Project Review",
    expectedChangedFields: ["time", "deadline"],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 5. Rescheduled exam
  {
    id: "m3-case-05",
    label: "Rescheduled Exam/Quiz",
    categoryCoverage: "rescheduled exam",
    description: "ML Quiz 2 rescheduled from Wednesday at 4 PM to Friday at 5 PM",
    existingRecords: [
      {
        id: "task-ml-q2",
        itemType: "TASK",
        title: "ML Quiz 2",
        category: "QUIZ",
        courseCode: "CSE3002",
        courseTitle: "Machine Learning",
        deadline: new Date("2026-09-23T10:30:00.000Z"), // Sep 23, 2026 at 4:00 PM IST
        normalizedDeadline: "September 23, 2026 at 4:00 PM",
      },
    ],
    incomingNoticeText:
      "The ML Quiz 2 was rescheduled from Wednesday at 4 PM to Friday at 5 PM.",
    expectedRelationship: "RESCHEDULED",
    expectedMatchedTitle: "ML Quiz 2",
    expectedChangedFields: ["deadline", "time"],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 6. Changed deadline
  {
    id: "m3-case-06",
    label: "Changed Project Deadline",
    categoryCoverage: "changed deadline",
    description: "DBMS Project deadline updated to a new target date",
    existingRecords: [
      {
        id: "task-dbms-proj",
        itemType: "TASK",
        title: "DBMS Project",
        category: "PROJECT",
        courseCode: "CSE3001",
        courseTitle: "Database Management Systems",
        deadline: new Date("2026-09-30T18:29:00.000Z"),
        normalizedDeadline: "September 30, 2026 at 11:59 PM",
      },
    ],
    incomingNoticeText:
      "Please note: the deadline for DBMS Project is changed to October 10 at 11:59 PM.",
    expectedRelationship: "UPDATED",
    expectedMatchedTitle: "DBMS Project",
    expectedChangedFields: ["deadline"],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 7. Extended deadline
  {
    id: "m3-case-07",
    label: "Extended Assignment Deadline",
    categoryCoverage: "extended deadline",
    description: "NLP Assignment 1 extended from September 18 to September 28",
    existingRecords: [
      {
        id: "task-nlp-a1",
        itemType: "TASK",
        title: "NLP Assignment 1",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-18T18:29:00.000Z"),
        normalizedDeadline: "September 18, 2026 at 11:59 PM",
      },
    ],
    incomingNoticeText:
      "The deadline for NLP Assignment 1 is extended from September 18 to September 28 before 11:59 PM.",
    expectedRelationship: "RESCHEDULED",
    expectedMatchedTitle: "NLP Assignment 1",
    expectedChangedFields: ["deadline"],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 8. Changed venue
  {
    id: "m3-case-08",
    label: "Relocated Class Venue",
    categoryCoverage: "changed venue",
    description: "OS lecture moved to a new hall SJT 402",
    existingRecords: [
      {
        id: "event-os-lec",
        itemType: "EVENT",
        title: "OS Lecture",
        category: "LECTURE",
        courseCode: "CSE2004",
        courseTitle: "Operating Systems",
        startTime: new Date("2026-09-24T04:30:00.000Z"), // Thursday 10 AM
        venue: "SJT 101",
      },
    ],
    incomingNoticeText:
      "The OS lecture on Thursday at 10 AM has been moved to SJT 402.",
    expectedRelationship: "RESCHEDULED",
    expectedMatchedTitle: "OS Lecture",
    expectedChangedFields: ["venue"],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 9. Changed platform
  {
    id: "m3-case-09",
    label: "Changed Submission Platform",
    categoryCoverage: "changed platform",
    description: "Platform altered from VTOP to Moodle",
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
      },
    ],
    incomingNoticeText:
      "Submit NLP Assignment 2 via Moodle instead of VTOP before September 20 at 11:59 PM.",
    expectedRelationship: "UPDATED",
    expectedMatchedTitle: "NLP Assignment 2",
    expectedChangedFields: ["platform"],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 10. Changed marks (Prompt Example C)
  {
    id: "m3-case-10",
    label: "Changed Marks Weightage (Prompt Example C)",
    categoryCoverage: "changed marks",
    description: "NLP Assignment 2 weightage updated 20 -> 25 marks",
    existingRecords: [
      {
        id: "task-nlp-a2",
        itemType: "TASK",
        title: "NLP Assignment 2",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"),
        marks: 20,
        submissionPlatform: "VTOP",
      },
    ],
    incomingNoticeText:
      "NLP Assignment 2 will now carry 25 marks.",
    expectedRelationship: "UPDATED",
    expectedMatchedTitle: "NLP Assignment 2",
    expectedChangedFields: ["marks"],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 11. Cancellation (Prompt Example D)
  {
    id: "m3-case-11",
    label: "Cancelled Event (Prompt Example D)",
    categoryCoverage: "cancellation",
    description: "NLP project review scheduled for Monday has been cancelled",
    existingRecords: [
      {
        id: "event-nlp-rev",
        itemType: "EVENT",
        title: "NLP Project Review",
        category: "REVIEW",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        startTime: new Date("2026-09-21T09:30:00.000Z"), // Monday 3 PM
        status: "ACTIVE",
      },
    ],
    incomingNoticeText:
      "The NLP project review scheduled for Monday has been cancelled.",
    expectedRelationship: "CANCELLED",
    expectedMatchedTitle: "NLP Project Review",
    expectedChangedFields: ["status"],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 12. Unrelated notice
  {
    id: "m3-case-12",
    label: "Unrelated Circular Notice",
    categoryCoverage: "unrelated notice",
    description: "Campus maintenance circular unrelated to existing deliverables",
    existingRecords: [
      {
        id: "task-nlp-a2",
        itemType: "TASK",
        title: "NLP Assignment 2",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"),
      },
    ],
    incomingNoticeText:
      "Campus WiFi maintenance scheduled for Sunday evening from 6 PM to 10 PM. Internet services will be intermittently unavailable.",
    expectedRelationship: "NEW",
    expectedChangedFields: [],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 13. Same course but different assignment
  {
    id: "m3-case-13",
    label: "Same Course Different Assignment",
    categoryCoverage: "same course but different assignment",
    description: "Assignment 2 announced when Assignment 1 already exists",
    existingRecords: [
      {
        id: "task-nlp-a1",
        itemType: "TASK",
        title: "NLP Assignment 1",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-15T18:29:00.000Z"),
      },
    ],
    incomingNoticeText:
      "NLP Assignment 2 is released. Submit through VTOP by October 05 at 11:59 PM.",
    expectedRelationship: "NEW",
    expectedChangedFields: [],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 14. Same title across different courses
  {
    id: "m3-case-14",
    label: "Same Deliverable Title Across Different Courses",
    categoryCoverage: "same title across different courses",
    description: "Assignment 1 for MAT2001 when Assignment 1 for CSE4001 exists",
    existingRecords: [
      {
        id: "task-nlp-a1",
        itemType: "TASK",
        title: "Assignment 1",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-18T18:29:00.000Z"),
      },
    ],
    incomingNoticeText:
      "Applied Statistics (MAT2001) Assignment 1 is due next Friday at 5 PM on Moodle.",
    expectedRelationship: "NEW",
    expectedChangedFields: [],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 15. Multiple notices referring to the same event
  {
    id: "m3-case-15",
    label: "Multiple Notices Referring to Same Event",
    categoryCoverage: "multiple notices referring to the same event",
    description: "Follow-up reminder for existing scheduled project review",
    existingRecords: [
      {
        id: "event-nlp-rev",
        itemType: "EVENT",
        title: "NLP Project Review",
        category: "REVIEW",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        startTime: new Date("2026-09-21T09:30:00.000Z"), // Monday 3 PM
        normalizedDeadline: "September 21, 2026 at 3:00 PM",
        venue: "SJT 402",
      },
    ],
    incomingNoticeText:
      "Reminder: The NLP project review is scheduled for Monday at 3 PM in SJT 402.",
    expectedRelationship: "DUPLICATE",
    expectedMatchedTitle: "NLP Project Review",
    expectedChangedFields: [],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },

  // 16. Preponed session
  {
    id: "m3-case-16",
    label: "Preponed Academic Session",
    categoryCoverage: "preponed session",
    description: "AI review preponed from Monday to Sunday",
    existingRecords: [
      {
        id: "event-ai-rev",
        itemType: "EVENT",
        title: "AI Project Review",
        category: "REVIEW",
        courseCode: "CSE3005",
        courseTitle: "Artificial Intelligence",
        startTime: new Date("2026-09-21T11:30:00.000Z"), // Monday 5 PM
        normalizedDeadline: "September 21, 2026 at 5:00 PM",
      },
    ],
    incomingNoticeText:
      "AI Project Review has been preponed from Monday at 5 PM to Sunday at 6 PM.",
    expectedRelationship: "RESCHEDULED",
    expectedMatchedTitle: "AI Project Review",
    expectedChangedFields: ["time", "deadline"],
    referenceDate: M3_TEST_ANCHOR_DATE,
  },
];
