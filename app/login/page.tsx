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
import { DEMO_STUDENTS, DEMO_TEACHERS, setActiveSessionId } from "@/lib/auth/session";

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
      // Update active session in memory and cookie
      setActiveSessionId(data.user.id);

      // Full navigation to ensure fresh session cookies and state
      if (activeRole === "TEACHER") {
        window.location.href = "/faculty-course-intelligence";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Sign in failed");
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
        padding: "2.5rem 1.5rem",
        background: "var(--bg-app)",
        color: "var(--text-primary)",
      }}
    >
      {/* Back to landing page */}
      <div style={{ width: "100%", maxWidth: "460px", marginBottom: "1rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "#526176",
            textDecoration: "none",
            transition: "color 0.15s ease",
          }}
        >
          <ArrowLeft size={15} />
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
            padding: "0.35rem 0.85rem",
            background: "#FFFFFF",
            border: "1px solid #E1E5EC",
            borderRadius: "999px",
            color: "#3448A5",
            fontSize: "0.74rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
            boxShadow: "0 2px 6px rgba(11, 18, 32, 0.04)",
          }}
        >
          <Sparkles size={13} />
          <span>Academic Intelligence Platform</span>
        </div>
        <h1
          style={{
            fontSize: "1.9rem",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: "#172033",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          AcademicAI Authentication
        </h1>
        <p
          style={{
            fontSize: "0.88rem",
            color: "#526176",
            margin: "0.45rem 0 0 0",
            maxWidth: "420px",
            lineHeight: 1.5,
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
          gap: "0.6rem",
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
            gap: "0.55rem",
            padding: "0.75rem",
            borderRadius: "10px",
            border: activeRole === "STUDENT" ? "2px solid #3448A5" : "1px solid #E1E5EC",
            background: "#FFFFFF",
            color: activeRole === "STUDENT" ? "#3448A5" : "#526176",
            fontWeight: 700,
            fontSize: "0.86rem",
            cursor: "pointer",
            boxShadow: activeRole === "STUDENT" ? "0 4px 12px rgba(52, 72, 165, 0.12)" : "0 1px 3px rgba(11, 18, 32, 0.04)",
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
            gap: "0.55rem",
            padding: "0.75rem",
            borderRadius: "10px",
            border: activeRole === "TEACHER" ? "2px solid #3448A5" : "1px solid #E1E5EC",
            background: "#FFFFFF",
            color: activeRole === "TEACHER" ? "#3448A5" : "#526176",
            fontWeight: 700,
            fontSize: "0.86rem",
            cursor: "pointer",
            boxShadow: activeRole === "TEACHER" ? "0 4px 12px rgba(52, 72, 165, 0.12)" : "0 1px 3px rgba(11, 18, 32, 0.04)",
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
          background: "#FFFFFF",
          border: "1px solid #E1E5EC",
          borderRadius: "14px",
          boxShadow: "0 8px 30px rgba(11, 18, 32, 0.06)",
          padding: "2rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              margin: 0,
              color: "#172033",
            }}
          >
            {activeRole === "TEACHER" ? "Faculty Authentication" : "Student Authentication"}
          </h2>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "0.25rem 0.6rem",
              borderRadius: "999px",
              background: activeRole === "TEACHER" ? "rgba(184, 138, 69, 0.1)" : "rgba(52, 72, 165, 0.08)",
              color: activeRole === "TEACHER" ? "#B88A45" : "#3448A5",
              letterSpacing: "0.06em",
              border: `1px solid ${activeRole === "TEACHER" ? "rgba(184, 138, 69, 0.25)" : "rgba(52, 72, 165, 0.2)"}`,
            }}
          >
            Role: {activeRole}
          </span>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(196, 81, 53, 0.08)",
              border: "1px solid rgba(196, 81, 53, 0.25)",
              color: "#C45135",
              borderRadius: "8px",
              padding: "0.75rem 0.9rem",
              fontSize: "0.82rem",
              marginBottom: "1.2rem",
              lineHeight: 1.45,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.74rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#172033",
                marginBottom: "0.45rem",
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
                  padding: "0.75rem 0.95rem 0.75rem 2.4rem",
                  borderRadius: "8px",
                  border: "1px solid #E1E5EC",
                  background: "#F7F5F0",
                  fontSize: "0.88rem",
                  color: "#172033",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <User
                size={16}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#526176",
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
              <label
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#172033",
                }}
              >
                Password
              </label>
              <span style={{ fontSize: "0.72rem", color: "#526176", fontWeight: 500 }}>
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
                  padding: "0.75rem 0.95rem 0.75rem 2.4rem",
                  borderRadius: "8px",
                  border: "1px solid #E1E5EC",
                  background: "#F7F5F0",
                  fontSize: "0.88rem",
                  color: "#172033",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <Key
                size={16}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#526176",
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
              background: "#3448A5",
              color: "#FFFFFF",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 14px rgba(52, 72, 165, 0.25)",
              transition: "background 0.15s ease",
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
          background: "#FFFFFF",
          border: "1px solid #E1E5EC",
          borderRadius: "12px",
          padding: "1.25rem",
          boxShadow: "0 4px 16px rgba(11, 18, 32, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            fontSize: "0.74rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#3448A5",
            marginBottom: "0.5rem",
          }}
        >
          <ShieldCheck size={15} />
          <span>Curated {activeRole === "TEACHER" ? "Teacher" : "Student"} Accounts (Evaluation)</span>
        </div>

        <p style={{ fontSize: "0.78rem", color: "#526176", margin: "0 0 0.85rem 0", lineHeight: 1.45 }}>
          Click any verified account below to populate credentials and test role-isolated data:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: isSelected
                    ? "1.5px solid #3448A5"
                    : "1px solid #E1E5EC",
                  background: isSelected
                    ? "rgba(52, 72, 165, 0.06)"
                    : "#F7F5F0",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#172033" }}>
                    {acc.name}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#526176" }}>
                    {acc.rollNumber} &bull; {acc.program}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      background: "#FFFFFF",
                      border: "1px solid #E1E5EC",
                      color: "#526176",
                      fontWeight: 600,
                    }}
                  >
                    {acc.badge}
                  </span>
                  {isSelected && (
                    <CheckCircle2
                      size={15}
                      color="#3448A5"
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
