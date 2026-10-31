import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getFacultyDashboardData } from "@/lib/services/faculty-dashboard.service";
import { getAuthenticatedUser } from "@/lib/auth/session-service";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/faculty-dashboard
 *
 * Strict faculty-only API route providing real submission counts,
 * reconciliation charts, and authorized course data.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get("academic_student_id")?.value;

    const authUser = await getAuthenticatedUser(req);
    const resolvedUserId = (authUser && authUser.role === "TEACHER") ? authUser.id : (cookieUserId || authUser?.id);

    if (!resolvedUserId) {
      return NextResponse.json(
        {
          error: "Forbidden: Faculty access required. Please sign in as a teacher.",
          role: "STUDENT",
        },
        { status: 403 }
      );
    }

    // Check DB directly or fallback to session
    let isTeacher = authUser?.role === "TEACHER";
    let facultyId = resolvedUserId;

    if (!isTeacher) {
      const dbUser = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { id: true, role: true },
      });
      if (dbUser && dbUser.role === "TEACHER") {
        isTeacher = true;
        facultyId = dbUser.id;
      } else {
        const session = getCurrentSession(resolvedUserId);
        if (session.role === "TEACHER") {
          isTeacher = true;
          facultyId = session.id;
        }
      }
    }

    // Enforce role authorization
    if (!isTeacher) {
      return NextResponse.json(
        {
          error: "Forbidden: Faculty access required. Students cannot access faculty submission intelligence.",
          role: "STUDENT",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const courseFilter = searchParams.get("courseId") || "ALL";

    const data = await getFacultyDashboardData(facultyId, courseFilter);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Error in /api/faculty-dashboard:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load faculty dashboard data" },
      { status: 500 }
    );
  }
}
