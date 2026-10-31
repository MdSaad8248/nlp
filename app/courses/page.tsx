import Shell from "@/components/layout/Shell";
import { BookOpen, User, Clock, CheckSquare, Calendar, ArrowRight, Plus, GraduationCap, Users, FileCheck2 } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { ensureDefaultUserAndCourses } from "@/lib/services/user.service";
import { formatTaskTitle } from "@/lib/utils/formatters";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/auth/session-service";
import { cookies } from "next/headers";

export default async function CoursesPage() {
  await ensureDefaultUserAndCourses();

  const authUser = await getAuthenticatedUser();
  const cookieStore = await cookies();
  const studentCookie = cookieStore.get("academic_student_id")?.value;
  const session = authUser
    ? {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role as "STUDENT" | "TEACHER",
        rollNumber: authUser.rollNumber || "",
        program: authUser.program || "",
      }
    : getCurrentSession(studentCookie);
  const isTeacher = session.role === "TEACHER";

  // Filter courses based on user role authorization
  let courses: any[] = [];

  if (isTeacher) {
    // Teacher sees only assigned courses
    courses = await prisma.course.findMany({
      where: {
        facultyMembers: {
          some: { userId: session.id },
        },
      },
      include: {
        enrollments: {
          include: { user: true },
        },
        tasks: {
          include: { user: true, progress: true },
          orderBy: { deadline: "asc" },
        },
        events: {
          orderBy: { startTime: "asc" },
        },
      },
      orderBy: { code: "asc" },
    });
  } else {
    // Student sees only enrolled courses
    courses = await prisma.course.findMany({
      where: {
        enrollments: {
          some: { userId: session.id },
        },
      },
      include: {
        tasks: {
          where: {
            userId: session.id,
            status: { not: "COMPLETED" },
          },
          orderBy: { deadline: "asc" },
        },
        events: {
          where: { userId: session.id },
          orderBy: { startTime: "asc" },
        },
      },
      orderBy: { code: "asc" },
    });
  }

  return (
    <Shell>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
              {isTeacher ? "Assigned Courses & Curriculum" : "My Enrolled Courses & Curriculum"}
            </h1>
            <span className="badge badge-indigo">
              {courses.length} {isTeacher ? "Assigned" : "Enrolled"}
            </span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            {isTeacher
              ? `Authorized course management, student cohort rosters, and deliverables for ${session.name}.`
              : `Active course enrollments, faculty information, personal deliverables, and lecture slots for ${session.name}.`}
          </p>
        </div>

        <Link href="/inbox" className="btn btn-primary btn-sm">
          <Plus size={14} />
          <span>Ingest Notice</span>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
          }}
        >
          <BookOpen size={32} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {isTeacher ? "No courses currently assigned" : "No active course enrollments"}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            {isTeacher
              ? "You have not been assigned to any course faculty records."
              : "You are not currently enrolled in any academic courses."}
          </p>
        </div>
      ) : (
        /* Course Cards Grid */
        <div className="grid-2col" style={{ marginBottom: "1.5rem" }}>
          {courses.map((course) => {
            if (isTeacher) {
              const enrolledStudentsCount = course.enrollments?.length || 0;
              const allTasks = course.tasks || [];
              const completedCount = allTasks.filter(
                (t: any) => t.status === "COMPLETED" || (t.progress?.[0]?.percentage ?? 0) >= 100
              ).length;
              const needsReviewCount = allTasks.filter(
                (t: any) =>
                  t.status === "IN_PROGRESS" ||
                  t.progress?.[0]?.note?.toLowerCase().includes("review") ||
                  t.progress?.[0]?.note?.toLowerCase().includes("grading")
              ).length;
              const lateCount = allTasks.filter(
                (t: any) =>
                  t.status === "OVERDUE" ||
                  (t.deadline && new Date(t.deadline) < new Date() && t.status !== "COMPLETED")
              ).length;

              return (
                <div
                  key={course.id}
                  className="card-clean"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderTop: `3px solid ${course.color || "var(--accent-primary)"}`,
                    padding: "1.25rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span className="badge badge-indigo" style={{ fontSize: "0.72rem" }}>
                            {course.code}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                            {course.credits} Credits
                          </span>
                        </div>
                        <h2 style={{ fontSize: "1.08rem", fontWeight: 700, marginTop: "0.35rem", color: "var(--text-primary)" }}>
                          {course.title}
                        </h2>
                      </div>

                      {course.slot && (
                        <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                          Slot: {course.slot}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                      <User size={13} />
                      <span>Role: <strong>Primary Instructor</strong> &bull; Department of Computing</span>
                    </div>

                    {/* Faculty metrics pill row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                      <div style={{ padding: "0.6rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", fontSize: "0.75rem" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Enrolled Cohort</div>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginTop: "0.1rem" }}>
                          {enrolledStudentsCount}
                        </div>
                      </div>

                      <div style={{ padding: "0.6rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", fontSize: "0.75rem" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Completed</div>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#10B981", marginTop: "0.1rem" }}>
                          {completedCount}
                        </div>
                      </div>

                      <div style={{ padding: "0.6rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", fontSize: "0.75rem" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Review / Late</div>
                        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: lateCount > 0 ? "var(--priority-critical)" : "var(--accent-primary)", marginTop: "0.1rem" }}>
                          {needsReviewCount + lateCount}
                        </div>
                      </div>
                    </div>

                    {/* Active Course Deliverables */}
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                        Course Assessments Tracked ({allTasks.length})
                      </div>
                      {allTasks.length === 0 ? (
                        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.4rem 0" }}>
                          No deliverables registered for this course.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                          {allTasks.slice(0, 3).map((t: any) => (
                            <div
                              key={t.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "0.78rem",
                                padding: "0.4rem 0",
                                borderBottom: "1px solid var(--border-subtle)",
                              }}
                            >
                              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                                {t.user?.name ? `${t.user.name}: ` : ""}{formatTaskTitle(t.title, course.code)}
                              </span>
                              <span className={`badge ${t.status === "COMPLETED" ? "badge-low" : t.status === "OVERDUE" ? "badge-critical" : "badge-medium"}`}>
                                {t.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Faculty Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "1.25rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <Link href={`/syllabus?courseCode=${course.code}`} className="btn btn-outline btn-sm" title="View Syllabus">
                        <span>Syllabus</span>
                      </Link>
                      <Link href={`/faculty-dataset?courseCode=${course.code}`} className="btn btn-outline btn-sm" title="View Enrolled Roster">
                        <span>Roster</span>
                      </Link>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <Link href={`/submissions?courseId=${course.id}`} className="btn btn-secondary btn-sm">
                        <span>Submissions ({allTasks.length})</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            // Student View
            const activeTasks = course.tasks || [];
            const totalHours = activeTasks.reduce(
              (acc: number, t: any) => acc + (t.category === "PROJECT" ? 8 : t.category === "EXAM" ? 10 : 4),
              0
            );
            const nextEvent = course.events?.[0];

            return (
              <div
                key={course.id}
                className="card-clean"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderTop: `3px solid ${course.color || "var(--accent-primary)"}`,
                  padding: "1.25rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span className="badge badge-indigo" style={{ fontSize: "0.72rem" }}>
                          {course.code}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                          {course.credits} Credits
                        </span>
                      </div>
                      <h2 style={{ fontSize: "1.08rem", fontWeight: 700, marginTop: "0.35rem", color: "var(--text-primary)" }}>
                        {course.title}
                      </h2>
                    </div>

                    {course.slot && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                        Slot: {course.slot}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                    <User size={13} />
                    <span>Faculty: <strong>{course.faculty || "Department Faculty"}</strong></span>
                  </div>

                  {/* Student metrics pill row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                    <div style={{ padding: "0.6rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", fontSize: "0.75rem" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Pending Tasks</div>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginTop: "0.1rem" }}>
                        {activeTasks.length}
                      </div>
                    </div>

                    <div style={{ padding: "0.6rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", fontSize: "0.75rem" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Workload</div>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginTop: "0.1rem" }}>
                        {totalHours}h
                      </div>
                    </div>

                    <div style={{ padding: "0.6rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", fontSize: "0.75rem" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Next Event</div>
                      <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--info-accent)", marginTop: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {nextEvent ? formatTaskTitle(nextEvent.title, course.code) : "Lecture Slot"}
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Task List */}
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                      My Active Deliverables
                    </div>

                    {activeTasks.length === 0 ? (
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.4rem 0" }}>
                        No active assignments or project reviews pending.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {activeTasks.map((t: any) => (
                          <div
                            key={t.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.78rem",
                              padding: "0.4rem 0",
                              borderBottom: "1px solid var(--border-subtle)",
                            }}
                          >
                            <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{formatTaskTitle(t.title, course.code)}</span>
                            <span className={`badge ${t.priority === "CRITICAL" ? "badge-critical" : t.priority === "HIGH" ? "badge-high" : "badge-medium"}`}>
                              {t.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Student Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                  <Link href={`/syllabus?courseCode=${course.code}`} className="btn btn-outline btn-sm">
                    <span>Course Syllabus</span>
                  </Link>
                  <Link href="/tasks" className="btn btn-secondary btn-sm">
                    <span>View My Tasks</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
