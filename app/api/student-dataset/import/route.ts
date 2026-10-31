import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/auth/session-service";
import { hashPassword } from "@/lib/auth/password";
import { cookies } from "next/headers";

interface ImportRow {
  studentId: string;
  studentName: string;
  email: string;
  courseCode: string;
  academicYear?: string;
  semester?: number;
  section?: string;
  enrollmentStatus?: string;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get("academic_student_id")?.value;
    const authUser = await getAuthenticatedUser(req);
    const resolvedUserId = (authUser && authUser.role === "TEACHER") ? authUser.id : (studentCookie || authUser?.id);

    let isTeacher = authUser?.role === "TEACHER";
    let facultyUserId = resolvedUserId || "";
    let facultyName = authUser?.name || "Faculty";
    let facultyEmail = authUser?.email || "faculty@academic.ai";

    if (!isTeacher && resolvedUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { id: true, name: true, email: true, role: true },
      });
      if (dbUser && dbUser.role === "TEACHER") {
        isTeacher = true;
        facultyUserId = dbUser.id;
        facultyName = dbUser.name;
        facultyEmail = dbUser.email;
      } else {
        const session = getCurrentSession(resolvedUserId);
        if (session.role === "TEACHER") {
          isTeacher = true;
          facultyUserId = session.id;
          facultyName = session.name;
          facultyEmail = session.email;
        }
      }
    }

    // Strict role check
    if (!isTeacher) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Only authorized faculty may execute dataset imports." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { rows, filename } = body as { rows: ImportRow[]; filename?: string };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No confirmed rows provided for import." },
        { status: 400 }
      );
    }

    // Pre-hash student password
    const defaultStudentPassword = await hashPassword("student123");

    // Fetch existing courses map
    const courses = await prisma.course.findMany({ select: { id: true, code: true } });
    const courseMap = new Map(courses.map((c) => [c.code.toUpperCase(), c.id]));

    let createdStudents = 0;
    let createdEnrollments = 0;
    let updatedEnrollments = 0;
    let skippedRows = 0;
    const errors: string[] = [];

    // Execute in transaction for safety
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const studentId = row.studentId.trim();
        const studentName = row.studentName.trim();
        const email = row.email.trim().toLowerCase();
        const courseCode = row.courseCode.trim().toUpperCase();
        const courseId = courseMap.get(courseCode);

        if (!studentId || !studentName || !email || !courseId) {
          skippedRows++;
          errors.push(`Skipped row: missing required identifiers for ${studentName || studentId || "Unknown"}`);
          continue;
        }

        // Upsert student User record
        let user = await tx.user.findFirst({
          where: {
            OR: [{ rollNumber: studentId }, { email: email }],
          },
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              name: studentName,
              email: email,
              rollNumber: studentId,
              role: "STUDENT",
              passwordHash: defaultStudentPassword,
              semester: row.semester || 8,
              program: "B.Tech Computer Science & Engineering",
            },
          });
          createdStudents++;

          // Initialize preferences for newly created student
          await tx.studentPreference.create({
            data: {
              userId: user.id,
              academicTimezone: "Asia/Kolkata",
              notificationLeadDays: 2,
              highWorkloadThreshold: 4,
            },
          });
        } else {
          // Update name if student was updated
          await tx.user.update({
            where: { id: user.id },
            data: {
              name: studentName,
              semester: row.semester || user.semester,
            },
          });
        }

        // Check if enrollment already exists
        const existingEnrollment = await tx.courseEnrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: courseId,
            },
          },
        });

        // Compute realistic initial progress (e.g. 50-85% for demonstration)
        const progressVal = Math.floor(55 + Math.random() * 35);

        if (!existingEnrollment) {
          await tx.courseEnrollment.create({
            data: {
              userId: user.id,
              courseId: courseId,
              section: row.section || "A",
              academicYear: row.academicYear || "2025-2026",
              semester: row.semester || user.semester || 8,
              enrollmentStatus: row.enrollmentStatus || "ACTIVE",
              progress: progressVal,
            },
          });
          createdEnrollments++;
        } else {
          await tx.courseEnrollment.update({
            where: { id: existingEnrollment.id },
            data: {
              section: row.section || existingEnrollment.section,
              academicYear: row.academicYear || existingEnrollment.academicYear,
              semester: row.semester || existingEnrollment.semester,
              enrollmentStatus: row.enrollmentStatus || existingEnrollment.enrollmentStatus,
            },
          });
          updatedEnrollments++;
        }
      }

      // Log import into DatasetImport audit table
      await tx.datasetImport.create({
        data: {
          facultyId: facultyUserId,
          filename: filename || "students_dataset.csv",
          totalRows: rows.length,
          validRows: rows.length - skippedRows,
          createdStudents,
          createdEnrollments,
          skippedRows,
          status: skippedRows === 0 ? "COMPLETED" : "PARTIAL",
          summary: JSON.stringify({
            createdStudents,
            createdEnrollments,
            updatedEnrollments,
            skippedRows,
            facultyName: facultyName,
            facultyEmail: facultyEmail,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Student dataset successfully imported and reconciled into active database.",
      results: {
        totalProcessed: rows.length,
        createdStudents,
        createdEnrollments,
        updatedEnrollments,
        skippedRows,
        errors,
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/student-dataset/import:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to commit student dataset import" },
      { status: 500 }
    );
  }
}
