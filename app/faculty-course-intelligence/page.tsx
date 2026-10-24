"use client";

import { useState } from "react";
import Shell from "@/components/layout/Shell";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
  BookOpen,
  ArrowRight,
  Filter,
  Info,
} from "lucide-react";
import { getDemoCourseCohort, FacultyCohortAnalysis } from "@/lib/faculty-review/demo-cohort";
import Link from "next/link";

export default function FacultyCourseIntelligencePage() {
  const [cohort] = useState<FacultyCohortAnalysis>(getDemoCourseCohort());
  const [filter, setFilter] = useState<"ALL" | "NOT_SUBMITTED" | "OVERDUE" | "HIGH_RISK">("ALL");

  const filteredStudents = cohort.students.filter((s) => {
    if (filter === "NOT_SUBMITTED") return !s.submitted;
    if (filter === "OVERDUE") return s.isOverdue;
    if (filter === "HIGH_RISK") return s.riskLevel === "CRITICAL" || s.riskLevel === "HIGH";
    return true;
  });

  return (
    <Shell>
      {/* ── HEADER ROW ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--accent-academic)",
              marginBottom: "0.3rem",
            }}
          >
            <Users size={13} />
            <span>Faculty Monitoring &bull; Academic Intelligence at Cohort Level</span>
          </div>
          <h1
            style={{
              fontSize: "1.85rem",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Faculty Course Intelligence
          </h1>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", margin: "0.25rem 0 0 0" }}>
            Real-time cohort deliverable tracking, deadline collision detection, and explainable academic risk diagnostics.
          </p>
        </div>

        {/* Course badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.5rem 0.85rem",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-xs)",
              background: "rgba(99, 102, 241, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-ai)",
              fontWeight: 700,
              fontSize: "0.8rem",
            }}
          >
            NLP
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {cohort.courseCode}: {cohort.courseTitle}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Faculty: {cohort.facultyName} &bull; Deliverable: {cohort.assignmentTitle}
            </div>
          </div>
        </div>
      </div>

      {/* ── COHORT STAT STRIP ───────────────────────────────────────── */}
      <div className="stat-strip" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-item">
          <span className="stat-number">{cohort.totalStudents}</span>
          <span className="stat-label">Enrolled Students</span>
          <span className="stat-sub">Batch of 2026</span>
        </div>

        <div className="stat-item">
          <span className="stat-number" style={{ color: "var(--status-low)" }}>
            {cohort.submittedCount}
          </span>
          <span className="stat-label">Submitted</span>
          <span className="stat-sub">
            {((cohort.submittedCount / cohort.totalStudents) * 100).toFixed(0)}% Completion
          </span>
        </div>

        <div className="stat-item">
          <span
            className="stat-number"
            style={{ color: "var(--accent-academic)" }}
          >
            {cohort.notSubmittedCount}
          </span>
          <span className="stat-label">Not Submitted</span>
          <span className="stat-sub">Active pending upload</span>
        </div>

        <div className="stat-item">
          <span className="stat-number critical">
            {cohort.overdueCount}
          </span>
          <span className="stat-label">Overdue</span>
          <span className="stat-sub">Deadline elapsed</span>
        </div>

        <div className="stat-item">
          <span className="stat-number critical">
            {cohort.highRiskCount}
          </span>
          <span className="stat-label">High Academic Risk</span>
          <span className="stat-sub">Urgent attention needed</span>
        </div>
      </div>

      {/* ── EXPLAINABLE INSIGHT BANNER ───────────────────────────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderLeft: "4px solid var(--status-critical)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ShieldAlert size={16} color="var(--status-critical)" />
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--status-critical)",
              }}
            >
              Academic AI Explainable Cohort Insight
            </span>
          </div>

          <span
            className="badge badge-critical"
            style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem" }}
          >
            {cohort.assessmentPressure} COHORT PRESSURE
          </span>
        </div>

        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
            margin: "0 0 0.6rem 0",
          }}
        >
          {cohort.explainableInsight.headline}
        </h2>

        <div
          style={{
            background: "rgba(0,0,0,0.02)",
            borderRadius: "var(--radius-xs)",
            padding: "0.75rem 1rem",
            border: "1px solid var(--border-subtle)",
            marginBottom: "0.85rem",
          }}
        >
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.2rem",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            {cohort.explainableInsight.whyAtRiskBullets.map((bullet, idx) => (
              <li key={idx} style={{ lineHeight: 1.45 }}>
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Info size={13} />
          <span>{cohort.explainableInsight.actionableAdvice}</span>
        </div>
      </div>

      {/* ── COHORT ANALYSIS BREAKDOWN CARDS ──────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Assessment Pressure & Collision */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
            <Calendar size={14} color="var(--accent-academic)" />
            <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              Assessment Collision Window
            </span>
          </div>

          <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "0.35rem" }}>
            {cohort.assessmentClashCount48h} Students with Dual Deadlines
          </div>

          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: "0.75rem" }}>
            12 of the 18 students who have not submitted have the <strong>CSE3002 Machine Learning Quiz 2</strong> within 48 hours of this review deadline.
          </p>

          <div style={{ background: "rgba(0,0,0,0.02)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <strong>Collision Impact:</strong> Students prioritize imminent timed quizzes over written reports unless given explicit submission time blocks.
          </div>
        </div>

        {/* Deadline Concentration */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
            <Layers size={14} color="var(--accent-academic)" />
            <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              Curricular Workload Pressure
            </span>
          </div>

          <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "0.35rem" }}>
            {cohort.deadlineConcentration}
          </div>

          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: "0.75rem" }}>
            Cognitive workload engine computed an average student workload pressure score of <strong>{cohort.averageRiskScore} / 100</strong> for this cohort.
          </p>

          <div style={{ background: "rgba(0,0,0,0.02)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <strong>Assessment Scheme:</strong> Review carries 20 marks. Delayed submissions will significantly skew the CAT component bell curve.
          </div>
        </div>
      </div>

      {/* ── COHORT STUDENTS ROSTER ───────────────────────────────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Cohort Student Roster ({cohort.totalStudents} Students)
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Showing {filteredStudents.length} students based on filter selection
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: `All (${cohort.totalStudents})` },
              { id: "NOT_SUBMITTED", label: `Not Submitted (${cohort.notSubmittedCount})` },
              { id: "OVERDUE", label: `Overdue (${cohort.overdueCount})` },
              { id: "HIGH_RISK", label: `High Risk (${cohort.highRiskCount})` },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilter(btn.id as any)}
                style={{
                  padding: "0.3rem 0.65rem",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  border: filter === btn.id ? "1px solid var(--accent-academic)" : "1px solid var(--border-subtle)",
                  background: filter === btn.id ? "rgba(180, 83, 9, 0.08)" : "transparent",
                  color: filter === btn.id ? "var(--accent-academic)" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid var(--border-default)", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>Roll Number</th>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>Student Name</th>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>Submission Status</th>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>48h Clash</th>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>Risk Level</th>
                <th style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>Diagnostic Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((std) => (
                <tr
                  key={std.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: std.riskLevel === "CRITICAL" ? "rgba(220, 38, 38, 0.02)" : "transparent",
                  }}
                >
                  <td style={{ padding: "0.6rem 0.5rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                    {std.rollNumber}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", color: "var(--text-primary)", fontWeight: 500 }}>
                    {std.name}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>
                    {std.submitted ? (
                      <span className="badge badge-low" style={{ fontSize: "0.62rem" }}>
                        ✓ SUBMITTED
                      </span>
                    ) : std.isOverdue ? (
                      <span className="badge badge-critical" style={{ fontSize: "0.62rem" }}>
                        OVERDUE
                      </span>
                    ) : (
                      <span className="badge badge-medium" style={{ fontSize: "0.62rem" }}>
                        PENDING
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>
                    {std.hasAssessmentIn48h ? (
                      <span style={{ color: "var(--status-critical)", fontWeight: 600 }}>
                        {std.upcomingAssessmentName}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>
                    <span
                      className={`badge ${
                        std.riskLevel === "CRITICAL" || std.riskLevel === "HIGH"
                          ? "badge-critical"
                          : std.riskLevel === "MEDIUM"
                          ? "badge-medium"
                          : "badge-low"
                      }`}
                      style={{ fontSize: "0.62rem" }}
                    >
                      {std.riskLevel} ({std.riskScore})
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", color: "var(--text-secondary)", fontSize: "0.72rem" }}>
                    {std.riskReason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
