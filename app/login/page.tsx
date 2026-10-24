"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  User,
  Key,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { DEMO_STUDENTS, DEMO_TEACHERS } from "@/lib/auth/session";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role");

  const [activeRole, setActiveRole] = useState<"STUDENT" | "TEACHER">(
    initialRoleParam === "teacher" ? "TEACHER" : "STUDENT"
  );

  const [identifier, setIdentifier] = useState(
    initialRoleParam === "teacher" ? DEMO_TEACHERS[0].email : DEMO_STUDENTS[0].email
  );
  const [password, setPassword] = useState(
    initialRoleParam === "teacher" ? "teacher123" : "student123"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When switching role tabs, update default credentials
  const handleRoleChange = (role: "STUDENT" | "TEACHER") => {
    setActiveRole(role);
    setError(null);
    if (role === "TEACHER") {
      setIdentifier(DEMO_TEACHERS[0].email);
      setPassword("teacher123");
    } else {
      setIdentifier(DEMO_STUDENTS[0].email);
      setPassword("student123");
    }
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          expectedRole: activeRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed");
      }

      // Redirect to appropriate role dashboard
      if (activeRole === "TEACHER") {
        router.push("/faculty-course-intelligence");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (acc: { email: string; role: "STUDENT" | "TEACHER" }) => {
    setIdentifier(acc.email);
    setPassword(acc.role === "TEACHER" ? "teacher123" : "student123");
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem 1.5rem",
        background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)",
        color: "#f8fafc",
      }}
    >
      {/* Back to landing page */}
      <div style={{ width: "100%", maxWidth: "460px", marginBottom: "1rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.8rem",
            color: "#94a3b8",
            textDecoration: "none",
            transition: "color 0.15s ease",
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Role Selection</span>
        </Link>
      </div>

      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.3rem 0.8rem",
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.28)",
            borderRadius: "999px",
            color: "#60a5fa",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}
        >
          <Sparkles size={13} />
          <span>Academic Intelligence Platform</span>
        </div>
        <h1
          style={{
            fontSize: "1.85rem",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: "#ffffff",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          AcademicAI Authentication
        </h1>
        <p
          style={{
            fontSize: "0.85rem",
            color: "#94a3b8",
            margin: "0.35rem 0 0 0",
            maxWidth: "420px",
          }}
        >
          Sign in with your verified institutional credentials to access your isolated workspace.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <button
          type="button"
          onClick={() => handleRoleChange("STUDENT")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.7rem",
            borderRadius: "10px",
            border: activeRole === "STUDENT" ? "2px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
            background: activeRole === "STUDENT" ? "rgba(37, 99, 235, 0.2)" : "rgba(15, 23, 42, 0.6)",
            color: activeRole === "STUDENT" ? "#60a5fa" : "#94a3b8",
            fontWeight: 700,
            fontSize: "0.84rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <BookOpen size={16} />
          <span>Student Sign In</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleChange("TEACHER")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.7rem",
            borderRadius: "10px",
            border: activeRole === "TEACHER" ? "2px solid #8b5cf6" : "1px solid rgba(255, 255, 255, 0.1)",
            background: activeRole === "TEACHER" ? "rgba(139, 92, 246, 0.2)" : "rgba(15, 23, 42, 0.6)",
            color: activeRole === "TEACHER" ? "#c084fc" : "#94a3b8",
            fontWeight: 700,
            fontSize: "0.84rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <GraduationCap size={16} />
          <span>Teacher Sign In</span>
        </button>
      </div>

      {/* Login Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "14px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
          padding: "2rem",
          marginBottom: "1.5rem",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              margin: 0,
              color: "#ffffff",
            }}
          >
            {activeRole === "TEACHER" ? "Faculty Authentication" : "Student Authentication"}
          </h2>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "0.2rem 0.55rem",
              borderRadius: "999px",
              background: activeRole === "TEACHER" ? "rgba(139, 92, 246, 0.15)" : "rgba(37, 99, 235, 0.15)",
              color: activeRole === "TEACHER" ? "#c084fc" : "#60a5fa",
              letterSpacing: "0.06em",
              border: `1px solid ${activeRole === "TEACHER" ? "rgba(139, 92, 246, 0.3)" : "rgba(37, 99, 235, 0.3)"}`,
            }}
          >
            Role: {activeRole}
          </span>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(220, 38, 38, 0.12)",
              border: "1px solid rgba(220, 38, 38, 0.35)",
              color: "#f87171",
              borderRadius: "8px",
              padding: "0.75rem 0.9rem",
              fontSize: "0.8rem",
              marginBottom: "1.2rem",
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#94a3b8",
                marginBottom: "0.4rem",
              }}
            >
              {activeRole === "TEACHER"
                ? "Faculty ID or Email"
                : "Student Roll Number or Email"}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  activeRole === "TEACHER"
                    ? "e.g. FAC-NLP-01 or faculty.raman@academic.ai"
                    : "e.g. 21BDS0142 or saad@academic.ai"
                }
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 0.95rem 0.75rem 2.3rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "#090d16",
                  fontSize: "0.86rem",
                  color: "#f8fafc",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <User
                size={15}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#94a3b8",
                }}
              >
                Password
              </label>
              <span style={{ fontSize: "0.68rem", color: "#64748b" }}>
                Hashed verification
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Institutional password"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 0.95rem 0.75rem 2.3rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "#090d16",
                  fontSize: "0.86rem",
                  color: "#f8fafc",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <Key
                size={15}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.5rem",
              padding: "0.85rem",
              borderRadius: "8px",
              border: "none",
              background: activeRole === "TEACHER" ? "#7c3aed" : "#2563eb",
              color: "#ffffff",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: activeRole === "TEACHER" ? "0 4px 15px rgba(124, 58, 237, 0.4)" : "0 4px 15px rgba(37, 99, 235, 0.4)",
            }}
          >
            {loading ? "Verifying Credentials..." : `Sign In as ${activeRole === "TEACHER" ? "Teacher" : "Student"}`}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>

      {/* Demo Credentials Helper Box */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: activeRole === "TEACHER" ? "#c084fc" : "#60a5fa",
            marginBottom: "0.5rem",
          }}
        >
          <ShieldCheck size={14} />
          <span>Curated {activeRole === "TEACHER" ? "Teacher" : "Student"} Accounts (Evaluation)</span>
        </div>

        <p style={{ fontSize: "0.74rem", color: "#94a3b8", margin: "0 0 0.75rem 0" }}>
          Click any verified account below to populate credentials and test role-isolated data:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {(activeRole === "TEACHER" ? DEMO_TEACHERS : DEMO_STUDENTS).map((acc) => {
            const isSelected = identifier.toLowerCase() === acc.email.toLowerCase();
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => selectDemoAccount(acc)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "8px",
                  border: isSelected
                    ? `1.5px solid ${activeRole === "TEACHER" ? "#8b5cf6" : "#3b82f6"}`
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isSelected
                    ? activeRole === "TEACHER"
                      ? "rgba(139, 92, 246, 0.1)"
                      : "rgba(37, 99, 235, 0.1)"
                    : "rgba(0, 0, 0, 0.2)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>
                    {acc.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    {acc.rollNumber} &bull; {acc.program}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#e2e8f0",
                      fontWeight: 600,
                    }}
                  >
                    {acc.badge}
                  </span>
                  {isSelected && (
                    <CheckCircle2
                      size={14}
                      color={activeRole === "TEACHER" ? "#c084fc" : "#60a5fa"}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", color: "#fff" }}>Loading login portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
