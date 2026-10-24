/**
 * lib/evaluation/m8-risk-planning-fixtures.ts
 *
 * Milestone 8-D Evaluation Scenarios:
 * Academic Risk Radar + Smart Planning test fixtures.
 * Covers 21 comprehensive scenarios testing risk level triggers,
 * planning rankings, rubric/syllabus integration, and edge cases.
 */

import { RiskEvaluationInput } from "@/lib/intelligence/academic-risk-radar";
import { PlannerCandidateItem } from "@/lib/intelligence/smart-planner";
import { StructuredRubric } from "@/lib/intelligence/rubric-engine";
import { StructuredSyllabus } from "@/lib/intelligence/syllabus-engine";
import { AcademicContradiction } from "@/lib/nlp/contradiction-detector";

export interface M8RiskPlanningScenario {
  id: string;
  name: string;
  category: string;
  description: string;
  referenceDate: Date;
  input: RiskEvaluationInput;
  plannerTasks?: PlannerCandidateItem[];
  plannerOptions?: {
    availableHours?: number;
    startTimeHour?: number;
    rubrics?: StructuredRubric[];
    syllabi?: StructuredSyllabus[];
  };
  expected: {
    expectedRiskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    minTriggersCount?: number;
    expectedTriggerTypes?: string[];
    highestRiskCourse?: string | null;
    smartPlan?: {
      minSessionsCount?: number;
      expectedFirstFocusContains?: string;
      expectedMarksCoveredMin?: number;
      mustContainWhyNowReason?: string;
    };
  };
}

const REF_DATE = new Date("2026-09-20T10:00:00.000Z");

// Sample rubric for testing
const SAMPLE_NLP_RUBRIC: StructuredRubric = {
  id: "rubric-nlp-test",
  title: "Natural Language Processing Capstone Project Rubric",
  courseCode: "CSE4001",
  courseName: "Natural Language Processing",
  taskTitle: "NLP Capstone Project",
  totalMarks: 100,
  totalWeightage: 100,
  requirements: [
    {
      id: "req-1",
      title: "Literature Survey",
      description: "Review of 5 papers",
      marks: 10,
      weightagePercentage: 10,
      isMandatory: true,
      status: "COMPLETED",
      subRequirements: [],
      submissionRequirement: null,
      deadline: null,
      rawTextSpan: "Literature Survey — 10 marks",
      sourceEvidence: { snippet: "Literature Survey — 10 marks", confidence: 0.95 },
    },
    {
      id: "req-2",
      title: "Dataset Preparation",
      description: "Dataset curation & tokenization",
      marks: 10,
      weightagePercentage: 10,
      isMandatory: true,
      status: "COMPLETED",
      subRequirements: [],
      submissionRequirement: null,
      deadline: null,
      rawTextSpan: "Dataset — 10 marks",
      sourceEvidence: { snippet: "Dataset — 10 marks", confidence: 0.95 },
    },
    {
      id: "req-3",
      title: "Methodology",
      description: "Mathematical formulation & attention mechanism",
      marks: 15,
      weightagePercentage: 15,
      isMandatory: true,
      status: "IN_PROGRESS",
      subRequirements: [],
      submissionRequirement: null,
      deadline: null,
      rawTextSpan: "Methodology — 15 marks",
      sourceEvidence: { snippet: "Methodology — 15 marks", confidence: 0.95 },
    },
    {
      id: "req-4",
      title: "Implementation",
      description: "PyTorch model code and training script",
      marks: 25,
      weightagePercentage: 25,
      isMandatory: true,
      status: "NOT_STARTED",
      subRequirements: [],
      submissionRequirement: null,
      deadline: null,
      rawTextSpan: "Implementation — 25 marks",
      sourceEvidence: { snippet: "Implementation — 25 marks", confidence: 0.95 },
    },
    {
      id: "req-5",
      title: "Evaluation & Ablation",
      description: "ROUGE/BLEU metrics and ablation study",
      marks: 20,
      weightagePercentage: 20,
      isMandatory: true,
      status: "NOT_STARTED",
      subRequirements: [],
      submissionRequirement: null,
      deadline: null,
      rawTextSpan: "Evaluation — 20 marks",
      sourceEvidence: { snippet: "Evaluation — 20 marks", confidence: 0.95 },
    },
    {
      id: "req-6",
      title: "Report & Presentation",
      description: "IEEE paper and 10-minute demo",
      marks: 20,
      weightagePercentage: 20,
      isMandatory: false,
      status: "NOT_STARTED",
      subRequirements: [],
      submissionRequirement: null,
      deadline: null,
      rawTextSpan: "Presentation — 20 marks",
      sourceEvidence: { snippet: "Presentation — 20 marks", confidence: 0.95 },
    },
  ],
  submissionGuidelines: ["Submit PDF and code via VTOP"],
  deadline: "2026-09-22T18:00:00.000Z",
  sourceDocument: "NLP_Rubric.pdf",
  rawText: "NLP Capstone Project Rubric",
  createdAt: "2026-09-20T10:00:00.000Z",
  isMalformed: false,
  warnings: [],
};

export const M8_RISK_PLANNING_SCENARIOS: M8RiskPlanningScenario[] = [
  // 1. Low Risk
  {
    id: "scen-01-low-risk",
    name: "Low Risk — Balanced single deliverable due in 3 weeks",
    category: "RISK_LEVEL",
    description: "One 10-mark assignment due next month with plenty of runway.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "task-01",
          title: "Operating Systems Assignment 1",
          courseCode: "CSE3001",
          category: "ASSIGNMENT",
          deadline: new Date("2026-10-15T18:00:00.000Z"),
          status: "PENDING",
          marks: 10,
          priority: "LOW",
        },
      ],
    },
    expected: {
      expectedRiskLevel: "LOW",
      minTriggersCount: 0,
    },
  },

  // 2. Medium Risk
  {
    id: "scen-02-medium-risk",
    name: "Medium Risk — Moderate workload due within 4 days",
    category: "RISK_LEVEL",
    description: "Two assignments due within 4 days totaling 25 marks.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "task-02a",
          title: "Compiler Design Lab Exercise",
          courseCode: "CSE3003",
          category: "ASSIGNMENT",
          deadline: new Date("2026-09-23T18:00:00.000Z"), // in 3 days
          status: "PENDING",
          marks: 15,
          priority: "MEDIUM",
        },
        {
          id: "task-02b",
          title: "Database Systems Quiz Prep",
          courseCode: "CSE2004",
          category: "QUIZ",
          deadline: new Date("2026-09-24T12:00:00.000Z"), // in 4 days
          status: "PENDING",
          marks: 10,
          priority: "MEDIUM",
        },
      ],
    },
    expected: {
      expectedRiskLevel: "MEDIUM",
      minTriggersCount: 1,
    },
  },

  // 3. High Risk
  {
    id: "scen-03-high-risk",
    name: "High Risk — 3 incomplete deliverables within 48 hours",
    category: "RISK_LEVEL",
    description: "Three separate deliverables due within 48 hours creating a deadline cluster.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "task-03a",
          title: "NLP Mini Project Submission",
          courseCode: "CSE4001",
          category: "PROJECT",
          deadline: new Date("2026-09-21T18:00:00.000Z"), // 32 hours away
          status: "IN_PROGRESS",
          marks: 25,
          priority: "CRITICAL",
        },
        {
          id: "task-03b",
          title: "Web Tech Lab Report",
          courseCode: "CSE3002",
          category: "REPORT",
          deadline: new Date("2026-09-22T08:00:00.000Z"), // 46 hours away
          status: "PENDING",
          marks: 15,
          priority: "HIGH",
        },
        {
          id: "task-03c",
          title: "Cloud Computing Assignment",
          courseCode: "CSE4005",
          category: "ASSIGNMENT",
          deadline: new Date("2026-09-21T23:59:00.000Z"), // 38 hours away
          status: "PENDING",
          marks: 20,
          priority: "HIGH",
        },
      ],
    },
    expected: {
      expectedRiskLevel: "HIGH",
      minTriggersCount: 1,
      expectedTriggerTypes: ["DEADLINE_CLUSTER"],
    },
  },

  // 4. Critical Risk
  {
    id: "scen-04-critical-risk",
    name: "Critical Risk — Overdue high-marks assessment plus imminent deadlines",
    category: "RISK_LEVEL",
    description: "A 30-mark deliverable is already overdue while another major exam is tomorrow.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "task-04a",
          title: "Software Engineering Capstone Final",
          courseCode: "CSE4010",
          category: "PROJECT",
          deadline: new Date("2026-09-19T18:00:00.000Z"), // Past deadline!
          status: "OVERDUE",
          marks: 30,
          priority: "CRITICAL",
        },
        {
          id: "task-04b",
          title: "Computer Networks Lab Evaluation",
          courseCode: "CSE3004",
          category: "ASSIGNMENT",
          deadline: new Date("2026-09-21T10:00:00.000Z"), // in 24h
          status: "PENDING",
          marks: 25,
          priority: "HIGH",
        },
      ],
    },
    expected: {
      expectedRiskLevel: "CRITICAL",
      minTriggersCount: 1,
      expectedTriggerTypes: ["OVERDUE_ASSESSMENT"],
    },
  },

  // 5. Deadline Cluster
  {
    id: "scen-05-deadline-cluster",
    name: "Deadline Cluster — 4 deliverables due within 48h",
    category: "DEADLINE_PATTERNS",
    description: "Multiple assignments due in a narrow 48-hour time window.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        { id: "t5a", title: "Task A", deadline: new Date("2026-09-21T12:00:00.000Z"), status: "PENDING", marks: 10, priority: "HIGH" },
        { id: "t5b", title: "Task B", deadline: new Date("2026-09-21T16:00:00.000Z"), status: "PENDING", marks: 15, priority: "HIGH" },
        { id: "t5c", title: "Task C", deadline: new Date("2026-09-22T09:00:00.000Z"), status: "PENDING", marks: 10, priority: "HIGH" },
        { id: "t5d", title: "Task D", deadline: new Date("2026-09-22T11:00:00.000Z"), status: "PENDING", marks: 10, priority: "MEDIUM" },
      ],
    },
    expected: {
      expectedRiskLevel: "HIGH",
      expectedTriggerTypes: ["DEADLINE_CLUSTER"],
    },
  },

  // 6. Exam + Assignment Collision
  {
    id: "scen-06-exam-assignment",
    name: "Exam + Assignment — CAT Exam and project submission on the same day",
    category: "COLLISION",
    description: "CAT-1 exam scheduled on same day as a 25-mark project deliverable.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "t6",
          title: "NLP Model Implementation Report",
          courseCode: "CSE4001",
          deadline: new Date("2026-09-22T17:00:00.000Z"),
          status: "IN_PROGRESS",
          marks: 25,
          priority: "HIGH",
        },
      ],
      exams: [
        {
          id: "ex6",
          title: "CAT-1 Theory Exam",
          courseCode: "CSE3001",
          examDate: new Date("2026-09-22T04:00:00.000Z"),
          weightage: 30,
        },
      ],
    },
    expected: {
      expectedRiskLevel: "HIGH",
      expectedTriggerTypes: ["EXAM_ASSIGNMENT_COLLISION"],
    },
  },

  // 7. High Marks + Short Deadline
  {
    id: "scen-07-high-marks-short-deadline",
    name: "High Marks + Short Deadline — 30-mark deliverable due in 18 hours",
    category: "HIGH_STAKES",
    description: "High weightage (>=25 marks) with less than 24 hours remaining.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "t7",
          title: "Major Project Interim Review",
          courseCode: "CSE4001",
          deadline: new Date("2026-09-21T04:00:00.000Z"), // 18 hours from now
          status: "IN_PROGRESS",
          marks: 30,
          priority: "CRITICAL",
        },
      ],
    },
    expected: {
      expectedRiskLevel: "HIGH",
      expectedTriggerTypes: ["HIGH_MARKS_SHORT_DEADLINE"],
    },
  },

  // 8. Overdue Project
  {
    id: "scen-08-overdue-project",
    name: "Overdue Project — High-value project past deadline",
    category: "OVERDUE",
    description: "Project past deadline triggers OVERDUE_ASSESSMENT.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "t8",
          title: "AI Ethics Term Paper",
          courseCode: "HUM1002",
          deadline: new Date("2026-09-18T18:00:00.000Z"), // 2 days ago
          status: "OVERDUE",
          marks: 20,
          priority: "HIGH",
        },
      ],
    },
    expected: {
      expectedRiskLevel: "HIGH",
      expectedTriggerTypes: ["OVERDUE_ASSESSMENT"],
    },
  },

  // 9. Completed Item
  {
    id: "scen-09-completed-item",
    name: "Completed Item — Verified completed items contribute zero risk",
    category: "COMPLETION_FILTERING",
    description: "Completed tasks must be filtered out and never trigger false risk.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "t9a",
          title: "Completed NLP Review",
          courseCode: "CSE4001",
          deadline: new Date("2026-09-20T12:00:00.000Z"),
          status: "COMPLETED",
          marks: 30,
          priority: "CRITICAL",
        },
        {
          id: "t9b",
          title: "Completed Lab 1",
          courseCode: "CSE3002",
          deadline: new Date("2026-09-19T10:00:00.000Z"),
          status: "COMPLETED",
          marks: 20,
          priority: "HIGH",
        },
      ],
    },
    expected: {
      expectedRiskLevel: "LOW",
      minTriggersCount: 0,
    },
  },

  // 10. Cancelled Item
  {
    id: "scen-10-cancelled-item",
    name: "Cancelled Item — Cancelled tasks contribute zero risk",
    category: "COMPLETION_FILTERING",
    description: "Tasks with CANCELLED status should be completely ignored by risk radar.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "t10",
          title: "Cancelled Guest Lecture Review",
          courseCode: "CSE4001",
          deadline: new Date("2026-09-21T10:00:00.000Z"),
          status: "CANCELLED",
          marks: 25,
          priority: "CRITICAL",
        },
      ],
    },
    expected: {
      expectedRiskLevel: "LOW",
      minTriggersCount: 0,
    },
  },

  // 11. Rescheduled Item
  {
    id: "scen-11-rescheduled-item",
    name: "Rescheduled Item — Extended deadline evaluated with new date",
    category: "RESCHEDULED",
    description: "Task rescheduled from today to next week is correctly evaluated with new date.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "t11",
          title: "Distributed Systems Project Demo",
          courseCode: "CSE4003",
          deadline: new Date("2026-09-30T18:00:00.000Z"), // Extended to 10 days later
          status: "PENDING",
          marks: 20,
          priority: "MEDIUM",
          isRescheduled: true,
        },
      ],
    },
    expected: {
      expectedRiskLevel: "LOW",
      minTriggersCount: 0,
    },
  },

  // 12. Duplicate Item
  {
    id: "scen-12-duplicate-item",
    name: "Duplicate Item — Multiple records for same deliverable don't double count risk",
    category: "DEDUPLICATION",
    description: "Duplicate tasks should not inflate risk artificially.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "t12a",
          title: "NLP Project Literature Survey",
          courseCode: "CSE4001",
          deadline: new Date("2026-09-28T18:00:00.000Z"),
          status: "PENDING",
          marks: 10,
          priority: "MEDIUM",
        },
        {
          id: "t12b",
          title: "NLP Project Literature Survey (Duplicate Copy)",
          courseCode: "CSE4001",
          deadline: new Date("2026-09-28T18:00:00.000Z"),
          status: "PENDING",
          marks: 10,
          priority: "MEDIUM",
        },
      ],
    },
    expected: {
      expectedRiskLevel: "LOW",
    },
  },

  // 13. Many Incomplete Rubric Requirements
  {
    id: "scen-13-incomplete-rubrics",
    name: "Many Incomplete Rubric Requirements — 4 missing criteria with 70 marks at stake",
    category: "RUBRIC_INTELLIGENCE",
    description: "High-value rubric with multiple incomplete requirements triggers risk.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "t13",
          title: "NLP Capstone Project",
          courseCode: "CSE4001",
          deadline: new Date("2026-09-22T18:00:00.000Z"),
          status: "IN_PROGRESS",
          marks: 100,
          priority: "CRITICAL",
        },
      ],
      rubrics: [SAMPLE_NLP_RUBRIC],
    },
    expected: {
      expectedRiskLevel: "HIGH",
      expectedTriggerTypes: ["UNRESOLVED_RUBRIC_REQUIREMENTS"],
    },
  },

  // 14. Overloaded Course
  {
    id: "scen-14-overloaded-course",
    name: "Overloaded Course — Concentrated workload in single course",
    category: "COURSE_OVERLOAD",
    description: "4 deliverables and 50 marks concentrated in CSE4001.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        { id: "t14a", title: "NLP Assignment 1", courseCode: "CSE4001", deadline: new Date("2026-09-22T18:00:00.000Z"), status: "PENDING", marks: 15, priority: "HIGH" },
        { id: "t14b", title: "NLP Lab 3", courseCode: "CSE4001", deadline: new Date("2026-09-23T18:00:00.000Z"), status: "PENDING", marks: 15, priority: "HIGH" },
        { id: "t14c", title: "NLP Quiz", courseCode: "CSE4001", deadline: new Date("2026-09-24T18:00:00.000Z"), status: "PENDING", marks: 10, priority: "MEDIUM" },
        { id: "t14d", title: "NLP Project Milestone", courseCode: "CSE4001", deadline: new Date("2026-09-25T18:00:00.000Z"), status: "PENDING", marks: 20, priority: "HIGH" },
      ],
    },
    expected: {
      highestRiskCourse: "CSE4001",
      expectedRiskLevel: "HIGH",
      expectedTriggerTypes: ["COURSE_OVERLOAD"],
    },
  },

  // 15. Balanced Workload
  {
    id: "scen-15-balanced-workload",
    name: "Balanced Workload — Evenly spaced deliverables across 3 courses",
    category: "WORKLOAD",
    description: "Deliverables spaced out over weeks with zero collisions.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        { id: "t15a", title: "Coursework A", courseCode: "CSE3001", deadline: new Date("2026-10-01T18:00:00.000Z"), status: "PENDING", marks: 10, priority: "LOW" },
        { id: "t15b", title: "Coursework B", courseCode: "CSE3002", deadline: new Date("2026-10-10T18:00:00.000Z"), status: "PENDING", marks: 10, priority: "LOW" },
      ],
    },
    expected: {
      expectedRiskLevel: "LOW",
      minTriggersCount: 0,
    },
  },

  // 16. Smart-Plan Ranking
  {
    id: "scen-16-smart-plan-ranking",
    name: "Smart-Plan Ranking — Highest priority and nearest deadline ranked first",
    category: "SMART_PLAN",
    description: "Deterministic ranking puts critical deadline ahead of distant tasks.",
    referenceDate: REF_DATE,
    input: { referenceDate: REF_DATE, tasks: [] },
    plannerTasks: [
      {
        id: "p16a",
        title: "Distant Low Priority Essay",
        courseCode: "HUM1001",
        deadline: new Date("2026-10-20T18:00:00.000Z"),
        status: "PENDING",
        marks: 10,
        priority: "LOW",
        estimatedHours: 2,
      },
      {
        id: "p16b",
        title: "Immediate Machine Learning Exam Prep",
        courseCode: "CSE3002",
        deadline: new Date("2026-09-21T09:00:00.000Z"),
        status: "PENDING",
        marks: 30,
        priority: "CRITICAL",
        estimatedHours: 3,
      },
    ],
    expected: {
      smartPlan: {
        minSessionsCount: 1,
        expectedFirstFocusContains: "Machine Learning",
      },
    },
  },

  // 17. Syllabus-Aware Planning
  {
    id: "scen-17-syllabus-aware-plan",
    name: "Syllabus-Aware Planning — Maps coursework to module topic from M8-A",
    category: "SMART_PLAN",
    description: "Planner correlates deliverable title with Syllabus modules.",
    referenceDate: REF_DATE,
    input: { referenceDate: REF_DATE, tasks: [] },
    plannerTasks: [
      {
        id: "p17",
        title: "NLP Transformer Architecture Assignment",
        courseCode: "CSE4001",
        deadline: new Date("2026-09-21T18:00:00.000Z"),
        status: "PENDING",
        marks: 25,
        priority: "HIGH",
        estimatedHours: 2,
      },
    ],
    expected: {
      smartPlan: {
        minSessionsCount: 1,
        mustContainWhyNowReason: "marks",
      },
    },
  },

  // 18. Rubric-Aware Planning
  {
    id: "scen-18-rubric-aware-plan",
    name: "Rubric-Aware Planning — Specifically schedules incomplete rubric criteria",
    category: "SMART_PLAN",
    description: "Breaks down project into incomplete rubric components (Methodology, Implementation).",
    referenceDate: REF_DATE,
    input: { referenceDate: REF_DATE, tasks: [] },
    plannerTasks: [
      {
        id: "p18",
        title: "NLP Capstone Project",
        courseCode: "CSE4001",
        deadline: new Date("2026-09-22T18:00:00.000Z"),
        status: "IN_PROGRESS",
        marks: 100,
        priority: "CRITICAL",
      },
    ],
    plannerOptions: {
      rubrics: [SAMPLE_NLP_RUBRIC],
      availableHours: 3,
      startTimeHour: 19,
    },
    expected: {
      smartPlan: {
        minSessionsCount: 2,
        expectedMarksCoveredMin: 35,
      },
    },
  },

  // 19. Missing Duration
  {
    id: "scen-19-missing-duration",
    name: "Missing Duration — Robust fallback when estimatedHours is undefined",
    category: "EDGE_CASES",
    description: "Planner uses robust defaults when duration/estimatedHours is missing.",
    referenceDate: REF_DATE,
    input: { referenceDate: REF_DATE, tasks: [] },
    plannerTasks: [
      {
        id: "p19",
        title: "Algorithms Problem Set",
        courseCode: "CSE2005",
        deadline: new Date("2026-09-21T18:00:00.000Z"),
        status: "PENDING",
        marks: 15,
        priority: "HIGH",
        // estimatedHours undefined!
      },
    ],
    expected: {
      smartPlan: {
        minSessionsCount: 1,
        expectedFirstFocusContains: "Algorithms",
      },
    },
  },

  // 20. Empty Academic State
  {
    id: "scen-20-empty-state",
    name: "Empty Academic State — Zero tasks and events",
    category: "EDGE_CASES",
    description: "Returns safe zero-risk and graceful empty schedule.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [],
      exams: [],
      events: [],
    },
    plannerTasks: [],
    expected: {
      expectedRiskLevel: "LOW",
      minTriggersCount: 0,
      smartPlan: {
        minSessionsCount: 0,
      },
    },
  },

  // 21. Contradiction-Related Risk
  {
    id: "scen-21-contradiction-risk",
    name: "Contradiction-Related Risk — Unresolved academic contradiction adds trigger",
    category: "CONTRADICTION",
    description: "Unresolved schedule or venue contradiction from M8-B increases risk score.",
    referenceDate: REF_DATE,
    input: {
      referenceDate: REF_DATE,
      tasks: [
        {
          id: "t21",
          title: "Embedded Systems Review",
          courseCode: "ECE2001",
          deadline: new Date("2026-09-23T10:00:00.000Z"),
          status: "PENDING",
          marks: 20,
          priority: "HIGH",
        },
      ],
      contradictions: [
        {
          id: "contra-1",
          type: "SCHEDULE_CONFLICT",
          severity: "HIGH",
          summary: "Conflicting lab review schedules in TT401 vs SJT201",
          sourceNoticeIds: ["n1", "n2"],
          evidence: "Notice A states Monday 2 PM while Notice B states Monday 4 PM",
          suggestedResolution: "Verify with course coordinator",
          affectedItemTitle: "Embedded Systems Review",
        } as unknown as AcademicContradiction,
      ],
    },
    expected: {
      expectedRiskLevel: "MEDIUM",
      expectedTriggerTypes: ["ACADEMIC_CONTRADICTION"],
    },
  },
];
