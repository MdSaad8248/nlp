import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session-service";
import { getCurrentSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { formatIST } from "@/lib/services/faculty-dashboard.service";

export const dynamic = "force-dynamic";

/**
 * Helper to resolve the authenticated faculty member from session or cookie.
 */
async function getAuthorizedFaculty(req: NextRequest) {
  const cookieStore = await cookies();
  const cookieUserId = cookieStore.get("academic_student_id")?.value;
  const authUser = await getAuthenticatedUser(req);
  const resolvedUserId = (authUser && authUser.role === "TEACHER") ? authUser.id : (cookieUserId || authUser?.id);

  if (!resolvedUserId) return null;

  // Verify faculty identity in database
  const facultyUser = await prisma.user.findUnique({
    where: { id: resolvedUserId },
    include: {
      managedCourses: {
        include: { course: true },
      },
    },
  });

  if (!facultyUser) {
    const session = getCurrentSession(resolvedUserId);
    if (session.role !== "TEACHER") return null;
    const fallbackUser = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        managedCourses: {
          include: { course: true },
        },
      },
    });
    if (!fallbackUser || fallbackUser.role !== "TEACHER") return null;
    const authorizedCourses = fallbackUser.managedCourses.map((mc) => ({
      id: mc.course.id,
      code: mc.course.code,
      title: mc.course.title,
      credits: mc.course.credits,
      slot: mc.course.slot,
    }));
    return {
      facultyUser: fallbackUser,
      authorizedCourses,
      authorizedCourseIds: authorizedCourses.map((c) => c.id),
    };
  }

  if (facultyUser.role !== "TEACHER") return null;

  const authorizedCourses = facultyUser.managedCourses.map((mc) => ({
    id: mc.course.id,
    code: mc.course.code,
    title: mc.course.title,
    credits: mc.course.credits,
    slot: mc.course.slot,
  }));

  return {
    facultyUser,
    authorizedCourses,
    authorizedCourseIds: authorizedCourses.map((c) => c.id),
  };
}

/**
 * GET /api/submissions
 *
 * Scoped query of student assessment submissions strictly for courses the faculty member manages.
 * Supports filters: courseId, status (ALL, NEEDS_REVIEW, COMPLETED, LATE, PENDING), and search.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthorizedFaculty(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Faculty authentication required." },
        { status: 403 }
      );
    }

    const { authorizedCourses, authorizedCourseIds } = auth;

    if (authorizedCourseIds.length === 0) {
      return NextResponse.json({
        success: true,
        authorizedCourses: [],
        submissions: [],
        counts: { total: 0, needsReview: 0, completed: 0, late: 0, pending: 0 },
      });
    }

    const { searchParams } = new URL(req.url);
    const courseIdParam = searchParams.get("courseId");
    const statusParam = searchParams.get("status") || "ALL";
    const searchQuery = searchParams.get("search")?.trim().toLowerCase();

    // Verify course scope authorization if specific course requested
    let targetCourseIds = authorizedCourseIds;
    if (courseIdParam && courseIdParam !== "ALL") {
      if (!authorizedCourseIds.includes(courseIdParam)) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You are not authorized to view submissions for this course." },
          { status: 403 }
        );
      }
      targetCourseIds = [courseIdParam];
    }

    // Fetch deliverables/tasks for authorized courses
    const allTasks = await prisma.task.findMany({
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
        rubrics: {
          take: 1,
        },
      },
      orderBy: { deadline: "asc" },
    });

    const now = new Date();

    // Classify into canonical categories
    const categorized = allTasks.map((t) => {
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
      const isPending = !isCompleted && !isNeedsReview && !isLate;

      let canonicalStatus = "PENDING";
      if (isCompleted) canonicalStatus = "COMPLETED";
      else if (isNeedsReview) canonicalStatus = "NEEDS_REVIEW";
      else if (isLate) canonicalStatus = "LATE";

      return {
        id: t.id,
        taskId: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        deadline: t.deadline?.toISOString() || null,
        deadlineDisplay: formatIST(t.deadline),
        normalizedDeadline: t.normalizedDeadline,
        priority: t.priority,
        rawStatus: t.status,
        canonicalStatus,
        submissionPlatform: t.submissionPlatform || "VTOP",
        weightage: t.weightage,
        student: {
          id: t.user.id,
          name: t.user.name,
          email: t.user.email,
          rollNumber: t.user.rollNumber || "STUDENT",
          program: t.user.program || "B.Tech CSE",
          semester: t.user.semester,
        },
        course: {
          id: t.course?.id || "",
          code: t.course?.code || "N/A",
          title: t.course?.title || "N/A",
        },
        progress: {
          percentage: t.progress[0]?.percentage ?? (isCompleted ? 100 : 0),
          note: progressNote,
          updatedAt: t.progress[0]?.updatedAt?.toISOString() || t.updatedAt.toISOString(),
        },
        rubric: t.rubrics[0]
          ? {
              id: t.rubrics[0].id,
              title: t.rubrics[0].title,
              totalMarks: t.rubrics[0].totalMarks,
            }
          : null,
      };
    });

    // Counts across all items in active course filter
    const counts = {
      total: categorized.length,
      needsReview: categorized.filter((c) => c.canonicalStatus === "NEEDS_REVIEW").length,
      completed: categorized.filter((c) => c.canonicalStatus === "COMPLETED").length,
      late: categorized.filter((c) => c.canonicalStatus === "LATE").length,
      pending: categorized.filter((c) => c.canonicalStatus === "PENDING").length,
    };

    // Apply status filter
    let filtered = categorized;
    if (statusParam && statusParam !== "ALL") {
      filtered = filtered.filter((item) => item.canonicalStatus === statusParam);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery) ||
          item.student.name.toLowerCase().includes(searchQuery) ||
          item.student.rollNumber.toLowerCase().includes(searchQuery) ||
          item.course.code.toLowerCase().includes(searchQuery) ||
          item.course.title.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      authorizedCourses,
      submissions: filtered,
      counts,
    });
  } catch (err: any) {
    console.error("Error in GET /api/submissions:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load submissions" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/submissions
 *
 * Allows authorized faculty to review, grade, or update a student submission.
 * Validates course-level authorization before updating the database.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthorizedFaculty(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Faculty authentication required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { taskId, status, percentage, feedback, marks } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: taskId." },
        { status: 400 }
      );
    }

    // Lookup task and ensure it exists and belongs to a course the faculty manages
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { course: true, user: true },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Submission not found." },
        { status: 404 }
      );
    }

    if (!task.courseId || !auth.authorizedCourseIds.includes(task.courseId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to grade submissions for this course." },
        { status: 403 }
      );
    }

    // Determine new status and progress
    const newStatus = status || (percentage >= 100 ? "COMPLETED" : "IN_PROGRESS");
    const progressPercentage = typeof percentage === "number" ? Math.min(100, Math.max(0, percentage)) : 100;
    const progressNote = feedback
      ? `Graded by ${auth.facultyUser.name}: ${feedback}${marks !== undefined ? ` [Score: ${marks}]` : ""}`
      : `Reviewed and graded by ${auth.facultyUser.name}`;

    // Update task status
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    // Create or update latest progress record
    const existingProgress = await prisma.taskProgress.findFirst({
      where: { taskId },
      orderBy: { updatedAt: "desc" },
    });

    if (existingProgress) {
      await prisma.taskProgress.update({
        where: { id: existingProgress.id },
        data: {
          percentage: progressPercentage,
          note: progressNote,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.taskProgress.create({
        data: {
          taskId,
          percentage: progressPercentage,
          note: progressNote,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated submission for ${task.user.name} (${task.title})`,
      taskId,
      newStatus,
      progressPercentage,
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/submissions:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update submission" },
      { status: 500 }
    );
  }
}
