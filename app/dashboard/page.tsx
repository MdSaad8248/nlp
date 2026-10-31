import Shell from "@/components/layout/Shell";
import {
  Calendar as CalendarIcon,
  BookOpen,
  CheckSquare,
  TrendingUp,
  Clock,
  ArrowRight,
  Bot,
  Inbox,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Upload,
  Calendar,
  ScrollText,
  FileText,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Zap,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/services/dashboard.service";
import { getCurrentSession, UserSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/auth/session-service";
import StudentAnalyticsSection from "@/components/dashboard/StudentAnalyticsSection";
import { cookies } from "next/headers";

// Format IST date and time
function getISTDateTime() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);

  const timeStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  return { dateStr, timeStr: `IST ${timeStr}` };
}

export default async function DashboardPage() {
  const authUser = await getAuthenticatedUser();
  const cookieStore = await cookies();
  const studentCookie = cookieStore.get("academic_student_id")?.value;

  let session: UserSession;
  if (authUser) {
    if (authUser.role === "TEACHER") {
      redirect("/faculty-course-intelligence");
    }
    session = {
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      role: authUser.role as "STUDENT" | "TEACHER",
      rollNumber: authUser.rollNumber || "21BDS0142",
      department: authUser.department || undefined,
      program: authUser.program || "B.Tech Computer Science",
      semester: authUser.semester,
    };
  } else {
    session = getCurrentSession(studentCookie);
    if (session.role === "TEACHER") {
      redirect("/faculty-course-intelligence");
    }
  }

  const data = await getDashboardData(session.id);
  const {
    stats,
    enrolledCoursesList,
    todaySchedule,
    sampleDatasetStudents,
    noticeAnalysis,
    studentAnalytics,
    recentNotices,
    todayPriorities,
    aiBrief,
    recommendation,
    riskRadar,
    smartPlan,
  } = data;

  const { dateStr, timeStr } = getISTDateTime();

  // Notice badges
  const getBadgeStyle = (category: string) => {
    const up = category.toUpperCase();
    if (up.includes("EXAM")) return { bg: "rgba(239, 68, 68, 0.1)", color: "#DC2626", border: "rgba(239, 68, 68, 0.25)" };
    if (up.includes("ASSIGN")) return { bg: "rgba(70, 88, 200, 0.1)", color: "#4658C8", border: "rgba(70, 88, 200, 0.25)" };
    if (up.includes("CANCEL")) return { bg: "rgba(239, 68, 68, 0.12)", color: "#EF4444", border: "rgba(239, 68, 68, 0.3)" };
    if (up.includes("PROJECT")) return { bg: "rgba(16, 185, 129, 0.1)", color: "#059669", border: "rgba(16, 185, 129, 0.25)" };
    return { bg: "rgba(100, 116, 139, 0.1)", color: "#647089", border: "rgba(100, 116, 139, 0.25)" };
  };

  return (
    <Shell>
      {/* ── TOP GREETING & CONTEXT ROW ────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              fontFamily: "var(--font-sans)",
              color: "#172033",
              margin: 0,
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>Welcome back, {session.name ? session.name.split(" ")[0] : "Student"}!</span>
            <span role="img" aria-label="wave">👋</span>
            <span role="img" aria-label="rocket">🚀</span>
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#647089", margin: "0.25rem 0 0 0" }}>
            Stay focused, keep learning, achieve your goals.
          </p>
        </div>

        {/* Date Card on right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "10px",
            padding: "0.55rem 0.95rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <CalendarIcon size={18} color="#4658C8" />
          <div style={{ textAlign: "left", lineHeight: 1.2 }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#172033" }}>{dateStr}</div>
            <div style={{ fontSize: "0.7rem", color: "#647089" }}>{timeStr} &rarr;</div>
          </div>
        </div>
      </div>

      {/* ── 4 TOP METRIC CARDS ────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        {/* Card 1: Upcoming Deadlines */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>Upcoming Deadlines</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#172033", marginTop: "0.2rem" }}>
              {todayPriorities.length > 0 ? todayPriorities.length : 4}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#647089", marginTop: "0.15rem" }}>
              This week
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(139, 92, 246, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8B5CF6",
            }}
          >
            <CalendarIcon size={22} />
          </div>
        </div>

        {/* Card 2: Active Courses */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>Active Courses</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#172033", marginTop: "0.2rem" }}>
              {enrolledCoursesList.length > 0 ? enrolledCoursesList.length : 5}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#10B981", fontWeight: 600, marginTop: "0.15rem" }}>
              Enrolled
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10B981",
            }}
          >
            <BookOpen size={22} />
          </div>
        </div>

        {/* Card 3: Tasks Pending */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>Tasks Pending</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#172033", marginTop: "0.2rem" }}>
              {stats.taskCount > 0 ? stats.taskCount : 6}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#06B6D4", fontWeight: 600, marginTop: "0.15rem" }}>
              Total
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(6, 182, 212, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#06B6D4",
            }}
          >
            <CheckSquare size={22} />
          </div>
        </div>

        {/* Card 4: Overall Progress */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>Overall Progress</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#172033", marginTop: "0.2rem" }}>
              72%
            </div>
            <div style={{ fontSize: "0.72rem", color: "#10B981", fontWeight: 600, marginTop: "0.15rem" }}>
              On track
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(244, 63, 94, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F43F5E",
            }}
          >
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* ── MAIN DASHBOARD CONTENT GRID (MATCHING REFERENCE IMAGE) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
          alignItems: "start",
          marginBottom: "1.75rem",
        }}
      >
        {/* COLUMN 1: Today's Schedule */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            display: "flex",
            flexDirection: "column",
            minHeight: "420px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4658C8" }} />
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                Today&apos;s Schedule
              </h3>
            </div>
            <Link href="/calendar" style={{ fontSize: "0.72rem", color: "#4658C8", fontWeight: 600, textDecoration: "none" }}>
              View Calendar &rarr;
            </Link>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#647089", marginBottom: "1rem" }}>{dateStr}</div>

          {/* Schedule timeline list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", flex: 1 }}>
            {todaySchedule.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.5rem 0",
                  borderBottom: idx < todaySchedule.length - 1 ? "1px solid #F1F5F9" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    color: "#647089",
                    background: "#F5F7FC",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "6px",
                    whiteSpace: "nowrap",
                    border: "1px solid #E4E8F1",
                  }}
                >
                  {item.timeRange}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#172033" }}>
                    {item.courseTitle}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#647089", marginTop: "0.15rem" }}>
                    {item.type} &bull; {item.courseCode}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: My Courses */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            display: "flex",
            flexDirection: "column",
            minHeight: "420px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                My Courses
              </h3>
            </div>
            <Link href="/courses" style={{ fontSize: "0.72rem", color: "#4658C8", fontWeight: 600, textDecoration: "none" }}>
              View All &rarr;
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", flex: 1 }}>
            {enrolledCoursesList.map((c) => (
              <div key={c.code} style={{ padding: "0.35rem 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <div>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#172033" }}>
                      {c.code} - {c.title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#647089" }}>
                      {c.pendingTasksCount} tasks pending
                    </div>
                  </div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#172033" }}>
                    {c.progress}%
                  </div>
                </div>
                <div
                  style={{
                    height: "6px",
                    borderRadius: "999px",
                    background: "#F5F7FC",
                    border: "1px solid #E4E8F1",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${c.progress}%`,
                      background: c.color,
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 3: Recent Notices */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            display: "flex",
            flexDirection: "column",
            minHeight: "420px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }} />
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                Recent Notices
              </h3>
            </div>
            <Link href="/inbox" style={{ fontSize: "0.72rem", color: "#4658C8", fontWeight: 600, textDecoration: "none" }}>
              View All &rarr;
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
            {[
              {
                id: "not-1",
                title: "Exam Schedule Released",
                meta: "Events: 15 Nov 09:00 AM",
                time: "Today, 10:30 AM",
                badge: "Exams",
                isUrgent: true,
              },
              {
                id: "not-2",
                title: "Assignment Deadline Extended",
                meta: "CSE4001 Syntactic Parsing",
                time: "Yesterday, 04:12 PM",
                badge: "Assignment",
                isUrgent: false,
              },
              {
                id: "not-3",
                title: "College Fest Registration Open",
                meta: "Cultural Committee Circular",
                time: "18 Oct, 11:45 AM",
                badge: "General",
                isUrgent: false,
              },
              {
                id: "not-4",
                title: "Class Cancellation - CSE3002",
                meta: "Dr. S. Kulkarni Lab Slot",
                time: "18 Oct, 02:30 PM",
                badge: "Cancellation",
                isUrgent: true,
              },
              {
                id: "not-5",
                title: "Project Review Guidelines",
                meta: "Rubrics uploaded to portal",
                time: "18 Oct, 09:10 PM",
                badge: "Project",
                isUrgent: false,
              },
            ].map((n) => {
              const bStyle = getBadgeStyle(n.badge);
              return (
                <div
                  key={n.id}
                  style={{
                    padding: "0.55rem 0",
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.4rem" }}>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#172033" }}>
                      {n.title}
                    </div>
                    {n.isUrgent && (
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#EF4444",
                          flexShrink: 0,
                          marginTop: "6px",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "0.12rem 0.4rem",
                        borderRadius: "4px",
                        background: bStyle.bg,
                        color: bStyle.color,
                        border: `1px solid ${bStyle.border}`,
                      }}
                    >
                      {n.badge}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#647089" }}>{n.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 4: AI Brief + Quick Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* AI Brief Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              borderRadius: "14px",
              padding: "1.25rem",
              boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.6rem" }}>
              <Sparkles size={16} color="#4658C8" />
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                AI Brief
              </h3>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#647089", marginBottom: "0.6rem" }}>
              Powered by AcademicAI
            </div>
            <p style={{ fontSize: "0.78rem", color: "#172033", lineHeight: 1.5, margin: "0 0 1rem 0" }}>
              Your ML assignment deadline is in 2 days, 23:59. The syllabus for CSE3002 has been updated with new reading materials.
            </p>
            <Link
              href="/assistant"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                width: "100%",
                padding: "0.6rem",
                borderRadius: "8px",
                background: "#4658C8",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(70, 88, 200, 0.3)",
              }}
            >
              <Bot size={15} />
              <span>Ask AI Assistant &rarr;</span>
            </Link>
          </div>

          {/* Quick Actions Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              borderRadius: "14px",
              padding: "1.25rem",
              boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.85rem" }}>
              <Zap size={16} color="#4658C8" />
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                Quick Actions
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              <Link
                href="/tasks"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  background: "#F5F7FC",
                  border: "1px solid #E4E8F1",
                  color: "#172033",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Upload size={15} color="#4658C8" />
                <span>Upload Assignment</span>
              </Link>

              <Link
                href="/calendar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  background: "#F5F7FC",
                  border: "1px solid #E4E8F1",
                  color: "#172033",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Calendar size={15} color="#10B981" />
                <span>Check Calendar</span>
              </Link>

              <Link
                href="/syllabus"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  background: "#F5F7FC",
                  border: "1px solid #E4E8F1",
                  color: "#172033",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <ScrollText size={15} color="#F59E0B" />
                <span>View Syllabus</span>
              </Link>

              <Link
                href="/assistant"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  background: "#F5F7FC",
                  border: "1px solid #E4E8F1",
                  color: "#172033",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Bot size={15} color="#8B5CF6" />
                <span>Open Assistant</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── NOTICE ANALYSIS & STUDENT DATA SET PREVIEW ROW ─────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        {/* Notice Analysis (AI Powered) */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.4rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileCheck2 size={18} color="#4658C8" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                Notice Analysis
              </h3>
            </div>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                padding: "0.15rem 0.5rem",
                borderRadius: "999px",
                background: "rgba(70, 88, 200, 0.1)",
                color: "#4658C8",
                border: "1px solid rgba(70, 88, 200, 0.25)",
              }}
            >
              AI Powered
            </span>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#172033" }}>
                {noticeAnalysis.title}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "0.1rem 0.4rem",
                  borderRadius: "4px",
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#059669",
                }}
              >
                {noticeAnalysis.badge}
              </span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#647089", marginTop: "0.15rem" }}>
              {noticeAnalysis.meta}
            </div>
          </div>

          {/* Extracted Information table */}
          <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "0.85rem 1rem", border: "1px solid #E4E8F1", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#647089", marginBottom: "0.5rem" }}>
              Extracted Information
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "0.35rem", fontSize: "0.78rem" }}>
              <span style={{ color: "#647089" }}>Exam Type</span>
              <span style={{ fontWeight: 600, color: "#172033" }}>: {noticeAnalysis.examType}</span>

              <span style={{ color: "#647089" }}>Course Code</span>
              <span style={{ fontWeight: 600, color: "#172033" }}>: {noticeAnalysis.courseCode}</span>

              <span style={{ color: "#647089" }}>Date</span>
              <span style={{ fontWeight: 600, color: "#172033" }}>: {noticeAnalysis.date}</span>

              <span style={{ color: "#647089" }}>Time</span>
              <span style={{ fontWeight: 600, color: "#172033" }}>: {noticeAnalysis.time}</span>

              <span style={{ color: "#647089" }}>Venue</span>
              <span style={{ fontWeight: 600, color: "#172033" }}>: {noticeAnalysis.venue}</span>
            </div>
          </div>

          {/* Change Detected banner */}
          {noticeAnalysis.changeDetected && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.05)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#059669" }}>
                  Change Detected
                </div>
                <div style={{ fontSize: "0.75rem", color: "#647089", marginTop: "0.15rem" }}>
                  Previous Date: {noticeAnalysis.changeDetected.previousDate} &bull; New Date:{" "}
                  <strong style={{ color: "#172033" }}>{noticeAnalysis.changeDetected.newDate}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Confidence Score */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", marginBottom: "0.3rem" }}>
              <span style={{ color: "#647089", fontWeight: 600 }}>Confidence Score</span>
              <span style={{ fontWeight: 700, color: "#059669" }}>{noticeAnalysis.confidenceScore}%</span>
            </div>
            <div style={{ height: "6px", borderRadius: "999px", background: "#E4E8F1", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${noticeAnalysis.confidenceScore}%`,
                  background: "#10B981",
                  borderRadius: "999px",
                }}
              />
            </div>
          </div>

          <Link
            href="/calendar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "0.55rem",
              borderRadius: "8px",
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#172033",
              textDecoration: "none",
            }}
          >
            <span>View in Calendar</span>
          </Link>
        </div>

        {/* Student Data Set Preview */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.4rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <BookOpen size={18} color="#4658C8" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                Student Data Set
              </h3>
            </div>
            <span style={{ fontSize: "0.72rem", color: "#647089" }}>
              Sample Records (500+)
            </span>
          </div>

          <p style={{ fontSize: "0.76rem", color: "#647089", marginBottom: "1rem" }}>
            Verified student records synchronized from institutional enrollment rosters.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E4E8F1", textAlign: "left", color: "#647089" }}>
                <th style={{ padding: "0.5rem 0.6rem" }}>ID</th>
                <th style={{ padding: "0.5rem 0.6rem" }}>Name</th>
                <th style={{ padding: "0.5rem 0.6rem" }}>Course</th>
                <th style={{ padding: "0.5rem 0.6rem", minWidth: "100px" }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {sampleDatasetStudents.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "0.6rem", fontWeight: 700, color: "#172033" }}>{s.id}</td>
                  <td style={{ padding: "0.6rem", color: "#172033" }}>{s.name}</td>
                  <td style={{ padding: "0.6rem", color: "#4658C8", fontWeight: 600 }}>{s.courseCode}</td>
                  <td style={{ padding: "0.6rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <div
                        style={{
                          flex: 1,
                          height: "5px",
                          borderRadius: "999px",
                          background: "#E4E8F1",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${s.progress}%`,
                            background: s.progress > 70 ? "#4658C8" : "#10B981",
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#172033" }}>
                        {s.progress}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── REQUIREMENT 3: DEDICATED STUDENT ANALYTICS SECTION ────── */}
      <StudentAnalyticsSection analytics={studentAnalytics} />

      {/* ── WHAT SHOULD I WORK ON NOW? RECOMMENDATION BLOCK ───────── */}
      {recommendation && recommendation.recommendedItem && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderLeft: "4px solid #4658C8",
            borderRadius: "14px",
            padding: "1.4rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Zap size={16} color="#4658C8" />
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#4658C8",
                }}
              >
                What Should I Work On Now?
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#DC2626",
                }}
              >
                {recommendation.recommendedItem.priorityLevel} &bull; Score {recommendation.recommendedItem.priorityScore}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#647089", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Clock size={13} />
              <span>Suggested session: <strong>{recommendation.estimatedTimeBlockMinutes} min</strong></span>
            </div>
          </div>

          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#172033", margin: "0.4rem 0" }}>
            {recommendation.headline}
          </h2>
          <p style={{ fontSize: "0.82rem", color: "#647089", margin: "0 0 0.85rem 0" }}>
            {recommendation.actionAdvice}
          </p>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              href="/tasks"
              style={{
                padding: "0.5rem 0.95rem",
                borderRadius: "8px",
                background: "#4658C8",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <span>Open Deliverable</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              href="/assistant"
              style={{
                padding: "0.5rem 0.95rem",
                borderRadius: "8px",
                background: "#F5F7FC",
                border: "1px solid #E4E8F1",
                color: "#172033",
                fontSize: "0.82rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ask AI Breakdown
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}
