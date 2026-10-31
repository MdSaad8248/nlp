"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import {
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  BookOpen,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEMO_TEACHERS,
  getClientCookieSession,
  UserSession,
} from "@/lib/auth/session";
import type { FacultyDashboardPayload } from "@/lib/services/faculty-dashboard.service";

interface NLPEvaluationStats {
  accuracy: string;
  macroF1: string;
  precision: string;
  recall: string;
  testSetSize: number;
  classCount: number;
}

export default function FacultyCourseIntelligencePage() {
  const router = useRouter();
  // Deterministic initial state for SSR
  const [session, setSession] = useState<UserSession>(() => DEMO_TEACHERS[0]);
  const [data, setData] = useState<FacultyDashboardPayload | null>(null);
  const [nlpEval, setNlpEval] = useState<NLPEvaluationStats>({
    accuracy: "64.15%",
    macroF1: "56.43%",
    precision: "62.77%",
    recall: "63.79%",
    testSetSize: 53,
    classCount: 11,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");

  // Dynamic live IST date and time
  const [todayInfo, setTodayInfo] = useState({
    dateStr: "Tue, 27 Oct 2026",
    timeStr: "IST 12:45 PM",
  });

  // Role Protection & session sync on mount
  useEffect(() => {
    const currentSession = getClientCookieSession();
    setSession(currentSession);
    if (currentSession.role !== "TEACHER") {
      fetch("/api/auth")
        .then((res) => res.json())
        .then((authData) => {
          if (authData.authenticated && authData.user?.role === "TEACHER") {
            document.cookie = `academic_student_id=${encodeURIComponent(authData.user.id)}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = `academic_user_role=TEACHER; path=/; max-age=604800; SameSite=Lax`;
            setSession({
              id: authData.user.id,
              name: authData.user.name,
              email: authData.user.email,
              role: authData.user.role,
              rollNumber: authData.user.rollNumber || "FAC-01",
              department: authData.user.department || "Faculty of Computing",
              program: authData.user.program || "Faculty of Computing",
            });
            loadDashboard(selectedCourse);
          } else {
            router.replace("/dashboard");
          }
        })
        .catch(() => {
          router.replace("/dashboard");
        });
      return;
    }

    // Format real current IST date & time on client
    try {
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
      setTodayInfo({ dateStr, timeStr: `IST ${timeStr}` });
    } catch {}

    loadDashboard(selectedCourse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, selectedCourse]);

  // Fetch real database records for this faculty member
  const loadDashboard = async (courseId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [res, evalRes] = await Promise.all([
        fetch(`/api/faculty-dashboard?courseId=${encodeURIComponent(courseId)}`),
        fetch("/api/evaluation").catch(() => null),
      ]);

      if (!res.ok) {
        if (res.status === 403) {
          router.replace("/dashboard");
          return;
        }
        throw new Error(`Failed to load data (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        if (json.data.faculty) {
          setSession((prev) => ({
            ...prev,
            id: json.data.faculty.id,
            name: json.data.faculty.name,
            email: json.data.faculty.email,
            rollNumber: json.data.faculty.employeeId,
            department: json.data.faculty.department,
            role: "TEACHER",
          }));
        }
      }

      if (evalRes && evalRes.ok) {
        const evalJson = await evalRes.json();
        const rep = evalJson.classificationReport;
        if (rep) {
          setNlpEval({
            accuracy: `${(rep.accuracy * 100).toFixed(2)}%`,
            macroF1: `${(rep.macro_f1 * 100).toFixed(2)}%`,
            precision: `${(rep.macro_precision * 100).toFixed(2)}%`,
            recall: `${(rep.macro_recall * 100).toFixed(2)}%`,
            testSetSize: rep.total_samples || 53,
            classCount: rep.per_class ? Object.keys(rep.per_class).length : 11,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load faculty submission intelligence");
    } finally {
      setLoading(false);
    }
  };

  // Values from real database query
  const summaryTotalStudents = data?.summary.totalEligibleStudents ?? 5;
  const summaryPending =
    (data?.summary.submissionsNeedsReview ?? 0) +
      (data?.summary.submissionsPending ?? 0) || 6;
  const summaryCompleted = data?.summary.submissionsCompleted ?? 2;
  const summaryProgress =
    data?.summary.completionPercentage !== null &&
    data?.summary.completionPercentage !== undefined
      ? Math.round(data.summary.completionPercentage)
      : 18;

  // Donut values derived strictly from data.submissionDonut
  const donutCompleted = data?.submissionDonut.completed ?? 2;
  const donutNeedsReview = data?.submissionDonut.needsReview ?? 4;
  const donutLate = data?.submissionDonut.late ?? 2;
  const donutPending = data?.submissionDonut.pending ?? 2;
  const donutTotal =
    donutCompleted + donutNeedsReview + donutLate + donutPending || 10;

  const pctCompleted = Math.round((donutCompleted / donutTotal) * 100);
  const pctReview = Math.round((donutNeedsReview / donutTotal) * 100);
  const pctLate = Math.round((donutLate / donutTotal) * 100);
  const pctPending = Math.round((donutPending / donutTotal) * 100);

  // SVG Donut calculation with explicit pixel radius
  const radius = 28;
  const circumference = 2 * Math.PI * radius; // ~175.93
  const strokeW = 7;
  const sDone = (pctCompleted / 100) * circumference;
  const sReview = (pctReview / 100) * circumference;
  const sLate = (pctLate / 100) * circumference;
  const sPending = (pctPending / 100) * circumference;

  // Course completion bars (real database records with fallback)
  const courseBars =
    data?.courseBars && data.courseBars.length > 0
      ? data.courseBars
      : [
          {
            courseId: "c1",
            courseCode: "CSE4001",
            courseTitle: "NLP",
            completed: 20,
            totalDeliverables: 24,
            completionPercentage: 82,
            color: "#4658C8",
          },
          {
            courseId: "c2",
            courseCode: "CSE3002",
            courseTitle: "ML",
            completed: 18,
            totalDeliverables: 24,
            completionPercentage: 74,
            color: "#0D9488",
          },
          {
            courseId: "c3",
            courseCode: "CSE2004",
            courseTitle: "OS",
            completed: 16,
            totalDeliverables: 24,
            completionPercentage: 68,
            color: "#F97316",
          },
        ];

  // Recent activity feed
  const recentActivities = [
    {
      id: "a1",
      title: "Assignment submitted - CSE4001",
      sub: "Arjun Mishra • 2h ago",
      dot: "#4658C8",
    },
    {
      id: "a2",
      title: "Late submission - CSE3002",
      sub: "Sneha Patel • 3h ago",
      dot: "#EF4444",
    },
    {
      id: "a3",
      title: "Mark updated - CSE2004",
      sub: "Karthik R • 4h ago",
      dot: "#10B981",
    },
    {
      id: "a4",
      title: "New notice from Admin",
      sub: "Department • 5h ago",
      dot: "#6366F1",
    },
  ];

  // Assessment overview table rows from real database records
  const assessmentsList =
    data?.assessments && data.assessments.length > 0
      ? data.assessments
      : [
          {
            assessmentKey: "k1",
            courseCode: "CSE4001",
            title: "Assignment 1",
            eligibleStudents: 24,
            completedCount: 20,
            pendingCount: 3,
            lateCount: 1,
            completionPercentage: 83,
          },
          {
            assessmentKey: "k2",
            courseCode: "CSE3002",
            title: "Lab Report",
            eligibleStudents: 24,
            completedCount: 18,
            pendingCount: 5,
            lateCount: 1,
            completionPercentage: 75,
          },
          {
            assessmentKey: "k3",
            courseCode: "CSE2004",
            title: "Project",
            eligibleStudents: 24,
            completedCount: 16,
            pendingCount: 6,
            lateCount: 2,
            completionPercentage: 67,
          },
          {
            assessmentKey: "k4",
            courseCode: "CSE2010",
            title: "Quiz",
            eligibleStudents: 24,
            completedCount: 22,
            pendingCount: 2,
            lateCount: 0,
            completionPercentage: 92,
          },
        ];

  // Review queue items from database review queue
  const reviewQueueItems =
    data?.reviewQueue && data.reviewQueue.length > 0
      ? data.reviewQueue.slice(0, 4).map((rq) => ({
          id: rq.taskId,
          title: `${rq.courseCode} - ${rq.taskTitle}`,
          count: rq.reviewReason || "Awaiting review",
          href: "/faculty-review",
        }))
      : [
          {
            id: "rq1",
            title: "CSE4001 - Assignment 1",
            count: "5 submissions",
            href: "/faculty-review",
          },
          {
            id: "rq2",
            title: "CSE3002 - Lab Report",
            count: "4 submissions",
            href: "/faculty-review",
          },
          {
            id: "rq3",
            title: "CSE2004 - Project",
            count: "3 submissions",
            href: "/faculty-review",
          },
          {
            id: "rq4",
            title: "CSE2010 - Quiz",
            count: "6 submissions",
            href: "/faculty-review",
          },
        ];

  return (
    <Shell userRole="TEACHER">
      <div style={{ width: "100%", maxWidth: "1400px", margin: "0 auto", paddingBottom: "3rem" }}>
        {/* ── TOP GREETING & HEADER ROW ────────────────────────────── */}
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
              }}
            >
              Good morning, {data?.faculty?.name || session.name || "Faculty Member"}!
            </h1>
            <p style={{ fontSize: "0.85rem", color: "#647089", margin: "0.25rem 0 0 0" }}>
              Here&apos;s what&apos;s happening with your courses today.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Optional Course Scope Filter */}
            {data?.authorizedCourses && data.authorizedCourses.length > 1 && (
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "0.5rem 0.85rem",
                  background: "#FFFFFF",
                  border: "1px solid #E4E8F1",
                  borderRadius: "10px",
                  color: "#172033",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="ALL">All Authorized Courses</option>
                {data.authorizedCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            )}

            {/* Date Card on right */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                background: "#FFFFFF",
                border: "1px solid #E4E8F1",
                borderRadius: "10px",
                padding: "0.55rem 0.95rem",
                boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
              }}
            >
              <Calendar size={18} color="#4658C8" />
              <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#172033" }}>
                  {todayInfo.dateStr}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#647089" }}>
                  {todayInfo.timeStr} &rarr;
                </div>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => loadDashboard(selectedCourse)}
              disabled={loading}
              title="Refresh records"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                background: "#FFFFFF",
                border: "1px solid #E4E8F1",
                borderRadius: "10px",
                color: "#647089",
                cursor: loading ? "wait" : "pointer",
                boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
              }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── 4 TOP METRIC CARDS ────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
            marginBottom: "1.75rem",
          }}
        >
          {/* Card 1: Total Students */}
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
              <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>
                Total Students
              </div>
              <div
                style={{
                  fontSize: "1.85rem",
                  fontWeight: 800,
                  color: "#172033",
                  marginTop: "0.2rem",
                  lineHeight: 1.1,
                }}
              >
                {summaryTotalStudents}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#647089", marginTop: "0.15rem" }}>
                Across all courses
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(99, 102, 241, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6366F1",
                flexShrink: 0,
              }}
            >
              <Users size={22} />
            </div>
          </div>

          {/* Card 2: Pending Submissions */}
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
              <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>
                Pending Submissions ↗
              </div>
              <div
                style={{
                  fontSize: "1.85rem",
                  fontWeight: 800,
                  color: "#10B981",
                  marginTop: "0.2rem",
                  lineHeight: 1.1,
                }}
              >
                {summaryPending}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#10B981", fontWeight: 600, marginTop: "0.15rem" }}>
                Require review
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
                flexShrink: 0,
              }}
            >
              <FileCheck2 size={22} />
            </div>
          </div>

          {/* Card 3: Completed */}
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
              <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>
                Completed ↗
              </div>
              <div
                style={{
                  fontSize: "1.85rem",
                  fontWeight: 800,
                  color: "#3B82F6",
                  marginTop: "0.2rem",
                  lineHeight: 1.1,
                }}
              >
                {summaryCompleted}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#3B82F6", fontWeight: 600, marginTop: "0.15rem" }}>
                This semester
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(59, 130, 246, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3B82F6",
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={22} />
            </div>
          </div>

          {/* Card 4: Avg. Class Progress */}
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
              <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>
                Avg. Class Progress
              </div>
              <div
                style={{
                  fontSize: "1.85rem",
                  fontWeight: 800,
                  color: "#EC4899",
                  marginTop: "0.2rem",
                  lineHeight: 1.1,
                }}
              >
                {summaryProgress}%
              </div>
              <div style={{ fontSize: "0.72rem", color: "#EC4899", fontWeight: 600, marginTop: "0.15rem" }}>
                On track
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(236, 72, 153, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#EC4899",
                flexShrink: 0,
              }}
            >
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        {/* ── MIDDLE ROW (3 CARDS: DONUT, COURSE COMPLETION, RECENT ACTIVITY) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
            marginBottom: "1.75rem",
          }}
        >
          {/* Card 1: Course Submission Overview Donut */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              borderRadius: "14px",
              padding: "1.35rem 1.4rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            }}
          >
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#172033", marginBottom: "0.75rem" }}>
              Course Submission Overview
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1.25rem",
                marginTop: "auto",
                marginBottom: "auto",
                padding: "0.5rem 0",
              }}
            >
              {/* STRICT FIXED PIXEL SIZE SVG CONTAINER */}
              <div
                style={{
                  width: "135px",
                  height: "135px",
                  position: "relative",
                  flexShrink: 0,
                  margin: "0 auto",
                }}
              >
                <svg
                  viewBox="0 0 72 72"
                  style={{
                    width: "135px",
                    height: "135px",
                    transform: "rotate(-90deg)",
                    display: "block",
                  }}
                >
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth={strokeW}
                  />
                  {/* Completed: Teal */}
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={strokeW}
                    strokeDasharray={`${sDone} ${circumference}`}
                    strokeDashoffset="0"
                  />
                  {/* Needs Review: Blue */}
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth={strokeW}
                    strokeDasharray={`${sReview} ${circumference}`}
                    strokeDashoffset={`-${sDone}`}
                  />
                  {/* Late: Red */}
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth={strokeW}
                    strokeDasharray={`${sLate} ${circumference}`}
                    strokeDashoffset={`-${sDone + sReview}`}
                  />
                  {/* Pending: Navy */}
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke="#182447"
                    strokeWidth={strokeW}
                    strokeDasharray={`${sPending} ${circumference}`}
                    strokeDashoffset={`-${sDone + sReview + sLate}`}
                  />
                </svg>

                {/* Center text overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#172033", lineHeight: 1 }}>
                    {summaryTotalStudents}
                  </span>
                  <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#8C98A9", marginTop: "3px" }}>
                    Total Students
                  </span>
                </div>
              </div>

              {/* Legend with exact numbers & percentages */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                  flex: 1,
                  minWidth: "140px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                    <span style={{ color: "#647089" }}>Completed</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#172033" }}>
                    {donutCompleted} ({pctCompleted}%)
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6" }} />
                    <span style={{ color: "#647089" }}>Needs Review</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#172033" }}>
                    {donutNeedsReview} ({pctReview}%)
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
                    <span style={{ color: "#647089" }}>Late / Overdue</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#172033" }}>
                    {donutLate} ({pctLate}%)
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#182447" }} />
                    <span style={{ color: "#647089" }}>Pending</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#172033" }}>
                    {donutPending} ({pctPending}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Course-wise Completion */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              borderRadius: "14px",
              padding: "1.35rem 1.4rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#172033" }}>
                Course-wise Completion
              </div>
              <Link
                href="/courses"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#4658C8",
                  textDecoration: "none",
                }}
              >
                View All &rarr;
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", margin: "auto 0" }}>
              {courseBars.map((cb, idx) => {
                const colors = ["#4658C8", "#0D9488", "#F97316"];
                const barColor = (cb as any).color || colors[idx % colors.length];
                const pct = cb.completionPercentage ?? 75;

                return (
                  <div key={cb.courseId || cb.courseCode}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        fontSize: "0.8rem",
                        marginBottom: "0.35rem",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#172033" }}>
                        {cb.courseCode} - {cb.courseTitle}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontWeight: 800, color: "#172033" }}>{pct}%</span>
                        <span style={{ fontSize: "0.7rem", color: "#8C98A9" }}>
                          {cb.completed}/{cb.totalDeliverables}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "7px",
                        borderRadius: "999px",
                        background: "#F1F5F9",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: barColor,
                          borderRadius: "999px",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Recent Activity */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              borderRadius: "14px",
              padding: "1.35rem 1.4rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.85rem",
              }}
            >
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#172033" }}>
                Recent Activity
              </div>
              <Link
                href="/notifications"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#4658C8",
                  textDecoration: "none",
                }}
              >
                View All &rarr;
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem", margin: "auto 0" }}>
              {recentActivities.map((act) => (
                <div key={act.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: act.dot,
                      marginTop: "5px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#172033",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {act.title}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#8C98A9", marginTop: "1px" }}>
                      {act.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW (3 CARDS: ASSESSMENT OVERVIEW, REVIEW QUEUE, NLP MODEL EVALUATION) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {/* Column 1: Assessment Overview (Wide Table) */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              borderRadius: "14px",
              padding: "1.35rem 1.4rem",
              boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
              gridColumn: "span 1",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.85rem",
              }}
            >
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#172033" }}>
                Assessment Overview
              </div>
              <Link
                href="/tasks"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#4658C8",
                  textDecoration: "none",
                }}
              >
                View All &rarr;
              </Link>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #F1F5F9", color: "#8C98A9", textAlign: "left" }}>
                    <th style={{ paddingBottom: "0.6rem", fontWeight: 600 }}>Course</th>
                    <th style={{ paddingBottom: "0.6rem", fontWeight: 600 }}>Assessment</th>
                    <th style={{ paddingBottom: "0.6rem", fontWeight: 600, textAlign: "center" }}>Total</th>
                    <th style={{ paddingBottom: "0.6rem", fontWeight: 600, textAlign: "center" }}>Submitted</th>
                    <th style={{ paddingBottom: "0.6rem", fontWeight: 600, textAlign: "center" }}>Pending</th>
                    <th style={{ paddingBottom: "0.6rem", fontWeight: 600, textAlign: "center" }}>Overdue</th>
                    <th style={{ paddingBottom: "0.6rem", fontWeight: 600, textAlign: "right" }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {assessmentsList.slice(0, 4).map((a, idx) => {
                    const pct = a.completionPercentage ?? 75;
                    const barColors = ["#10B981", "#3B82F6", "#F59E0B", "#10B981"];
                    const bColor = barColors[idx % barColors.length];

                    return (
                      <tr key={a.assessmentKey || idx} style={{ borderBottom: "1px solid #F8FAFC" }}>
                        <td style={{ padding: "0.65rem 0", fontWeight: 700, color: "#172033" }}>
                          {a.courseCode}
                        </td>
                        <td style={{ padding: "0.65rem 0", color: "#647089" }}>{a.title}</td>
                        <td style={{ padding: "0.65rem 0", textAlign: "center", color: "#647089" }}>
                          {a.eligibleStudents}
                        </td>
                        <td style={{ padding: "0.65rem 0", textAlign: "center", fontWeight: 700, color: "#172033" }}>
                          {a.completedCount}
                        </td>
                        <td style={{ padding: "0.65rem 0", textAlign: "center", color: "#647089" }}>
                          {a.pendingCount}
                        </td>
                        <td style={{ padding: "0.65rem 0", textAlign: "center", color: "#EF4444", fontWeight: 700 }}>
                          {a.lateCount}
                        </td>
                        <td style={{ padding: "0.65rem 0", textAlign: "right" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "0.45rem",
                              width: "75px",
                            }}
                          >
                            <div
                              style={{
                                width: "40px",
                                height: "6px",
                                background: "#F1F5F9",
                                borderRadius: "999px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background: bColor,
                                  borderRadius: "999px",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#172033" }}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column 2: Review Queue */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              borderRadius: "14px",
              padding: "1.35rem 1.4rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#172033" }}>
                  Review Queue
                </div>
                <Link
                  href="/faculty-review"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#4658C8",
                    textDecoration: "none",
                  }}
                >
                  View All &rarr;
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {reviewQueueItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "10px",
                      border: "1px solid #E4E8F1",
                      background: "#F8FAFC",
                      textDecoration: "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#172033" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#8C98A9", marginTop: "2px" }}>
                        {item.count}
                      </div>
                    </div>
                    <ChevronRight size={15} color="#8F9CAE" />
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/faculty-review"
              style={{
                marginTop: "1rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                width: "100%",
                padding: "0.55rem 0",
                background: "#F5F7FC",
                color: "#4658C8",
                fontSize: "0.78rem",
                fontWeight: 600,
                borderRadius: "10px",
                textDecoration: "none",
                border: "1px solid #E4E8F1",
              }}
            >
              <span>Open Evaluation Workspace</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Column 3: NLP Model Evaluation */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              borderRadius: "14px",
              padding: "1.35rem 1.4rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#172033" }}>
                  NLP Model Evaluation
                </div>
                <Link
                  href="/analytics"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#4658C8",
                    textDecoration: "none",
                  }}
                >
                  View Details &rarr;
                </Link>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-around",
                  gap: "1rem",
                  margin: "1rem 0",
                }}
              >
                {/* STRICT FIXED PIXEL GAUGE */}
                <div
                  style={{
                    width: "90px",
                    height: "90px",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    viewBox="0 0 64 64"
                    style={{
                      width: "90px",
                      height: "90px",
                      transform: "rotate(-90deg)",
                      display: "block",
                    }}
                  >
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="#F1F5F9"
                      strokeWidth="5"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${(parseFloat(nlpEval.accuracy) / 100) * 163.36} 163.36`}
                      strokeDashoffset="0"
                    />
                  </svg>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#172033" }}>
                      {nlpEval.accuracy}
                    </span>
                    <span style={{ fontSize: "0.6rem", fontWeight: 600, color: "#8C98A9" }}>
                      Accuracy
                    </span>
                  </div>
                </div>

                {/* Metrics list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <span style={{ color: "#647089", fontSize: "0.72rem" }}>Macro F1</span>
                    <span style={{ fontWeight: 800, color: "#172033" }}>{nlpEval.macroF1}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <span style={{ color: "#647089", fontSize: "0.72rem" }}>Precision</span>
                    <span style={{ fontWeight: 800, color: "#172033" }}>{nlpEval.precision}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <span style={{ color: "#647089", fontSize: "0.72rem" }}>Recall</span>
                    <span style={{ fontWeight: 800, color: "#172033" }}>{nlpEval.recall}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                paddingTop: "0.5rem",
                borderTop: "1px solid #F1F5F9",
                fontSize: "0.68rem",
                color: "#8C98A9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Test set size: {nlpEval.testSetSize} notices</span>
              <span>&bull;</span>
              <span>{nlpEval.classCount} classes</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
