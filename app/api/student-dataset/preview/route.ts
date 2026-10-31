import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/auth/session-service";
import { cookies } from "next/headers";

interface RawRow {
  student_id?: string;
  student_name?: string;
  email?: string;
  course_code?: string;
  academic_year?: string;
  semester?: string | number;
  section?: string;
  enrollment_status?: string;
  [key: string]: any;
}

export interface ValidatedPreviewRow {
  index: number;
  studentId: string;
  studentName: string;
  email: string;
  courseCode: string;
  academicYear: string;
  semester: number;
  section: string;
  enrollmentStatus: string;
  isValid: boolean;
  isExistingStudent: boolean;
  isDuplicateInFile: boolean;
  courseExists: boolean;
  errors: string[];
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get("academic_student_id")?.value;
    const authUser = await getAuthenticatedUser(req);
    const resolvedUserId = (authUser && authUser.role === "TEACHER") ? authUser.id : (studentCookie || authUser?.id);

    let isTeacher = authUser?.role === "TEACHER";

    if (!isTeacher && resolvedUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { id: true, role: true },
      });
      if (dbUser && dbUser.role === "TEACHER") {
        isTeacher = true;
      } else {
        const session = getCurrentSession(resolvedUserId);
        if (session.role === "TEACHER") {
          isTeacher = true;
        }
      }
    }

    // Strict role check
    if (!isTeacher) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Only authorized faculty may import datasets." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { rows, filename } = body as { rows: RawRow[]; filename?: string };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "The uploaded dataset contains no rows or is improperly formatted." },
        { status: 400 }
      );
    }

    // Limit file size to 1000 rows for local university safety
    if (rows.length > 1000) {
      return NextResponse.json(
        { success: false, error: "Dataset exceeds maximum allowed limit of 1000 rows per batch." },
        { status: 400 }
      );
    }

    // Fetch existing courses and existing student IDs from database for fast lookup
    const [existingCourses, existingUsers] = await Promise.all([
      prisma.course.findMany({ select: { id: true, code: true } }),
      prisma.user.findMany({
        where: { role: "STUDENT" },
        select: { id: true, email: true, rollNumber: true },
      }),
    ]);

    const courseMap = new Map(existingCourses.map((c) => [c.code.toUpperCase(), c.id]));
    const existingRollMap = new Set(existingUsers.map((u) => (u.rollNumber || "").toUpperCase()));
    const existingEmailMap = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const seenInFile = new Set<string>(); // composite key of student_id + course_code
    const validatedRows: ValidatedPreviewRow[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let newStudentsCount = 0;
    let existingStudentsCount = 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const errors: string[] = [];

      const studentId = String(raw.student_id || raw.roll_number || raw.id || "").trim();
      const studentName = String(raw.student_name || raw.name || "").trim();
      const email = String(raw.email || "").trim().toLowerCase();
      const courseCode = String(raw.course_code || raw.course || "").trim().toUpperCase();
      const academicYear = String(raw.academic_year || "2025-2026").trim();
      const semesterNum = parseInt(String(raw.semester || 8), 10) || 8;
      const section = String(raw.section || "A").trim().toUpperCase();
      const enrollmentStatus = String(raw.enrollment_status || "ACTIVE").trim().toUpperCase();

      // Validation 1: Required Student ID
      if (!studentId) {
        errors.push("Missing required Student ID / Roll Number");
      }

      // Validation 2: Required Student Name
      if (!studentName) {
        errors.push("Missing required Student Name");
      }

      // Validation 3: Valid Email
      if (!email) {
        errors.push("Missing required Student Email");
      } else if (!emailRegex.test(email)) {
        errors.push(`Invalid email format: "${email}"`);
      }

      // Validation 4: Course Code exists
      if (!courseCode) {
        errors.push("Missing required Course Code");
      } else if (!courseMap.has(courseCode)) {
        errors.push(`Course Code "${courseCode}" does not exist in academic course registry`);
      }

      // Validation 5: Duplicate check within file
      const compositeKey = `${studentId.toUpperCase()}::${courseCode}`;
      let isDuplicateInFile = false;
      if (seenInFile.has(compositeKey)) {
        errors.push(`Duplicate enrollment for student ${studentId} in course ${courseCode} within this CSV`);
        isDuplicateInFile = true;
      } else {
        seenInFile.add(compositeKey);
      }

      // Validation 6: Enrollment status
      const validStatuses = ["ACTIVE", "DROPPED", "AUDIT"];
      if (!validStatuses.includes(enrollmentStatus)) {
        errors.push(`Invalid enrollment status "${enrollmentStatus}". Expected ACTIVE, DROPPED, or AUDIT`);
      }

      const isExistingStudent =
        existingRollMap.has(studentId.toUpperCase()) || existingEmailMap.has(email);

      const isValid = errors.length === 0;

      if (isValid) {
        validCount++;
        if (isExistingStudent) {
          existingStudentsCount++;
        } else {
          newStudentsCount++;
        }
      } else {
        invalidCount++;
      }

      validatedRows.push({
        index: i + 1,
        studentId,
        studentName,
        email,
        courseCode,
        academicYear,
        semester: semesterNum,
        section,
        enrollmentStatus,
        isValid,
        isExistingStudent,
        isDuplicateInFile,
        courseExists: courseMap.has(courseCode),
        errors,
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        filename: filename || "students_dataset.csv",
        totalRows: rows.length,
        validRows: validCount,
        invalidRows: invalidCount,
        newStudentsCount,
        existingStudentsCount,
        availableCourses: Array.from(courseMap.keys()),
      },
      previewRows: validatedRows.slice(0, 50), // Return first 50 rows for review
      allValid: invalidCount === 0,
    });
  } catch (error: any) {
    console.error("Error in POST /api/student-dataset/preview:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to validate dataset preview" },
      { status: 500 }
    );
  }
}
