"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function RoleSelectionLandingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [loading, setLoading] = useState<string | null>(null);

  const quickLaunch = async (
    identifier: string,
    role: "STUDENT" | "TEACHER",
    password = role === "TEACHER" ? "teacher123" : "student123"
  ) => {
    setLoading(identifier);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, expectedRole: role }),
      });
      const data = await res.json();
      if (data.success) {
        if (role === "TEACHER") {
          router.push("/faculty-course-intelligence");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      } else {
        alert(data.error || "Authentication failed");
      }
    } catch (e: any) {
      alert(e.message || "Sign in failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Top Banner Navigation */}
      <header
        style={{
          height: "72px",
          borderBottom: "1px solid var(--border-default)",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(12px)",
          padding: "0 2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #1B295A, #3448A5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 10px rgba(52, 72, 165, 0.25)",
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
              }}
            >
              AcademicAI
            </div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "var(--text-secondary)",
                letterSpacing: "0.06em",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Academic Intelligence Platform
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/about"
            style={{
              fontSize: "0.84rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              transition: "color 0.15s ease",
            }}
          >
            System Architecture
          </Link>
          <Link
            href="/login"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: "none" }}
          >
            Direct Sign In
          </Link>
        </div>
      </header>

      {/* Main Hero & Role Selection Container */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3.5rem 1.5rem",
          maxWidth: "1200px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Title & Tagline */}
        <div style={{ textAlign: "center", marginBottom: "3rem", maxWidth: "720px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.35rem 0.9rem",
              borderRadius: "999px",
              background: "rgba(52, 72, 165, 0.08)",
              border: "1px solid rgba(52, 72, 165, 0.22)",
              color: "#3448A5",
              fontSize: "0.74rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "1.2rem",
            }}
          >
            <ShieldCheck size={14} />
            <span>Role-Based Academic Access Portal</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2.1rem, 4vw, 3rem)",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Select Your Academic Role
          </h1>
          <p
            style={{
              fontSize: "1rem",
              color: "var(--text-secondary)",
              marginTop: "0.85rem",
              lineHeight: 1.6,
            }}
          >
            Welcome to the Academic Intelligence Platform. Choose your verified portal to
            access tailored schedules, syllabus grounding, and institutional intelligence.
          </p>
        </div>

        {/* Two Prominent Role Cards Side-by-Side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2rem",
            width: "100%",
            maxWidth: "960px",
            marginBottom: "3rem",
          }}
        >
          {/* 1. STUDENT CARD */}
          <div
            onClick={() => setSelectedRole("STUDENT")}
            style={{
              background: "#FFFFFF",
              border: selectedRole === "STUDENT" ? "2px solid #3448A5" : "1px solid var(--border-default)",
              borderRadius: "16px",
              padding: "2.25rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow:
                selectedRole === "STUDENT"
                  ? "0 6px 24px rgba(52, 72, 165, 0.14)"
                  : "var(--shadow-card)",
              position: "relative",
              minHeight: "470px",
            }}
          >
            {selectedRole === "STUDENT" && (
              <div
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  color: "#3448A5",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "999px",
                  background: "rgba(52, 72, 165, 0.10)",
                  border: "1px solid rgba(52, 72, 165, 0.25)",
                }}
              >
                <CheckCircle2 size={14} />
                <span>Selected</span>
              </div>
            )}

            <div>
              {/* Icon badge */}
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: "rgba(52, 72, 165, 0.08)",
                  border: "1px solid rgba(52, 72, 165, 0.22)",
                  color: "#3448A5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <BookOpen size={28} />
              </div>

              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  color: "var(--text-primary)",
                  margin: "0 0 0.5rem 0",
                  letterSpacing: "-0.01em",
                }}
              >
                Student Portal
              </h2>

              <p
                style={{
                  fontSize: "0.92rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                  margin: "0 0 1.5rem 0",
                }}
              >
                Manage academic notices, deadlines, courses, and grounded study resources.
              </p>

              {/* Feature checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.8rem" }}>
                {[
                  "Personalized assignment & exam schedules",
                  "NLP-powered circular & notice parsing",
                  "Course syllabus search & grounded answers",
                  "Project rubric criteria & mark calculators",
                ].map((feat, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      fontSize: "0.84rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#3448A5",
                        flexShrink: 0,
                      }}
                    />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Link
                href="/login?role=student"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              >
                <span>Enter Student Portal</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* 2. TEACHER CARD */}
          <div
            onClick={() => setSelectedRole("TEACHER")}
            style={{
              background: "#FFFFFF",
              border: selectedRole === "TEACHER" ? "2px solid #3448A5" : "1px solid var(--border-default)",
              borderRadius: "16px",
              padding: "2.25rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow:
                selectedRole === "TEACHER"
                  ? "0 6px 24px rgba(52, 72, 165, 0.14)"
                  : "var(--shadow-card)",
              position: "relative",
              minHeight: "470px",
            }}
          >
            {selectedRole === "TEACHER" && (
              <div
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  color: "#3448A5",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "999px",
                  background: "rgba(52, 72, 165, 0.10)",
                  border: "1px solid rgba(52, 72, 165, 0.25)",
                }}
              >
                <CheckCircle2 size={14} />
                <span>Selected</span>
              </div>
            )}

            <div>
              {/* Icon badge */}
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: "rgba(184, 138, 69, 0.10)",
                  border: "1px solid rgba(184, 138, 69, 0.25)",
                  color: "#B88A45",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <GraduationCap size={28} />
              </div>

              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  color: "var(--text-primary)",
                  margin: "0 0 0.5rem 0",
                  letterSpacing: "-0.01em",
                }}
              >
                Teacher Portal
              </h2>

              <p
                style={{
                  fontSize: "0.92rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                  margin: "0 0 1.5rem 0",
                }}
              >
                Manage course announcements, assessments, syllabi, and student-facing academic information.
              </p>

              {/* Feature checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.8rem" }}>
                {[
                  "Authorized course & syllabus management",
                  "Assessment rubric creation with mark validation",
                  "Student notice publishing & broadcast dispatch",
                  "Live evaluation & defense walkthrough mode",
                ].map((feat, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      fontSize: "0.84rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#B88A45",
                        flexShrink: 0,
                      }}
                    />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Link
                href="/login?role=teacher"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              >
                <span>Enter Teacher Portal</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Launch Section for University Evaluation / Project Defense */}
        <div
          style={{
            width: "100%",
            maxWidth: "960px",
            background: "#FFFFFF",
            border: "1px solid var(--border-default)",
            borderRadius: "14px",
            padding: "1.75rem 2rem",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={16} color="#3448A5" />
              <span
                style={{
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-primary)",
                }}
              >
                1-Click Quick Demo Accounts (University Review Defense)
              </span>
            </div>
            <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
              Pre-provisioned with isolated database states & course relations
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {/* Student 1 */}
            <button
              type="button"
              disabled={Boolean(loading)}
              onClick={() => quickLaunch("saad@academic.ai", "STUDENT")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: "1px solid var(--border-default)",
                background: "var(--bg-app)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Saad (Student A)
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.12rem 0.4rem",
                    borderRadius: "4px",
                    background: "rgba(52, 72, 165, 0.10)",
                    color: "#3448A5",
                    fontWeight: 700,
                  }}
                >
                  STUDENT
                </span>
              </div>
              <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                21BDS0142 &bull; NLP / Heavy Workload
              </span>
            </button>

            {/* Student 2 */}
            <button
              type="button"
              disabled={Boolean(loading)}
              onClick={() => quickLaunch("priya@academic.ai", "STUDENT")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: "1px solid var(--border-default)",
                background: "var(--bg-app)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Priya Sharma (Student B)
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.12rem 0.4rem",
                    borderRadius: "4px",
                    background: "rgba(52, 72, 165, 0.10)",
                    color: "#3448A5",
                    fontWeight: 700,
                  }}
                >
                  STUDENT
                </span>
              </div>
              <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                22BCS0218 &bull; ML / Moderate Workload
              </span>
            </button>

            {/* Teacher 1 */}
            <button
              type="button"
              disabled={Boolean(loading)}
              onClick={() => quickLaunch("faculty.raman@academic.ai", "TEACHER")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: "1px solid var(--border-default)",
                background: "var(--bg-app)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Dr. P. Raman (Faculty)
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.12rem 0.4rem",
                    borderRadius: "4px",
                    background: "rgba(184, 138, 69, 0.12)",
                    color: "#B88A45",
                    fontWeight: 700,
                  }}
                >
                  TEACHER
                </span>
              </div>
              <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                FAC-NLP-01 &bull; Lead: CSE4001 NLP
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-default)",
          padding: "1.25rem 2.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.76rem",
          color: "var(--text-secondary)",
          flexWrap: "wrap",
          gap: "0.5rem",
          background: "var(--bg-app)",
        }}
      >
        <div>Academic Intelligence Platform &bull; University Project Defense Edition</div>
        <div>Natural Language Processing &bull; SQLite Persistence &bull; Zero Hallucination</div>
      </footer>
    </div>
  );
}
