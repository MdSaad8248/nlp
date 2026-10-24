"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface PriorityTask {
  id: string;
  title: string;
  courseCode?: string | null;
  courseTitle?: string | null;
  category: string;
  priority: string;
  deadline?: string | Date | null;
  normalizedDeadline?: string | null;
  priorityReason?: string | null;
  penaltyClause?: string | null;
  progress?: number;
}

interface TodayPrioritiesListProps {
  tasks: PriorityTask[];
}

export default function TodayPrioritiesList({ tasks }: TodayPrioritiesListProps) {
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({
    [tasks[0]?.id || ""]: true, // first item open by default for immediate explainability
  });
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  const toggleReason = (taskId: string) => {
    setExpandedReasons((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleToggleComplete = (taskId: string) => {
    setCompletedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  if (tasks.length === 0) {
    return (
      <div className="empty-state-box">
        <div className="empty-state-icon">
          <CheckCircle2 size={22} style={{ color: "var(--priority-low)" }} />
        </div>
        <div className="empty-state-title">All caught up</div>
        <div className="empty-state-sub">
          No urgent deliverables due today. Ingest course announcements to track new deadlines.
        </div>
        <Link href="/inbox" className="btn btn-secondary btn-sm">
          <span>Ingest Notice</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {tasks.map((task) => {
        const isCritical = task.priority === "CRITICAL";
        const priorityBadgeClass = isCritical ? "badge-critical" : "badge-high";
        const isCompleted = !!completedTaskIds[task.id];
        const isReasonExpanded = !!expandedReasons[task.id];
        const estimatedEffort =
          task.category === "PROJECT"
            ? "~8h estimated"
            : task.category === "EXAM"
            ? "~10h estimated"
            : "~4h estimated";
        const progressVal = isCompleted ? 100 : 25;

        return (
          <div
            key={task.id}
            style={{
              padding: "1.25rem 1.35rem",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderLeft: `3px solid ${
                isCompleted
                  ? "var(--priority-low)"
                  : isCritical
                  ? "var(--priority-critical)"
                  : "var(--priority-high)"
              }`,
              opacity: isCompleted ? 0.7 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {/* Top metadata line: Course + Category + Restrained Priority Accent */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="badge badge-neutral" style={{ fontSize: "0.68rem", fontWeight: 600 }}>
                  {task.courseCode || "ACADEMIC"}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  {task.category}
                </span>
              </div>

              <span className={`badge ${isCompleted ? "badge-low" : priorityBadgeClass}`}>
                {isCompleted ? "COMPLETED" : task.priority}
              </span>
            </div>

            {/* PRIMARY ELEMENT: Bold, confident task title */}
            <h3
              style={{
                fontSize: "1.12rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.015em",
                marginBottom: "0.45rem",
                textDecoration: isCompleted ? "line-through" : "none",
              }}
            >
              {task.title}
            </h3>

            {/* Deadline, progress & estimated effort */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "1rem",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Clock size={13} style={{ color: "var(--text-muted)" }} />
                <span>
                  Due:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {task.normalizedDeadline ||
                      (task.deadline ? new Date(task.deadline).toLocaleDateString() : "TBD")}
                  </strong>
                </span>
              </div>

              <span style={{ color: "var(--text-dim)" }}>&bull;</span>

              <span>
                {progressVal}% complete &bull; {estimatedEffort}
              </span>
            </div>

            {/* Hairline Progress Track */}
            <div style={{ marginBottom: "0.75rem" }}>
              <div className="progress-track" style={{ height: "4px" }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${progressVal}%`,
                    background: isCompleted ? "var(--priority-low)" : "var(--accent-primary)",
                  }}
                />
              </div>
            </div>

            {/* Collapsible Reasoning Disclosure */}
            {task.priorityReason && (
              <div style={{ marginBottom: "0.85rem" }}>
                <button
                  type="button"
                  onClick={() => toggleReason(task.id)}
                  className="reasoning-trigger"
                  aria-expanded={isReasonExpanded}
                >
                  <Sparkles size={12} />
                  <span>Why is this priority?</span>
                  {isReasonExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {isReasonExpanded && (
                  <div
                    style={{
                      marginTop: "0.45rem",
                      padding: "0.65rem 0.9rem",
                      borderRadius: "var(--radius-xs)",
                      background: "rgba(0, 0, 0, 0.3)",
                      borderLeft: "2px solid var(--accent-primary)",
                      fontSize: "0.78rem",
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {task.priorityReason}
                  </div>
                )}
              </div>
            )}

            {/* Actions: [Complete] [View details] */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "0.5rem",
                paddingTop: "0.65rem",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <button
                type="button"
                onClick={() => handleToggleComplete(task.id)}
                className={`btn btn-sm ${isCompleted ? "btn-outline" : "btn-secondary"}`}
                style={{ fontSize: "0.76rem" }}
              >
                <CheckCircle2 size={13} style={{ color: isCompleted ? "var(--priority-low)" : undefined }} />
                <span>{isCompleted ? "Completed" : "Complete"}</span>
              </button>

              <Link href="/tasks" className="btn btn-outline btn-sm" style={{ fontSize: "0.76rem" }}>
                <span>View details</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
