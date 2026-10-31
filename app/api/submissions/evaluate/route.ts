import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session-service";
import { getCurrentSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import {
  evaluateSubmissionWithRubric,
  getSampleCapstoneReportText,
  RubricCriterionInput,
} from "@/lib/ai/gemini-evaluator";

export const dynamic = "force-dynamic";

/**
 * Helper to authenticate and authorize the faculty member.
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
    const authorizedCourseIds = fallbackUser.managedCourses.map((mc) => mc.course.id);
    return { facultyUser: fallbackUser, authorizedCourseIds };
  }

  if (facultyUser.role !== "TEACHER") return null;

  const authorizedCourseIds = facultyUser.managedCourses.map((mc) => mc.course.id);
  return { facultyUser, authorizedCourseIds };
}

/**
 * POST /api/submissions/evaluate
 *
 * Runs structured, rubric-guided AI evaluation on a student submission.
 * Enforces course-level authorization, loads rubric criteria, and evaluates
 * using Gemini 3.8 Flash (or deterministic fallback engine).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthorizedFaculty(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Faculty authentication required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { taskId, documentText: customText, criteria: customCriteria } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: taskId." },
        { status: 400 }
      );
    }

    // Lookup task with course, student, progress, and rubric relations
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Submission task not found." },
        { status: 404 }
      );
    }

    // Verify course authorization
    if (!task.courseId || !auth.authorizedCourseIds.includes(task.courseId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not authorized to evaluate submissions for this course." },
        { status: 403 }
      );
    }

    const courseCode = task.course?.code || "CSE4001";
    const courseTitle = task.course?.title || "Computer Science";
    const studentName = task.user?.name || "Student";
    const studentRollNumber = task.user?.rollNumber || "22BDS0001";
    const taskTitle = task.title;

    // Resolve Rubric Criteria
    let criteria: RubricCriterionInput[] = [];
    let rubricTitle = `${courseCode} Rubric`;
    let rubricTotalMarks = 100;

    if (Array.isArray(customCriteria) && customCriteria.length > 0) {
      criteria = customCriteria;
    } else if (task.rubrics && task.rubrics.length > 0) {
      const dbRubric = task.rubrics[0];
      rubricTitle = dbRubric.title;
      rubricTotalMarks = dbRubric.totalMarks;
      try {
        criteria = JSON.parse(dbRubric.criteriaJson);
      } catch {}
    } else {
      // Find rubric for this course
      const dbRubric = await prisma.rubric.findFirst({
        where: {
          OR: [
            { courseId: task.courseId },
            { courseCode: courseCode },
          ],
        },
        orderBy: { updatedAt: "desc" },
      });

      if (dbRubric) {
        rubricTitle = dbRubric.title;
        rubricTotalMarks = dbRubric.totalMarks;
        try {
          criteria = JSON.parse(dbRubric.criteriaJson);
        } catch {}
      }
    }

    // If no rubric found, use standard academic capstone rubric
    if (!criteria || criteria.length === 0) {
      criteria = [
        { id: "crit-1", title: "Problem Definition & Literature Survey", marks: 20, description: "Clear domain scope, problem articulation, and contemporary references." },
        { id: "crit-2", title: "Methodology & Architecture Design", marks: 25, description: "Rigorous pipeline specification, mathematical formulations, and diagrams." },
        { id: "crit-3", title: "Empirical Implementation & Code Quality", marks: 25, description: "Executable implementation, modular code, reproducible scripts." },
        { id: "crit-4", title: "Evaluation Metrics & Error Analysis", marks: 20, description: "Quantitative metrics, confusion matrix, and failure mode analysis." },
        { id: "crit-5", title: "Technical Report & Presentation", marks: 10, description: "IEEE format document, concise writing, honest disclosure of limitations." },
      ];
    }

    // Determine document text to evaluate
    let documentText: string;
    if (customText !== undefined) {
      const nonPrintableCount = typeof customText === "string" ? (customText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length : 0;
      const isUnreadable =
        !customText ||
        typeof customText !== "string" ||
        customText.trim().length < 50 ||
        nonPrintableCount > 0 ||
        customText.includes("[UNREADABLE]");

      if (isUnreadable) {
        return NextResponse.json(
          {
            success: false,
            error: "The provided document is unreadable, corrupt, or contains insufficient text for rubric evaluation.",
            code: "DOCUMENT_UNREADABLE",
          },
          { status: 422 }
        );
      }
      documentText = customText.trim();
    } else {
      documentText = getSampleCapstoneReportText(courseCode, taskTitle, studentName);
    }

    // Run AI Evaluation
    const evaluation = await evaluateSubmissionWithRubric({
      documentText,
      rubricCriteria: criteria,
      courseCode,
      taskTitle,
      studentName,
      studentRollNumber,
      totalMarks: rubricTotalMarks,
    });

    return NextResponse.json({
      success: true,
      taskId: task.id,
      taskTitle: task.title,
      student: {
        id: task.user.id,
        name: task.user.name,
        email: task.user.email,
        rollNumber: task.user.rollNumber || "22BDS0001",
        program: task.user.program || "B.Tech CSE",
      },
      course: {
        id: task.course?.id,
        code: courseCode,
        title: courseTitle,
      },
      rubric: {
        title: rubricTitle,
        totalMarks: rubricTotalMarks,
        criteriaCount: criteria.length,
      },
      evaluation,
    });
  } catch (err: any) {
    console.error("Error in POST /api/submissions/evaluate:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to evaluate submission." },
      { status: 500 }
    );
  }
}
