import {
  WorkloadPeriod,
  DeadlinePressureLevel,
  PeriodWorkloadMetrics,
  DayWorkloadBucket,
  CourseWorkloadBucket,
  WorkloadSummary,
  RankedAcademicItem,
} from "./types";

export interface WorkloadItemInput {
  id: string;
  itemType: "TASK" | "EXAM" | "EVENT";
  title: string;
  courseCode: string | null;
  courseTitle: string | null;
  category: string;
  deadline: Date | null;
  status: string; // PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
  marks: number | null;
  weightage: number | null;
  priorityScore: number;
  priorityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isOverdue: boolean;
  isRescheduled?: boolean;
}

/**
 * Estimated effort in hours based on academic assessment type
 */
export function estimateItemHours(category: string, marks?: number | null): number {
  const cat = (category || "").toUpperCase();
  if (cat === "EXAM") {
    return 6.0;
  }
  if (cat === "PROJECT" || cat === "REVIEW") {
    return marks && marks >= 25 ? 10.0 : 6.0;
  }
  if (cat === "QUIZ" || cat === "LAB") {
    return 2.5;
  }
  // Default assignment
  return marks && marks >= 20 ? 4.0 : 2.5;
}

/**
 * Evaluates pressure level based on volume, high-priority count, and exams
 */
export function determinePeriodPressure(
  period: WorkloadPeriod,
  itemCount: number,
  highCriticalCount: number,
  examCount: number,
  overdueCount: number
): DeadlinePressureLevel {
  if (period === "TODAY") {
    if (overdueCount > 0 || highCriticalCount >= 2 || (itemCount >= 2 && examCount >= 1)) {
      return "CRITICAL";
    }
    if (highCriticalCount >= 1 || itemCount >= 2 || examCount >= 1) {
      return "HIGH";
    }
    if (itemCount === 1) {
      return "MEDIUM";
    }
    return "LOW";
  }

  if (period === "TOMORROW") {
    if (highCriticalCount >= 2 || (itemCount >= 2 && examCount >= 1)) {
      return "CRITICAL";
    }
    if (highCriticalCount >= 1 || itemCount >= 2 || examCount >= 1) {
      return "HIGH";
    }
    if (itemCount === 1) {
      return "MEDIUM";
    }
    return "LOW";
  }

  if (period === "NEXT_7_DAYS") {
    if (highCriticalCount >= 4 || (itemCount >= 5 && examCount >= 2)) {
      return "CRITICAL";
    }
    if (highCriticalCount >= 2 || itemCount >= 3 || examCount >= 1) {
      return "HIGH";
    }
    if (itemCount >= 1) {
      return "MEDIUM";
    }
    return "LOW";
  }

  // NEXT_30_DAYS
  if (highCriticalCount >= 6 || itemCount >= 10 || examCount >= 4) {
    return "CRITICAL";
  }
  if (highCriticalCount >= 3 || itemCount >= 5 || examCount >= 2) {
    return "HIGH";
  }
  if (itemCount >= 2) {
    return "MEDIUM";
  }
  return "LOW";
}

export function generatePeriodSummary(
  period: WorkloadPeriod,
  pressure: DeadlinePressureLevel,
  itemCount: number,
  examCount: number,
  overdueCount: number
): string {
  if (overdueCount > 0) {
    return `${overdueCount} overdue item(s) require immediate remediation.`;
  }
  if (itemCount === 0) {
    return `No pending deadlines scheduled for this period.`;
  }
  if (pressure === "CRITICAL") {
    return `Intense workload with ${itemCount} deliverables${examCount > 0 ? ` including ${examCount} exam(s)` : ""}.`;
  }
  if (pressure === "HIGH") {
    return `Elevated workload requiring structured focus blocks across ${itemCount} item(s).`;
  }
  if (pressure === "MEDIUM") {
    return `Moderate academic load: ${itemCount} deliverable(s) pending.`;
  }
  return `Light pace: manageable requirements on schedule.`;
}

/**
 * Computes workload summary across periods, daily timeline buckets, and courses.
 */
export function computeWorkloadSummary(
  items: WorkloadItemInput[],
  now: Date = new Date()
): WorkloadSummary {
  // Filter out completed and cancelled items strictly
  const activeItems = items.filter((it) => {
    const s = (it.status || "").toUpperCase();
    return s !== "COMPLETED" && s !== "CANCELLED";
  });

  const nowMs = now.getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
  const endOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);
  const endOf30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59, 999);

  // Period Buckets
  const buildPeriodMetrics = (
    period: WorkloadPeriod,
    label: string,
    filterFn: (d: Date | null, isOverdue: boolean) => boolean
  ): PeriodWorkloadMetrics => {
    const matching = activeItems.filter((it) => filterFn(it.deadline, it.isOverdue));
    const tasks = matching.filter((it) => it.itemType === "TASK");
    const exams = matching.filter((it) => it.itemType === "EXAM");
    const events = matching.filter((it) => it.itemType === "EVENT");
    const overdue = matching.filter((it) => it.isOverdue || (it.deadline && it.deadline.getTime() < nowMs));
    const highCritical = matching.filter((it) => it.priorityLevel === "HIGH" || it.priorityLevel === "CRITICAL");
    const totalHours = matching.reduce((sum, it) => sum + estimateItemHours(it.category, it.marks), 0);
    const totalPriorityScore = matching.reduce((sum, it) => sum + it.priorityScore, 0);

    const pressure = determinePeriodPressure(period, matching.length, highCritical.length, exams.length, overdue.length);
    const pressureSummary = generatePeriodSummary(period, pressure, matching.length, exams.length, overdue.length);

    return {
      period,
      periodLabel: label,
      incompleteTasks: tasks.length,
      exams: exams.length,
      academicEvents: events.length,
      overdueTasks: overdue.length,
      highCriticalItems: highCritical.length,
      estimatedHours: Math.round(totalHours * 10) / 10,
      deadlineConcentration: matching.length,
      totalPriorityPressure: totalPriorityScore,
      pressureLevel: pressure,
      pressureSummary,
    };
  };

  const today = buildPeriodMetrics("TODAY", "Today", (d, isOverdue) => {
    if (isOverdue) return true; // overdue surfaces in Today
    if (!d) return false;
    return d.getTime() <= endOfToday.getTime();
  });

  const tomorrow = buildPeriodMetrics("TOMORROW", "Tomorrow", (d) => {
    if (!d) return false;
    return d.getTime() > endOfToday.getTime() && d.getTime() <= endOfTomorrow.getTime();
  });

  const next7Days = buildPeriodMetrics("NEXT_7_DAYS", "Next 7 Days", (d, isOverdue) => {
    if (isOverdue) return true;
    if (!d) return false;
    return d.getTime() <= endOf7Days.getTime();
  });

  const next30Days = buildPeriodMetrics("NEXT_30_DAYS", "Next 30 Days", (d, isOverdue) => {
    if (isOverdue) return true;
    if (!d) return false;
    return d.getTime() <= endOf30Days.getTime();
  });

  // Daily Buckets for the upcoming 10 days
  const byDay: DayWorkloadBucket[] = [];
  for (let i = 0; i < 10; i++) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const bucketStart = new Date(bucketDate.getFullYear(), bucketDate.getMonth(), bucketDate.getDate(), 0, 0, 0);
    const bucketEnd = new Date(bucketDate.getFullYear(), bucketDate.getMonth(), bucketDate.getDate(), 23, 59, 59, 999);

    const isToday = i === 0;
    const isTomorrow = i === 1;
    const dateStr = bucketDate.toISOString().split("T")[0];
    const dayLabel = isToday
      ? "Today"
      : isTomorrow
      ? "Tomorrow"
      : bucketDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    const dayItems = activeItems.filter((it) => {
      if (!it.deadline) return false;
      const t = it.deadline.getTime();
      if (isToday && it.isOverdue) return true; // overdue included in today bucket
      return t >= bucketStart.getTime() && t <= bucketEnd.getTime();
    });

    const dayTasks = dayItems.filter((it) => it.itemType === "TASK");
    const dayExams = dayItems.filter((it) => it.itemType === "EXAM");
    const dayEvents = dayItems.filter((it) => it.itemType === "EVENT");
    const dayHigh = dayItems.filter((it) => it.priorityLevel === "HIGH" || it.priorityLevel === "CRITICAL");

    let dayPressure: DeadlinePressureLevel = "LOW";
    if (dayHigh.length >= 2 || (dayItems.length >= 2 && dayExams.length >= 1)) {
      dayPressure = "CRITICAL";
    } else if (dayHigh.length >= 1 || dayItems.length >= 2 || dayExams.length >= 1) {
      dayPressure = "HIGH";
    } else if (dayItems.length === 1) {
      dayPressure = "MEDIUM";
    }

    byDay.push({
      date: dateStr,
      dayLabel,
      isToday,
      isTomorrow,
      taskCount: dayTasks.length,
      examCount: dayExams.length,
      eventCount: dayEvents.length,
      totalDeadlines: dayItems.length,
      highPriorityCount: dayHigh.length,
      pressureLevel: dayPressure,
      items: dayItems.map((it) => ({
        id: it.id,
        title: it.title,
        courseCode: it.courseCode,
        type: it.itemType,
        priority: it.priorityLevel,
        marks: it.marks ?? it.weightage,
      })),
    });
  }

  // Course Breakdown
  const courseMap = new Map<string, CourseWorkloadBucket>();
  for (const it of activeItems) {
    const code = it.courseCode || "GENERAL";
    const title = it.courseTitle || (code === "GENERAL" ? "General Academic" : code);

    if (!courseMap.has(code)) {
      courseMap.set(code, {
        courseCode: code,
        courseTitle: title,
        incompleteTaskCount: 0,
        examCount: 0,
        estimatedHours: 0,
        totalMarks: 0,
        hasUpcomingDeadline: false,
        nextDeadline: null,
      });
    }

    const c = courseMap.get(code)!;
    if (it.itemType === "TASK") {
      c.incompleteTaskCount += 1;
    } else if (it.itemType === "EXAM") {
      c.examCount += 1;
    }

    c.estimatedHours += estimateItemHours(it.category, it.marks);
    if (it.marks) {
      c.totalMarks += it.marks;
    }

    if (it.deadline) {
      c.hasUpcomingDeadline = true;
      const dStr = it.deadline.toISOString();
      if (!c.nextDeadline || dStr < c.nextDeadline) {
        c.nextDeadline = dStr;
      }
    }
  }

  const byCourse = Array.from(courseMap.values())
    .map((c) => ({
      ...c,
      estimatedHours: Math.round(c.estimatedHours * 10) / 10,
    }))
    .sort((a, b) => b.incompleteTaskCount + b.examCount - (a.incompleteTaskCount + a.examCount));

  // Overall pressure
  let overallPressure: DeadlinePressureLevel = "LOW";
  if (today.pressureLevel === "CRITICAL" || tomorrow.pressureLevel === "CRITICAL" || next7Days.pressureLevel === "CRITICAL") {
    overallPressure = "CRITICAL";
  } else if (today.pressureLevel === "HIGH" || tomorrow.pressureLevel === "HIGH" || next7Days.pressureLevel === "HIGH") {
    overallPressure = "HIGH";
  } else if (next7Days.incompleteTasks > 0 || next7Days.exams > 0) {
    overallPressure = "MEDIUM";
  }

  let riskSummary = "Workload is well-balanced across the upcoming academic window.";
  if (today.overdueTasks > 0) {
    riskSummary = `Immediate action needed: ${today.overdueTasks} deliverable(s) are overdue.`;
  } else if (today.pressureLevel === "CRITICAL") {
    riskSummary = "High-pressure day: multiple critical items or examinations scheduled.";
  } else if (tomorrow.pressureLevel === "CRITICAL" || tomorrow.pressureLevel === "HIGH") {
    riskSummary = "Substantial workload tomorrow. Recommend preparing materials in advance today.";
  } else if (next7Days.pressureLevel === "CRITICAL") {
    riskSummary = "Heavy deadline concentration in the next 7 days. Plan dedicated focus blocks.";
  }

  return {
    today,
    tomorrow,
    next7Days,
    next30Days,
    byDay,
    byCourse,
    overallPressure,
    riskSummary,
  };
}
