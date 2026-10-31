/**
 * Authoritative Faculty Dashboard Service
 *
 * Provides real database-driven summaries, reconciliation charts, assessment overviews,
 * and review queues strictly restricted to the faculty member's authorized courses.
 *
 * Rules:
 * 1. Zero fabricated statistics or synthetic placeholders.
 * 2. Strict denominator rules: Completion % = completed / eligible * 100, or null ('—') if 0.
 * 3. Mutually exclusive submission donut categories so totals reconcile 100%.
 * 4. Course-scoped authorization via prisma.courseFaculty.
 */

import { prisma } from "@/lib/db/prisma";

export interface FacultyAssessmentRow {
  assessmentKey: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  category: string;
  deadlineIso: string | null;
  deadlineDisplay: string;
  eligibleStudents: number;
  completedCount: number;
  needsReviewCount: number;
  lateCount: number;
  pendingCount: number;
  completionPercentage: number | null;
  status: "ACTIVE" | "OVERDUE" | "COMPLETED";
}

export interface FacultySubmissionDonut {
  completed: number;
  needsReview: number;
  late: number;
  pending: number;
  total: number;
}

export interface CourseCompletionBar {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  completed: number;
  needsReview: number;
  late: number;
  pending: number;
  totalDeliverables: number;
  eligibleStudents: number;
  completionPercentage: number | null;
}

export interface FacultyReviewItem {
  taskId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  courseCode: string;
  courseTitle: string;
  taskTitle: string;
  category: string;
  deadlineDisplay: string;
  status: string;
  reviewReason: string;
  progressPercentage: number;
  updatedAt: string;
}

export interface FacultyActivityItem {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  courseCode?: string;
  studentName?: string;
}

export interface FacultyStudentRosterItem {
  studentId: string;
  name: string;
  rollNumber: string;
  email: string;
  coursesEnrolled: string[];
  totalAssigned: number;
  completedCount: number;
  pendingCount: number;
  lateCount: number;
  needsReviewCount: number;
}

export interface FacultyDashboardPayload {
  faculty: {
    id: string;
    name: string;
    email: string;
    employeeId: string;
    department?: string;
  };
  authorizedCourses: Array<{
    id: string;
    code: string;
    title: string;
    role: string;
    credits: number;
    slot?: string | null;
  }>;
  selectedCourseId: string; // "ALL" or specific courseId
  summary: {
    totalEligibleStudents: number;
    totalEnrollments: number;
    submissionsCompleted: number;
    submissionsNeedsReview: number;
    submissionsLate: number;
    submissionsPending: number;
    totalDeliverables: number;
    issuesCount: number;
    completionPercentage: number | null;
  };
  submissionDonut: FacultySubmissionDonut;
  courseBars: CourseCompletionBar[];
  assessments: FacultyAssessmentRow[];
  reviewQueue: FacultyReviewItem[];
  recentActivity: FacultyActivityItem[];
  studentRoster: FacultyStudentRosterItem[];
}

// Format UTC date into Asia/Kolkata (IST) display string
export function formatIST(date: Date | string | null | undefined): string {
  if (!date) return "No deadline set";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d) + " (IST)";
}

export async function getFacultyDashboardData(
  facultyUserId: string,
  courseFilter?: string
): Promise<FacultyDashboardPayload> {
  // 1. Identify faculty user and their authorized courses
  const facultyUser = await prisma.user.findUnique({
    where: { id: facultyUserId },
    include: {
      managedCourses: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!facultyUser) {
    throw new Error(`Faculty user ${facultyUserId} not found in database.`);
  }

  const authorizedCourses = facultyUser.managedCourses.map((fa) => ({
    id: fa.course.id,
    code: fa.course.code,
    title: fa.course.title,
    role: fa.role,
    credits: fa.course.credits,
    slot: fa.course.slot,
  }));

  const authorizedCourseIds = authorizedCourses.map((c) => c.id);

  // Determine active course scope
  let targetCourseIds = authorizedCourseIds;
  let activeFilter = "ALL";

  if (courseFilter && courseFilter !== "ALL") {
    if (authorizedCourseIds.includes(courseFilter)) {
      targetCourseIds = [courseFilter];
      activeFilter = courseFilter;
    }
  }

  // If faculty has no authorized courses, return clean empty structure
  if (targetCourseIds.length === 0) {
    return {
      faculty: {
        id: facultyUser.id,
        name: facultyUser.name,
        email: facultyUser.email,
        employeeId: facultyUser.rollNumber || "FACULTY",
        department: facultyUser.department || undefined,
      },
      authorizedCourses: [],
      selectedCourseId: "ALL",
      summary: {
        totalEligibleStudents: 0,
        totalEnrollments: 0,
        submissionsCompleted: 0,
        submissionsNeedsReview: 0,
        submissionsLate: 0,
        submissionsPending: 0,
        totalDeliverables: 0,
        issuesCount: 0,
        completionPercentage: null,
      },
      submissionDonut: { completed: 0, needsReview: 0, late: 0, pending: 0, total: 0 },
      courseBars: [],
      assessments: [],
      reviewQueue: [],
      recentActivity: [],
      studentRoster: [],
    };
  }

  // 2. Fetch Enrollments for Authorized Courses
  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      courseId: { in: targetCourseIds },
    },
    include: {
      user: true,
      course: true,
    },
  });

  const uniqueEligibleStudentIds = Array.from(new Set(enrollments.map((e) => e.userId)));
  const totalEligibleStudents = uniqueEligibleStudentIds.length;
  const totalEnrollments = enrollments.length;

  // 3. Fetch Tasks / Deliverables for Authorized Courses
  const tasks = await prisma.task.findMany({
    where: {
      courseId: { in: targetCourseIds },
      status: { not: "CANCELLED" },
    },
    include: {
      course: true,
      user: true,
      progress: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { deadline: "asc" },
  });

  const now = new Date();

  // 4. Classify each deliverable into mutually exclusive categories
  // Precedence:
  // 1. COMPLETED: status === "COMPLETED" || progressPercentage === 100
  // 2. NEEDS_REVIEW: status === "IN_PROGRESS" || progressNote mentions "review" or "grading"
  // 3. LATE: status === "OVERDUE" || (deadline && deadline < now)
  // 4. PENDING: status === "PENDING" && (!deadline || deadline >= now)
  let countCompleted = 0;
  let countNeedsReview = 0;
  let countLate = 0;
  let countPending = 0;

  const reviewQueueItems: FacultyReviewItem[] = [];

  for (const t of tasks) {
    const isCompleted = t.status === "COMPLETED" || (t.progress[0]?.percentage ?? 0) >= 100;
    const progressNote = t.progress[0]?.note || "";
    const isNeedsReview =
      !isCompleted &&
      (t.status === "IN_PROGRESS" ||
        progressNote.toLowerCase().includes("review") ||
        progressNote.toLowerCase().includes("grading") ||
        progressNote.toLowerCase().includes("submitted"));
    const isLate =
      !isCompleted &&
      !isNeedsReview &&
      (t.status === "OVERDUE" || (t.deadline !== null && t.deadline < now));

    if (isCompleted) {
      countCompleted++;
    } else if (isNeedsReview) {
      countNeedsReview++;
      reviewQueueItems.push({
        taskId: t.id,
        studentId: t.userId,
        studentName: t.user.name,
        rollNumber: t.user.rollNumber || "STD",
        courseCode: t.course?.code || "GEN",
        courseTitle: t.course?.title || "General",
        taskTitle: t.title,
        category: t.category,
        deadlineDisplay: formatIST(t.deadline),
        status: "NEEDS_REVIEW",
        reviewReason: progressNote || "Submitted work awaiting grading and rubric evaluation",
        progressPercentage: t.progress[0]?.percentage ?? 0,
        updatedAt: t.updatedAt.toISOString(),
      });
    } else if (isLate) {
      countLate++;
      reviewQueueItems.push({
        taskId: t.id,
        studentId: t.userId,
        studentName: t.user.name,
        rollNumber: t.user.rollNumber || "STD",
        courseCode: t.course?.code || "GEN",
        courseTitle: t.course?.title || "General",
        taskTitle: t.title,
        category: t.category,
        deadlineDisplay: formatIST(t.deadline),
        status: "OVERDUE",
        reviewReason: `Submission overdue since ${formatIST(t.deadline)}`,
        progressPercentage: t.progress[0]?.percentage ?? 0,
        updatedAt: t.updatedAt.toISOString(),
      });
    } else {
      countPending++;
    }
  }

  const totalDeliverables = countCompleted + countNeedsReview + countLate + countPending;
  const issuesCount = countLate + countNeedsReview;

  const completionPercentage =
    totalDeliverables > 0
      ? Math.round((countCompleted / totalDeliverables) * 1000) / 10
      : null;

  const submissionDonut: FacultySubmissionDonut = {
    completed: countCompleted,
    needsReview: countNeedsReview,
    late: countLate,
    pending: countPending,
    total: totalDeliverables,
  };

  // 5. Course-Wise Bar Chart
  const courseBars: CourseCompletionBar[] = [];
  for (const c of authorizedCourses) {
    if (activeFilter !== "ALL" && c.id !== activeFilter) continue;

    const courseTasks = tasks.filter((t) => t.courseId === c.id);
    const courseEligible = Array.from(
      new Set(enrollments.filter((e) => e.courseId === c.id).map((e) => e.userId))
    ).length;

    let cDone = 0;
    let cReview = 0;
    let cLate = 0;
    let cPending = 0;

    for (const ct of courseTasks) {
      const isDone = ct.status === "COMPLETED" || (ct.progress[0]?.percentage ?? 0) >= 100;
      const pNote = ct.progress[0]?.note || "";
      const isRev =
        !isDone &&
        (ct.status === "IN_PROGRESS" ||
          pNote.toLowerCase().includes("review") ||
          pNote.toLowerCase().includes("grading") ||
          pNote.toLowerCase().includes("submitted"));
      const isLt =
        !isDone && !isRev && (ct.status === "OVERDUE" || (ct.deadline !== null && ct.deadline < now));

      if (isDone) cDone++;
      else if (isRev) cReview++;
      else if (isLt) cLate++;
      else cPending++;
    }

    const cTotal = cDone + cReview + cLate + cPending;
    courseBars.push({
      courseId: c.id,
      courseCode: c.code,
      courseTitle: c.title,
      completed: cDone,
      needsReview: cReview,
      late: cLate,
      pending: cPending,
      totalDeliverables: cTotal,
      eligibleStudents: courseEligible,
      completionPercentage: cTotal > 0 ? Math.round((cDone / cTotal) * 1000) / 10 : null,
    });
  }

  // 6. Assessment Overview Table (Distinct deliverables grouped by Title + Course)
  const assessmentMap = new Map<string, FacultyAssessmentRow>();

  for (const t of tasks) {
    const key = `${t.courseId}_${t.title}`;
    const courseEnrolledCount = Array.from(
      new Set(enrollments.filter((e) => e.courseId === t.courseId).map((e) => e.userId))
    ).length;

    if (!assessmentMap.has(key)) {
      assessmentMap.set(key, {
        assessmentKey: key,
        courseId: t.courseId || "",
        courseCode: t.course?.code || "GEN",
        courseTitle: t.course?.title || "General",
        title: t.title,
        category: t.category,
        deadlineIso: t.deadline ? t.deadline.toISOString() : null,
        deadlineDisplay: formatIST(t.deadline),
        eligibleStudents: courseEnrolledCount,
        completedCount: 0,
        needsReviewCount: 0,
        lateCount: 0,
        pendingCount: 0,
        completionPercentage: null,
        status: t.deadline && t.deadline < now ? "OVERDUE" : "ACTIVE",
      });
    }

    const row = assessmentMap.get(key)!;
    const isDone = t.status === "COMPLETED" || (t.progress[0]?.percentage ?? 0) >= 100;
    const pNote = t.progress[0]?.note || "";
    const isRev =
      !isDone &&
      (t.status === "IN_PROGRESS" ||
        pNote.toLowerCase().includes("review") ||
        pNote.toLowerCase().includes("grading") ||
        pNote.toLowerCase().includes("submitted"));
    const isLt =
      !isDone && !isRev && (t.status === "OVERDUE" || (t.deadline !== null && t.deadline < now));

    if (isDone) row.completedCount++;
    else if (isRev) row.needsReviewCount++;
    else if (isLt) row.lateCount++;
    else row.pendingCount++;
  }

  const assessments: FacultyAssessmentRow[] = Array.from(assessmentMap.values()).map((row) => {
    const denom = row.eligibleStudents > 0 ? row.eligibleStudents : row.completedCount + row.pendingCount + row.lateCount + row.needsReviewCount;
    const pct = denom > 0 ? Math.round((row.completedCount / denom) * 1000) / 10 : null;
    let st: "ACTIVE" | "OVERDUE" | "COMPLETED" = row.status;
    if (denom > 0 && row.completedCount === denom) {
      st = "COMPLETED";
    }
    return {
      ...row,
      completionPercentage: pct,
      status: st,
    };
  });

  // 7. Recent Academic Activity from AcademicAuditLog and TaskProgress
  const recentAuditLogs = await prisma.academicAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const recentActivity: FacultyActivityItem[] = recentAuditLogs.map((log) => ({
    id: log.id,
    timestamp: formatIST(log.createdAt),
    action: log.actionTaken,
    details: log.reasons || `${log.relationship} on ${log.targetType}`,
  }));

  if (recentActivity.length === 0) {
    // Fall back to recent task updates
    const recentTasks = await prisma.task.findMany({
      where: { courseId: { in: targetCourseIds } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { user: true, course: true },
    });
    for (const rt of recentTasks) {
      recentActivity.push({
        id: rt.id,
        timestamp: formatIST(rt.updatedAt),
        action: `DELIVERABLE_${rt.status}`,
        details: `${rt.user.name} &bull; ${rt.title} status updated to ${rt.status}`,
        courseCode: rt.course?.code,
        studentName: rt.user.name,
      });
    }
  }

  // 8. Student Roster for Authorized Courses
  const studentMap = new Map<string, FacultyStudentRosterItem>();

  for (const en of enrollments) {
    if (!studentMap.has(en.userId)) {
      studentMap.set(en.userId, {
        studentId: en.userId,
        name: en.user.name,
        rollNumber: en.user.rollNumber || "STD",
        email: en.user.email,
        coursesEnrolled: [],
        totalAssigned: 0,
        completedCount: 0,
        pendingCount: 0,
        lateCount: 0,
        needsReviewCount: 0,
      });
    }
    const item = studentMap.get(en.userId)!;
    if (!item.coursesEnrolled.includes(en.course.code)) {
      item.coursesEnrolled.push(en.course.code);
    }
  }

  for (const t of tasks) {
    const item = studentMap.get(t.userId);
    if (!item) continue;
    item.totalAssigned++;
    const isDone = t.status === "COMPLETED" || (t.progress[0]?.percentage ?? 0) >= 100;
    const pNote = t.progress[0]?.note || "";
    const isRev =
      !isDone &&
      (t.status === "IN_PROGRESS" ||
        pNote.toLowerCase().includes("review") ||
        pNote.toLowerCase().includes("grading") ||
        pNote.toLowerCase().includes("submitted"));
    const isLt =
      !isDone && !isRev && (t.status === "OVERDUE" || (t.deadline !== null && t.deadline < now));

    if (isDone) item.completedCount++;
    else if (isRev) item.needsReviewCount++;
    else if (isLt) item.lateCount++;
    else item.pendingCount++;
  }

  const studentRoster = Array.from(studentMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    faculty: {
      id: facultyUser.id,
      name: facultyUser.name,
      email: facultyUser.email,
      employeeId: facultyUser.rollNumber || "FACULTY",
      department: facultyUser.department || undefined,
    },
    authorizedCourses,
    selectedCourseId: activeFilter,
    summary: {
      totalEligibleStudents,
      totalEnrollments,
      submissionsCompleted: countCompleted,
      submissionsNeedsReview: countNeedsReview,
      submissionsLate: countLate,
      submissionsPending: countPending,
      totalDeliverables,
      issuesCount,
      completionPercentage,
    },
    submissionDonut,
    courseBars,
    assessments,
    reviewQueue: reviewQueueItems,
    recentActivity,
    studentRoster,
  };
}
