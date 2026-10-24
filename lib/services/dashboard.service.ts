import { prisma } from "@/lib/db/prisma";
import { ensureDefaultUserAndCourses } from "./user.service";
import { getFullAcademicState } from "@/lib/intelligence/academic-state";
import { getStudentNotifications } from "@/lib/intelligence/notification-scheduler";
import { FullAcademicState, PriorityFactor, PriorityLevel } from "@/lib/intelligence/types";
import { AcademicRiskRadar, AcademicRiskRadarReport } from "@/lib/intelligence/academic-risk-radar";
import { SmartPlanner, SmartAcademicPlan } from "@/lib/intelligence/smart-planner";
import { RubricStore } from "@/lib/intelligence/rubric-store";

export interface DashboardData {
  stats: {
    courseCount: number;
    taskCount: number;
    eventCount: number;
    noticeCount: number;
    highPriorityCount: number;
    overdueCount: number;
    completedCount: number;
    cancelledCount: number;
    rescheduledCount: number;
    unreadNotificationCount: number;
  };
  notifications?: {
    unreadCount: number;
    actionRequiredCount: number;
    topAlert: {
      id: string;
      title: string;
      message: string;
      urgency: string;
    } | null;
  };
  todayPriorities: Array<{
    id: string;
    title: string;
    category: string;
    priority: PriorityLevel;
    priorityScore: number;
    normalizedDeadline: string | null;
    deadline: Date | null;
    courseCode: string | null;
    courseTitle: string | null;
    priorityReason: string;
    penaltyClause: string | null;
    progress: number;
    factors: PriorityFactor[];
    timeRemainingLabel: string;
    isOverdue: boolean;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    normalizedDeadline: string | null;
    deadline: Date | null;
    courseCode: string | null;
    courseTitle: string | null;
    status: string;
    progress: number;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    eventType: string;
    venue: string | null;
    startTime: Date;
    endTime: Date;
    courseTitle: string | null;
    isRescheduled: boolean;
  }>;
  recentNotices: Array<{
    id: string;
    title: string | null;
    rawText: string;
    channel: string;
    createdAt: Date;
    taskCount: number;
  }>;
  recentChanges: Array<{
    id: string;
    taskId: string;
    taskTitle: string;
    courseCode: string | null;
    note: string;
    updatedAt: Date;
  }>;
  workload: {
    level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    totalEstimatedHours: number;
    byCourse: Array<{
      courseCode: string;
      courseTitle: string;
      taskCount: number;
      estimatedHours: number;
    }>;
    riskSummary: string;
    today: FullAcademicState["workload"]["today"];
    tomorrow: FullAcademicState["workload"]["tomorrow"];
    next7Days: FullAcademicState["workload"]["next7Days"];
    next30Days: FullAcademicState["workload"]["next30Days"];
  };
  aiBrief: {
    title: string;
    summary: string;
    actionAdvice: string;
    urgentCourse: string | null;
    severity?: string;
  };
  recommendation: FullAcademicState["recommendation"];
  pulseEvents: FullAcademicState["pulseEvents"];
  intelligence: FullAcademicState;
  riskRadar: AcademicRiskRadarReport;
  smartPlan: SmartAcademicPlan;
}

export async function getDashboardData(userId?: string): Promise<DashboardData> {
  // Ensure default setup is seeded if clean db
  await ensureDefaultUserAndCourses();

  // Determine user to isolate data for
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findFirst();
  const targetUserId = user?.id;

  // Compute full deterministic intelligence state strictly for this student
  const intelligenceState = await getFullAcademicState(targetUserId);

  // Student-specific enrolled courses count
  const userEnrollments = targetUserId
    ? await prisma.courseEnrollment.findMany({ where: { userId: targetUserId } })
    : [];
  const courseCount = userEnrollments.length > 0 ? userEnrollments.length : await prisma.course.count();
  const noticeCount = await prisma.academicSource.count();

  const events = await prisma.event.findMany({
    where: targetUserId ? { userId: targetUserId } : undefined,
    include: { course: true },
    orderBy: { startTime: "asc" },
    take: 5,
  });

  const recentSources = await prisma.academicSource.findMany({
    include: {
      evidences: {
        include: { task: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Query recent task changes from TaskProgress table for target user
  const progressLogs = await prisma.taskProgress.findMany({
    where: {
      note: { contains: "Change Detected" },
      task: targetUserId ? { userId: targetUserId } : undefined,
    },
    include: {
      task: {
        include: { course: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  const recentChanges = progressLogs.map((log) => ({
    id: log.id,
    taskId: log.taskId,
    taskTitle: log.task.title,
    courseCode: log.task.course?.code || null,
    note: log.note || "Deadline modified via notice",
    updatedAt: log.updatedAt,
  }));

  // Build todayPriorities from intelligenceState.rankedAttentionItems
  const todayPriorities = intelligenceState.rankedAttentionItems.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    priority: item.priorityLevel,
    priorityScore: item.priorityScore,
    normalizedDeadline: item.normalizedDeadline,
    deadline: item.deadline,
    courseCode: item.courseCode,
    courseTitle: item.courseTitle,
    priorityReason: item.priorityReason,
    penaltyClause: item.factors.find((f) => f.name === "Strict deadline")?.detail || null,
    progress: 0,
    factors: item.factors,
    timeRemainingLabel: item.timeRemainingLabel,
    isOverdue: item.isOverdue,
  }));

  const upcomingDeadlines = intelligenceState.rankedAttentionItems.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priorityLevel,
    normalizedDeadline: t.normalizedDeadline,
    deadline: t.deadline,
    courseCode: t.courseCode,
    courseTitle: t.courseTitle,
    status: t.status,
    progress: 0,
  }));

  const upcomingEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    eventType: e.eventType,
    venue: e.venue,
    startTime: e.startTime,
    endTime: e.endTime,
    courseTitle: e.course?.title || null,
    isRescheduled: e.isRescheduled,
  }));

  const recentNotices = recentSources.map((s) => ({
    id: s.id,
    title: s.title,
    rawText: s.rawText,
    channel: s.channel,
    createdAt: s.createdAt,
    taskCount: s.evidences.length,
  }));

  // Workload mapped to standard format + multi-period extensions
  const workloadLevelMapped =
    intelligenceState.workload.overallPressure === "CRITICAL"
      ? "CRITICAL"
      : intelligenceState.workload.overallPressure === "HIGH"
      ? "HIGH"
      : intelligenceState.workload.overallPressure === "MEDIUM"
      ? "MODERATE"
      : "LOW";

  const topObservation = intelligenceState.observations[0];

  const aiBrief = {
    title: intelligenceState.recommendation.recommendedItem
      ? intelligenceState.recommendation.headline
      : "AI Academic Brief",
    summary: topObservation
      ? topObservation.observationText
      : "Academic schedule is balanced with no urgent deadline clashes.",
    actionAdvice: intelligenceState.recommendation.actionAdvice,
    urgentCourse: intelligenceState.recommendation.recommendedItem?.courseCode || null,
    severity: topObservation?.severity || "NORMAL",
  };

  // Notifications data for student
  const notifData = await getStudentNotifications(targetUserId);

  // M8-D Academic Risk Radar & Smart Plan isolated to target user
  const [allTasks, allExams] = await Promise.all([
    prisma.task.findMany({
      where: targetUserId ? { userId: targetUserId } : undefined,
      include: { course: true },
    }),
    prisma.exam.findMany({ include: { course: true } }),
  ]);

  const riskRadar = AcademicRiskRadar.evaluateRisk({
    tasks: allTasks.map((t) => ({
      id: t.id,
      title: t.title,
      courseCode: t.course?.code || null,
      category: t.category,
      deadline: t.deadline,
      status: t.status,
      marks: t.weightage,
      priority: t.priority,
    })),
    exams: allExams.map((ex) => ({
      id: ex.id,
      title: ex.title,
      courseCode: ex.course.code,
      examDate: ex.examDate,
      startTime: ex.startTime,
      weightage: ex.weightage,
    })),
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      eventType: e.eventType,
      startTime: e.startTime,
    })),
    rubrics: RubricStore.getAllRubrics(),
  });

  const smartPlan = SmartPlanner.generateSmartPlan(
    allTasks.map((t) => ({
      id: t.id,
      title: t.title,
      courseCode: t.course?.code || null,
      category: t.category,
      deadline: t.deadline,
      status: t.status,
      marks: t.weightage,
      priority: t.priority,
      estimatedHours: t.estimatedHours || undefined,
    })),
    {
      rubrics: RubricStore.getAllRubrics(),
    }
  );

  return {
    stats: {
      courseCount,
      taskCount: intelligenceState.stats.totalActiveTasks,
      eventCount: intelligenceState.stats.totalEvents,
      noticeCount,
      highPriorityCount: intelligenceState.stats.highCriticalCount,
      overdueCount: intelligenceState.stats.overdueCount,
      completedCount: intelligenceState.stats.completedCount,
      cancelledCount: intelligenceState.stats.cancelledCount,
      rescheduledCount: intelligenceState.stats.rescheduledCount,
      unreadNotificationCount: notifData.unreadCount,
    },
    notifications: {
      unreadCount: notifData.unreadCount,
      actionRequiredCount: notifData.groups.actionRequired.length,
      topAlert: notifData.groups.actionRequired[0]
        ? {
            id: notifData.groups.actionRequired[0].id,
            title: notifData.groups.actionRequired[0].title,
            message: notifData.groups.actionRequired[0].message,
            urgency: notifData.groups.actionRequired[0].urgency,
          }
        : null,
    },
    todayPriorities,
    upcomingDeadlines,
    upcomingEvents,
    recentNotices,
    recentChanges,
    workload: {
      level: workloadLevelMapped,
      totalEstimatedHours: intelligenceState.workload.next7Days.estimatedHours,
      byCourse: intelligenceState.workload.byCourse.map((c) => ({
        courseCode: c.courseCode,
        courseTitle: c.courseTitle,
        taskCount: c.incompleteTaskCount + c.examCount,
        estimatedHours: c.estimatedHours,
      })),
      riskSummary: intelligenceState.workload.riskSummary,
      today: intelligenceState.workload.today,
      tomorrow: intelligenceState.workload.tomorrow,
      next7Days: intelligenceState.workload.next7Days,
      next30Days: intelligenceState.workload.next30Days,
    },
    aiBrief,
    recommendation: intelligenceState.recommendation,
    pulseEvents: intelligenceState.pulseEvents,
    intelligence: intelligenceState,
    riskRadar,
    smartPlan,
  };
}
