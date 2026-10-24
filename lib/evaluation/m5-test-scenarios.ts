import {
  NotificationType,
  NotificationUrgency,
  NotificationStage,
  RankedAcademicItem,
  FullAcademicState,
  AdaptiveNotification,
} from "../intelligence/types";

export interface M5ScenarioNoticeItem {
  id: string;
  title: string;
  courseCode: string;
  category: string;
  deadlineOffsetHours: number | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  marks: number | null;
  hasPenaltyClause?: boolean;
  hasUrgentKeywords?: boolean;
  isClustered?: boolean;
  isRescheduled?: boolean;
}

export interface M5TestScenario {
  id: string;
  name: string;
  category: string;
  description: string;
  items: M5ScenarioNoticeItem[];
  existingNotifications?: Partial<AdaptiveNotification>[];
  auditLogs?: Array<{
    id: string;
    targetType: string;
    targetId: string;
    relationship: string;
    changedFields: string | null;
    reasons: string | null;
    createdAt: Date;
  }>;
  preferences?: {
    notificationsEnabled?: boolean;
    urgentAlertsEnabled?: boolean;
    workloadAlertsEnabled?: boolean;
    digestEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
  expected: {
    expectedGeneratedTypes?: NotificationType[];
    expectedMinNotificationCount?: number;
    expectedMaxNotificationCount?: number;
    expectedUrgencies?: Record<string, NotificationUrgency>;
    expectedStages?: Record<string, NotificationStage>;
    shouldInvalidateIds?: string[];
    expectDigest?: boolean;
    shouldBeSuppressed?: boolean;
    whyBulletsContain?: string[];
  };
}

export const M5_TEST_ANCHOR_DATE = new Date("2026-09-18T10:00:00+05:30");

export const M5_TEST_SCENARIOS: M5TestScenario[] = [
  // 1. Low-priority task due in 7 days with light workload -> early reminder suppressed
  {
    id: "m5-case-01",
    name: "Low-Priority Task 7-Day Suppression",
    category: "suppression_and_timing",
    description: "Low-priority reading assignment due in 160 hours (7D window) under low workload pressure is suppressed to avoid alert fatigue",
    items: [
      {
        id: "task-low-7d",
        title: "Optional Reading: Chapter 4 Overview",
        courseCode: "HUM1001",
        category: "READING",
        deadlineOffsetHours: 160,
        status: "PENDING",
        marks: 5,
      },
    ],
    expected: {
      expectedMaxNotificationCount: 0,
      shouldBeSuppressed: true,
    },
  },

  // 2. Medium-priority assignment due in 48 hours -> 48H reminder generated
  {
    id: "m5-case-02",
    name: "Medium-Priority 48H Stage Reminder",
    category: "deadline_reminders",
    description: "Data Structures lab assignment due in 40 hours triggers a 48H stage reminder with NORMAL urgency",
    items: [
      {
        id: "task-med-48h",
        title: "BST & AVL Trees Implementation Lab",
        courseCode: "CSE2002",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 40,
        status: "PENDING",
        marks: 15,
      },
    ],
    expected: {
      expectedGeneratedTypes: ["DEADLINE_REMINDER"],
      expectedMinNotificationCount: 1,
      expectedStages: { "task-med-48h": "48H" },
      expectedUrgencies: { "task-med-48h": "NORMAL" },
      whyBulletsContain: ["Task is incomplete", "Due in"],
    },
  },

  // 3. High-priority task due tomorrow (24 hours) -> 24H stage reminder with URGENT escalation
  {
    id: "m5-case-03",
    name: "High-Priority 24H Stage Urgent Escalation",
    category: "deadline_reminders",
    description: "Database Architecture Project due in 20 hours (within 24H window) carrying 25 marks escalates to URGENT urgency",
    items: [
      {
        id: "task-high-24h",
        title: "Distributed Database Indexing Project",
        courseCode: "CSE3001",
        category: "PROJECT",
        deadlineOffsetHours: 20,
        status: "PENDING",
        marks: 25,
      },
    ],
    expected: {
      expectedGeneratedTypes: ["DEADLINE_REMINDER"],
      expectedMinNotificationCount: 1,
      expectedStages: { "task-high-24h": "24H" },
      expectedUrgencies: { "task-high-24h": "URGENT" },
      whyBulletsContain: ["Due in 20h", "High priority"],
    },
  },

  // 4. Critical milestone due within 12 hours -> CRITICAL urgency notification
  {
    id: "m5-case-04",
    name: "Critical Milestone Due Within 12 Hours",
    category: "urgent_deadlines",
    description: "NLP Capstone Deliverable due in 8 hours carrying 30 marks triggers an immediate URGENT_DEADLINE with CRITICAL urgency",
    items: [
      {
        id: "task-crit-12h",
        title: "NLP Transformer Model Checkpoint",
        courseCode: "CSE4001",
        category: "PROJECT",
        deadlineOffsetHours: 8,
        status: "PENDING",
        marks: 30,
        hasPenaltyClause: true,
      },
    ],
    expected: {
      expectedGeneratedTypes: ["URGENT_DEADLINE"],
      expectedMinNotificationCount: 1,
      expectedStages: { "task-crit-12h": "12H" },
      expectedUrgencies: { "task-crit-12h": "CRITICAL" },
      whyBulletsContain: ["Task is active and incomplete", "Due within 8h", "Strict late submission policy"],
    },
  },

  // 5. Incomplete deliverable past deadline -> OVERDUE_ALERT notification
  {
    id: "m5-case-05",
    name: "Overdue Deliverable Alert",
    category: "overdue_alerts",
    description: "Machine Learning Exercise 2 passed its deadline 4 hours ago and remains unsubmitted, triggering an OVERDUE_ALERT",
    items: [
      {
        id: "task-overdue",
        title: "Machine Learning SVM Exercise",
        courseCode: "CSE3002",
        category: "ASSIGNMENT",
        deadlineOffsetHours: -4,
        status: "PENDING",
        marks: 15,
      },
    ],
    expected: {
      expectedGeneratedTypes: ["OVERDUE_ALERT"],
      expectedMinNotificationCount: 1,
      expectedStages: { "task-overdue": "OVERDUE" },
      expectedUrgencies: { "task-overdue": "CRITICAL" },
      whyBulletsContain: ["Task is active and incomplete", "Deadline has passed"],
    },
  },

  // 6. Completed deliverable reminder suppression -> Strictly 0 notifications generated
  {
    id: "m5-case-06",
    name: "Completed Task Reminder Suppression",
    category: "suppression_and_timing",
    description: "Assignment 1 is marked COMPLETED before its deadline; all reminder generation is strictly suppressed",
    items: [
      {
        id: "task-completed",
        title: "Language Modeling & Tokenization Lab",
        courseCode: "CSE4001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 14,
        status: "COMPLETED",
        marks: 20,
      },
    ],
    expected: {
      expectedMaxNotificationCount: 0,
      shouldBeSuppressed: true,
    },
  },

  // 7. Cancelled event reminder suppression -> Strictly 0 notifications generated
  {
    id: "m5-case-07",
    name: "Cancelled Event Suppression",
    category: "suppression_and_timing",
    description: "Guest lecture is cancelled; future scheduled reminders for this event are strictly suppressed",
    items: [
      {
        id: "event-cancelled",
        title: "Guest Lecture on Graph Neural Networks",
        courseCode: "CSE4001",
        category: "LECTURE",
        deadlineOffsetHours: 22,
        status: "CANCELLED",
        marks: null,
      },
    ],
    expected: {
      expectedMaxNotificationCount: 0,
      shouldBeSuppressed: true,
    },
  },

  // 8. Rescheduled deliverable invalidation and new reminder scheduling
  {
    id: "m5-case-08",
    name: "Rescheduled Event Notification & Invalidation",
    category: "change_intelligence",
    description: "Capstone Project Review was rescheduled; existing 24H reminder is invalidated and reschedule alert is created",
    items: [
      {
        id: "task-rescheduled-review",
        title: "Capstone Project Review 1",
        courseCode: "CSE4001",
        category: "REVIEW",
        deadlineOffsetHours: 72,
        status: "PENDING",
        marks: 30,
        isRescheduled: true,
      },
    ],
    existingNotifications: [
      {
        id: "notif-old-review",
        targetItemId: "task-rescheduled-review",
        type: "DEADLINE_REMINDER",
        stage: "24H",
        dedupKey: "task:task-rescheduled-review:24H:old",
        status: "SCHEDULED",
      },
    ],
    auditLogs: [
      {
        id: "audit-resched-1",
        targetType: "TASK",
        targetId: "task-rescheduled-review",
        relationship: "RESCHEDULED",
        changedFields: JSON.stringify(["deadline", "venue"]),
        reasons: JSON.stringify(["Review postponed from Sep 19 to Sep 21 at SJT 402"]),
        createdAt: new Date("2026-09-18T09:30:00+05:30"),
      },
    ],
    expected: {
      expectedGeneratedTypes: ["RESCHEDULED_EVENT"],
      shouldInvalidateIds: ["notif-old-review"],
      whyBulletsContain: ["Schedule changed officially via verified circular"],
    },
  },

  // 9. Strict deadline penalty clause urgency escalation
  {
    id: "m5-case-09",
    name: "Strict Penalty Clause Urgency Escalation",
    category: "urgency_reasoning",
    description: "Task in 48H window normally NORMAL urgency is escalated to URGENT due to strict zero-tolerance late submission penalty",
    items: [
      {
        id: "task-penalty-escalate",
        title: "Operating Systems Memory Allocator Lab",
        courseCode: "CSE2004",
        category: "LAB",
        deadlineOffsetHours: 42,
        status: "PENDING",
        marks: 15,
        hasPenaltyClause: true,
      },
    ],
    expected: {
      expectedGeneratedTypes: ["DEADLINE_REMINDER"],
      expectedStages: { "task-penalty-escalate": "48H" },
      expectedUrgencies: { "task-penalty-escalate": "URGENT" },
      whyBulletsContain: ["Strict late submission penalty active"],
    },
  },

  // 10. High academic weightage (30 marks) urgency boost
  {
    id: "m5-case-10",
    name: "High Weightage Importance Escalation",
    category: "urgency_reasoning",
    description: "Major course project carrying 35 marks in 24H stage receives CRITICAL priority and urgency escalation",
    items: [
      {
        id: "task-high-marks",
        title: "Compiler Design Syntax Tree Generator",
        courseCode: "CSE3003",
        category: "PROJECT",
        deadlineOffsetHours: 22,
        status: "PENDING",
        marks: 35,
      },
    ],
    expected: {
      expectedGeneratedTypes: ["DEADLINE_REMINDER"],
      expectedStages: { "task-high-marks": "24H" },
      expectedUrgencies: { "task-high-marks": "CRITICAL" },
      whyBulletsContain: ["High weightage deliverable", "35 marks"],
    },
  },

  // 11. Deduplication idempotence test
  {
    id: "m5-case-11",
    name: "Deduplication Idempotence Check",
    category: "deduplication",
    description: "If an identical active notification with matching dedupKey already exists, exactly 0 duplicate notifications are created",
    items: [
      {
        id: "task-dedup-check",
        title: "Computer Networks Socket Programming",
        courseCode: "CSE2001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 10,
        status: "PENDING",
        marks: 20,
      },
    ],
    existingNotifications: [
      {
        id: "existing-notif-1",
        targetItemId: "task-dedup-check",
        type: "URGENT_DEADLINE",
        stage: "12H",
        dedupKey: "task:task-dedup-check:12H:2026-09-18T14:30:00.000Z",
        status: "SENT",
      },
    ],
    expected: {
      expectedMaxNotificationCount: 0,
      shouldBeSuppressed: true,
    },
  },

  // 12. Stage transition from 48H to 12H generates appropriate new stage notification
  {
    id: "m5-case-12",
    name: "Stage Progression from 48H to 12H",
    category: "deduplication",
    description: "Previous 48H reminder was sent yesterday; as deadline is now within 8h, a new 12H URGENT_DEADLINE is legitimately created",
    items: [
      {
        id: "task-progression",
        title: "Artificial Intelligence Search Algorithms",
        courseCode: "CSE3004",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 8,
        status: "PENDING",
        marks: 20,
      },
    ],
    existingNotifications: [
      {
        id: "old-48h-reminder",
        targetItemId: "task-progression",
        type: "DEADLINE_REMINDER",
        stage: "48H",
        dedupKey: "task:task-progression:48H:2026-09-18T18:00:00.000Z",
        status: "SENT",
      },
    ],
    expected: {
      expectedGeneratedTypes: ["URGENT_DEADLINE"],
      expectedMinNotificationCount: 1,
      expectedStages: { "task-progression": "12H" },
      expectedUrgencies: { "task-progression": "CRITICAL" },
    },
  },

  // 13. Multiple deadlines concentration triggers WORKLOAD_ALERT
  {
    id: "m5-case-13",
    name: "Deadline Cluster Workload Alert",
    category: "workload_intelligence",
    description: "3 major deliverables due within 36 hours creates a high-pressure deadline cluster, triggering a WORKLOAD_ALERT",
    items: [
      {
        id: "cluster-task-1",
        title: "NLP Assignment 2",
        courseCode: "CSE4001",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 16,
        status: "PENDING",
        marks: 20,
        isClustered: true,
      },
      {
        id: "cluster-task-2",
        title: "Database Indexing Milestone",
        courseCode: "CSE3001",
        category: "PROJECT",
        deadlineOffsetHours: 24,
        status: "PENDING",
        marks: 25,
        isClustered: true,
      },
      {
        id: "cluster-task-3",
        title: "Machine Learning Lab 4",
        courseCode: "CSE3002",
        category: "LAB",
        deadlineOffsetHours: 32,
        status: "PENDING",
        marks: 15,
        isClustered: true,
      },
    ],
    expected: {
      expectedGeneratedTypes: ["WORKLOAD_ALERT"],
      expectedMinNotificationCount: 3,
      whyBulletsContain: ["Deadline concentration"],
    },
  },

  // 14. Light workload suppresses unnecessary early warnings
  {
    id: "m5-case-14",
    name: "Light Workload Early Notification Suppression",
    category: "workload_intelligence",
    description: "Single light task due in 6 days under zero workload pressure avoids generating premature notifications",
    items: [
      {
        id: "task-single-light",
        title: "Ethics in Engineering Essay",
        courseCode: "HUM2001",
        category: "ESSAY",
        deadlineOffsetHours: 140,
        status: "PENDING",
        marks: 10,
      },
    ],
    expected: {
      expectedMaxNotificationCount: 0,
      shouldBeSuppressed: true,
    },
  },

  // 15. Heavy workload escalates 48h reminder urgency from NORMAL to URGENT
  {
    id: "m5-case-15",
    name: "Workload Concentration Urgency Escalation",
    category: "workload_intelligence",
    description: "Deliverable due in 44 hours is escalated to URGENT because 2 other items are due in the same 48-hour window",
    items: [
      {
        id: "task-target-esc",
        title: "Software Engineering Sprint 2 Review",
        courseCode: "CSE3005",
        category: "PROJECT",
        deadlineOffsetHours: 44,
        status: "PENDING",
        marks: 20,
        isClustered: true,
      },
      {
        id: "task-partner-1",
        title: "Networks Lab Exam",
        courseCode: "CSE2001",
        category: "EXAM",
        deadlineOffsetHours: 24,
        status: "PENDING",
        marks: 30,
        isClustered: true,
      },
    ],
    expected: {
      expectedUrgencies: { "task-target-esc": "URGENT" },
      whyBulletsContain: ["workload window"],
    },
  },

  // 16. High-stakes exam reminder
  {
    id: "m5-case-16",
    name: "High-Stakes CAT-1 Exam Notification",
    category: "exam_reminders",
    description: "Computer Networks CAT-1 exam scheduled in 36 hours triggers an EXAM_REMINDER with exam venue and syllabus context",
    items: [
      {
        id: "exam-cn-cat1",
        title: "Computer Networks CAT-1 Exam",
        courseCode: "CSE2001",
        category: "EXAM",
        deadlineOffsetHours: 36,
        status: "PENDING",
        marks: 50,
      },
    ],
    expected: {
      expectedGeneratedTypes: ["EXAM_REMINDER"],
      expectedMinNotificationCount: 1,
      expectedUrgencies: { "exam-cn-cat1": "CRITICAL" },
      whyBulletsContain: ["Scheduled academic examination", "50 marks"],
    },
  },

  // 17. Changed venue notification from notice audit log
  {
    id: "m5-case-17",
    name: "Changed Venue Notice Intelligence",
    category: "change_intelligence",
    description: "Audit log records venue relocation from TT 105 to SJT 402, generating an UPDATED_ACADEMIC_ITEM notification",
    items: [
      {
        id: "event-venue-change",
        title: "Machine Learning Lab Evaluation",
        courseCode: "CSE3002",
        category: "LAB",
        deadlineOffsetHours: 50,
        status: "PENDING",
        marks: 20,
      },
    ],
    auditLogs: [
      {
        id: "audit-venue-1",
        targetType: "EVENT",
        targetId: "event-venue-change",
        relationship: "UPDATED",
        changedFields: JSON.stringify(["venue"]),
        reasons: JSON.stringify(["Lab venue relocated to SJT 218 due to maintenance"]),
        createdAt: new Date("2026-09-18T09:00:00+05:30"),
      },
    ],
    expected: {
      expectedGeneratedTypes: ["UPDATED_ACADEMIC_ITEM"],
      expectedMinNotificationCount: 1,
      whyBulletsContain: ["venue", "circular"],
    },
  },

  // 18. Changed platform notification from notice audit log
  {
    id: "m5-case-18",
    name: "Changed Platform Submission Notice",
    category: "change_intelligence",
    description: "Notice informs students that submission platform changed from VTOP to GitHub Classroom",
    items: [
      {
        id: "task-platform-change",
        title: "Cloud Computing Docker Deployment",
        courseCode: "CSE4002",
        category: "ASSIGNMENT",
        deadlineOffsetHours: 48,
        status: "PENDING",
        marks: 20,
      },
    ],
    auditLogs: [
      {
        id: "audit-platform-1",
        targetType: "TASK",
        targetId: "task-platform-change",
        relationship: "UPDATED",
        changedFields: JSON.stringify(["platform"]),
        reasons: JSON.stringify(["Submission platform migrated to GitHub Classroom"]),
        createdAt: new Date("2026-09-18T09:15:00+05:30"),
      },
    ],
    expected: {
      expectedGeneratedTypes: ["UPDATED_ACADEMIC_ITEM"],
      expectedMinNotificationCount: 1,
      whyBulletsContain: ["platform", "circular"],
    },
  },

  // 19. Extended deadline notification from notice audit log
  {
    id: "m5-case-19",
    name: "Extended Deadline Notice Alert",
    category: "change_intelligence",
    description: "Official circular extends mini project submission deadline by 4 days, generating an updated schedule alert",
    items: [
      {
        id: "task-extended-dl",
        title: "NLP Mini Project Submission",
        courseCode: "CSE4001",
        category: "PROJECT",
        deadlineOffsetHours: 96,
        status: "PENDING",
        marks: 25,
      },
    ],
    auditLogs: [
      {
        id: "audit-ext-1",
        targetType: "TASK",
        targetId: "task-extended-dl",
        relationship: "UPDATED",
        changedFields: JSON.stringify(["deadline"]),
        reasons: JSON.stringify(["Deadline extended from Sep 18 to Sep 22 at 11:59 PM"]),
        createdAt: new Date("2026-09-18T09:45:00+05:30"),
      },
    ],
    expected: {
      expectedGeneratedTypes: ["UPDATED_ACADEMIC_ITEM"],
      expectedMinNotificationCount: 1,
      whyBulletsContain: ["deadline", "circular"],
    },
  },

  // 20. Daily Academic Digest generation
  {
    id: "m5-case-20",
    name: "Daily Academic Digest Generation",
    category: "daily_digest",
    description: "Evaluator generates a comprehensive Daily Academic Digest summarizing active deliverables, top focus item, and workload pressure",
    items: [
      {
        id: "digest-task-1",
        title: "Distributed Database Indexing",
        courseCode: "CSE3001",
        category: "PROJECT",
        deadlineOffsetHours: 12,
        status: "PENDING",
        marks: 30,
      },
      {
        id: "digest-task-2",
        title: "Machine Learning Quiz 2",
        courseCode: "CSE3002",
        category: "QUIZ",
        deadlineOffsetHours: 36,
        status: "PENDING",
        marks: 15,
      },
    ],
    expected: {
      expectDigest: true,
      expectedGeneratedTypes: ["DAILY_DIGEST"],
      expectedMinNotificationCount: 2,
    },
  },
];
