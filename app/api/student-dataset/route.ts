import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/auth/session-service";
import { cookies } from "next/headers";
import { hashPassword } from "@/lib/auth/password";

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
      authorizedCourseCodes: authorizedCourses.map((c) => c.code),
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
    authorizedCourseCodes: authorizedCourses.map((c) => c.code),
  };
}

/**
 * GET /api/student-dataset
 * Secure endpoint for authorized faculty to query and filter student records strictly for their assigned courses.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthorizedFaculty(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Only authorized faculty may view student roster records." },
        { status: 403 }
      );
    }

    const { authorizedCourses, authorizedCourseIds, authorizedCourseCodes } = auth;

    if (authorizedCourseIds.length === 0) {
      return NextResponse.json({
        success: true,
        totalCount: 0,
        records: [],
        filters: {
          courses: [],
          sections: [],
          semesters: [1, 2, 3, 4, 5, 6, 7, 8],
          statuses: ["ACTIVE", "DROPPED", "AUDIT"],
        },
        recentImports: [],
      });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const requestedCourseCode = searchParams.get("courseCode")?.trim() || "";
    const section = searchParams.get("section")?.trim() || "";
    const semester = searchParams.get("semester") ? parseInt(searchParams.get("semester")!, 10) : undefined;
    const status = searchParams.get("status")?.trim().toUpperCase() || "";

    // Verify course scope authorization if specific course requested
    let targetCourseIds = authorizedCourseIds;
    if (requestedCourseCode && requestedCourseCode !== "ALL") {
      if (!authorizedCourseCodes.includes(requestedCourseCode)) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You are not authorized to view student roster for this course." },
          { status: 403 }
        );
      }
      const matched = authorizedCourses.find((c) => c.code === requestedCourseCode);
      if (matched) {
        targetCourseIds = [matched.id];
      }
    }

    // Query enrollments scoped strictly to faculty's authorized courses
    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        courseId: { in: targetCourseIds },
        user: {
          role: "STUDENT",
          ...(search
            ? {
              OR: [
                { name: { contains: search } },
                { rollNumber: { contains: search } },
                { email: { contains: search } },
              ],
            }
            : {}),
        },
        section: section ? section : undefined,
        semester: semester ? semester : undefined,
        enrollmentStatus: status ? status : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            program: true,
            semester: true,
            department: true,
            tasks: {
              where: {
                courseId: { in: targetCourseIds },
              },
              select: {
                id: true,
                status: true,
                category: true,
              },
            },
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            credits: true,
            color: true,
          },
        },
      },
      orderBy: [
        { course: { code: "asc" } },
        { user: { rollNumber: "asc" } },
      ],
    });

    // Query distinct available sections and import history for this faculty
    const [allSections, importHistory] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { courseId: { in: targetCourseIds } },
        select: { section: true },
        distinct: ["section"],
      }),
      prisma.datasetImport.findMany({
        where: { facultyId: auth.facultyUser.id },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const formattedRecords = enrollments.map((e) => {
      const studentTasks = e.user.tasks || [];
      const completedTasks = studentTasks.filter((t) => t.status === "COMPLETED").length;
      const pendingTasks = studentTasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS").length;
      const overdueTasks = studentTasks.filter((t) => t.status === "OVERDUE").length;

      return {
        enrollmentId: e.id,
        studentId: e.user.rollNumber || e.user.id.slice(0, 8),
        userId: e.user.id,
        name: e.user.name,
        email: e.user.email,
        courseCode: e.course.code,
        courseTitle: e.course.title,
        courseColor: e.course.color,
        section: e.section || "A",
        semester: e.semester || e.user.semester || 8,
        academicYear: e.academicYear || "2025-2026",
        status: e.enrollmentStatus || "ACTIVE",
        progress: e.progress || 0,
        enrolledAt: e.createdAt,
        submissionsCount: {
          total: studentTasks.length,
          completed: completedTasks,
          pending: pendingTasks,
          overdue: overdueTasks,
        },
      };
    });

    return NextResponse.json({
      success: true,
      totalCount: formattedRecords.length,
      records: formattedRecords,
      filters: {
        courses: authorizedCourses,
        sections: allSections.map((s) => s.section).filter(Boolean),
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        statuses: ["ACTIVE", "DROPPED", "AUDIT"],
      },
      recentImports: importHistory,
    });
  } catch (error: any) {
    console.error("Error in GET /api/student-dataset:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve student roster records" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student-dataset
 * Bulk CSV import of students into a course managed by the authenticated faculty member.
 * Validates course permissions, avoids duplicates, and creates records in safe transactions.
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
    const { courseCode, rows, filename } = body;

    if (!courseCode || !auth.authorizedCourseCodes.includes(courseCode)) {
      return NextResponse.json(
        { success: false, error: `Forbidden: You are not authorized to enroll students in course ${courseCode}.` },
        { status: 403 }
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payload: 'rows' array with at least 1 student row is required." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { code: courseCode },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: `Course ${courseCode} not found in database.` },
        { status: 404 }
      );
    }

    const defaultPasswordHash = await hashPassword("student123");

    let createdStudents = 0;
    let createdEnrollments = 0;
    let skippedRows = 0;
    const errors: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const rollNumber = (row.rollNumber || row.studentId || "").trim();
        const email = (row.email || "").trim().toLowerCase();
        const name = (row.name || row.studentName || "").trim();
        const section = (row.section || "A").trim().toUpperCase();
        const semester = parseInt(row.semester, 10) || 8;

        if (!rollNumber || !email || !name) {
          skippedRows++;
          errors.push(`Row ${idx + 1}: Missing required fields (rollNumber, email, or name).`);
          continue;
        }

        // Upsert student user
        let user = await tx.user.findFirst({
          where: {
            OR: [{ rollNumber }, { email }],
          },
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              name,
              email,
              rollNumber,
              role: "STUDENT",
              passwordHash: defaultPasswordHash,
              program: row.program || "B.Tech Computer Science & Engineering",
              semester,
              department: "School of Computer Science & Engineering",
            },
          });
          createdStudents++;
        }

        // Check enrollment
        const existingEnrollment = await tx.courseEnrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id,
            },
          },
        });

        if (!existingEnrollment) {
          await tx.courseEnrollment.create({
            data: {
              userId: user.id,
              courseId: course.id,
              section,
              semester,
              progress: 0,
              enrollmentStatus: "ACTIVE",
            },
          });
          createdEnrollments++;
        } else {
          skippedRows++;
        }
      }

      // Record import audit
      await tx.datasetImport.create({
        data: {
          facultyId: auth.facultyUser.id,
          filename: filename || `roster_${courseCode}_${Date.now()}.csv`,
          totalRows: rows.length,
          validRows: createdEnrollments,
          createdStudents,
          createdEnrollments,
          skippedRows,
          status: errors.length > 0 && createdEnrollments === 0 ? "FAILED" : "COMPLETED",
          summary: `Course: ${courseCode} | Created ${createdStudents} students, ${createdEnrollments} enrollments, skipped ${skippedRows}.`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Roster import completed for ${courseCode}.`,
      summary: {
        totalRows: rows.length,
        createdStudents,
        createdEnrollments,
        skippedRows,
        errors,
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/student-dataset:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process roster import." },
      { status: 500 }
    );
  }
}
