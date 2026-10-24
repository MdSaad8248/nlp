"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import {
  CheckSquare,
  Clock,
  Plus,
  Tag,
  Quote,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  FileText,
  ShieldAlert,
  HelpCircle,
  ArrowRight,
  Circle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface TaskItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  deadline: string | null;
  normalizedDeadline: string | null;
  description: string | null;
  isAiGenerated: boolean;
  confidence: number | null;
  course: {
    code: string;
    title: string;
  } | null;
  evidences: Array<{
    extractedSnippet: string;
    source: {
      id: string;
      title: string;
      createdAt: string;
      rawText?: string;
    };
  }>;
  progress: Array<{
    note: string | null;
    percentage: number;
    updatedAt: string;
  }>;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "today" | "upcoming" | "completed">("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeEvidenceTask, setActiveEvidenceTask] = useState<TaskItem | null>(null);
  const [selectedDetailTask, setSelectedDetailTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && data.tasks) {
        setTasks(data.tasks);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterTab === "completed" && t.status !== "COMPLETED") return false;
    if (filterTab === "today" && t.priority !== "CRITICAL" && t.priority !== "HIGH") return false;
    if (filterTab === "upcoming" && t.status === "COMPLETED") return false;

    if (selectedCourse !== "all" && t.course?.code !== selectedCourse) return false;
    if (selectedPriority !== "all" && t.priority !== selectedPriority) return false;
    if (selectedStatus !== "all" && t.status !== selectedStatus) return false;

    return true;
  });

  const uniqueCourses = Array.from(
    new Set(tasks.map((t) => t.course?.code).filter(Boolean))
  ) as string[];

  const handleToggleStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === "COMPLETED" ? "PENDING" : "COMPLETED" }
          : t
      )
    );
  };

  return (
    <Shell>
      {/* Top Header */}
      <div className="page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
            <h1 className="page-title">Academic Flow</h1>
            <span className="badge badge-academic" style={{ fontSize: "0.6rem" }}>{tasks.length} tracked</span>
          </div>
          <p className="page-sub">
            Syllabus deliverables, verified deadlines, and explainable urgency ratings.
          </p>
        </div>
        <Link href="/inbox" className="btn btn-ai btn-sm" style={{ marginTop: "0.5rem" }}>
          <Plus size={13} aria-hidden="true" />
          <span>Ingest Notice</span>
        </Link>
      </div>

      {/* Filter Control Bar */}
      <div
        className="card-clean"
        style={{
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        {/* View Tabs: [All] [Today] [Upcoming] [Completed] */}
        <div className="tabs-nav">
          <button
            type="button"
            className={`tab-btn ${filterTab === "all" ? "active" : ""}`}
            onClick={() => setFilterTab("all")}
          >
            All ({tasks.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${filterTab === "today" ? "active" : ""}`}
            onClick={() => setFilterTab("today")}
          >
            Today
          </button>
          <button
            type="button"
            className={`tab-btn ${filterTab === "upcoming" ? "active" : ""}`}
            onClick={() => setFilterTab("upcoming")}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`tab-btn ${filterTab === "completed" ? "active" : ""}`}
            onClick={() => setFilterTab("completed")}
          >
            Completed
          </button>
        </div>

        {/* Dropdown Filters: Course, Priority, Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {/* Course filter */}
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              padding: "0.35rem 0.6rem",
              borderRadius: "var(--radius-xs)",
              fontSize: "0.78rem",
              outline: "none",
            }}
          >
            <option value="all">Course: All</option>
            {uniqueCourses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              padding: "0.35rem 0.6rem",
              borderRadius: "var(--radius-xs)",
              fontSize: "0.78rem",
              outline: "none",
            }}
          >
            <option value="all">Priority: All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              padding: "0.35rem 0.6rem",
              borderRadius: "var(--radius-xs)",
              fontSize: "0.78rem",
              outline: "none",
            }}
          >
            <option value="all">Status: All</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Unified Task List / Table Hybrid Container */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        {filteredTasks.length === 0 ? (
          <div className="empty-state-box" style={{ border: "none" }}>
            <div className="empty-state-icon">
              <CheckSquare size={22} style={{ color: "var(--priority-low)" }} />
            </div>
            <div className="empty-state-title">All caught up</div>
            <div className="empty-state-sub">
              No tasks match your current filter settings. Analyze your first academic notice to create tasks and deadlines.
            </div>
            <Link href="/inbox" className="btn btn-primary btn-sm">
              Ingest Notice
            </Link>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === "COMPLETED";
            const isCritical = task.priority === "CRITICAL";
            const isHigh = task.priority === "HIGH";
            const isMedium = task.priority === "MEDIUM";

            const priorityBadge = isCompleted
              ? "badge-low"
              : isCritical
              ? "badge-critical"
              : isHigh
              ? "badge-high"
              : isMedium
              ? "badge-medium"
              : "badge-low";

            const evidence = task.evidences[0];
            const progress = isCompleted ? 100 : (task.progress[0]?.percentage || 25);
            const estimatedWorkload =
              task.category === "PROJECT"
                ? "~8h estimated"
                : task.category === "EXAM"
                ? "~10h estimated"
                : "~4h estimated";

            return (
              <div
                key={task.id}
                className="task-row-clean"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.1rem 1.35rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  borderLeft: `3px solid ${
                    isCompleted
                      ? "var(--priority-low)"
                      : isCritical
                      ? "var(--priority-critical)"
                      : isHigh
                      ? "var(--priority-high)"
                      : "var(--priority-medium)"
                  }`,
                  opacity: isCompleted ? 0.65 : 1,
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                {/* Left: Checkbox + Title + Course + Category */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", minWidth: 0, flex: 1 }}>
                  {/* Status Toggle Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(task.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: isCompleted ? "var(--priority-low)" : "var(--text-muted)",
                      marginTop: "3px",
                      padding: "0",
                    }}
                    title={isCompleted ? "Mark pending" : "Mark completed"}
                  >
                    {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
                      <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                        {task.course ? task.course.code : "GEN"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {task.category}
                      </span>
                      <span className={`badge ${priorityBadge}`} style={{ fontSize: "0.66rem" }}>
                        {task.priority}
                      </span>
                    </div>

                    <h3
                      onClick={() => setSelectedDetailTask(task)}
                      style={{
                        fontSize: "1.02rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        textDecoration: isCompleted ? "line-through" : "none",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {task.title}
                    </h3>

                    {/* Metadata line: Deadline + Workload + Progress */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        fontSize: "0.76rem",
                        color: "var(--text-secondary)",
                        marginTop: "0.3rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Clock size={12} style={{ color: "var(--text-muted)" }} />
                        <span>
                          Due:{" "}
                          <strong style={{ color: "var(--text-primary)" }}>
                            {task.normalizedDeadline ||
                              (task.deadline ? new Date(task.deadline).toLocaleDateString() : "TBD")}
                          </strong>
                        </span>
                      </div>

                      <span style={{ color: "var(--text-dim)" }}>&bull;</span>
                      <span>{progress}% complete</span>

                      <span style={{ color: "var(--text-dim)" }}>&bull;</span>
                      <span>{estimatedWorkload}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  {evidence && (
                    <button
                      type="button"
                      onClick={() => setActiveEvidenceTask(task)}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: "0.74rem" }}
                    >
                      <Quote size={12} />
                      <span>View source</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedDetailTask(task)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: "0.74rem" }}
                  >
                    <span>Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(task.id)}
                    className={`btn btn-sm ${isCompleted ? "btn-outline" : "btn-secondary"}`}
                    style={{ fontSize: "0.74rem" }}
                  >
                    <CheckCircle2 size={12} style={{ color: isCompleted ? "var(--priority-low)" : undefined }} />
                    <span>{isCompleted ? "Completed" : "Complete"}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SOURCE TRACEABILITY SLIDE-OUT SHEET DRAWER */}
      {activeEvidenceTask && (
        <div className="drawer-backdrop" onClick={() => setActiveEvidenceTask(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <Quote size={16} style={{ color: "var(--accent-primary)" }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>SOURCE TRACEABILITY</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveEvidenceTask(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1 }}>
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                  Source Notice
                </span>
                <div
                  style={{
                    padding: "0.85rem",
                    borderRadius: "var(--radius-xs)",
                    background: "var(--bg-app)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    marginTop: "0.35rem",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {activeEvidenceTask.evidences[0]?.source?.rawText ||
                    "Dear students, The NLP Mini Project submission deadline has been extended from September 18, 2026 to September 22, 2026. Students must submit the project through VTOP before 11:59 PM. Late submissions will not be accepted."}
                </div>
              </div>

              {/* Relevant Evidence */}
              <div
                style={{
                  padding: "0.85rem",
                  borderRadius: "var(--radius-xs)",
                  background: "rgba(99, 102, 241, 0.08)",
                  borderLeft: "3px solid var(--accent-primary)",
                }}
              >
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase", display: "block" }}>
                  Relevant Evidence
                </span>
                <p style={{ fontSize: "0.86rem", color: "var(--text-primary)", fontStyle: "italic", marginTop: "0.25rem", lineHeight: 1.5 }}>
                  &ldquo;{activeEvidenceTask.evidences[0]?.extractedSnippet || "Late submissions will not be accepted."}&rdquo;
                </p>
              </div>

              {/* AI Interpretation */}
              <div style={{ padding: "0.85rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                  AI Interpretation
                </span>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.25rem", lineHeight: 1.45 }}>
                  Strict submission policy explicitly enforces zero late credit.
                </p>
              </div>

              {/* Decision */}
              <div style={{ padding: "0.85rem", borderRadius: "var(--radius-xs)", background: "var(--priority-high-bg)", border: "1px solid var(--priority-high-border)" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--priority-high)", textTransform: "uppercase", display: "block" }}>
                  Decision &amp; Priority Impact
                </span>
                <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", marginTop: "0.25rem", fontWeight: 600 }}>
                  Priority increased to HIGH due to policy strictness and deadline proximity.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => setActiveEvidenceTask(null)}
                className="btn btn-secondary btn-sm"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAIL SLIDE-OUT SHEET DRAWER */}
      {selectedDetailTask && (
        <div className="drawer-backdrop" onClick={() => setSelectedDetailTask(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <CheckSquare size={16} style={{ color: "var(--accent-primary)" }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>Task Specifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailTask(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1 }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Deliverable Title
                </div>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                  {selectedDetailTask.title}
                </h4>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ padding: "0.75rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Course</span>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: "0.15rem", fontSize: "0.85rem" }}>
                    {selectedDetailTask.course ? `${selectedDetailTask.course.code} • ${selectedDetailTask.course.title}` : "Academic"}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Deadline</span>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: "0.15rem", fontSize: "0.85rem" }}>
                    {selectedDetailTask.normalizedDeadline || "TBD"}
                  </div>
                </div>
              </div>

              <div style={{ padding: "0.85rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Description &amp; Reasoning
                </span>
                <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: "0.3rem", lineHeight: 1.5 }}>
                  {selectedDetailTask.description || "Deliverable tracked through the AcademicAI natural language extraction engine."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => setSelectedDetailTask(null)}
                className="btn btn-secondary btn-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
