"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, BarChart3, PieChart, Layers, Calendar } from "lucide-react";

export interface TaskCompletionData {
  completed: number;
  pending: number;
  overdue: number;
  total: number;
}

export interface DayWorkloadData {
  dateKey: string;
  dayLabel: string;
  dayOfWeek: string;
  dateNum: number;
  assignmentsCount: number;
  examsCount: number;
  eventsCount: number;
  totalCount: number;
  items: Array<{ title: string; category: string; courseCode?: string | null }>;
}

export interface DashboardChartsProps {
  completion: TaskCompletionData;
  sevenDayWorkload: DayWorkloadData[];
}

export default function DashboardCharts({
  completion,
  sevenDayWorkload,
}: DashboardChartsProps) {
  const [hoveredDay, setHoveredDay] = useState<DayWorkloadData | null>(null);

  // --- Chart A: Donut Calculations ---
  const { completed, pending, overdue, total } = completion;
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89

  const pctCompleted = total > 0 ? completed / total : 0;
  const pctPending = total > 0 ? pending / total : 0;
  const pctOverdue = total > 0 ? overdue / total : 0;

  const lenCompleted = pctCompleted * circumference;
  const lenPending = pctPending * circumference;
  const lenOverdue = pctOverdue * circumference;

  const offsetCompleted = 0;
  const offsetPending = -lenCompleted;
  const offsetOverdue = -(lenCompleted + lenPending);

  // --- Chart B: Workload Max Scaling ---
  const maxItems = Math.max(1, ...sevenDayWorkload.map((d) => d.totalCount));
  const chartHeightPx = 110;
  const totalUpcoming7Days = sevenDayWorkload.reduce((sum, d) => sum + d.totalCount, 0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "1rem",
        marginBottom: "1.25rem",
      }}
      aria-label="Dashboard Analytics Overview"
    >
      {/* ── CHART A: Task Completion Overview ───────────────────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem 1.4rem",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "var(--radius-xs)",
                  background: "rgba(52, 72, 165, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-academic)",
                }}
              >
                <PieChart size={14} />
              </div>
              <h3
                style={{
                  fontSize: "1.02rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Task Completion Overview
              </h3>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                background: "var(--bg-app)",
                padding: "0.15rem 0.5rem",
                borderRadius: "999px",
                border: "1px solid var(--border-default)",
              }}
            >
              {total} tracked
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 1rem 0" }}>
            Deliverables grouped by strict status precedence (Completed &gt; Overdue &gt; Pending).
          </p>
        </div>

        {total === 0 ? (
          <div
            style={{
              padding: "1.5rem 1rem",
              textAlign: "center",
              background: "var(--bg-app)",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--border-default)",
            }}
          >
            <Clock size={20} style={{ color: "var(--text-muted)", margin: "0 auto 0.4rem auto" }} />
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
              No active tasks found
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Ingest notices or course syllabi to populate trackable tasks.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "1rem" }}>
            {/* Donut SVG */}
            <div style={{ position: "relative", width: "115px", height: "115px", flexShrink: 0 }}>
              <svg width="115" height="115" viewBox="0 0 115 115" style={{ transform: "rotate(-90deg)" }}>
                {/* Background Track */}
                <circle
                  cx="57.5"
                  cy="57.5"
                  r={radius}
                  fill="transparent"
                  stroke="var(--border-default)"
                  strokeWidth="11"
                />
                {/* Completed Slice */}
                {lenCompleted > 0 && (
                  <circle
                    cx="57.5"
                    cy="57.5"
                    r={radius}
                    fill="transparent"
                    stroke="#2E7D4E"
                    strokeWidth="11"
                    strokeDasharray={`${lenCompleted} ${circumference}`}
                    strokeDashoffset={offsetCompleted}
                    style={{ transition: "stroke-dasharray 0.5s ease" }}
                  />
                )}
                {/* Pending Slice */}
                {lenPending > 0 && (
                  <circle
                    cx="57.5"
                    cy="57.5"
                    r={radius}
                    fill="transparent"
                    stroke="#3448A5"
                    strokeWidth="11"
                    strokeDasharray={`${lenPending} ${circumference}`}
                    strokeDashoffset={offsetPending}
                    style={{ transition: "stroke-dasharray 0.5s ease" }}
                  />
                )}
                {/* Overdue Slice */}
                {lenOverdue > 0 && (
                  <circle
                    cx="57.5"
                    cy="57.5"
                    r={radius}
                    fill="transparent"
                    stroke="#C45135"
                    strokeWidth="11"
                    strokeDasharray={`${lenOverdue} ${circumference}`}
                    strokeDashoffset={offsetOverdue}
                    style={{ transition: "stroke-dasharray 0.5s ease" }}
                  />
                )}
              </svg>
              {/* Center Metrics Label */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    color: "var(--text-primary)",
                    lineHeight: 1,
                  }}
                >
                  {total}
                </span>
                <span
                  style={{
                    fontSize: "0.62rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginTop: "2px",
                  }}
                >
                  Tasks
                </span>
              </div>
            </div>

            {/* Legend & Exact Counts */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, minWidth: "160px" }}>
              {/* Completed */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#2E7D4E" }} />
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>Completed</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{completed}</strong>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                    ({total > 0 ? Math.round(pctCompleted * 100) : 0}%)
                  </span>
                </div>
              </div>

              {/* Pending */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#3448A5" }} />
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>Pending</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{pending}</strong>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                    ({total > 0 ? Math.round(pctPending * 100) : 0}%)
                  </span>
                </div>
              </div>

              {/* Overdue */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#C45135" }} />
                  <span style={{ fontSize: "0.78rem", color: overdue > 0 ? "#C45135" : "var(--text-secondary)", fontWeight: overdue > 0 ? 700 : 500 }}>
                    Overdue
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                  <strong style={{ fontSize: "0.85rem", color: overdue > 0 ? "#C45135" : "var(--text-primary)" }}>{overdue}</strong>
                  <span style={{ fontSize: "0.68rem", color: overdue > 0 ? "#C45135" : "var(--text-muted)" }}>
                    ({total > 0 ? Math.round(pctOverdue * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CHART B: Seven-Day Academic Workload ────────────────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem 1.4rem",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "var(--radius-xs)",
                  background: "rgba(52, 72, 165, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-academic)",
                }}
              >
                <BarChart3 size={14} />
              </div>
              <h3
                style={{
                  fontSize: "1.02rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                7-Day Academic Workload
              </h3>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.68rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: "#3448A5" }} />
                Tasks
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: "#B88A45" }} />
                Exams
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: "#526176" }} />
                Events
              </span>
            </div>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 1rem 0" }}>
            Upcoming deadlines and scheduled sessions grouped by local IST calendar date.
          </p>
        </div>

        {totalUpcoming7Days === 0 ? (
          <div
            style={{
              padding: "1.5rem 1rem",
              textAlign: "center",
              background: "var(--bg-app)",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--border-default)",
            }}
          >
            <Calendar size={20} style={{ color: "var(--text-muted)", margin: "0 auto 0.4rem auto" }} />
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
              No upcoming academic work in the next 7 days
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Your schedule is clear. Check the Full Calendar for long-range milestones.
            </div>
          </div>
        ) : (
          <div>
            {/* Bar Chart Columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "0.45rem",
                alignItems: "flex-end",
                height: `${chartHeightPx}px`,
                borderBottom: "1px solid var(--border-default)",
                paddingBottom: "4px",
              }}
            >
              {sevenDayWorkload.map((day, idx) => {
                const isToday = idx === 0;
                const total = day.totalCount;
                const heightPct = total > 0 ? Math.min(100, Math.max(16, (total / maxItems) * 100)) : 0;

                const taskPct = total > 0 ? (day.assignmentsCount / total) * 100 : 0;
                const examPct = total > 0 ? (day.examsCount / total) * 100 : 0;
                const eventPct = total > 0 ? (day.eventsCount / total) * 100 : 0;

                return (
                  <div
                    key={day.dateKey}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      cursor: total > 0 ? "pointer" : "default",
                      position: "relative",
                    }}
                    title={`${day.dayLabel}: ${total} item(s) (${day.assignmentsCount} tasks, ${day.examsCount} exams, ${day.eventsCount} events)`}
                  >
                    {/* Item count above bar */}
                    {total > 0 && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: isToday ? "var(--accent-academic)" : "var(--text-primary)",
                          marginBottom: "3px",
                          lineHeight: 1,
                        }}
                      >
                        {total}
                      </span>
                    )}

                    {/* Stacked Bar */}
                    {total > 0 ? (
                      <div
                        style={{
                          width: "80%",
                          maxWidth: "24px",
                          height: `${heightPct}%`,
                          borderRadius: "4px 4px 1px 1px",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column-reverse",
                          background: "var(--border-default)",
                          transition: "height 0.3s ease",
                        }}
                      >
                        {/* Assignments (Bottom) */}
                        {day.assignmentsCount > 0 && (
                          <div style={{ height: `${taskPct}%`, background: "#3448A5" }} />
                        )}
                        {/* Exams (Middle) */}
                        {day.examsCount > 0 && (
                          <div style={{ height: `${examPct}%`, background: "#B88A45" }} />
                        )}
                        {/* Events (Top) */}
                        {day.eventsCount > 0 && (
                          <div style={{ height: `${eventPct}%`, background: "#526176" }} />
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          width: "4px",
                          height: "6px",
                          borderRadius: "2px",
                          background: "var(--border-subtle)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* X-Axis Day Labels */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "0.45rem",
                marginTop: "0.4rem",
              }}
            >
              {sevenDayWorkload.map((day, idx) => {
                const isToday = idx === 0;
                return (
                  <div key={day.dateKey} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: isToday ? 800 : 600,
                        color: isToday ? "var(--accent-academic)" : "var(--text-secondary)",
                      }}
                    >
                      {day.dayOfWeek}
                    </div>
                    <div
                      style={{
                        fontSize: "0.62rem",
                        color: isToday ? "var(--accent-academic)" : "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: isToday ? 700 : 500,
                      }}
                    >
                      {isToday ? "Today" : day.dateNum}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Day Inspector Preview */}
            {hoveredDay && hoveredDay.totalCount > 0 && (
              <div
                style={{
                  marginTop: "0.6rem",
                  padding: "0.4rem 0.65rem",
                  background: "var(--bg-app)",
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.72rem",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <strong>{hoveredDay.dayLabel}:</strong> {hoveredDay.items.map((it) => it.title).join("; ")}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-academic)", fontWeight: 700 }}>
                  {hoveredDay.totalCount} due
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
