"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import { useRouter } from "next/navigation";
import { getClientCookieSession } from "@/lib/auth/session";
import {
  GraduationCap,
  Sparkles,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Play,
  FileText,
  FileSpreadsheet,
  Clock,
  ShieldAlert,
  Bot,
  Brain,
  ChevronRight,
  Eye,
  RefreshCw,
  Send,
  Award,
  X,
  CheckSquare,
} from "lucide-react";
import {
  FACULTY_DEMO_CASES,
  DemoCaseDefinition,
  DemoExecutionResult,
} from "@/lib/faculty-review/demo-cases";
import {
  EVALUATION_BENCHMARK_SUMMARY,
  EvaluationMetricSummary,
} from "@/lib/faculty-review/evaluation-summary";

const PIPELINE_STAGES = [
  { id: "input", name: "Academic Input", desc: "PDFs, notices, LMS, circulars, images" },
  { id: "classification", name: "Classification", desc: "Statistical multi-class intent categorization" },
  { id: "ner", name: "Entity Extraction", desc: "Course code, deliverable, platform, venue" },
  { id: "temporal", name: "Temporal Reasoning", desc: "Normalized IST deadlines & relative shifts" },
  { id: "extraction", name: "Task/Event Extraction", desc: "Structured state object creation" },
  { id: "change", name: "Change Intelligence", desc: "5-way relationship & transition tracking" },
  { id: "priority", name: "Priority Scoring", desc: "Multi-factor cognitive impact formula" },
  { id: "risk", name: "Risk Radar", desc: "Exam collisions, deadline clusters & overload" },
  { id: "planning", name: "Smart Planning", desc: "Daily schedule blocks with 'Why Now?' rationale" },
  { id: "notification", name: "Notification Engine", desc: "Staged alerts & quiet-hour suppression" },
  { id: "assistant", name: "Grounded Assistant", desc: "Tool-driven answers with zero hallucination" },
];

export default function FacultyReviewPage() {
  const router = useRouter();
  const [selectedCaseId, setSelectedCaseId] = useState<string>("demo-1");
  const [executionResults, setExecutionResults] = useState<Record<string, DemoExecutionResult>>({});
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "demos" | "pipeline" | "evidence" | "evaluation">("queue");
  const [activeStageFilter, setActiveStageFilter] = useState<string | null>(null);

  // Live Review Queue State
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any | null>(null);
  const [gradingScore, setGradingScore] = useState<string>("90");
  const [gradingFeedback, setGradingFeedback] = useState<string>("");
  const [gradingStatus, setGradingStatus] = useState<"COMPLETED" | "IN_PROGRESS">("COMPLETED");
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [evaluatingTaskId, setEvaluatingTaskId] = useState<string | null>(null);
  const [aiEvaluationData, setAiEvaluationData] = useState<any | null>(null);

  const selectedCase = FACULTY_DEMO_CASES.find((c) => c.id === selectedCaseId) || FACULTY_DEMO_CASES[0];
  const currentResult = executionResults[selectedCase.id];

  // Role guard with server fallback & Auto-run first case on mount
  useEffect(() => {
    const session = getClientCookieSession();
    if (session.role !== "TEACHER") {
      fetch("/api/auth")
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user?.role === "TEACHER") {
            document.cookie = `academic_student_id=${encodeURIComponent(data.user.id)}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = `academic_user_role=TEACHER; path=/; max-age=604800; SameSite=Lax`;
            fetchReviewQueue();
            executeCase(selectedCase.id);
          } else {
            router.replace("/dashboard");
          }
        })
        .catch(() => {
          router.replace("/dashboard");
        });
      return;
    }
    fetchReviewQueue();
    executeCase(selectedCase.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function fetchReviewQueue() {
    setQueueLoading(true);
    try {
      const res = await fetch("/api/submissions?status=NEEDS_REVIEW");
      const data = await res.json();
      if (data.success && Array.isArray(data.submissions)) {
        setReviewQueue(data.submissions);
      }
    } catch (err) {
      console.error("Failed to fetch review queue:", err);
    } finally {
      setQueueLoading(false);
    }
  }

  const handleOpenQueueReview = (item: any) => {
    setSelectedQueueItem(item);
    setGradingScore(item.rubric ? String(Math.round(item.rubric.totalMarks * 0.9)) : "90");
    setGradingFeedback(item.progress?.note || "Thorough submission. Approved with full credit.");
    setGradingStatus("COMPLETED");
    setReviewSuccessMsg(null);
    if (!aiEvaluationData || aiEvaluationData.taskId !== (item.taskId || item.id)) {
      setAiEvaluationData(null);
    }
  };

  const handleTriggerAiEvaluation = async (item: any) => {
    const targetTaskId = item.taskId || item.id;
    setEvaluatingTaskId(targetTaskId);
    try {
      const res = await fetch("/api/submissions/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: targetTaskId }),
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setAiEvaluationData(data);
        setSelectedQueueItem(item);
        setGradingScore(String(data.evaluation.totalMarksAwarded));
        const strengthsList = (data.evaluation.strengths || []).map((s: string) => `• ${s}`).join("\n");
        const improvementsList = (data.evaluation.areasForImprovement || []).map((a: string) => `• ${a}`).join("\n");
        setGradingFeedback(
          `${data.evaluation.overallFeedback}\n\nKey Strengths:\n${strengthsList}\n\nAreas for Improvement:\n${improvementsList}`
        );
      } else {
        alert(data.error || "Failed to complete AI evaluation.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to complete AI evaluation.");
    } finally {
      setEvaluatingTaskId(null);
    }
  };

  const handleSaveQueueGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueItem) return;

    setSubmittingGrade(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedQueueItem.taskId,
          status: gradingStatus,
          percentage: gradingStatus === "COMPLETED" ? 100 : 75,
          feedback: gradingFeedback,
          marks: gradingScore ? Number(gradingScore) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to commit review.");
      }

      setReviewSuccessMsg(`Review saved for ${selectedQueueItem.student.name}!`);
      setTimeout(() => {
        setSelectedQueueItem(null);
        fetchReviewQueue();
      }, 900);
    } catch (err: any) {
      alert(err.message || "Failed to save review.");
    } finally {
      setSubmittingGrade(false);
    }
  };

  async function executeCase(caseId: string) {
    setLoadingCaseId(caseId);
    try {
      const res = await fetch("/api/faculty-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setExecutionResults((prev) => ({ ...prev, [caseId]: data.result }));
      }
    } catch (err) {
      console.error("Failed to run demo case:", err);
    } finally {
      setLoadingCaseId(null);
    }
  }

  async function executeAllCases() {
    setIsRunningAll(true);
    for (const c of FACULTY_DEMO_CASES) {
      setLoadingCaseId(c.id);
      try {
        const res = await fetch("/api/faculty-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: c.id }),
        });
        const data = await res.json();
        if (data.success && data.result) {
          setExecutionResults((prev) => ({ ...prev, [c.id]: data.result }));
        }
      } catch (err) {
        console.error(`Failed to run demo ${c.id}:`, err);
      }
    }
    setLoadingCaseId(null);
    setIsRunningAll(false);
  }

  const filteredCases = activeStageFilter
    ? FACULTY_DEMO_CASES.filter((c) =>
        c.pipelineStage.toLowerCase().includes(activeStageFilter.toLowerCase())
      )
    : FACULTY_DEMO_CASES;

  return (
    <Shell userRole="TEACHER">
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
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
                    background: "var(--accent-primary)",
                    color: "#fff",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Milestone 8-F Verified
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Academic Defense &amp; Demonstration Mode
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
                AcademicAI — Faculty Review Mode
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.35rem", maxWidth: "800px" }}>
                NLP-driven Academic Intelligence &amp; Personalized Student Assistance Platform. Complete system demonstration covering natural language processing, multimodal document ingestion, change intelligence, academic risk detection, and grounded AI assistant tooling.
              </p>
            </div>

            {/* Verification Export Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={executeAllCases}
                disabled={isRunningAll}
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8rem",
                  padding: "0.45rem 0.8rem",
                }}
              >
                <RefreshCw size={14} className={isRunningAll ? "spin-icon" : ""} />
                <span>{isRunningAll ? "Executing 15 Demos..." : "Run All 15 Demos"}</span>
              </button>

              <a
                href="/api/faculty-review?export=json"
                download
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8rem",
                  padding: "0.45rem 0.8rem",
                  textDecoration: "none",
                }}
              >
                <FileText size={14} />
                <span>Export Log (JSON)</span>
              </a>

              <a
                href="/api/faculty-review?export=csv"
                download
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8rem",
                  padding: "0.45rem 0.8rem",
                  textDecoration: "none",
                }}
              >
                <FileSpreadsheet size={14} />
                <span>Export Audit (CSV)</span>
              </a>
            </div>
          </div>

          {/* Review Mode Navigation Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "1.25rem",
              borderTop: "1px solid var(--border-default)",
              paddingTop: "0.75rem",
            }}
          >
            {[
              { id: "queue", label: "Live Review Queue", icon: GraduationCap, badge: reviewQueue.length },
              { id: "demos", label: "15 Live Demonstration Cases", icon: Play },
              { id: "pipeline", label: "NLP Intelligence Pipeline", icon: Layers },
              { id: "evidence", label: "Evidence & Trace Inspector", icon: Eye },
              { id: "evaluation", label: "M8-E Final Evaluation Benchmark", icon: CheckCircle2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.9rem",
                    borderRadius: "6px",
                    border: isActive ? "1px solid var(--accent-primary)" : "1px solid transparent",
                    background: isActive ? "var(--bg-surface)" : "transparent",
                    color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      style={{
                        background: isActive ? "var(--accent-primary)" : "rgba(234, 179, 8, 0.2)",
                        color: isActive ? "#fff" : "#ca8a04",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "0.1rem 0.4rem",
                        borderRadius: "999px",
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* ============================================================ */}
        {/* TAB 0: LIVE REVIEW QUEUE */}
        {/* ============================================================ */}
        {activeTab === "queue" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Submissions Awaiting Faculty Review ({reviewQueue.length})
                </h2>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                  Items in this queue are student deliverables currently marked In-Progress or pending grading for your assigned courses.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchReviewQueue}
                disabled={queueLoading}
                className="btn btn-secondary"
                style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <RefreshCw size={13} className={queueLoading ? "spin-icon" : ""} />
                <span>Refresh Queue</span>
              </button>
            </div>

            {queueLoading ? (
              <div
                style={{
                  padding: "3.5rem",
                  textAlign: "center",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <RefreshCw size={24} className="spin-icon" style={{ color: "var(--accent-primary)", margin: "0 auto 0.75rem" }} />
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Loading live review queue...</div>
              </div>
            ) : reviewQueue.length === 0 ? (
              <div
                style={{
                  padding: "4rem 2rem",
                  textAlign: "center",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <CheckCircle2 size={40} color="#16a34a" style={{ margin: "0 auto 0.75rem" }} />
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Review Queue Clear!
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem", maxWidth: "520px", margin: "0.25rem auto 1.25rem" }}>
                  No student assessment submissions currently require faculty review for your assigned courses. All submitted work is up to date.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/submissions")}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.82rem" }}
                >
                  View All Submissions &amp; Deliverables
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1rem" }}>
                {reviewQueue.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div>
                      {/* Top badges */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                        <span
                          style={{
                            background: "rgba(234, 179, 8, 0.15)",
                            color: "#ca8a04",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          Needs Review
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            background: "var(--bg-canvas)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                            border: "1px solid var(--border-default)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {item.course.code}
                        </span>
                      </div>

                      {/* Task title */}
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
                        {item.title}
                      </h3>

                      {/* Student info */}
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                        Submitted by: <strong style={{ color: "var(--text-primary)" }}>{item.student.name}</strong> ({item.student.rollNumber})
                      </div>

                      {/* Progress note */}
                      {item.progress?.note && (
                        <div
                          style={{
                            background: "var(--bg-canvas)",
                            padding: "0.6rem 0.75rem",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                            marginBottom: "0.75rem",
                            borderLeft: "3px solid var(--accent-primary)",
                          }}
                        >
                          &ldquo;{item.progress.note}&rdquo;
                        </div>
                      )}

                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "1rem" }}>
                        <span>Deadline: {item.deadlineDisplay}</span>
                        <span>Platform: {item.submissionPlatform}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleTriggerAiEvaluation(item)}
                        disabled={evaluatingTaskId === (item.taskId || item.id)}
                        className="btn btn-secondary"
                        style={{
                          fontSize: "0.78rem",
                          padding: "0.45rem 0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          color: "var(--accent-primary)",
                          borderColor: "var(--accent-primary)",
                          fontWeight: 600,
                        }}
                      >
                        <Sparkles size={13} className={evaluatingTaskId === (item.taskId || item.id) ? "spin-icon" : ""} />
                        <span>{evaluatingTaskId === (item.taskId || item.id) ? "Evaluating..." : "AI Rubric Eval"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenQueueReview(item)}
                        className="btn btn-primary"
                        style={{
                          fontSize: "0.8rem",
                          padding: "0.45rem 0.85rem",
                          background: "var(--accent-primary)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <Award size={13} />
                        <span>Grade &amp; Approve</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Drawer for Grading in Review Queue */}
        {selectedQueueItem && (
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
            onClick={() => setSelectedQueueItem(null)}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default)", paddingBottom: "1rem", marginBottom: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
                    Faculty Review Action
                  </span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0.25rem 0 0", color: "var(--text-primary)" }}>
                    {selectedQueueItem.title}
                  </h3>
                </div>
                <button type="button" onClick={() => setSelectedQueueItem(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ background: "var(--bg-canvas)", padding: "0.85rem", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "1rem" }}>
                <div><strong>Student:</strong> {selectedQueueItem.student.name} ({selectedQueueItem.student.rollNumber})</div>
                <div style={{ marginTop: "0.25rem" }}><strong>Course:</strong> {selectedQueueItem.course.code} &bull; {selectedQueueItem.course.title}</div>
                <div style={{ marginTop: "0.25rem" }}><strong>Deadline:</strong> {selectedQueueItem.deadlineDisplay}</div>
              </div>

              {/* AI Rubric Evaluation Assessment Panel */}
              {aiEvaluationData && aiEvaluationData.taskId === (selectedQueueItem.taskId || selectedQueueItem.id) ? (
                <div
                  style={{
                    background: "rgba(52, 72, 165, 0.05)",
                    border: "1px solid rgba(52, 72, 165, 0.25)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Sparkles size={16} color="var(--accent-primary)" />
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase" }}>
                        {aiEvaluationData.evaluation.evaluatorModel}
                      </span>
                    </div>
                    <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent-primary)" }}>
                      {aiEvaluationData.evaluation.totalMarksAwarded} / {aiEvaluationData.evaluation.maxPossibleMarks} ({aiEvaluationData.evaluation.percentageScore}%)
                    </span>
                  </div>

                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.75rem", lineHeight: 1.45 }}>
                    {aiEvaluationData.evaluation.overallFeedback}
                  </p>

                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                    Criterion Breakdown &amp; Evidence Quotes:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "200px", overflowY: "auto", paddingRight: "0.2rem", marginBottom: "0.75rem" }}>
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
                          <span style={{ color: "var(--accent-primary)" }}>{crit.awardedMarks} / {crit.maxMarks}</span>
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
                              borderLeft: "2px solid var(--accent-primary)",
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
                      background: "rgba(52, 72, 165, 0.1)",
                      border: "1px solid var(--accent-primary)",
                      color: "var(--accent-primary)",
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
                  onClick={() => handleTriggerAiEvaluation(selectedQueueItem)}
                  disabled={evaluatingTaskId === (selectedQueueItem.taskId || selectedQueueItem.id)}
                  style={{
                    width: "100%",
                    marginBottom: "1rem",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px dashed var(--accent-primary)",
                    background: "rgba(52, 72, 165, 0.04)",
                    color: "var(--accent-primary)",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <Sparkles size={14} className={evaluatingTaskId === (selectedQueueItem.taskId || selectedQueueItem.id) ? "spin-icon" : ""} />
                  <span>{evaluatingTaskId === (selectedQueueItem.taskId || selectedQueueItem.id) ? "Evaluating with Gemini 3.8 Flash..." : "Run AI Rubric Pre-Evaluation (Gemini)"}</span>
                </button>
              )}

              <form onSubmit={handleSaveQueueGrade} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    Marks Awarded (out of 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={gradingScore}
                    onChange={(e) => setGradingScore(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-default)", background: "var(--bg-canvas)", color: "var(--text-primary)", fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    Status Outcome
                  </label>
                  <select
                    value={gradingStatus}
                    onChange={(e) => setGradingStatus(e.target.value as any)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-default)", background: "var(--bg-canvas)", color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    <option value="COMPLETED">Approve &amp; Mark Completed (100% score recorded)</option>
                    <option value="IN_PROGRESS">Return for Revision (75% progress recorded)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    Faculty Evaluation Notes &amp; Rubric Feedback
                  </label>
                  <textarea
                    rows={4}
                    value={gradingFeedback}
                    onChange={(e) => setGradingFeedback(e.target.value)}
                    placeholder="Enter rubric criteria breakdown and evaluation feedback..."
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-default)", background: "var(--bg-canvas)", color: "var(--text-primary)", fontSize: "0.82rem" }}
                  />
                </div>

                {reviewSuccessMsg && (
                  <div style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", background: "rgba(22, 163, 74, 0.12)", color: "#16a34a", fontSize: "0.8rem", fontWeight: 600 }}>
                    {reviewSuccessMsg}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button type="button" onClick={() => setSelectedQueueItem(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingGrade}
                    className="btn btn-primary"
                    style={{ flex: 2, background: "var(--accent-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                  >
                    {submittingGrade ? <RefreshCw size={13} className="spin-icon" /> : <Send size={13} />}
                    <span>{submittingGrade ? "Saving..." : "Commit Grade"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: 15 LIVE DEMONSTRATION CASES */}
        {/* ============================================================ */}
        {activeTab === "demos" && (
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "1.5rem" }}>
            {/* Left Column: Curated Demo List */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                maxHeight: "calc(100vh - 220px)",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                  DEMO SCENARIOS ({FACULTY_DEMO_CASES.length})
                </span>
                {activeStageFilter && (
                  <button
                    type="button"
                    onClick={() => setActiveStageFilter(null)}
                    style={{ fontSize: "0.7rem", color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {filteredCases.map((c) => {
                  const isSelected = c.id === selectedCaseId;
                  const hasRun = !!executionResults[c.id];
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCaseId(c.id);
                        if (!executionResults[c.id]) {
                          executeCase(c.id);
                        }
                      }}
                      style={{
                        padding: "0.6rem 0.75rem",
                        borderRadius: "6px",
                        border: isSelected ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-default)",
                        background: isSelected ? "var(--bg-surface-elevated, #fff)" : "transparent",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: isSelected ? "var(--accent-primary)" : "var(--text-muted)",
                          }}
                        >
                          CASE {c.number.toString().padStart(2, "0")} · {c.category.toUpperCase()}
                        </span>
                        {hasRun ? (
                          <span style={{ fontSize: "0.65rem", color: "#16a34a", fontWeight: 600 }}>● Verified</span>
                        ) : (
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>○ Ready</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: isSelected ? 700 : 500, color: "var(--text-primary)" }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        Stage: {c.pipelineStage}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Case Deep-Dive & Real Execution Trace */}
            <div>
              {/* Case Header Card */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span className="badge badge-indigo" style={{ marginBottom: "0.35rem" }}>
                      Demo Case {selectedCase.number} of 15 · {selectedCase.category}
                    </span>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0.25rem 0", color: "var(--text-primary)" }}>
                      {selectedCase.title}
                    </h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                      {selectedCase.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeCase(selectedCase.id)}
                    disabled={loadingCaseId === selectedCase.id}
                    className="btn btn-primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.85rem",
                      padding: "0.5rem 0.9rem",
                    }}
                  >
                    <Play size={14} className={loadingCaseId === selectedCase.id ? "spin-icon" : ""} />
                    <span>{loadingCaseId === selectedCase.id ? "Running Live Engine..." : "Execute Real Engine"}</span>
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--border-default)",
                    display: "flex",
                    gap: "1.5rem",
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <div>
                    <strong>Pipeline Stage:</strong> {selectedCase.pipelineStage}
                  </div>
                  <div>
                    <strong>Benchmark Ground Truth:</strong> {selectedCase.evaluationReference}
                  </div>
                </div>
              </div>

              {/* Six-Stage Academic Execution Stream */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* 1. INPUT */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#3448A5", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      1
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      INPUT (ACADEMIC SOURCE TEXT / DOCUMENT EXTRACT)
                    </span>
                  </div>
                  <pre
                    style={{
                      background: "var(--bg-canvas, #f8f9fa)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "6px",
                      padding: "0.75rem",
                      fontSize: "0.82rem",
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-mono, monospace)",
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    {selectedCase.rawInput}
                  </pre>
                  {selectedCase.secondaryInput && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)" }}>Secondary Channel Input:</span>
                      <pre
                        style={{
                          background: "var(--bg-canvas, #f8f9fa)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "6px",
                          padding: "0.5rem",
                          fontSize: "0.8rem",
                          whiteSpace: "pre-wrap",
                          fontFamily: "var(--font-mono, monospace)",
                          color: "var(--text-primary)",
                          margin: "0.2rem 0 0 0",
                        }}
                      >
                        {selectedCase.secondaryInput}
                      </pre>
                    </div>
                  )}
                </div>

                {/* 2. NLP UNDERSTANDING */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#3448A5", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      2
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      NLP UNDERSTANDING (EXTRACTION &amp; NORMALIZATION)
                    </span>
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {currentResult ? (
                      currentResult.nlpUnderstanding
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                        Click &quot;Execute Real Engine&quot; to run live extraction...
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. STRUCTURED RESULT */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#3448A5", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      3
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      STRUCTURED RESULT (INTELLIGENCE PAYLOAD)
                    </span>
                  </div>
                  {currentResult ? (
                    <pre
                      style={{
                        background: "var(--bg-canvas, #f8f9fa)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "6px",
                        padding: "0.75rem",
                        fontSize: "0.76rem",
                        maxHeight: "220px",
                        overflowY: "auto",
                        fontFamily: "var(--font-mono, monospace)",
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {JSON.stringify(currentResult.structuredResult, null, 2)}
                    </pre>
                  ) : (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      Awaiting engine execution.
                    </div>
                  )}
                </div>

                {/* 4. EVIDENCE */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#3448A5", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      4
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      EVIDENCE (SOURCE SPAN &amp; ATTRIBUTION)
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.84rem",
                      color: "var(--text-primary)",
                      background: "rgba(184, 138, 69, 0.08)",
                      borderLeft: "3px solid #B88A45",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "0 6px 6px 0",
                    }}
                  >
                    {currentResult ? currentResult.evidence : "N/A"}
                  </div>
                </div>

                {/* 5. SYSTEM ACTION */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#3448A5", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      5
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      SYSTEM ACTION (ACADEMIC COMMAND CENTER MUTATION)
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--accent-primary)",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {currentResult ? currentResult.systemAction : "Awaiting execution"}
                  </div>
                </div>

                {/* 6. EXPLANATION */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#3448A5", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      6
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      EXPLANATION (PEDAGOGICAL &amp; COGNITIVE JUSTIFICATION)
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {currentResult ? currentResult.explanation : "Awaiting execution"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: NLP INTELLIGENCE PIPELINE */}
        {/* ============================================================ */}
        {activeTab === "pipeline" && (
          <div>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                End-to-End Academic NLP Intelligence Architecture
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                Every ingested academic item progresses through an explicit multi-layer comprehension graph. Statistical and multimodal models extract features, while deterministic invariant engines govern priority, academic state transitions, risk radar calculations, and mutation safety.
              </p>
            </div>

            {/* Pipeline Stepper Flow */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {PIPELINE_STAGES.map((stage, idx) => {
                const stageCases = FACULTY_DEMO_CASES.filter((c) =>
                  c.pipelineStage.toLowerCase().includes(stage.name.toLowerCase().split(" ")[0])
                );
                return (
                  <div
                    key={stage.id}
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "var(--accent-primary)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {stage.name}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {stage.desc}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {stageCases.length} demo case(s)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStageFilter(stage.name.split(" ")[0]);
                          setActiveTab("demos");
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                      >
                        View Cases
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: EVIDENCE & TRACE INSPECTOR */}
        {/* ============================================================ */}
        {activeTab === "evidence" && (
          <div>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Evidence &amp; Trace Inspector: {selectedCase.title}
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    Full transparency into extracted spans, page coordinates, normalized timestamps, and downstream impact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => executeCase(selectedCase.id)}
                  disabled={loadingCaseId === selectedCase.id}
                  className="btn btn-primary"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                >
                  <RefreshCw size={13} className={loadingCaseId === selectedCase.id ? "spin-icon" : ""} />
                  <span>Re-run Trace</span>
                </button>
              </div>
            </div>

            {currentResult ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                {/* Column 1: Source & Raw Attribution */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      ORIGINAL ACADEMIC SOURCE
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {currentResult.trace.originalSource}
                    </div>
                    {currentResult.trace.sourcePageInfo && (
                      <div style={{ fontSize: "0.75rem", color: "var(--accent-primary)", marginTop: "0.2rem" }}>
                        Attribution: {currentResult.trace.sourcePageInfo}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      VERIFIED EVIDENCE SNIPPET
                    </div>
                    <blockquote
                      style={{
                        margin: 0,
                        padding: "0.6rem 0.8rem",
                        background: "rgba(245, 158, 11, 0.08)",
                        borderLeft: "3px solid #f59e0b",
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      &quot;{currentResult.trace.evidenceSnippet}&quot;
                    </blockquote>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      NORMALIZED DATE &amp; TIME (ASIA/KOLKATA)
                    </div>
                    <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono, monospace)", color: "var(--text-primary)" }}>
                      {currentResult.trace.normalizedDateTime || "No timestamp associated"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      RELATIONSHIP TO PRIOR KNOWLEDGE
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-primary)" }}>
                      {currentResult.trace.relationshipToPrevious || "NEW (No prior matched record)"}
                    </div>
                  </div>
                </div>

                {/* Column 2: Downstream Intelligence Impact */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      TASK &amp; EVENT MUTATION
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {currentResult.trace.resultingTaskEventChange || "No database mutation"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      PRIORITY &amp; RISK REASONING
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {currentResult.trace.priorityRiskReasoning || "Standard baseline priority"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      NOTIFICATION INTELLIGENCE REASONING
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {currentResult.trace.notificationReasoning || "Standard staged notification schedule"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      AI ASSISTANT GROUNDED EXPOSURE
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {currentResult.trace.assistantGrounding || "Accessible via grounded tool lookups"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                Execute the case in Tab 1 to inspect evidence traces.
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: M8-E FINAL EVALUATION BENCHMARK */}
        {/* ============================================================ */}
        {activeTab === "evaluation" && (
          <div>
            {/* Scientific Integrity Note */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Reproducible Final Benchmark Standards &amp; Metric Discipline
                </h2>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                Every metric reported below is derived from our executable benchmark suite (<code>scripts/test-milestone8-final-evaluation.ts</code>) over a 110-item curated academic dataset (50 TRAIN / 25 DEV / 35 TEST).
                Per academic integrity standards, we strictly distinguish between statistical NLP models (evaluated on accuracy/F1) and deterministic rule engines (evaluated on invariant preservation and scenario success). No numbers are approximated or fabricated.
              </p>
            </div>

            {/* Benchmark Table */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                marginBottom: "1.5rem",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-canvas, #f8f9fa)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Component
                    </th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Architecture Type
                    </th>
                    <th style={{ textAlign: "center", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Samples
                    </th>
                    <th style={{ textAlign: "center", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Performance
                    </th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Key Metric &amp; Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EVALUATION_BENCHMARK_SUMMARY.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid var(--border-default)",
                        background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {row.component}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                        <span className="badge badge-indigo">{row.category}</span>
                      </td>
                      <td style={{ textAlign: "center", padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                        {row.sampleSize}
                      </td>
                      <td style={{ textAlign: "center", padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: parseFloat(row.accuracyOrSuccess) >= 70 ? "#16a34a" : "#ca8a04",
                          }}
                        >
                          {row.accuracyOrSuccess}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.8rem" }}>
                          {row.keyMetric}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          {row.notes}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Error Analysis Overview */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                Honest Error Analysis &amp; Systemic Edge Cases (from docs/error-analysis.md)
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                Failure modes observed on the untouched TEST set were logged without synthetic data manipulation:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#b91c1c", marginBottom: "0.2rem" }}>
                    Informal Student Slang
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Phrases like &quot;DA2 due date got pushed&quot; lack formal university header keywords, occasionally dropping statistical classification confidence below threshold.
                  </div>
                </div>

                <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#b91c1c", marginBottom: "0.2rem" }}>
                    Extreme OCR Distortion
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Severe lens glare or skewed low-res mobile photos generate character substitution noise requiring fuzzy Levenshtein distance fallbacks.
                  </div>
                </div>

                <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#b91c1c", marginBottom: "0.2rem" }}>
                    Multi-Clause Reschedules
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Complex circulars shifting multiple batch timings in a single sentence require multi-entity resolution to avoid binding the wrong new time to a previous task.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
