"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import { useRouter } from "next/navigation";
import { getClientCookieSession } from "@/lib/auth/session";
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  RefreshCw,
  X,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  BookOpen,
  Award,
  Send,
  Sparkles,
} from "lucide-react";

interface SubmissionItem {
  id: string;
  taskId: string;
  title: string;
  description: string | null;
  category: string;
  deadline: string | null;
  deadlineDisplay: string;
  priority: string;
  rawStatus: string;
  canonicalStatus: "COMPLETED" | "NEEDS_REVIEW" | "LATE" | "PENDING";
  submissionPlatform: string;
  weightage: number | null;
  student: {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    program: string;
    semester: number;
  };
  course: {
    id: string;
    code: string;
    title: string;
  };
  progress: {
    percentage: number;
    note: string;
    updatedAt: string;
  };
  rubric: {
    id: string;
    title: string;
    totalMarks: number;
  } | null;
}

export default function SubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [authorizedCourses, setAuthorizedCourses] = useState<{ id: string; code: string; title: string }[]>([]);
  const [counts, setCounts] = useState({ total: 0, needsReview: 0, completed: 0, late: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NEEDS_REVIEW" | "COMPLETED" | "LATE" | "PENDING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Review Drawer / Modal
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [gradingScore, setGradingScore] = useState<string>("");
  const [gradingFeedback, setGradingFeedback] = useState<string>("");
  const [gradingStatus, setGradingStatus] = useState<"COMPLETED" | "IN_PROGRESS">("COMPLETED");
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [evaluatingTaskId, setEvaluatingTaskId] = useState<string | null>(null);
  const [aiEvaluationData, setAiEvaluationData] = useState<any | null>(null);

  // Client-side role guard with asynchronous server fallback
  useEffect(() => {
    const session = getClientCookieSession();
    if (session.role !== "TEACHER") {
      fetch("/api/auth")
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user?.role === "TEACHER") {
            document.cookie = `academic_student_id=${encodeURIComponent(data.user.id)}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = `academic_user_role=TEACHER; path=/; max-age=604800; SameSite=Lax`;
            fetchSubmissions();
          } else {
            router.replace("/dashboard");
          }
        })
        .catch(() => {
          router.replace("/dashboard");
        });
      return;
    }
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, selectedCourse, statusFilter]);

  async function fetchSubmissions() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCourse !== "ALL") params.append("courseId", selectedCourse);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/submissions?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load submissions");
      }

      setSubmissions(data.submissions || []);
      setAuthorizedCourses(data.authorizedCourses || []);
      setCounts(data.counts || { total: 0, needsReview: 0, completed: 0, late: 0, pending: 0 });
    } catch (err: any) {
      console.error("Submissions load error:", err);
      setError(err.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenReview = (item: SubmissionItem) => {
    setSelectedSubmission(item);
    setGradingScore(item.rubric ? String(Math.round(item.rubric.totalMarks * 0.9)) : "90");
    setGradingFeedback(item.progress.note || "Good technical implementation and thorough evidence.");
    setGradingStatus("COMPLETED");
    setActionSuccess(null);
    if (!aiEvaluationData || aiEvaluationData.taskId !== item.taskId) {
      setAiEvaluationData(null);
    }
  };

  const handleTriggerAiEvaluation = async (item: SubmissionItem) => {
    setEvaluatingTaskId(item.taskId);
    try {
      const res = await fetch("/api/submissions/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: item.taskId }),
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setAiEvaluationData(data);
        setSelectedSubmission(item);
        setGradingScore(String(data.evaluation.totalMarksAwarded));
        const strengthsList = (data.evaluation.strengths || []).map((s: string) => `• ${s}`).join("\n");
        const improvementsList = (data.evaluation.areasForImprovement || []).map((a: string) => `• ${a}`).join("\n");
        setGradingFeedback(
          `${data.evaluation.overallFeedback}\n\nKey Strengths:\n${strengthsList}\n\nAreas for Improvement:\n${improvementsList}`
        );
      } else {
        alert(data.error || "Failed to run AI evaluation.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to run AI evaluation.");
    } finally {
      setEvaluatingTaskId(null);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setSubmittingGrade(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedSubmission.taskId,
          status: gradingStatus,
          percentage: gradingStatus === "COMPLETED" ? 100 : 75,
          feedback: gradingFeedback,
          marks: gradingScore ? Number(gradingScore) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update review.");
      }

      setActionSuccess(`Review saved successfully for ${selectedSubmission.student.name}!`);
      setTimeout(() => {
        setSelectedSubmission(null);
        fetchSubmissions();
      }, 1000);
    } catch (err: any) {
      alert(err.message || "Could not save review.");
    } finally {
      setSubmittingGrade(false);
    }
  };

  // Client-filtered list by search query (for instant typing feel)
  const displayedSubmissions = submissions.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.student.name.toLowerCase().includes(q) ||
      item.student.rollNumber.toLowerCase().includes(q) ||
      item.course.code.toLowerCase().includes(q)
    );
  });

  return (
    <Shell userRole="TEACHER">
      <div style={{ maxWidth: "1380px", margin: "0 auto", paddingBottom: "3rem" }}>
        {/* Editorial Masthead */}
        <header
          style={{
            borderBottom: "2px solid var(--border-default)",
            paddingBottom: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
                <span
                  style={{
                    background: "#4658C8",
                    color: "#fff",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Faculty Intelligence
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Verified Assessment Deliverables &bull; Database-Backed
                </span>
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-serif, Georgia, serif)",
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.03em",
                  margin: 0,
                }}
              >
                Course Submissions &amp; Deliverables
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.35rem", maxWidth: "800px" }}>
                Real student assessment submissions strictly scoped to your authorized courses. Track completion, inspect rubrics, and grade student submissions.
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={fetchSubmissions}
                disabled={loading}
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.82rem",
                  padding: "0.5rem 0.85rem",
                }}
              >
                <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
                <span>Refresh Live</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/faculty-review")}
                className="btn btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.82rem",
                  padding: "0.5rem 0.95rem",
                  background: "#4658C8",
                  borderColor: "#4658C8",
                  color: "#fff",
                }}
              >
                <Award size={14} />
                <span>Open Faculty Review Console</span>
              </button>
            </div>
          </div>
        </header>

        {/* Metric Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {[
            {
              label: "Total Submissions",
              count: counts.total,
              sub: "Assigned course scope",
              border: "#4658C8",
              bg: "rgba(70, 88, 200, 0.05)",
            },
            {
              label: "Needs Review",
              count: counts.needsReview,
              sub: "Submitted drafts awaiting grading",
              border: "#EAB308",
              bg: "rgba(234, 179, 8, 0.08)",
            },
            {
              label: "Completed",
              count: counts.completed,
              sub: "Approved & 100% progress",
              border: "#16A34A",
              bg: "rgba(22, 163, 74, 0.08)",
            },
            {
              label: "Overdue / Late",
              count: counts.late,
              sub: "Past deadline without submission",
              border: "#DC2626",
              bg: "rgba(220, 38, 38, 0.08)",
            },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderLeft: `4px solid ${card.border}`,
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: "0.2rem 0" }}>
                {card.count}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {card.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Status Tab Pills */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: "All", count: counts.total },
              { id: "NEEDS_REVIEW", label: "Needs Review", count: counts.needsReview },
              { id: "COMPLETED", label: "Completed", count: counts.completed },
              { id: "LATE", label: "Late / Overdue", count: counts.late },
              { id: "PENDING", label: "Pending", count: counts.pending },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    border: isActive ? "1.5px solid #4658C8" : "1px solid var(--border-default)",
                    background: isActive ? "#4658C8" : "transparent",
                    color: isActive ? "#fff" : "var(--text-secondary)",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      background: isActive ? "rgba(255, 255, 255, 0.25)" : "var(--bg-canvas)",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "999px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Course Scope Dropdown & Search Bar */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Course Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <BookOpen size={15} color="var(--text-muted)" />
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={{
                  background: "var(--bg-canvas)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "6px",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.82rem",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="ALL">All Authorized Courses ({authorizedCourses.length})</option>
                {authorizedCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Instant Search input */}
            <div style={{ position: "relative", minWidth: "240px" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                placeholder="Search student, roll, task..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem 0.45rem 2.2rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-canvas)",
                  fontSize: "0.82rem",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "0.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area: Table / Empty / Loading */}
        {loading ? (
          <div
            style={{
              padding: "4rem 2rem",
              textAlign: "center",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
            }}
          >
            <RefreshCw size={28} className="spin-icon" style={{ color: "#4658C8", margin: "0 auto 1rem" }} />
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Loading authorized course submissions...
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Querying database records for {selectedCourse === "ALL" ? "all assigned courses" : selectedCourse}
            </div>
          </div>
        ) : error ? (
          <div
            style={{
              padding: "2.5rem",
              background: "rgba(220, 38, 38, 0.05)",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
            }}
          >
            <AlertTriangle size={32} color="#DC2626" style={{ margin: "0 auto 0.75rem" }} />
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#DC2626" }}>Error Loading Submissions</div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{error}</p>
            <button type="button" onClick={fetchSubmissions} className="btn btn-secondary" style={{ marginTop: "1rem" }}>
              Try Again
            </button>
          </div>
        ) : displayedSubmissions.length === 0 ? (
          <div
            style={{
              padding: "4rem 2rem",
              textAlign: "center",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
            }}
          >
            <CheckSquare size={36} color="var(--text-muted)" style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              No Submissions Found
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem", maxWidth: "500px", margin: "0.25rem auto 1.25rem" }}>
              {statusFilter !== "ALL"
                ? `There are currently no submissions with status "${statusFilter}" for the selected course.`
                : "No assessment deliverables are currently assigned or submitted for this course."}
            </p>
            {statusFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem" }}
              >
                Clear Status Filter
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-default)",
                    background: "var(--bg-canvas)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                  }}
                >
                  <th style={{ padding: "0.85rem 1rem" }}>Student</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Assessment &amp; Course</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Deadline (IST)</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Status &amp; Progress</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Platform</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedSubmissions.map((sub, idx) => {
                  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
                    COMPLETED: { bg: "rgba(22, 163, 74, 0.12)", text: "#16a34a", label: "Completed" },
                    NEEDS_REVIEW: { bg: "rgba(234, 179, 8, 0.15)", text: "#ca8a04", label: "Needs Review" },
                    LATE: { bg: "rgba(220, 38, 38, 0.12)", text: "#dc2626", label: "Overdue / Late" },
                    PENDING: { bg: "rgba(100, 116, 139, 0.12)", text: "#64748b", label: "Pending" },
                  };
                  const currentStyle = statusStyles[sub.canonicalStatus] || statusStyles.PENDING;

                  return (
                    <tr
                      key={sub.id}
                      style={{
                        borderBottom: idx === displayedSubmissions.length - 1 ? "none" : "1px solid var(--border-default)",
                        transition: "background 0.1s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(70, 88, 200, 0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Student Info */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "rgba(70, 88, 200, 0.1)",
                              color: "#4658C8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              flexShrink: 0,
                            }}
                          >
                            {sub.student.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>
                              {sub.student.name}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {sub.student.rollNumber} &bull; {sub.student.program}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assessment Title & Course */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {sub.title}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              background: "var(--bg-canvas)",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "4px",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--border-default)",
                            }}
                          >
                            {sub.course.code}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {sub.category} {sub.weightage ? `(${sub.weightage}% wt)` : ""}
                          </span>
                        </div>
                      </td>

                      {/* Deadline */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text-primary)" }}>
                          {sub.deadlineDisplay}
                        </div>
                        {sub.canonicalStatus === "LATE" && (
                          <div style={{ fontSize: "0.68rem", color: "#dc2626", fontWeight: 700, marginTop: "0.1rem" }}>
                            Deadline passed
                          </div>
                        )}
                      </td>

                      {/* Status & Progress Bar */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              background: currentStyle.bg,
                              color: currentStyle.text,
                            }}
                          >
                            {currentStyle.label}
                          </span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>
                            {sub.progress.percentage}%
                          </span>
                        </div>
                        <div
                          style={{
                            width: "100px",
                            height: "5px",
                            background: "var(--bg-canvas)",
                            borderRadius: "999px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${sub.progress.percentage}%`,
                              height: "100%",
                              background: currentStyle.text,
                              borderRadius: "999px",
                            }}
                          />
                        </div>
                      </td>

                      {/* Platform */}
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {sub.submissionPlatform}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleTriggerAiEvaluation(sub)}
                            disabled={evaluatingTaskId === sub.taskId}
                            className="btn btn-secondary"
                            style={{
                              padding: "0.35rem 0.65rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              color: "#4658C8",
                              borderColor: "#4658C8",
                            }}
                          >
                            <Sparkles size={13} className={evaluatingTaskId === sub.taskId ? "spin-icon" : ""} />
                            <span>{evaluatingTaskId === sub.taskId ? "Evaluating..." : "AI Rubric Eval"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenReview(sub)}
                            className="btn btn-secondary"
                            style={{
                              padding: "0.35rem 0.65rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                          >
                            <Eye size={13} />
                            <span>Review</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Slide-over Detail / Grading Modal */}
        {selectedSubmission && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 999,
              display: "flex",
              justifyContent: "flex-end",
            }}
            onClick={() => setSelectedSubmission(null)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "520px",
                background: "var(--bg-surface)",
                height: "100%",
                overflowY: "auto",
                padding: "2rem",
                boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid var(--border-default)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border-default)",
                  paddingBottom: "1rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      background: "rgba(70, 88, 200, 0.1)",
                      color: "#4658C8",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Submission Assessment
                  </span>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0.35rem 0 0", color: "var(--text-primary)" }}>
                    {selectedSubmission.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "0.25rem",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Student & Course Meta */}
              <div
                style={{
                  background: "var(--bg-canvas)",
                  padding: "1rem",
                  borderRadius: "8px",
                  marginBottom: "1.25rem",
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>
                      Student
                    </span>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {selectedSubmission.student.name}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                      {selectedSubmission.student.rollNumber}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>
                      Course
                    </span>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {selectedSubmission.course.code}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                      {selectedSubmission.course.title}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>
                      Deadline (IST)
                    </span>
                    <div style={{ color: "var(--text-primary)" }}>
                      {selectedSubmission.deadlineDisplay}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>
                      Platform
                    </span>
                    <div style={{ color: "var(--text-primary)" }}>
                      {selectedSubmission.submissionPlatform}
                    </div>
                  </div>
                </div>

                {selectedSubmission.progress.note && (
                  <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-default)" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>
                      Student Submission Note
                    </span>
                    <div style={{ color: "var(--text-secondary)", fontStyle: "italic", marginTop: "0.2rem" }}>
                      &ldquo;{selectedSubmission.progress.note}&rdquo;
                    </div>
                  </div>
                )}
              </div>

              {/* Rubric Reference if available */}
              {selectedSubmission.rubric && (
                <div
                  style={{
                    background: "rgba(70, 88, 200, 0.04)",
                    border: "1px solid rgba(70, 88, 200, 0.2)",
                    borderRadius: "8px",
                    padding: "0.85rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4658C8", textTransform: "uppercase" }}>
                    Standard Rubric Attached
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                    {selectedSubmission.rubric.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                    Total Marks: {selectedSubmission.rubric.totalMarks} points
                  </div>
                </div>
              )}

              {/* AI Rubric Evaluation Assessment Panel */}
              {aiEvaluationData && aiEvaluationData.taskId === selectedSubmission.taskId ? (
                <div
                  style={{
                    background: "rgba(70, 88, 200, 0.05)",
                    border: "1px solid rgba(70, 88, 200, 0.25)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Sparkles size={16} color="#4658C8" />
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#4658C8", textTransform: "uppercase" }}>
                        {aiEvaluationData.evaluation.evaluatorModel}
                      </span>
                    </div>
                    <span style={{ fontSize: "1rem", fontWeight: 800, color: "#4658C8" }}>
                      {aiEvaluationData.evaluation.totalMarksAwarded} / {aiEvaluationData.evaluation.maxPossibleMarks} ({aiEvaluationData.evaluation.percentageScore}%)
                    </span>
                  </div>

                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.75rem", lineHeight: 1.45 }}>
                    {aiEvaluationData.evaluation.overallFeedback}
                  </p>

                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                    Criterion Breakdown &amp; Evidence Quotes:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "180px", overflowY: "auto", paddingRight: "0.2rem", marginBottom: "0.75rem" }}>
                    {aiEvaluationData.evaluation.criteriaResults.map((crit: any, cidx: number) => (
                      <div
                        key={crit.criterionId || cidx}
                        style={{
                          background: "var(--bg-surface)",
                          padding: "0.55rem 0.7rem",
                          borderRadius: "6px",
                          border: "1px solid var(--border-default)",
                          fontSize: "0.76rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                          <span style={{ color: "var(--text-primary)" }}>{crit.title}</span>
                          <span style={{ color: "#4658C8" }}>{crit.awardedMarks} / {crit.maxMarks}</span>
                        </div>
                        <div style={{ color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                          {crit.justification}
                        </div>
                        {crit.evidenceQuote && (
                          <div
                            style={{
                              marginTop: "0.3rem",
                              fontSize: "0.7rem",
                              fontStyle: "italic",
                              color: "var(--text-muted)",
                              borderLeft: "2px solid #4658C8",
                              paddingLeft: "0.4rem",
                            }}
                          >
                            &ldquo;{crit.evidenceQuote.slice(0, 160)}...&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setGradingScore(String(aiEvaluationData.evaluation.totalMarksAwarded));
                      const strengthsList = (aiEvaluationData.evaluation.strengths || []).map((s: string) => `• ${s}`).join("\n");
                      const improvementsList = (aiEvaluationData.evaluation.areasForImprovement || []).map((a: string) => `• ${a}`).join("\n");
                      setGradingFeedback(
                        `${aiEvaluationData.evaluation.overallFeedback}\n\nKey Strengths:\n${strengthsList}\n\nAreas for Improvement:\n${improvementsList}`
                      );
                    }}
                    style={{
                      width: "100%",
                      padding: "0.45rem",
                      borderRadius: "6px",
                      background: "rgba(70, 88, 200, 0.1)",
                      border: "1px solid #4658C8",
                      color: "#4658C8",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <CheckSquare size={13} />
                    <span>Apply AI Suggested Marks &amp; Notes to Form</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTriggerAiEvaluation(selectedSubmission)}
                  disabled={evaluatingTaskId === selectedSubmission.taskId}
                  style={{
                    width: "100%",
                    marginBottom: "1.25rem",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px dashed #4658C8",
                    background: "rgba(70, 88, 200, 0.04)",
                    color: "#4658C8",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <Sparkles size={14} className={evaluatingTaskId === selectedSubmission.taskId ? "spin-icon" : ""} />
                  <span>{evaluatingTaskId === selectedSubmission.taskId ? "Evaluating with Gemini 3.8 Flash..." : "Run AI Rubric Pre-Evaluation (Gemini)"}</span>
                </button>
              )}

              {/* Grading & Review Form */}
              <form onSubmit={handleSaveReview} style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Faculty Evaluation &amp; Grade
                </h3>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    Score / Marks (out of 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={gradingScore}
                    onChange={(e) => setGradingScore(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-canvas)",
                      color: "var(--text-primary)",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    Review Decision
                  </label>
                  <select
                    value={gradingStatus}
                    onChange={(e) => setGradingStatus(e.target.value as any)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-canvas)",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="COMPLETED">Approve &amp; Mark Completed (100% progress)</option>
                    <option value="IN_PROGRESS">Request Revision / In-Progress (75% progress)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    Feedback &amp; Comments for Student
                  </label>
                  <textarea
                    rows={3}
                    value={gradingFeedback}
                    onChange={(e) => setGradingFeedback(e.target.value)}
                    placeholder="Enter assessment comments, rubric feedback, or instructions..."
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-canvas)",
                      color: "var(--text-primary)",
                      fontSize: "0.82rem",
                      resize: "vertical",
                    }}
                  />
                </div>

                {actionSuccess && (
                  <div
                    style={{
                      padding: "0.6rem 0.85rem",
                      borderRadius: "6px",
                      background: "rgba(22, 163, 74, 0.12)",
                      border: "1px solid rgba(22, 163, 74, 0.3)",
                      color: "#16a34a",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    {actionSuccess}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.65rem" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingGrade}
                    className="btn btn-primary"
                    style={{
                      flex: 2,
                      padding: "0.65rem",
                      background: "#4658C8",
                      borderColor: "#4658C8",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {submittingGrade ? (
                      <>
                        <RefreshCw size={14} className="spin-icon" />
                        <span>Saving Record...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Commit Review to DB</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
