import { PriorityLevel, DeadlinePressureLevel } from "../intelligence/types";

export interface M4ScenarioItem {
  id: string;
  itemType: "TASK" | "EXAM" | "EVENT";
  title: string;
  courseCode: string;
  category: string;
  deadlineOffsetHours: number | null; // relative to anchor date
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  marks: number | null;
  hasPenaltyClause?: boolean;
  hasUrgentKeywords?: boolean;
  isClustered?: boolean;
  isRescheduled?: boolean;
  isDuplicate?: boolean;
}

export interface M4TestScenario {
  id: string;
  name: string;
  category: string;
  description: string;
  items: M4ScenarioItem[];
  expected: {
    topPriorityItemId?: string;
    expectedItemLevels?: Record<string, PriorityLevel>;
    expectedMinScores?: Record<string, number>;
    expectedMaxScores?: Record<string, number>;
    activeAttentionCount: number;
    todayDeliverablesCount?: number;
    tomorrowDeliverablesCount?: number;
    next7DaysDeliverablesCount?: number;
    overallPressure?: DeadlinePressureLevel;
    recommendedItemId?: string;
    expectedObservationTypes?: string[];
  };
}

// Fixed Anchor Date: Friday, Sep 18, 2026, 10:00 AM IST
export const M4_TEST_ANCHOR_DATE = new Date("2026-09-18T10:00:00+05:30");

export const M4_TEST_SCENARIOS: M4TestScenario[] = [
  // 1. Urgent task due tomorrow with high weight (30 marks) and strict penalty
  {
    id: "m4-case-01",
    name: "Urgent High-Weight Project Due Tomorrow",
    category: "urgent_tasks",
    description: "NLP Capstone Project due in 18 hours carrying 30 marks with strict late submission penalty",
    items: [
      {
        id: "t1",
        itemType: "TASK",
        title: "NLP Capstone Project",
        courseCode: "CSE4001",
        category: "PROJECT",
        deadlineOffsetHours: 18, // within 24h
        status: "PENDING",
        marks: 30,
        hasPenaltyClause: true,
      },
    ],
    expected: {
      topPriorityItemId: "t1",
      expectedItemLevels: { t1: "CRITICAL" },
      expectedMinScores: { t1: 85 }, // 15(incomplete) + 35(<=24h) + 20(30m) + 12(proj) + 10(strict) = 92
      activeAttentionCount: 1,
      tomorrowDeliverablesCount: 1,
      overallPressure: "HIGH",
      recommendedItemId: "t1",
    },
  },

  // 2. Overdue task requiring immediate recovery
  {
    id: "m4-case-02",
    name: "Overdue Lab Deliverable",
    category: "overdue_tasks",
    description: "Database Lab Report 4 was due 6 hours ago with penalty clause and has not been submitted",
    items: [
      {
        id: "t2",
        itemType: "TASK",
        title: "Database Lab Report 4",
        courseCode: "CSE3002",
        category: "LAB",
        deadlineOffsetHours: -6, // overdue
        status: "PENDING",
        marks: 10,
        hasPenaltyClause: true, // +10 penalty clause -> 15+45+10+8+10 = 88 (CRITICAL)
      },
    ],
    expected: {
      topPriorityItemId: "t2",
      expectedItemLevels: { t2: "CRITICAL" },
      expectedMinScores: { t2: 80 },
      activeAttentionCount: 1,
      todayDeliverablesCount: 1,
      expectedObservationTypes: ["OVERDUE_ALERT"],
      recommendedItemId: "t2",
    },
  },

  // 3. High-weight deliverable in 3 days
  {
    id: "m4-case-03",
    name: "Major Semester Review in 3 Days",
    category: "high_weight_deliverables",
    description: "Software Engineering Project Review worth 40 marks scheduled in 70 hours",
    items: [
      {
        id: "t3",
        itemType: "TASK",
        title: "Software Engineering Review 1",
        courseCode: "CSE3001",
        category: "REVIEW",
        deadlineOffsetHours: 70, // <=7d
        status: "PENDING",
        marks: 40,
      },
    ],
    expected: {
      topPriorityItemId: "t3",
      expectedItemLevels: { t3: "HIGH" }, // 15 + 15 + 20 + 12 = 62
      expectedMinScores: { t3: 60 },
      activeAttentionCount: 1,
      next7DaysDeliverablesCount: 1,
      recommendedItemId: "t3",
    },
  },

  // 4. Upcoming examination
  {
    id: "m4-case-04",
    name: "CAT-1 Examination in 5 Days",
    category: "upcoming_exams",
    description: "Computer Networks Continuous Assessment Test 1 in 120 hours",
    items: [
      {
        id: "e1",
        itemType: "EXAM",
        title: "Computer Networks CAT-1",
        courseCode: "CSE3003",
        category: "EXAM",
        deadlineOffsetHours: 120, // 5 days
        status: "PENDING",
        marks: 50,
      },
    ],
    expected: {
      topPriorityItemId: "e1",
      expectedItemLevels: { e1: "HIGH" }, // 15 + 15 + 20 + 15 = 65
      expectedMinScores: { e1: 65 },
      activeAttentionCount: 1,
      next7DaysDeliverablesCount: 1,
      recommendedItemId: "e1",
    },
  },

  // 5. Low-priority distant homework
  {
    id: "m4-case-05",
    name: "Distant Reading Assignment",
    category: "low_priority_assignments",
    description: "Ethics in AI reading assignment due in 14 days carrying 5 marks",
    items: [
      {
        id: "t5",
        itemType: "TASK",
        title: "Ethics in AI Reflection Paper",
        courseCode: "HUM1002",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 336, // 14 days
        status: "PENDING",
        marks: 5,
      },
    ],
    expected: {
      topPriorityItemId: "t5",
      expectedItemLevels: { t5: "LOW" }, // 15 + 5 + 5 + 5 = 30
      expectedMaxScores: { t5: 39 },
      activeAttentionCount: 1,
      recommendedItemId: "t5",
    },
  },

  // 6. Mixed multi-course student workload
  {
    id: "m4-case-06",
    name: "Mixed Multi-Course Student Schedule",
    category: "mixed_multi_course",
    description: "Student balancing NLP project (due 18h), ML assignment (5 days), and Networks exam (14 days)",
    items: [
      {
        id: "t_nlp",
        itemType: "TASK",
        title: "NLP Final Project",
        courseCode: "CSE4001",
        category: "PROJECT",
        deadlineOffsetHours: 18,
        status: "PENDING",
        marks: 30,
        hasPenaltyClause: true,
      },
      {
        id: "t_ml",
        itemType: "TASK",
        title: "ML Exercise 3",
        courseCode: "CSE4002",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 120,
        status: "PENDING",
        marks: 10,
      },
      {
        id: "e_net",
        itemType: "EXAM",
        title: "Computer Networks FAT",
        courseCode: "CSE3003",
        category: "EXAM",
        deadlineOffsetHours: 336,
        status: "PENDING",
        marks: 50,
      },
    ],
    expected: {
      topPriorityItemId: "t_nlp",
      recommendedItemId: "t_nlp",
      expectedItemLevels: {
        t_nlp: "CRITICAL",
        t_ml: "MEDIUM",
        e_net: "MEDIUM",
      },
      activeAttentionCount: 3,
      tomorrowDeliverablesCount: 1,
      next7DaysDeliverablesCount: 2,
    },
  },

  // 7. Cluster of deadlines on same day
  {
    id: "m4-case-07",
    name: "Deadline Cluster Within 24-48h",
    category: "cluster_deadlines",
    description: "Three major deliverables due tomorrow: Cloud Lab, OS Quiz, and Compiler Assignment",
    items: [
      {
        id: "tc1",
        itemType: "TASK",
        title: "Cloud Computing Lab 5",
        courseCode: "CSE3005",
        category: "LAB",
        deadlineOffsetHours: 20,
        status: "PENDING",
        marks: 15,
        isClustered: true,
      },
      {
        id: "tc2",
        itemType: "TASK",
        title: "Operating Systems Quiz 2",
        courseCode: "CSE3004",
        category: "QUIZ",
        deadlineOffsetHours: 22,
        status: "PENDING",
        marks: 15,
        isClustered: true,
      },
      {
        id: "tc3",
        itemType: "TASK",
        title: "Compiler Design Milestone",
        courseCode: "CSE3006",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 24,
        status: "PENDING",
        marks: 20,
        isClustered: true,
      },
    ],
    expected: {
      activeAttentionCount: 3,
      tomorrowDeliverablesCount: 3,
      overallPressure: "CRITICAL",
      expectedObservationTypes: ["URGENT_CLUSTER"],
    },
  },

  // 8. Completed task exclusion
  {
    id: "m4-case-08",
    name: "Completed Task Complete Exclusion",
    category: "completed_exclusion",
    description: "A task marked COMPLETED has score 0, is excluded from attention and active workload",
    items: [
      {
        id: "t_done",
        itemType: "TASK",
        title: "Completed NLP Assignment 1",
        courseCode: "CSE4001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 4,
        status: "COMPLETED",
        marks: 25,
      },
      {
        id: "t_active",
        itemType: "TASK",
        title: "Pending NLP Assignment 2",
        courseCode: "CSE4001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 48,
        status: "PENDING",
        marks: 15,
      },
    ],
    expected: {
      topPriorityItemId: "t_active",
      recommendedItemId: "t_active",
      expectedItemLevels: {
        t_done: "LOW",
        t_active: "MEDIUM",
      },
      activeAttentionCount: 1, // Only t_active
    },
  },

  // 9. Cancelled task exclusion
  {
    id: "m4-case-09",
    name: "Cancelled Task Exclusion",
    category: "cancelled_exclusion",
    description: "Cancelled quiz has score 0 and is excluded from active attention list and workload pressure",
    items: [
      {
        id: "t_cancelled",
        itemType: "TASK",
        title: "Cancelled Mathematics Quiz",
        courseCode: "MAT2001",
        category: "QUIZ",
        deadlineOffsetHours: 8,
        status: "CANCELLED",
        marks: 20,
      },
      {
        id: "t_regular",
        itemType: "TASK",
        title: "Physics Problem Set 3",
        courseCode: "PHY1001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 36,
        status: "PENDING",
        marks: 10,
      },
    ],
    expected: {
      topPriorityItemId: "t_regular",
      recommendedItemId: "t_regular",
      expectedItemLevels: {
        t_cancelled: "LOW",
      },
      activeAttentionCount: 1,
    },
  },

  // 10. Cancelled event exclusion
  {
    id: "m4-case-10",
    name: "Cancelled Academic Event Exclusion",
    category: "cancelled_event_exclusion",
    description: "Cancelled guest lecture should not be counted in active pulse or event load",
    items: [
      {
        id: "ev_cancelled",
        itemType: "EVENT",
        title: "Cancelled Guest Lecture on Quantum Computing",
        courseCode: "CSE4005",
        category: "LECTURE",
        deadlineOffsetHours: 5,
        status: "CANCELLED",
        marks: null,
      },
    ],
    expected: {
      activeAttentionCount: 0,
      todayDeliverablesCount: 0,
    },
  },

  // 11. Rescheduled item counted once using new deadline
  {
    id: "m4-case-11",
    name: "Rescheduled Item Counted Once at New Date",
    category: "rescheduled_once",
    description: "Task rescheduled from today (+6h) to next week (+140h) is counted once at +140h",
    items: [
      {
        id: "t_resched",
        itemType: "TASK",
        title: "Machine Learning Mini Project",
        courseCode: "CSE4002",
        category: "PROJECT",
        deadlineOffsetHours: 140, // new extended deadline (not 6h)
        status: "PENDING",
        marks: 25,
        isRescheduled: true,
      },
    ],
    expected: {
      activeAttentionCount: 1,
      todayDeliverablesCount: 0, // not today
      next7DaysDeliverablesCount: 1, // in next 7 days
      recommendedItemId: "t_resched",
    },
  },

  // 12. Duplicate notices not inflating workload
  {
    id: "m4-case-12",
    name: "Duplicate Prevention Invariant",
    category: "duplicate_prevention",
    description: "Repeated notice for existing assignment must result in exactly 1 counted workload item",
    items: [
      {
        id: "t_orig",
        itemType: "TASK",
        title: "Web Technologies Assignment 2",
        courseCode: "CSE2004",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 26, // falls in tomorrow
        status: "PENDING",
        marks: 15,
      },
      // Duplicate item marked duplicate / cancelled
      {
        id: "t_dup",
        itemType: "TASK",
        title: "Web Technologies Assignment 2 (Duplicate Notice)",
        courseCode: "CSE2004",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 26,
        status: "CANCELLED", // Ingest pipeline ignores or cancels duplicate
        marks: 15,
        isDuplicate: true,
      },
    ],
    expected: {
      activeAttentionCount: 1,
      tomorrowDeliverablesCount: 1,
    },
  },

  // 13. Penalty clause score boost
  {
    id: "m4-case-13",
    name: "Strict Penalty Clause Impact",
    category: "penalty_clause",
    description: "Task with strict late submission policy receives +10 score contribution",
    items: [
      {
        id: "t_strict",
        itemType: "TASK",
        title: "Formal Methods Assignment",
        courseCode: "CSE3008",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 22,
        status: "PENDING",
        marks: 15,
        hasPenaltyClause: true,
      },
      {
        id: "t_lenient",
        itemType: "TASK",
        title: "Economics Essay",
        courseCode: "HUM2001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 22,
        status: "PENDING",
        marks: 15,
        hasPenaltyClause: false,
      },
    ],
    expected: {
      topPriorityItemId: "t_strict", // Strict wins because +10 penalty clause
      activeAttentionCount: 2,
      recommendedItemId: "t_strict",
    },
  },

  // 14. Explicit urgency keywords
  {
    id: "m4-case-14",
    name: "Explicit Urgency Keyword Detection",
    category: "urgent_keywords",
    description: "Notice explicitly marked CRITICAL/URGENT receives urgency factor bonus",
    items: [
      {
        id: "t_urgent_kw",
        itemType: "TASK",
        title: "CRITICAL: Immediate Bio-Informatics Lab Verification",
        courseCode: "BIO2001",
        category: "LAB",
        deadlineOffsetHours: 30,
        status: "PENDING",
        marks: 10,
        hasUrgentKeywords: true,
      },
    ],
    expected: {
      activeAttentionCount: 1,
      expectedMinScores: { t_urgent_kw: 60 },
    },
  },

  // 15. Same-day assessment clash (Exam + Task)
  {
    id: "m4-case-15",
    name: "Same-Day Exam and Project Submission Clash",
    category: "same_day_assessment",
    description: "CAT-2 exam in morning and Project report in evening on the same calendar day",
    items: [
      {
        id: "e_clash",
        itemType: "EXAM",
        title: "Digital Logic CAT-2",
        courseCode: "ECE1002",
        category: "EXAM",
        deadlineOffsetHours: 28,
        status: "PENDING",
        marks: 50,
      },
      {
        id: "t_clash",
        itemType: "TASK",
        title: "Digital Logic Verilog Project",
        courseCode: "ECE1002",
        category: "PROJECT",
        deadlineOffsetHours: 32,
        status: "PENDING",
        marks: 25,
      },
    ],
    expected: {
      activeAttentionCount: 2,
      expectedObservationTypes: ["SAME_DAY_ASSESSMENT"],
    },
  },

  // 16. Score tiebreaker: Earliest deadline wins
  {
    id: "m4-case-16",
    name: "Deterministic Tiebreaker: Earliest Deadline",
    category: "tiebreakers",
    description: "Two tasks with identical score (e.g. 55) resolve priority by earliest deadline",
    items: [
      {
        id: "t_earlier",
        itemType: "TASK",
        title: "Calculus Homework Set 4",
        courseCode: "MAT1001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 30,
        status: "PENDING",
        marks: 10,
      },
      {
        id: "t_later",
        itemType: "TASK",
        title: "Linear Algebra Homework 3",
        courseCode: "MAT1002",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 42,
        status: "PENDING",
        marks: 10,
      },
    ],
    expected: {
      topPriorityItemId: "t_earlier",
      recommendedItemId: "t_earlier",
      activeAttentionCount: 2,
    },
  },

  // 17. Score & deadline tiebreaker: Higher marks win
  {
    id: "m4-case-17",
    name: "Deterministic Tiebreaker: Higher Weightage",
    category: "tiebreakers",
    description: "Two tasks with same deadline resolve by academic marks weightage",
    items: [
      {
        id: "t_high_marks",
        itemType: "TASK",
        title: "Embedded Systems Lab Report",
        courseCode: "ECE2005",
        category: "LAB",
        deadlineOffsetHours: 20,
        status: "PENDING",
        marks: 25,
      },
      {
        id: "t_low_marks",
        itemType: "TASK",
        title: "Embedded Systems Pre-Lab Quiz",
        courseCode: "ECE2005",
        category: "LAB",
        deadlineOffsetHours: 20,
        status: "PENDING",
        marks: 5,
      },
    ],
    expected: {
      topPriorityItemId: "t_high_marks",
      recommendedItemId: "t_high_marks",
      activeAttentionCount: 2,
    },
  },

  // 18. Multi-horizon workload partitioning
  {
    id: "m4-case-18",
    name: "Multi-Horizon Workload Partitioning",
    category: "workload_partitioning",
    description: "Items distributed across Today (+8h), Tomorrow (+24h), Next 7 Days (+100h), and Next 30 Days (+500h)",
    items: [
      {
        id: "t_today",
        itemType: "TASK",
        title: "Daily Standup Notes",
        courseCode: "CSE4001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 8,
        status: "PENDING",
        marks: 5,
      },
      {
        id: "t_tmrw",
        itemType: "TASK",
        title: "Algorithm Problem Set",
        courseCode: "CSE2001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 24,
        status: "PENDING",
        marks: 10,
      },
      {
        id: "t_7d",
        itemType: "TASK",
        title: "Distributed Systems Milestone",
        courseCode: "CSE4003",
        category: "PROJECT",
        deadlineOffsetHours: 100,
        status: "PENDING",
        marks: 20,
      },
      {
        id: "t_30d",
        itemType: "TASK",
        title: "Semester Capstone Final Dossier",
        courseCode: "CSE4009",
        category: "PROJECT",
        deadlineOffsetHours: 500,
        status: "PENDING",
        marks: 50,
      },
    ],
    expected: {
      activeAttentionCount: 4,
      todayDeliverablesCount: 1,
      tomorrowDeliverablesCount: 1,
      next7DaysDeliverablesCount: 3,
    },
  },

  // 19. Cognitive effort estimation accuracy
  {
    id: "m4-case-19",
    name: "Cognitive Effort Estimation by Category",
    category: "effort_estimation",
    description: "Effort hours properly scaled: Project ~10h, Exam ~6h, Lab ~2.5h",
    items: [
      {
        id: "t_proj",
        itemType: "TASK",
        title: "Big Data Processing Project",
        courseCode: "CSE4004",
        category: "PROJECT",
        deadlineOffsetHours: 48,
        status: "PENDING",
        marks: 30,
      },
      {
        id: "e_exam",
        itemType: "EXAM",
        title: "Big Data Midterm",
        courseCode: "CSE4004",
        category: "EXAM",
        deadlineOffsetHours: 72,
        status: "PENDING",
        marks: 50,
      },
    ],
    expected: {
      activeAttentionCount: 2,
      next7DaysDeliverablesCount: 2,
    },
  },

  // 20. All clear condition
  {
    id: "m4-case-20",
    name: "All Clear Academic Schedule",
    category: "all_clear",
    description: "No pending or overdue deliverables in schedule produces ALL_CLEAR observation",
    items: [],
    expected: {
      activeAttentionCount: 0,
      expectedObservationTypes: ["ALL_CLEAR"],
      overallPressure: "LOW",
    },
  },
];
