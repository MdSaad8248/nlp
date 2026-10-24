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
  Calendar,
  Bell,
  Cpu,
  Layers,
  FileCheck2,
  Lock,
} from "lucide-react";
import { DEMO_STUDENTS, DEMO_TEACHERS } from "@/lib/auth/session";

export default function RoleSelectionLandingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [loading, setLoading] = useState<string | null>(null);

  const quickLaunch = async (identifier: string, role: "STUDENT" | "TEACHER", password = role === "TEACHER" ? "teacher123" : "student123") => {
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
        background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)",
        color: "#f8fafc",
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
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "0 2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)",
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              AcademicAI
            </div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", letterSpacing: "0.04em" }}>
              ACADEMIC INTELLIGENCE PLATFORM
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/about"
            style={{
              fontSize: "0.82rem",
              color: "#94a3b8",
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
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#ffffff",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              padding: "0.45rem 1rem",
              borderRadius: "8px",
              textDecoration: "none",
            }}
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
          padding: "3rem 1.5rem",
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
              background: "rgba(59, 130, 246, 0.12)",
              border: "1px solid rgba(59, 130, 246, 0.28)",
              color: "#60a5fa",
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
              fontSize: "clamp(2rem, 4vw, 2.85rem)",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.03em",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Select Your Academic Role
          </h1>
          <p
            style={{
              fontSize: "1.02rem",
              color: "#94a3b8",
              marginTop: "0.85rem",
              lineHeight: 1.6,
            }}
          >
            Welcome to the Academic Intelligence Platform. Choose your verified portal to
            access tailored schedules, syllabus grounding, and institutional intelligence.
          </p>
        </div>

        {/* Two Prominent Role Cards Side-by-Side (VIT Inspired Arrangement) */}
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
              background:
                selectedRole === "STUDENT"
                  ? "linear-gradient(180deg, rgba(37, 99, 235, 0.14) 0%, rgba(15, 23, 42, 0.85) 100%)"
                  : "rgba(15, 23, 42, 0.6)",
              border:
                selectedRole === "STUDENT"
                  ? "2px solid #3b82f6"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "2.25rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.25s ease",
              boxShadow:
                selectedRole === "STUDENT"
                  ? "0 0 35px rgba(59, 130, 246, 0.25)"
                  : "none",
              position: "relative",
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
                  color: "#60a5fa",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                <CheckCircle2 size={16} />
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
                  background: "rgba(37, 99, 235, 0.16)",
                  border: "1px solid rgba(37, 99, 235, 0.35)",
                  color: "#60a5fa",
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
                  color: "#ffffff",
                  margin: "0 0 0.5rem 0",
                }}
              >
                Student Portal
              </h2>

              <p
                style={{
                  fontSize: "0.92rem",
                  color: "#94a3b8",
                  lineHeight: 1.55,
                  margin: "0 0 1.5rem 0",
                }}
              >
                Manage academic notices, deadlines, courses, and study resources.
              </p>

              {/* Feature checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.8rem" }}>
                {[
                  "Personalized assignment & exam schedules",
                  "NLP-powered circular & WhatsApp notice parsing",
                  "Course syllabus search & grounded answers",
                  "Project rubric criteria & mark calculators",
                ].map((feat, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#cbd5e1" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Link
                href="/login?role=student"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                  transition: "all 0.15s ease",
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
              background:
                selectedRole === "TEACHER"
                  ? "linear-gradient(180deg, rgba(139, 92, 246, 0.14) 0%, rgba(15, 23, 42, 0.85) 100%)"
                  : "rgba(15, 23, 42, 0.6)",
              border:
                selectedRole === "TEACHER"
                  ? "2px solid #8b5cf6"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "2.25rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.25s ease",
              boxShadow:
                selectedRole === "TEACHER"
                  ? "0 0 35px rgba(139, 92, 246, 0.25)"
                  : "none",
              position: "relative",
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
                  color: "#c084fc",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                <CheckCircle2 size={16} />
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
                  background: "rgba(139, 92, 246, 0.16)",
                  border: "1px solid rgba(139, 92, 246, 0.35)",
                  color: "#c084fc",
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
                  color: "#ffffff",
                  margin: "0 0 0.5rem 0",
                }}
              >
                Teacher Portal
              </h2>

              <p
                style={{
                  fontSize: "0.92rem",
                  color: "#94a3b8",
                  lineHeight: 1.55,
                  margin: "0 0 1.5rem 0",
                }}
              >
                Manage course announcements, assessments, syllabi, and student-facing academic information.
              </p>

              {/* Feature checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.8rem" }}>
                {[
                  "Authorized course & syllabus management",
                  "Assessment rubric creation with mark validation",
                  "Student notice publishing & broadcast dispatch",
                  "Live evaluation & defense walkthrough mode",
                ].map((feat, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#cbd5e1" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8b5cf6" }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Link
                href="/login?role=teacher"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  background: "#7c3aed",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(124, 58, 237, 0.4)",
                  transition: "all 0.15s ease",
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
            background: "rgba(15, 23, 42, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "1.5rem 2rem",
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
              <ShieldCheck size={16} color="#3b82f6" />
              <span style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#e2e8f0" }}>
                1-Click Quick Demo Accounts (University Review Defense)
              </span>
            </div>
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
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
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                background: "rgba(59, 130, 246, 0.06)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#f8fafc" }}>
                  Saad (Student A)
                </span>
                <span style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem", borderRadius: "4px", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", fontWeight: 700 }}>
                  STUDENT
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.2rem" }}>
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
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                background: "rgba(59, 130, 246, 0.06)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#f8fafc" }}>
                  Priya Sharma (Student B)
                </span>
                <span style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem", borderRadius: "4px", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", fontWeight: 700 }}>
                  STUDENT
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.2rem" }}>
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
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                background: "rgba(139, 92, 246, 0.06)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#f8fafc" }}>
                  Dr. P. Raman (Faculty)
                </span>
                <span style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem", borderRadius: "4px", background: "rgba(139, 92, 246, 0.2)", color: "#c084fc", fontWeight: 700 }}>
                  TEACHER
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                FAC-NLP-01 &bull; Lead: CSE4001 NLP
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "1.25rem 2.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.74rem",
          color: "#64748b",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>Academic Intelligence Platform &bull; University Project Defense Edition</div>
        <div>Natural Language Processing &bull; SQLite Persistence &bull; Zero Hallucination</div>
      </footer>
    </div>
  );
}
