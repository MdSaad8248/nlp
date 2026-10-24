import { prisma } from "@/lib/db/prisma";
import { ensureDefaultUserAndCourses } from "@/lib/services/user.service";
import {
  FullAcademicState,
  RankedAcademicItem,
  WorkRecommendation,
  AIObservation,
  AcademicPulseItem,
} from "./types";
import { calculateAcademicPriority } from "./priority-engine";
import { computeWorkloadSummary, WorkloadItemInput } from "./workload-engine";
import { generateRecommendationReasons, formatFactorBreakdown } from "./priority-explanations";

export async function getFullAcademicState(
  userId?: string,
  now: Date = new Date()
): Promise<FullAcademicState> {
  // Ensure default seeded user exists if needed
  await ensureDefaultUserAndCourses();

  // Find user
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findFirst();

  const targetUserId = user?.id;

  // Fetch all tasks for user or workspace
  const tasks = await prisma.task.findMany({
    where: targetUserId ? { userId: targetUserId } : undefined,
    include: {
      course: true,
      evidences: {
        include: { source: true },
        take: 3,
      },
      progress: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all events
  const events = await prisma.event.findMany({
    where: targetUserId ? { userId: targetUserId } : undefined,
    include: { course: true },
    orderBy: { startTime: "asc" },
  });

  // Fetch all exams
  const exams = await prisma.exam.findMany({
    include: { course: true },
    orderBy: { examDate: "asc" },
  });

  // Determine clusters (check if multiple items are due within 48h of each other)
  const allActiveDeadlines = [
    ...tasks
      .filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.deadline)
      .map((t) => t.deadline!.getTime()),
    ...exams.map((e) => e.examDate.getTime()),
  ].sort((a, b) => a - b);

  const isTimeClustered = (timeMs: number): boolean => {
    const windowMs = 48 * 60 * 60 * 1000;
    const countInWindow = allActiveDeadlines.filter((t) => Math.abs(t - timeMs) <= windowMs).length;
    return countInWindow >= 2;
  };

  const nowMs = now.getTime();

  // Stats Counters
  let completedCount = 0;
  let cancelledCount = 0;
  let rescheduledCount = 0;
  let overdueCount = 0;
  let highCriticalCount = 0;

  // Process Tasks into RankedAcademicItems
  const rankedItems: RankedAcademicItem[] = [];
  const workloadItemInputs: WorkloadItemInput[] = [];

  for (const t of tasks) {
    const status = (t.status || "PENDING").toUpperCase();
    if (status === "COMPLETED") completedCount++;
    if (status === "CANCELLED") cancelledCount++;
    if (t.isRescheduled) rescheduledCount++;

    const isPenalty =
      Boolean(t.description && /late\s+(?:submission|penalty|deduct|zero|not\s+accepted)/i.test(t.description)) ||
      t.evidences.some((e) => /late\s+(?:submission|penalty|deduct|zero|not\s+accepted)/i.test(e.extractedSnippet || ""));

    const isUrgent =
      Boolean(t.description && /\burgent\b|\bimmediate\b|\bcritical\b|\basap\b/i.test(t.description)) ||
      /\burgent\b|\bimmediate\b|\bcritical\b/i.test(t.title);

    const deadlineMs = t.deadline ? t.deadline.getTime() : null;
    const isClustered = deadlineMs !== null && isTimeClustered(deadlineMs);

    const evalResult = calculateAcademicPriority({
      title: t.title,
      deadline: t.deadline,
      status: t.status,
      category: t.category,
      marks: t.weightage,
      weightage: t.weightage,
      hasPenaltyClause: isPenalty,
      penaltyClauseText: isPenalty ? "Strict deadline policy: late penalties apply" : null,
      hasUrgentKeywords: isUrgent,
      isClustered,
      now,
    });

    const isOverdue =
      status !== "COMPLETED" &&
      status !== "CANCELLED" &&
      (status === "OVERDUE" || (deadlineMs !== null && deadlineMs < nowMs));

    if (isOverdue) overdueCount++;
    if (evalResult.level === "HIGH" || evalResult.level === "CRITICAL") {
      if (status !== "COMPLETED" && status !== "CANCELLED") {
        highCriticalCount++;
      }
    }

    let timeRemainingHours: number | null = null;
    let timeRemainingLabel = "No deadline";

    if (deadlineMs !== null) {
      const diffHours = (deadlineMs - nowMs) / (1000 * 60 * 60);
      timeRemainingHours = Math.round(diffHours * 10) / 10;

      if (diffHours < 0) {
        timeRemainingLabel = `Overdue by ${Math.abs(Math.round(diffHours))}h`;
      } else if (diffHours < 24) {
        timeRemainingLabel = `${Math.max(1, Math.round(diffHours))}h remaining`;
      } else {
        const days = Math.ceil(diffHours / 24);
        timeRemainingLabel = `${days} day${days > 1 ? "s" : ""} remaining`;
      }
    }

    const rankedItem: RankedAcademicItem = {
      id: t.id,
      itemType: "TASK",
      title: t.title,
      courseCode: t.course?.code || null,
      courseTitle: t.course?.title || null,
      category: t.category,
      deadline: t.deadline,
      normalizedDeadline: t.normalizedDeadline,
      status: isOverdue ? "OVERDUE" : t.status,
      marks: t.weightage,
      weightage: t.weightage,
      submissionPlatform: t.submissionPlatform,
      priorityScore: evalResult.score,
      priorityLevel: evalResult.level,
      factors: evalResult.factors,
      priorityReason: evalResult.explanation,
      isOverdue,
      timeRemainingHours,
      timeRemainingLabel,
      isRescheduled: t.isRescheduled,
    };

    rankedItems.push(rankedItem);

    // Pass to workload engine if active
    if (status !== "COMPLETED" && status !== "CANCELLED") {
      workloadItemInputs.push({
        id: t.id,
        itemType: "TASK",
        title: t.title,
        courseCode: t.course?.code || null,
        courseTitle: t.course?.title || null,
        category: t.category,
        deadline: t.deadline,
        status: isOverdue ? "OVERDUE" : t.status,
        marks: t.weightage,
        weightage: t.weightage,
        priorityScore: evalResult.score,
        priorityLevel: evalResult.level,
        isOverdue,
        isRescheduled: t.isRescheduled,
      });
    }
  }

  // Process Exams into RankedAcademicItems
  for (const e of exams) {
    const examMs = e.examDate.getTime();
    const isClustered = isTimeClustered(examMs);

    const evalResult = calculateAcademicPriority({
      title: e.title,
      deadline: e.examDate,
      status: "PENDING",
      category: "EXAM",
      marks: e.weightage,
      weightage: e.weightage,
      hasPenaltyClause: true,
      penaltyClauseText: "Examination schedule strictly enforced",
      isClustered,
      now,
    });

    const isOverdue = examMs < nowMs;
    const diffHours = (examMs - nowMs) / (1000 * 60 * 60);

    let timeRemainingLabel = "Upcoming";
    if (diffHours < 0) {
      timeRemainingLabel = "Completed/Past";
    } else if (diffHours < 24) {
      timeRemainingLabel = `${Math.max(1, Math.round(diffHours))}h remaining`;
    } else {
      const days = Math.ceil(diffHours / 24);
      timeRemainingLabel = `${days} day${days > 1 ? "s" : ""} remaining`;
    }

    if (evalResult.level === "HIGH" || evalResult.level === "CRITICAL") {
      highCriticalCount++;
    }

    const examItem: RankedAcademicItem = {
      id: e.id,
      itemType: "EXAM",
      title: `${e.course?.code ? e.course.code + " - " : ""}${e.title}`,
      courseCode: e.course?.code || null,
      courseTitle: e.course?.title || null,
      category: "EXAM",
      deadline: e.examDate,
      normalizedDeadline: e.examDate.toLocaleDateString(),
      status: isOverdue ? "OVERDUE" : "PENDING",
      marks: e.weightage,
      weightage: e.weightage,
      submissionPlatform: e.venue || "Campus Exam Hall",
      priorityScore: evalResult.score,
      priorityLevel: evalResult.level,
      factors: evalResult.factors,
      priorityReason: evalResult.explanation,
      isOverdue,
      timeRemainingHours: Math.round(diffHours * 10) / 10,
      timeRemainingLabel,
    };

    rankedItems.push(examItem);

    if (!isOverdue) {
      workloadItemInputs.push({
        id: e.id,
        itemType: "EXAM",
        title: examItem.title,
        courseCode: e.course?.code || null,
        courseTitle: e.course?.title || null,
        category: "EXAM",
        deadline: e.examDate,
        status: "PENDING",
        marks: e.weightage,
        weightage: e.weightage,
        priorityScore: evalResult.score,
        priorityLevel: evalResult.level,
        isOverdue: false,
      });
    }
  }

  // Filter and Rank Attention Items (Only Active: non-completed, non-cancelled)
  const activeAttentionItems = rankedItems
    .filter((it) => it.status !== "COMPLETED" && it.status !== "CANCELLED")
    .sort((a, b) => {
      // 1. Highest priority score first
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      // 2. Earliest deadline first
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      // 3. Higher marks first
      return (b.marks || 0) - (a.marks || 0);
    });

  // Compute Workload Summary
  const workload = computeWorkloadSummary(workloadItemInputs, now);

  // Derive "What Should I Work On Now?" Recommendation
  const topCandidate = activeAttentionItems[0] || null;
  let recommendation: WorkRecommendation;

  if (!topCandidate) {
    recommendation = {
      recommendedItem: null,
      headline: "All Deliverables Clear",
      actionAdvice: "No pressing tasks or exams require your immediate focus right now.",
      reasons: ["No pending or overdue academic tasks found in your syllabus schedule."],
      estimatedTimeBlockMinutes: 0,
    };
  } else {
    const reasons = generateRecommendationReasons(
      topCandidate.title,
      topCandidate.category,
      topCandidate.timeRemainingLabel,
      topCandidate.marks,
      topCandidate.factors,
      topCandidate.isOverdue
    );

    let focusMins = 60;
    if (topCandidate.category === "EXAM") focusMins = 120;
    else if (topCandidate.category === "PROJECT" || topCandidate.category === "REVIEW") focusMins = 90;
    else if (topCandidate.priorityLevel === "CRITICAL") focusMins = 90;
    else if (topCandidate.category === "QUIZ" || topCandidate.category === "LAB") focusMins = 45;

    recommendation = {
      recommendedItem: topCandidate,
      headline: topCandidate.isOverdue
        ? `Overdue Recovery: ${topCandidate.title}`
        : `Primary Focus: ${topCandidate.title}`,
      actionAdvice: `Allocate a structured ${focusMins}-minute focus session today to complete and verify submission requirements.`,
      reasons,
      estimatedTimeBlockMinutes: focusMins,
    };
  }

  // Derive AI Observations
  const observations: AIObservation[] = [];

  // 1. Overdue Alert
  if (overdueCount > 0) {
    observations.push({
      id: "obs-overdue",
      type: "OVERDUE_ALERT",
      observationText: `${overdueCount} deliverable(s) have passed their scheduled deadline without recorded submission.`,
      actionAdvice: "Review submission portals immediately to check for late submission windows or faculty escalation.",
      severity: "CRITICAL",
      courseCode: null,
    });
  }

  // 2. Urgent Cluster Alert
  if (workload.today.deadlineConcentration >= 2 || workload.tomorrow.deadlineConcentration >= 2) {
    const count = workload.today.deadlineConcentration + workload.tomorrow.deadlineConcentration;
    observations.push({
      id: "obs-cluster",
      type: "URGENT_CLUSTER",
      observationText: `Deadline Cluster: ${count} major academic deliverables are concentrated in the next 48 hours.`,
      actionAdvice: "Break work into alternating 45-minute focus intervals today to prevent last-minute submission bottlenecks.",
      severity: "CRITICAL",
      courseCode: null,
    });
  }

  // 3. High Weight Item Alert
  const highWeightUpcoming = activeAttentionItems.find(
    (it) => (it.marks ?? 0) >= 25 && it.timeRemainingHours !== null && it.timeRemainingHours <= 72
  );
  if (highWeightUpcoming) {
    observations.push({
      id: "obs-high-weight",
      type: "HIGH_WEIGHT",
      observationText: `High-Impact Milestone: "${highWeightUpcoming.title}" accounts for ${highWeightUpcoming.marks} marks and is due within ${highWeightUpcoming.timeRemainingLabel}.`,
      actionAdvice: "Prioritize evaluation criteria and rubric compliance before final submission.",
      severity: "HIGH",
      courseCode: highWeightUpcoming.courseCode,
    });
  }

  // 4. Same Day Assessment Alert
  const sameDayExamAndTask = workload.byDay.find((d) => d.examCount >= 1 && d.taskCount >= 1);
  if (sameDayExamAndTask) {
    observations.push({
      id: "obs-same-day",
      type: "SAME_DAY_ASSESSMENT",
      observationText: `Simultaneous Assessments on ${sameDayExamAndTask.dayLabel}: Both an examination and an assignment deadline coincide.`,
      actionAdvice: "Pre-submit assignment deliverables at least 24 hours in advance to protect exam preparation time.",
      severity: "HIGH",
      courseCode: null,
    });
  }

  // 5. All Clear Fallback
  if (observations.length === 0) {
    observations.push({
      id: "obs-all-clear",
      type: "ALL_CLEAR",
      observationText: "Academic schedule is balanced with no urgent deadline clashes or high-risk clusters.",
      actionAdvice: "Review upcoming course lecture slides and prepare early for future project checkpoints.",
      severity: "NORMAL",
      courseCode: null,
    });
  }

  // Derive Academic Pulse Items for Today
  const pulseEvents: AcademicPulseItem[] = [];

  // Today's events
  const todayDateStr = now.toISOString().split("T")[0];
  for (const ev of events) {
    const evDateStr = ev.startTime.toISOString().split("T")[0];
    if (evDateStr === todayDateStr) {
      const h = ev.startTime.getHours();
      const m = ev.startTime.getMinutes();
      const isPast = ev.endTime.getTime() < nowMs;

      pulseEvents.push({
        id: ev.id,
        hour: h,
        minute: m,
        label: `${ev.course?.code ? ev.course.code + ": " : ""}${ev.title}`,
        state: isPast ? "done" : ev.eventType === "LECTURE" || ev.eventType === "LAB" ? "class" : "upcoming",
        courseCode: ev.course?.code || null,
        details: ev.venue ? `Venue: ${ev.venue}` : undefined,
      });
    }
  }

  // Today's active deadlines & exams
  for (const it of activeAttentionItems) {
    if (it.deadline) {
      const itDateStr = it.deadline.toISOString().split("T")[0];
      if (itDateStr === todayDateStr) {
        const h = it.deadline.getHours();
        const m = it.deadline.getMinutes();
        pulseEvents.push({
          id: it.id,
          hour: h,
          minute: m,
          label: `${it.courseCode ? it.courseCode + ": " : ""}${it.title}`,
          state: it.itemType === "EXAM" ? "exam" : it.priorityLevel === "CRITICAL" ? "critical" : "deadline",
          courseCode: it.courseCode,
          details: it.marks ? `${it.marks} marks` : undefined,
        });
      }
    }
  }

  // Sort pulse events chronologically
  pulseEvents.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  const totalActiveTasks = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length;

  return {
    timestamp: now.toISOString(),
    stats: {
      totalActiveTasks,
      totalExams: exams.length,
      totalEvents: events.length,
      overdueCount,
      highCriticalCount,
      completedCount,
      cancelledCount,
      rescheduledCount,
    },
    rankedAttentionItems: activeAttentionItems,
    workload,
    recommendation,
    observations,
    pulseEvents,
  };
}
