export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface PriorityFactor {
  name: string;
  scoreContribution: number;
  detail: string;
}

export interface PriorityEvaluationResult {
  score: number;
  level: PriorityLevel;
  factors: PriorityFactor[];
  explanation: string;
  urgencyLabel: string;
}

export type WorkloadPeriod = "TODAY" | "TOMORROW" | "NEXT_7_DAYS" | "NEXT_30_DAYS";
export type DeadlinePressureLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface PeriodWorkloadMetrics {
  period: WorkloadPeriod;
  periodLabel: string;
  incompleteTasks: number;
  exams: number;
  academicEvents: number;
  overdueTasks: number;
  highCriticalItems: number;
  estimatedHours: number;
  deadlineConcentration: number;
  totalPriorityPressure: number;
  pressureLevel: DeadlinePressureLevel;
  pressureSummary: string;
}

export interface DayWorkloadBucket {
  date: string; // ISO date string (YYYY-MM-DD)
  dayLabel: string; // e.g. "Mon, Sep 21"
  isToday: boolean;
  isTomorrow: boolean;
  taskCount: number;
  examCount: number;
  eventCount: number;
  totalDeadlines: number;
  highPriorityCount: number;
  pressureLevel: DeadlinePressureLevel;
  items: Array<{
    id: string;
    title: string;
    courseCode: string | null;
    type: "TASK" | "EXAM" | "EVENT";
    priority: PriorityLevel;
    marks: number | null;
  }>;
}

export interface CourseWorkloadBucket {
  courseCode: string;
  courseTitle: string;
  incompleteTaskCount: number;
  examCount: number;
  estimatedHours: number;
  totalMarks: number;
  hasUpcomingDeadline: boolean;
  nextDeadline: string | null;
}

export interface WorkloadSummary {
  today: PeriodWorkloadMetrics;
  tomorrow: PeriodWorkloadMetrics;
  next7Days: PeriodWorkloadMetrics;
  next30Days: PeriodWorkloadMetrics;
  byDay: DayWorkloadBucket[];
  byCourse: CourseWorkloadBucket[];
  overallPressure: DeadlinePressureLevel;
  riskSummary: string;
}

export interface RankedAcademicItem {
  id: string;
  itemType: "TASK" | "EXAM" | "EVENT";
  title: string;
  courseCode: string | null;
  courseTitle: string | null;
  category: string;
  deadline: Date | null;
  normalizedDeadline: string | null;
  status: string; // PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
  marks: number | null;
  weightage: number | null;
  submissionPlatform: string | null;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  factors: PriorityFactor[];
  priorityReason: string;
  isOverdue: boolean;
  timeRemainingHours: number | null;
  timeRemainingLabel: string;
  isRescheduled?: boolean;
  hasPenaltyClause?: boolean;
  isClustered?: boolean;
  venue?: string | null;
}

export interface WorkRecommendation {
  recommendedItem: RankedAcademicItem | null;
  headline: string;
  actionAdvice: string;
  reasons: string[];
  estimatedTimeBlockMinutes: number;
}

export interface AIObservation {
  id: string;
  type: "URGENT_CLUSTER" | "HIGH_WEIGHT" | "SAME_DAY_ASSESSMENT" | "OVERDUE_ALERT" | "ALL_CLEAR";
  observationText: string;
  actionAdvice: string;
  severity: "CRITICAL" | "HIGH" | "NORMAL" | "INFO";
  courseCode: string | null;
}

export interface AcademicPulseItem {
  id: string;
  hour: number;
  minute: number;
  label: string;
  state: "class" | "upcoming" | "deadline" | "critical" | "done" | "exam";
  courseCode?: string | null;
  details?: string;
}

export interface FullAcademicState {
  timestamp: string;
  stats: {
    totalActiveTasks: number;
    totalExams: number;
    totalEvents: number;
    overdueCount: number;
    highCriticalCount: number;
    completedCount: number;
    cancelledCount: number;
    rescheduledCount: number;
  };
  rankedAttentionItems: RankedAcademicItem[];
  workload: WorkloadSummary;
  recommendation: WorkRecommendation;
  observations: AIObservation[];
  pulseEvents: AcademicPulseItem[];
}

export type NotificationType =
  | "DEADLINE_REMINDER"
  | "URGENT_DEADLINE"
  | "OVERDUE_ALERT"
  | "EXAM_REMINDER"
  | "RESCHEDULED_EVENT"
  | "CANCELLED_EVENT"
  | "UPDATED_ACADEMIC_ITEM"
  | "WORKLOAD_ALERT"
  | "DAILY_DIGEST"
  | "PLAN_SUGGESTION";

export type NotificationStatus = "SCHEDULED" | "SENT" | "READ" | "DISMISSED" | "CANCELLED";

export type NotificationStage = "7D" | "48H" | "24H" | "12H" | "OVERDUE" | "CHANGE" | "DIGEST";

export type NotificationUrgency = "INFO" | "NORMAL" | "URGENT" | "CRITICAL";

export interface AdaptiveNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  urgency: NotificationUrgency;
  targetItemType: "TASK" | "EVENT" | "EXAM" | "WORKLOAD" | "DIGEST";
  targetItemId: string | null;
  courseCode: string | null;
  scheduledFor: Date;
  status: NotificationStatus;
  stage: NotificationStage | null;
  dedupKey: string;
  whyBullets: string[];
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: Date;
  readAt: Date | null;
  dismissedAt: Date | null;
}

export interface NotificationPreferenceSettings {
  notificationsEnabled: boolean;
  quietHoursStart: string | null; // e.g. "23:00"
  quietHoursEnd: string | null; // e.g. "07:00"
  digestEnabled: boolean;
  urgentAlertsEnabled: boolean;
  workloadAlertsEnabled: boolean;
  notificationLeadDays: number;
}

export interface DailyAcademicDigest {
  date: string;
  headline: string;
  criticalCount: number;
  dueTodayCount: number;
  dueTomorrowCount: number;
  rescheduledCount: number;
  topFocusItem: string | null;
  workloadPressure: DeadlinePressureLevel;
  summaryText: string;
}
