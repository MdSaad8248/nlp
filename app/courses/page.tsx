import Shell from "@/components/layout/Shell";
import { BookOpen, User, Clock, CheckSquare, Calendar, ArrowRight, Plus, GraduationCap } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { ensureDefaultUserAndCourses } from "@/lib/services/user.service";

export default async function CoursesPage() {
  await ensureDefaultUserAndCourses();

  const courses = await prisma.course.findMany({
    include: {
      tasks: {
        where: { status: { not: "COMPLETED" } },
        orderBy: { deadline: "asc" },
      },
      events: {
        orderBy: { startTime: "asc" },
      },
    },
    orderBy: { code: "asc" },
  });

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
              Courses &amp; Curriculum
            </h1>
            <span className="badge badge-indigo">{courses.length} Enrolled</span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Active academic course enrollments, faculty mapping, deliverables, and workload commitments.
          </p>
        </div>

        <Link href="/inbox" className="btn btn-primary btn-sm">
          <Plus size={14} />
          <span>Ingest Notice</span>
        </Link>
      </div>

      {/* Course Cards Grid */}
      <div className="grid-2col" style={{ marginBottom: "1.5rem" }}>
        {courses.map((course) => {
          const activeTasks = course.tasks;
          const totalHours = activeTasks.reduce((acc, t) => acc + (t.category === "PROJECT" ? 8 : t.category === "EXAM" ? 10 : 4), 0);
          const nextEvent = course.events[0];

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

                {/* Metrics Pill Row: Pending tasks, Upcoming tasks, Workload, Next event */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                  <div
                    style={{
                      padding: "0.6rem",
                      borderRadius: "var(--radius-xs)",
                      background: "var(--bg-surface-elevated)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Pending Tasks</div>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginTop: "0.1rem" }}>
                      {activeTasks.length}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "0.6rem",
                      borderRadius: "var(--radius-xs)",
                      background: "var(--bg-surface-elevated)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Workload</div>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginTop: "0.1rem" }}>
                      {totalHours}h
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "0.6rem",
                      borderRadius: "var(--radius-xs)",
                      background: "var(--bg-surface-elevated)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Next Event</div>
                    <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--info-accent)", marginTop: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nextEvent ? nextEvent.title.slice(0, 14) : "Lecture Slot"}
                    </div>
                  </div>
                </div>

                {/* Upcoming Task List snippet */}
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                    Active Deliverables
                  </div>

                  {activeTasks.length === 0 ? (
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.4rem 0" }}>
                      No active assignments or project reviews pending.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {activeTasks.map((t) => (
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
                          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.title}</span>
                          <span className={`badge ${t.priority === "CRITICAL" ? "badge-critical" : t.priority === "HIGH" ? "badge-high" : "badge-medium"}`}>
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Course Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                <Link href="/inbox" className="btn btn-outline btn-sm">
                  <span>Add Circular</span>
                </Link>
                <Link href="/tasks" className="btn btn-secondary btn-sm">
                  <span>View Tasks</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
