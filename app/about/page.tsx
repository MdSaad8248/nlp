"use client";

import Shell from "@/components/layout/Shell";
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  BookOpen,
  Award,
  FlaskConical,
  GraduationCap,
} from "lucide-react";

export default function AboutPage() {
  return (
    <Shell>
      <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              background: "rgba(52, 72, 165, 0.08)",
              color: "#3448A5",
            }}
          >
            System Architecture
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            University Project Defense & Documentation
          </span>
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
          Academic Intelligence Platform Architecture
        </h1>
        <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", margin: "0.35rem 0 0 0", lineHeight: 1.6 }}>
          A professional, reliable academic productivity SaaS engineering application combining NLP document understanding,
          temporal reasoning, change detection, and persistent curriculum grounding.
        </p>
      </div>

      {/* Core Architectural Guarantees Card */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "14px",
          padding: "1.75rem",
          boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
        }}
      >
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1rem 0", color: "var(--text-primary)" }}>
          Key Engineering Principles & Guarantees
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
          <div style={{ padding: "1rem", borderRadius: "8px", background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#3448A5", fontWeight: 700, fontSize: "0.86rem", marginBottom: "0.4rem" }}>
              <ShieldCheck size={16} />
              <span>Zero-Fabrication Guard</span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              If a syllabus, rubric, or deadline is missing from uploaded documents or database records, the system explicitly reports its absence instead of generating mock hallucinations.
            </p>
          </div>

          <div style={{ padding: "1rem", borderRadius: "8px", background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#3448A5", fontWeight: 700, fontSize: "0.86rem", marginBottom: "0.4rem" }}>
              <Cpu size={16} />
              <span>Hybrid Classification Engine</span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Integrates DistilBERT Transformer + Calibrated TF-IDF Baseline with a deterministic rule safeguard to guarantee 100% service availability with explainable confidence.
            </p>
          </div>

          <div style={{ padding: "1rem", borderRadius: "8px", background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#059669", fontWeight: 700, fontSize: "0.86rem", marginBottom: "0.4rem" }}>
              <Database size={16} />
              <span>Persistent SQLite Schema</span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              All syllabi, rubrics, deliverables, and role assignments persist across application restarts with transactional integrity and relational foreign keys.
            </p>
          </div>
        </div>
      </div>

      {/* End-to-End Pipeline Walkthrough */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "14px",
          padding: "1.75rem",
        }}
      >
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1.25rem 0", color: "var(--text-primary)" }}>
          End-to-End Intelligence Pipeline
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            {
              step: "Step 1: Multimodal Ingestion",
              desc: "Digital PDFs are parsed via pdf-parse; screenshots & photos are parsed via Tesseract OCR with bounding box tracking and magic byte security.",
            },
            {
              step: "Step 2: Notice Classification",
              desc: "Categorizes notice into 11 academic classes (ASSIGNMENT, QUIZ, EXAM, REVIEW, PROJECT, CLASS_CHANGE, CLASS_CANCELLATION, etc.) using hybrid model with review flagging.",
            },
            {
              step: "Step 3: Temporal Reasoning",
              desc: "Normalizes relative dates ('tomorrow evening', 'next Monday 3 PM') into exact Asia/Kolkata ISO timestamps and identifies transition clauses ('shifted from X to Y').",
            },
            {
              step: "Step 4: Academic Change Detection",
              desc: "Compares deliverable against existing database records to detect NEW, DUPLICATE, RESCHEDULED, UPDATED, or CANCELLED notices with diff logs.",
            },
            {
              step: "Step 5: Human-In-The-Loop Confirmation",
              desc: "Previews extracted items and verbatim evidence for student/teacher verification before committing changes to persistent database tables.",
            },
            {
              step: "Step 6: Priority & Adaptive Notifications",
              desc: "Computes urgency scores based on lead time, penalty clauses, and weightage, generating multistage scheduled alerts (7D, 48H, 24H, 12H).",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#3448A5",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {item.step}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem", lineHeight: 1.45 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role-Based Isolation Architecture */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "14px",
          padding: "1.75rem",
        }}
      >
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1rem 0", color: "var(--text-primary)" }}>
          Role-Based Access Control & Data Isolation
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div style={{ padding: "1.25rem", borderRadius: "10px", background: "rgba(52, 72, 165, 0.05)", border: "1px solid rgba(52, 72, 165, 0.2)" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#3448A5", marginBottom: "0.5rem" }}>
              Student Boundaries
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              <li>Private tasks, notifications, and study plans are strictly scoped to the student&apos;s authenticated ID.</li>
              <li>Read-only access to published course announcements, syllabi, and rubrics.</li>
              <li>No access to teacher endpoints or administrative actions.</li>
            </ul>
          </div>

          <div style={{ padding: "1.25rem", borderRadius: "10px", background: "rgba(184, 138, 69, 0.05)", border: "1px solid rgba(184, 138, 69, 0.2)" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#B88A45", marginBottom: "0.5rem" }}>
              Faculty / Teacher Boundaries
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              <li>Authorization enforced via CourseFaculty relations in persistent database.</li>
              <li>Teachers can publish verified announcements, upload syllabi, and configure rubrics only for their assigned courses.</li>
              <li>Access to Cohort Intelligence and Defense Walkthrough modes.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Shell>
  );
}
