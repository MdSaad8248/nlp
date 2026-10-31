"use client";

import React, { useState } from "react";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  Layers,
} from "lucide-react";

export interface StudentAnalyticsProps {
  analytics: {
    courseProgress: Array<{
      code: string;
      title: string;
      progress: number;
      completed: number;
      total: number;
    }>;
    taskDonut: {
      completed: number;
      pending: number;
      overdue: number;
      needsReview: number;
      total: number;
    };
    weeklyTrend: Array<{
      day: string;
      completed: number;
      active: number;
    }>;
    upcomingWorkload: Array<{
      day: string;
      count: number;
    }>;
  };
}

export default function StudentAnalyticsSection({ analytics }: StudentAnalyticsProps) {
  const { courseProgress, taskDonut, weeklyTrend, upcomingWorkload } = analytics;

  // Hover state for interactive tooltips
  const [hoveredCourse, setHoveredCourse] = useState<any | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // --- 1. Task Donut Chart Math ---
  const { completed, pending, overdue, needsReview, total } = taskDonut;
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  const pctCompleted = total > 0 ? completed / total : 0;
  const pctPending = total > 0 ? pending / total : 0;
  const pctOverdue = total > 0 ? overdue / total : 0;
  const pctNeedsReview = total > 0 ? needsReview / total : 0;

  const lenCompleted = pctCompleted * circumference;
  const lenPending = pctPending * circumference;
  const lenOverdue = pctOverdue * circumference;
  const lenNeedsReview = pctNeedsReview * circumference;

  const offsetCompleted = 0;
  const offsetPending = -lenCompleted;
  const offsetOverdue = -(lenCompleted + lenPending);
  const offsetNeedsReview = -(lenCompleted + lenPending + lenOverdue);

  // --- 2. Weekly Trend SVG Path Math (Line / Area chart) ---
  const trendMax = Math.max(1, ...weeklyTrend.map((t) => Math.max(t.completed, t.active)));
  const svgWidth = 320;
  const svgHeight = 110;
  const padX = 24;
  const padY = 16;
  const chartW = svgWidth - padX * 2;
  const chartH = svgHeight - padY * 2;

  const points = weeklyTrend.map((t, idx) => {
    const x = padX + (idx / (weeklyTrend.length - 1)) * chartW;
    const y = padY + chartH - (t.completed / trendMax) * chartH;
    return { x, y, ...t };
  });

  const linePath = points.reduce(
    (acc, pt, idx, arr) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      // Smooth cubic bezier curve
      const prev = arr[idx - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
    },
    ""
  );

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`
    : "";

  // --- 3. Upcoming Workload Max ---
  const workloadMax = Math.max(1, ...upcomingWorkload.map((w) => w.count));

  return (
    <div style={{ marginTop: "1.75rem", marginBottom: "1.5rem" }}>
      {/* Section Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              fontFamily: "var(--font-sans)",
              color: "#172033",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Academic Performance &amp; Analytics
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#647089", margin: "0.15rem 0 0 0" }}>
            Real-time course progression, deliverable reconciliation, and cognitive workload distribution.
          </p>
        </div>
      </div>

      {/* 2-Column Responsive Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* CHART 1: Course Progress Chart (Horizontal Bars) */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.4rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "rgba(70, 88, 200, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#4658C8",
                  }}
                >
                  <BarChart3 size={16} />
                </div>
                <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                  Course Academic Progress
                </h3>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#647089", fontWeight: 600 }}>
                {courseProgress.length} Enrolled Courses
              </span>
            </div>
            <p style={{ fontSize: "0.76rem", color: "#647089", marginBottom: "1.25rem" }}>
              Progress completion benchmarks across authorized semester course modules.
            </p>

            {/* Horizontal Bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {courseProgress.map((c) => (
                <div key={c.code}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#172033" }}>{c.code}</span>
                      <span style={{ fontSize: "0.76rem", color: "#647089" }}>&bull; {c.title}</span>
                    </div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#172033" }}>
                      {c.progress}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
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
                        borderRadius: "999px",
                        background:
                          c.code === "CSE4001"
                            ? "#4658C8"
                            : c.code === "CSE3002"
                            ? "#10B981"
                            : c.code === "CSE2004"
                            ? "#F59E0B"
                            : c.code === "CSE2010"
                            ? "#06B6D4"
                            : "#8B5CF6",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CHART 2: Task and Assessment Status (Donut Chart) */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.4rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10B981",
                  }}
                >
                  <PieChart size={16} />
                </div>
                <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                  Task &amp; Assessment Status
                </h3>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#647089", fontWeight: 600 }}>
                {total} Deliverables
              </span>
            </div>
            <p style={{ fontSize: "0.76rem", color: "#647089", marginBottom: "1rem" }}>
              Categorized deliverable health reconciling active deliverables and verified marks.
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "1.25rem" }}>
              {/* Donut SVG */}
              <div style={{ position: "relative", width: "120px", height: "120px", flexShrink: 0 }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="14"
                  />
                  {/* Completed (Teal/Green) */}
                  {lenCompleted > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="#10B981"
                      strokeWidth="14"
                      strokeDasharray={`${lenCompleted} ${circumference}`}
                      strokeDashoffset={offsetCompleted}
                      strokeLinecap="round"
                    />
                  )}
                  {/* Needs Review / Pending (Indigo) */}
                  {lenPending > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="#4658C8"
                      strokeWidth="14"
                      strokeDasharray={`${lenPending} ${circumference}`}
                      strokeDashoffset={offsetPending}
                    />
                  )}
                  {/* Overdue (Red) */}
                  {lenOverdue > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="#EF4444"
                      strokeWidth="14"
                      strokeDasharray={`${lenOverdue} ${circumference}`}
                      strokeDashoffset={offsetOverdue}
                    />
                  )}
                </svg>
                {/* Center text */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#172033", lineHeight: 1 }}>
                    {total}
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "#647089", fontWeight: 600, marginTop: "2px" }}>
                    Total
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", minWidth: "150px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
                    <span style={{ color: "#172033" }}>Completed</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#172033" }}>
                    {completed} ({total > 0 ? Math.round((completed / total) * 100) : 0}%)
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4658C8" }} />
                    <span style={{ color: "#172033" }}>In Progress</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#172033" }}>
                    {pending} ({total > 0 ? Math.round((pending / total) * 100) : 0}%)
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }} />
                    <span style={{ color: "#172033" }}>Overdue</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#172033" }}>
                    {overdue} ({total > 0 ? Math.round((overdue / total) * 100) : 0}%)
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F59E0B" }} />
                    <span style={{ color: "#172033" }}>Awaiting Review</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#172033" }}>
                    {needsReview} ({total > 0 ? Math.round((needsReview / total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CHART 3: Weekly Activity & Completion Trend (Line/Area Chart) */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.4rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "rgba(70, 88, 200, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#4658C8",
                }}
              >
                <TrendingUp size={16} />
              </div>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                Weekly Completion Trend
              </h3>
            </div>
            <span style={{ fontSize: "0.72rem", color: "#10B981", fontWeight: 700 }}>
              &uarr; 14% vs last week
            </span>
          </div>
          <p style={{ fontSize: "0.76rem", color: "#647089", marginBottom: "0.75rem" }}>
            Historical progression of completed deliverables over the past 7 days.
          </p>

          {/* SVG Area Chart */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "115px" }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4658C8" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#4658C8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line x1={padX} y1={padY} x2={svgWidth - padX} y2={padY} stroke="#F1F5F9" strokeWidth="1" />
              <line
                x1={padX}
                y1={padY + chartH / 2}
                x2={svgWidth - padX}
                y2={padY + chartH / 2}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <line
                x1={padX}
                y1={padY + chartH}
                x2={svgWidth - padX}
                y2={padY + chartH}
                stroke="#E4E8F1"
                strokeWidth="1"
              />

              {/* Gradient Area */}
              <path d={areaPath} fill="url(#trendGradient)" />

              {/* Main Line */}
              <path d={linePath} fill="none" stroke="#4658C8" strokeWidth="2.5" strokeLinecap="round" />

              {/* Data Dots & Day Labels */}
              {points.map((pt, idx) => (
                <g key={pt.day}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredTrendIndex === idx ? 5 : 3.5}
                    fill="#FFFFFF"
                    stroke="#4658C8"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredTrendIndex(idx)}
                    onMouseLeave={() => setHoveredTrendIndex(null)}
                    style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                  />
                  <text
                    x={pt.x}
                    y={svgHeight - 2}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#647089"
                    fontWeight="600"
                  >
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* CHART 4: Upcoming Workload (Bar Chart Timeline) */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.4rem",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "rgba(245, 158, 11, 0.09)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#D97706",
                }}
              >
                <Calendar size={16} />
              </div>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#172033", margin: 0 }}>
                7-Day Workload Distribution
              </h3>
            </div>
            <span style={{ fontSize: "0.72rem", color: "#647089", fontWeight: 600 }}>
              Daily Deliverables
            </span>
          </div>
          <p style={{ fontSize: "0.76rem", color: "#647089", marginBottom: "1rem" }}>
            Assigned exams, reviews, and task deadlines scheduled for the upcoming week.
          </p>

          {/* Bar Chart */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              height: "105px",
              paddingTop: "0.5rem",
              borderBottom: "1px solid #E4E8F1",
            }}
          >
            {upcomingWorkload.map((w, idx) => {
              const heightPct = Math.max(12, Math.round((w.count / workloadMax) * 85));
              const isToday = idx === 0;

              return (
                <div
                  key={w.day}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.4rem",
                    flex: 1,
                  }}
                >
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isToday ? "#4658C8" : "#172033" }}>
                    {w.count}
                  </span>
                  <div
                    style={{
                      width: "28px",
                      height: `${heightPct}px`,
                      borderRadius: "6px 6px 0 0",
                      background: isToday
                        ? "#4658C8"
                        : w.count > 2
                        ? "#EF4444"
                        : w.count > 0
                        ? "#10B981"
                        : "#E4E8F1",
                      transition: "height 0.3s ease",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? "#4658C8" : "#647089",
                      marginTop: "0.2rem",
                    }}
                  >
                    {w.day.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
