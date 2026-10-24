/**
 * Milestone 6 -- AI Assistant & Grounded Chat Engine
 * Offline evaluation scenarios for the deterministic grounded engine.
 *
 * These scenarios validate intent routing, tool selection, response grounding,
 * mutation confirmation gating, multi-turn context, and fallback behavior
 * WITHOUT requiring a live API server or LLM API key.
 *
 * Design mirrors the M3/M4/M5 evaluation harness pattern.
 */

// --- Intent Categories ---

export type M6IntentCategory =
  | "priority_query"
  | "deadline_query"
  | "workload_query"
  | "exam_query"
  | "course_query"
  | "notice_query"
  | "change_query"
  | "search_query"
  | "mutation_create_task"
  | "mutation_mark_completed"
  | "mutation_create_reminder"
  | "multi_turn_context"
  | "fallback_general";

// --- Expected Tool Calls ---

export interface ExpectedToolCall {
  toolName: string;
  argsContain?: Record<string, any>;
}

// --- Mock Tool Results ---

export interface MockToolResult {
  toolName: string;
  result: {
    success: boolean;
    data?: any;
    message?: string;
  };
}

// --- Message in Multi-turn Context ---

export interface M6ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

// --- Scenario Type ---

export interface M6TestScenario {
  id: string;
  name: string;
  category: M6IntentCategory;
  description: string;
  userMessage: string;
  history?: M6ConversationTurn[];
  mockToolResults: MockToolResult[];
  expected: {
    expectedTools: string[];
    responseContains: string[];
    responseExcludes?: string[];
    noToolRequired?: boolean;
    expectsConfirmationCard?: boolean;
    confirmationToolName?: string;
    minResponseLength?: number;
    expectsList?: boolean;
  };
}

// --- Anchor Date ---

export const M6_TEST_ANCHOR_DATE = new Date("2026-09-18T10:00:00+05:30");

// --- Mock data ---

const MOCK_PRIORITY_TASKS = [
  {
    id: "task-001",
    title: "NLP Mini Project Report",
    courseCode: "CSE4001",
    courseTitle: "Natural Language Processing",
    category: "PROJECT",
    deadline: "2026-09-19T23:59:00+05:30",
    priority: "CRITICAL",
    status: "IN_PROGRESS",
    marks: 30,
    reason: "Strict 5-mark penalty per day after deadline per course circular.",
    timeRemainingLabel: "due tomorrow",
    isOverdue: false,
  },
  {
    id: "task-002",
    title: "DBMS ER Diagram Assignment",
    courseCode: "CSE3002",
    courseTitle: "Database Management Systems",
    category: "ASSIGNMENT",
    deadline: "2026-09-20T23:59:00+05:30",
    priority: "HIGH",
    status: "PENDING",
    marks: 20,
    reason: "20-mark assignment due in 2 days.",
    timeRemainingLabel: "2 days",
    isOverdue: false,
  },
  {
    id: "task-003",
    title: "Machine Learning Weekly Quiz",
    courseCode: "CSE3010",
    courseTitle: "Machine Learning",
    category: "QUIZ",
    deadline: "2026-09-21T09:00:00+05:30",
    priority: "HIGH",
    status: "PENDING",
    marks: 10,
    timeRemainingLabel: "3 days",
    isOverdue: false,
  },
  {
    id: "task-004",
    title: "Software Engineering Lab Report",
    courseCode: "CSE2008",
    courseTitle: "Software Engineering",
    category: "REPORT",
    deadline: "2026-09-25T23:59:00+05:30",
    priority: "MEDIUM",
    status: "PENDING",
    marks: 15,
    timeRemainingLabel: "7 days",
    isOverdue: false,
  },
];

const MOCK_UPCOMING_TASKS = [
  ...MOCK_PRIORITY_TASKS.slice(0, 3),
  {
    id: "task-005",
    title: "Cloud Computing Architecture Review",
    courseCode: "CSE4011",
    priority: "LOW",
    deadline: "2026-09-28T23:59:00+05:30",
    status: "PENDING",
    marks: 5,
    timeRemainingLabel: "10 days",
    isOverdue: false,
  },
];

const MOCK_COURSES = [
  {
    id: "course-001",
    code: "CSE4001",
    title: "Natural Language Processing",
    faculty: "Dr. R. Ananthakrishnan",
    credits: 4,
    slot: "A1+TA1",
    venue: "SJT 402",
    activeTasksCount: 2,
  },
  {
    id: "course-002",
    code: "CSE3002",
    title: "Database Management Systems",
    faculty: "Dr. S. Priya",
    credits: 4,
    slot: "B1+TB1",
    venue: "SJT 301",
    activeTasksCount: 1,
  },
  {
    id: "course-003",
    code: "CSE3010",
    title: "Machine Learning",
    faculty: "Dr. A. Kumar",
    credits: 4,
    slot: "C1+TC1",
    venue: "SJT 511",
    activeTasksCount: 1,
  },
  {
    id: "course-004",
    code: "CSE2008",
    title: "Software Engineering",
    faculty: "Prof. M. Vijay",
    credits: 3,
    slot: "D1",
    venue: "SJT 211",
    activeTasksCount: 1,
  },
];

const MOCK_EXAMS = {
  exams: [
    {
      id: "exam-001",
      title: "CAT-2",
      course: "CSE4001",
      date: "2026-09-30T10:00:00+05:30",
      time: "10:00 AM",
      venue: "AB4 101",
      weightage: 25,
    },
    {
      id: "exam-002",
      title: "CAT-2",
      course: "CSE3002",
      date: "2026-09-30T10:00:00+05:30",
      time: "10:00 AM",
      venue: "AB4 102",
      weightage: 25,
    },
  ],
  events: [
    {
      id: "event-001",
      title: "NLP Workshop: Transformer Fine-tuning",
      course: "CSE4001",
      type: "WORKSHOP",
      venue: "SJT 502",
    },
    {
      id: "event-002",
      title: "NLP Project Review",
      course: "CSE4001",
      type: "PROJECT_REVIEW",
      venue: "SJT 402 Lab",
      date: "2026-09-22T14:00:00+05:30",
    },
  ],
};

const MOCK_WORKLOAD = {
  level: "HIGH",
  totalEstimatedHours: 22,
  activeTasks: 4,
  riskSummary:
    "High workload over next 7 days with CRITICAL NLP deadline. Recommend focused 4-hour study blocks.",
  breakdown: [
    { title: "NLP Mini Project Report", course: "CSE4001", hours: 8 },
    { title: "DBMS ER Diagram Assignment", course: "CSE3002", hours: 4 },
    { title: "Machine Learning Weekly Quiz", course: "CSE3010", hours: 2 },
    { title: "Software Engineering Lab Report", course: "CSE2008", hours: 5 },
    { title: "Cloud Computing Architecture Review", course: "CSE4011", hours: 3 },
  ],
};

const MOCK_RECENT_CHANGES = {
  detectedModifications: [
    {
      type: "RESCHEDULED",
      action: "NLP Mini Project deadline extended by 2 days",
      changes: [
        {
          field: "deadline",
          oldValue: "2026-09-17",
          newValue: "2026-09-19",
          reason: "Faculty extension notice",
        },
      ],
    },
  ],
  recentNotices: [
    {
      title: "NLP Mini Project Deadline Extension",
      date: "2026-09-16T14:00:00+05:30",
      snippet:
        "The submission deadline for the NLP Mini Project Report has been extended to September 19, 2026 at 11:59 PM.",
    },
  ],
};

const MOCK_LATEST_NOTICE = {
  id: "notice-001",
  title: "CSE4001 Mini Project Submission Notice",
  rawText:
    "All B.Tech 4th Year students of CSE4001 (Natural Language Processing) are informed that the Mini Project Report submission deadline is September 19, 2026 at 11:59 PM via VTOP. Late submissions will incur a penalty of 5 marks per day.",
  channel: "ANNOUNCEMENT",
  createdAt: "2026-09-15T09:00:00+05:30",
};

const MOCK_TODAY_PLAN = {
  date: "Friday, September 18",
  focus: "NLP Mini Project Report (CSE4001) -- due tomorrow",
  recommendedBlocks: [
    {
      time: "06:00 PM",
      action: "NLP Mini Project -- Draft Conclusion & Abstract",
      durationMinutes: 120,
    },
    {
      time: "08:30 PM",
      action: "DBMS ER Diagram -- Start conceptual design",
      durationMinutes: 90,
    },
    {
      time: "10:15 PM",
      action: "ML Weekly Quiz -- Revision of Week 4 material",
      durationMinutes: 45,
    },
  ],
};

const MOCK_SEARCH_RESULT_NLP = {
  tasks: [
    {
      title: "NLP Mini Project Report",
      course: "CSE4001",
      deadline: "2026-09-19T23:59:00+05:30",
    },
  ],
  courses: [
    {
      code: "CSE4001",
      title: "Natural Language Processing",
      faculty: "Dr. R. Ananthakrishnan",
    },
  ],
  notices: [
    {
      snippet:
        "NLP Mini Project Report submission deadline is September 19, 2026 at 11:59 PM via VTOP.",
    },
  ],
};

const MOCK_SOURCE_EVIDENCE = {
  snippet: "Late submissions will incur a penalty of 5 marks per day.",
  interpretation:
    "Strict penalty clause: 5 marks deducted per day of delay. This justifies CRITICAL priority elevation.",
};

// --- Test Scenarios ---

export const M6_TEST_SCENARIOS: M6TestScenario[] = [
  // CASE 01: Priority query
  {
    id: "m6-case-01",
    name: "Priority Query -- Finish First",
    category: "priority_query",
    description:
      "User asks which task to do first. Engine must call get_priority_tasks and surface the CRITICAL NLP report.",
    userMessage: "What should I finish first?",
    mockToolResults: [
      {
        toolName: "get_priority_tasks",
        result: { success: true, data: MOCK_PRIORITY_TASKS },
      },
    ],
    expected: {
      expectedTools: ["get_priority_tasks"],
      responseContains: ["NLP Mini Project Report", "CSE4001", "CRITICAL", "Recommendation"],
      minResponseLength: 150,
      expectsList: true,
    },
  },

  // CASE 02: Deadline query
  {
    id: "m6-case-02",
    name: "Deadline Query -- Due This Week",
    category: "deadline_query",
    description: "User asks about this week's deadlines. Engine must call get_upcoming_tasks.",
    userMessage: "What is due this week?",
    mockToolResults: [
      {
        toolName: "get_upcoming_tasks",
        result: { success: true, data: MOCK_UPCOMING_TASKS },
      },
    ],
    expected: {
      expectedTools: ["get_upcoming_tasks"],
      responseContains: ["NLP Mini Project", "DBMS", "CSE4001", "CSE3002"],
      minResponseLength: 100,
      expectsList: true,
    },
  },

  // CASE 03: Workload query
  {
    id: "m6-case-03",
    name: "Workload Query -- Academic Pressure",
    category: "workload_query",
    description: "User asks for workload summary. Engine must call get_workload.",
    userMessage: "Show my workload",
    mockToolResults: [
      {
        toolName: "get_workload",
        result: { success: true, data: MOCK_WORKLOAD },
      },
    ],
    expected: {
      expectedTools: ["get_workload"],
      responseContains: ["HIGH", "22", "hours", "NLP"],
      minResponseLength: 100,
    },
  },

  // CASE 04: Exam query
  {
    id: "m6-case-04",
    name: "Exam Query -- Next Exam Date",
    category: "exam_query",
    description: "User asks about upcoming exams. Engine must call get_upcoming_events.",
    userMessage: "When is my next exam?",
    mockToolResults: [
      {
        toolName: "get_upcoming_events",
        result: { success: true, data: MOCK_EXAMS },
      },
    ],
    expected: {
      expectedTools: ["get_upcoming_events"],
      responseContains: ["CAT-2", "CSE4001", "September 30"],
      minResponseLength: 80,
    },
  },

  // CASE 05: Course query -- all courses
  {
    id: "m6-case-05",
    name: "Course Query -- Enrolled Courses",
    category: "course_query",
    description: "User asks for enrolled courses. Engine must call get_course_information.",
    userMessage: "Show my enrolled courses",
    mockToolResults: [
      {
        toolName: "get_course_information",
        result: { success: true, data: MOCK_COURSES },
      },
    ],
    expected: {
      expectedTools: ["get_course_information"],
      responseContains: ["CSE4001", "Natural Language Processing", "CSE3002", "Dr."],
      expectsList: true,
      minResponseLength: 120,
    },
  },

  // CASE 06: Course query -- specific code
  {
    id: "m6-case-06",
    name: "Course Query -- Specific Course Code",
    category: "course_query",
    description: "User asks about CSE3002 specifically. Engine must call get_course_information.",
    userMessage: "Tell me about CSE3002",
    mockToolResults: [
      {
        toolName: "get_course_information",
        result: { success: true, data: [MOCK_COURSES[1]] },
      },
    ],
    expected: {
      expectedTools: ["get_course_information"],
      responseContains: ["CSE3002", "Database Management", "Dr. S. Priya"],
      minResponseLength: 60,
    },
  },

  // CASE 07: Notice query
  {
    id: "m6-case-07",
    name: "Notice Query -- Latest Circular",
    category: "notice_query",
    description: "User asks about academic notices. Engine must call summarize_notice.",
    userMessage: "Are there any recent notices or circulars?",
    mockToolResults: [
      {
        toolName: "summarize_notice",
        result: { success: true, data: MOCK_LATEST_NOTICE },
      },
    ],
    expected: {
      expectedTools: ["summarize_notice"],
      responseContains: ["CSE4001", "Mini Project", "September 19"],
      minResponseLength: 80,
    },
  },

  // CASE 08: Change query
  {
    id: "m6-case-08",
    name: "Change Query -- Recent Academic Changes",
    category: "change_query",
    description: "User asks about recent academic changes. Engine must call get_recent_changes.",
    userMessage: "What changed recently?",
    mockToolResults: [
      {
        toolName: "get_recent_changes",
        result: { success: true, data: MOCK_RECENT_CHANGES },
      },
    ],
    expected: {
      expectedTools: ["get_recent_changes"],
      responseContains: ["RESCHEDULED", "NLP", "September 19"],
      minResponseLength: 80,
    },
  },

  // CASE 09: Search query
  {
    id: "m6-case-09",
    name: "Search Query -- Academic Search",
    category: "search_query",
    description:
      "User issues a search request. Engine must parse the query and call search_academic_information.",
    userMessage: "Search for NLP",
    mockToolResults: [
      {
        toolName: "search_academic_information",
        result: { success: true, data: MOCK_SEARCH_RESULT_NLP },
      },
    ],
    expected: {
      expectedTools: ["search_academic_information"],
      responseContains: ["NLP Mini Project", "CSE4001"],
      minResponseLength: 60,
    },
  },

  // CASE 10: Today plan
  {
    id: "m6-case-10",
    name: "Today Plan Query -- Study Schedule",
    category: "priority_query",
    description: "User asks for today's plan. Engine must call get_today_plan and return time blocks.",
    userMessage: "Plan my day for today",
    mockToolResults: [
      {
        toolName: "get_today_plan",
        result: { success: true, data: MOCK_TODAY_PLAN },
      },
    ],
    expected: {
      expectedTools: ["get_today_plan"],
      responseContains: ["NLP Mini Project", "06:00 PM", "DBMS"],
      expectsList: true,
      minResponseLength: 100,
    },
  },

  // CASE 11: Mutation -- mark completed
  {
    id: "m6-case-11",
    name: "Mutation -- Mark Task Completed (Confirmation Gate)",
    category: "mutation_mark_completed",
    description:
      "Engine must NOT execute the mutation; must emit a confirm_action card instead.",
    userMessage: "Mark my NLP project as completed",
    mockToolResults: [],
    expected: {
      expectedTools: [],
      responseContains: ["confirm", "NLP", "COMPLETED"],
      expectsConfirmationCard: true,
      confirmationToolName: "mark_task_completed",
      minResponseLength: 60,
    },
  },

  // CASE 12: Mutation -- create reminder
  {
    id: "m6-case-12",
    name: "Mutation -- Create Reminder (Confirmation Gate)",
    category: "mutation_create_reminder",
    description: "Engine must emit a confirm_action card, not create the reminder directly.",
    userMessage: "Create a reminder for my DBMS assignment tomorrow",
    mockToolResults: [],
    expected: {
      expectedTools: [],
      responseContains: ["reminder", "confirm"],
      expectsConfirmationCard: true,
      confirmationToolName: "create_reminder",
      minResponseLength: 50,
    },
  },

  // CASE 13: Mutation -- create task
  {
    id: "m6-case-13",
    name: "Mutation -- Create Task (Confirmation Gate)",
    category: "mutation_create_task",
    description: "Engine must emit a confirm_action card instead of writing to the database.",
    userMessage: "Create a task for ML assignment 4",
    mockToolResults: [],
    expected: {
      expectedTools: [],
      responseContains: ["task", "confirm"],
      expectsConfirmationCard: true,
      confirmationToolName: "create_task",
      minResponseLength: 50,
    },
  },

  // CASE 14: Explanation query
  {
    id: "m6-case-14",
    name: "Explanation Query -- Why High Priority",
    category: "priority_query",
    description:
      "User asks for priority explanation. Engine should call get_source_evidence and get_priority_tasks.",
    userMessage: "Why is the NLP project high priority?",
    mockToolResults: [
      {
        toolName: "get_source_evidence",
        result: { success: true, data: MOCK_SOURCE_EVIDENCE },
      },
      {
        toolName: "get_priority_tasks",
        result: { success: true, data: MOCK_PRIORITY_TASKS },
      },
    ],
    expected: {
      expectedTools: ["get_source_evidence", "get_priority_tasks"],
      responseContains: ["penalty", "NLP", "CRITICAL"],
      minResponseLength: 100,
    },
  },

  // CASE 15: Multi-turn context
  {
    id: "m6-case-15",
    name: "Multi-Turn Context -- Follow-up Why Question",
    category: "multi_turn_context",
    description:
      "After priority answer, user follows up with 'Why?'. Engine routes to explanation tools.",
    userMessage: "Why?",
    history: [
      { role: "user", content: "What should I finish first?" },
      {
        role: "assistant",
        content:
          "### YOUR TOP PRIORITIES\n\n**01. NLP Mini Project Report**\n- Course: CSE4001 - Priority: CRITICAL\n- Deadline: 2026-09-19 23:59\n- Reason: Strict 5-mark penalty per day after deadline.\n\n**Recommendation:** Focus on **NLP Mini Project Report** first.",
      },
    ],
    mockToolResults: [
      {
        toolName: "get_source_evidence",
        result: { success: true, data: MOCK_SOURCE_EVIDENCE },
      },
      {
        toolName: "get_priority_tasks",
        result: { success: true, data: MOCK_PRIORITY_TASKS },
      },
    ],
    expected: {
      expectedTools: ["get_source_evidence", "get_priority_tasks"],
      responseContains: ["penalty", "CRITICAL"],
      minResponseLength: 80,
    },
  },

  // CASE 16: Fallback -- unknown intent
  {
    id: "m6-case-16",
    name: "Fallback -- Unknown Intent",
    category: "fallback_general",
    description:
      "Unrecognized query. Engine falls back to get_priority_tasks and presents capability list.",
    userMessage: "What is the meaning of life?",
    mockToolResults: [
      {
        toolName: "get_priority_tasks",
        result: { success: true, data: MOCK_PRIORITY_TASKS },
      },
    ],
    expected: {
      expectedTools: ["get_priority_tasks"],
      responseContains: ["priorities", "workload", "deadline"],
      responseExcludes: ["meaning of life"],
      minResponseLength: 80,
    },
  },

  // CASE 17: Empty state -- no tasks
  {
    id: "m6-case-17",
    name: "Empty State -- No Tasks in Database",
    category: "deadline_query",
    description: "When database is empty, engine must return a clear empty-state message.",
    userMessage: "What do I have due this week?",
    mockToolResults: [
      {
        toolName: "get_upcoming_tasks",
        result: { success: true, data: [] },
      },
    ],
    expected: {
      expectedTools: ["get_upcoming_tasks"],
      responseContains: ["No", "deliverables"],
      responseExcludes: ["NLP", "DBMS"],
      minResponseLength: 30,
    },
  },

  // CASE 18: Search -- no results
  {
    id: "m6-case-18",
    name: "Search Query -- No Results Found",
    category: "search_query",
    description: "A search that returns no matches. Engine must surface clear empty-results message.",
    userMessage: "Search for blockchain",
    mockToolResults: [
      {
        toolName: "search_academic_information",
        result: { success: true, data: { tasks: [], courses: [], notices: [] } },
      },
    ],
    expected: {
      expectedTools: ["search_academic_information"],
      responseContains: ["No records found", "blockchain"],
      responseExcludes: ["CSE4001", "NLP"],
      minResponseLength: 30,
    },
  },

  // CASE 19: Workload -- keyword variant 'pressure'
  {
    id: "m6-case-19",
    name: "Workload Query -- Keyword Variant: pressure",
    category: "workload_query",
    description: "The word 'pressure' should route to get_workload, not fall through to fallback.",
    userMessage: "How much academic pressure am I under right now?",
    mockToolResults: [
      {
        toolName: "get_workload",
        result: { success: true, data: MOCK_WORKLOAD },
      },
    ],
    expected: {
      expectedTools: ["get_workload"],
      responseContains: ["HIGH", "hours"],
      minResponseLength: 80,
    },
  },

  // CASE 20: Exam -- keyword variant 'CAT'
  {
    id: "m6-case-20",
    name: "Exam Query -- Keyword Variant: CAT",
    category: "exam_query",
    description: "The word 'CAT' should route to get_upcoming_events for exam schedules.",
    userMessage: "When is CAT-2?",
    mockToolResults: [
      {
        toolName: "get_upcoming_events",
        result: { success: true, data: MOCK_EXAMS },
      },
    ],
    expected: {
      expectedTools: ["get_upcoming_events"],
      responseContains: ["CAT-2", "September 30"],
      minResponseLength: 60,
    },
  },

  // CASE 21: Ambiguous Mutation -- Clarification Required
  {
    id: "m6-case-21",
    name: "Ambiguous Mutation -- Clarification Required",
    category: "mutation_mark_completed",
    description:
      "When user says 'Mark it done' without specifying which task, engine must ask for clarification instead of guessing or emitting a blind confirmation card.",
    userMessage: "Mark it done",
    mockToolResults: [],
    expected: {
      expectedTools: [],
      responseContains: ["Which task", "specify"],
      expectsConfirmationCard: false,
      minResponseLength: 40,
    },
  },

  // CASE 22: Explanation Query -- Why did I get this notification?
  {
    id: "m6-case-22",
    name: "Explanation Query -- Why Notification Was Sent",
    category: "priority_query",
    description:
      "User asks 'Why did I get this notification?'. Engine routes to get_source_evidence and get_priority_tasks.",
    userMessage: "Why did I get this notification?",
    mockToolResults: [
      {
        toolName: "get_source_evidence",
        result: { success: true, data: MOCK_SOURCE_EVIDENCE },
      },
      {
        toolName: "get_priority_tasks",
        result: { success: true, data: MOCK_PRIORITY_TASKS },
      },
    ],
    expected: {
      expectedTools: ["get_source_evidence", "get_priority_tasks"],
      responseContains: ["penalty", "CRITICAL", "NLP"],
      minResponseLength: 80,
    },
  },

  // CASE 23: Date Freshness -- Rescheduled NLP Review Event
  {
    id: "m6-case-23",
    name: "Date Freshness -- Rescheduled NLP Project Review",
    category: "exam_query",
    description:
      "User asks 'When is the NLP Project Review now?'. Engine routes to get_upcoming_events and reflects the current scheduled event.",
    userMessage: "When is the NLP Project Review now?",
    mockToolResults: [
      {
        toolName: "get_upcoming_events",
        result: { success: true, data: MOCK_EXAMS },
      },
    ],
    expected: {
      expectedTools: ["get_upcoming_events"],
      responseContains: ["NLP Project Review", "SJT 402"],
      minResponseLength: 50,
    },
  },

  // CASE 24: Manual Verification 1 -- What do I have due this week?
  {
    id: "m6-case-24",
    name: "Manual Verification 1 -- Due This Week",
    category: "deadline_query",
    description: "Checks upcoming deliverables for the week via get_upcoming_tasks.",
    userMessage: "What do I have due this week?",
    mockToolResults: [
      {
        toolName: "get_upcoming_tasks",
        result: { success: true, data: MOCK_UPCOMING_TASKS },
      },
    ],
    expected: {
      expectedTools: ["get_upcoming_tasks"],
      responseContains: ["NLP Mini Project Report", "DBMS ER Diagram Assignment"],
      minResponseLength: 80,
    },
  },

  // CASE 25: Manual Verification 2 -- Why should I work on the top task first?
  {
    id: "m6-case-25",
    name: "Manual Verification 2 -- Why Top Task First",
    category: "priority_query",
    description:
      "User asks why top task should be prioritized first; provides grounded evidence and penalty clause.",
    userMessage: "Why should I work on the top task first?",
    mockToolResults: [
      {
        toolName: "get_source_evidence",
        result: { success: true, data: MOCK_SOURCE_EVIDENCE },
      },
      {
        toolName: "get_priority_tasks",
        result: { success: true, data: MOCK_PRIORITY_TASKS },
      },
    ],
    expected: {
      expectedTools: ["get_source_evidence", "get_priority_tasks"],
      responseContains: ["NLP", "penalty", "Deadline Proximity"],
      minResponseLength: 100,
    },
  },

  // CASE 26: Manual Verification 3 -- What changed recently?
  {
    id: "m6-case-26",
    name: "Manual Verification 3 -- Recent Changes Audit Log",
    category: "change_query",
    description: "Audit log inspection for detected modifications and deadline shifts.",
    userMessage: "What changed recently?",
    mockToolResults: [
      {
        toolName: "get_recent_changes",
        result: { success: true, data: MOCK_RECENT_CHANGES },
      },
    ],
    expected: {
      expectedTools: ["get_recent_changes"],
      responseContains: ["RESCHEDULED", "NLP Mini Project", "2026-09-19"],
      minResponseLength: 80,
    },
  },

  // CASE 27: Manual Verification 5 -- Create Reminder
  {
    id: "m6-case-27",
    name: "Manual Verification 5 -- Create Reminder with Gating",
    category: "mutation_create_reminder",
    description: "Create reminder with title and scheduled time emits confirmation card.",
    userMessage: "Create a reminder for NLP Assignment 2 tomorrow at 7 PM.",
    mockToolResults: [],
    expected: {
      expectedTools: [],
      responseContains: ["reminder", "confirm"],
      expectsConfirmationCard: true,
      confirmationToolName: "create_reminder",
      minResponseLength: 50,
    },
  },

  // CASE 28: Manual Verification 6 -- Mark ML Assignment 3 as Completed
  {
    id: "m6-case-28",
    name: "Manual Verification 6 -- Mark ML Assignment 3 Completed",
    category: "mutation_mark_completed",
    description: "Specific task mark complete request emits confirmation card for target task.",
    userMessage: "Mark ML Assignment 3 as completed.",
    mockToolResults: [],
    expected: {
      expectedTools: [],
      responseContains: ["ML Assignment 3", "confirm"],
      expectsConfirmationCard: true,
      confirmationToolName: "mark_task_completed",
      minResponseLength: 50,
    },
  },

  // CASE 29: Anti-Hallucination -- No Scheduled Assessments
  {
    id: "m6-case-29",
    name: "Anti-Hallucination -- Empty Assessment Calendar",
    category: "exam_query",
    description:
      "Assistant does not invent exams or dates when events database is empty.",
    userMessage: "When is my upcoming lab exam?",
    mockToolResults: [
      {
        toolName: "get_upcoming_events",
        result: { success: true, data: { exams: [], events: [] } },
      },
    ],
    expected: {
      expectedTools: ["get_upcoming_events"],
      responseContains: ["No formal CAT, FAT, or special events"],
      responseExcludes: ["September 30", "CAT-2"],
      minResponseLength: 40,
    },
  },

  // CASE 30: Course Query with Code -- CSE4001
  {
    id: "m6-case-30",
    name: "Course Query with Code -- CSE4001",
    category: "course_query",
    description: "Queries course information by course code CSE4001.",
    userMessage: "Show details for course CSE4001",
    mockToolResults: [
      {
        toolName: "get_course_information",
        result: { success: true, data: [MOCK_COURSES[0]] },
      },
    ],
    expected: {
      expectedTools: ["get_course_information"],
      responseContains: ["CSE4001", "Natural Language Processing", "Ananthakrishnan"],
      minResponseLength: 60,
    },
  },

  // CASE 31: Multi-turn Follow-up -- Plan My Day
  {
    id: "m6-case-31",
    name: "Multi-turn Follow-up -- Plan My Day",
    category: "priority_query",
    description: "After reviewing deadlines, user asks 'Plan my day'.",
    userMessage: "Plan my day",
    history: [
      { role: "user", content: "What is due this week?" },
      { role: "assistant", content: "You have NLP Mini Project due tomorrow." },
    ],
    mockToolResults: [
      {
        toolName: "get_today_plan",
        result: { success: true, data: MOCK_TODAY_PLAN },
      },
    ],
    expected: {
      expectedTools: ["get_today_plan"],
      responseContains: ["TODAY'S RECOMMENDED PLAN", "Focus Priority", "NLP Mini Project"],
      minResponseLength: 80,
    },
  },
];
