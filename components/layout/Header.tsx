"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  Sparkles,
  Bot,
  ChevronDown,
  LogOut,
  User,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { getCurrentSession, UserSession, DEMO_STUDENTS, DEMO_TEACHERS } from "@/lib/auth/session";
import CommandPalette from "@/components/ui/CommandPalette";

interface HeaderProps {
  onMenuToggle: () => void;
  isCollapsed: boolean;
}

export default function Header({ onMenuToggle, isCollapsed }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession>(getCurrentSession());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync session from cookie
  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const studentCookie = cookies.find((c) => c.startsWith("academic_student_id="));
    const studentId = studentCookie ? decodeURIComponent(studentCookie.split("=")[1]) : null;
    setSession(getCurrentSession(studentId));
  }, [pathname]);

  // Click outside listener for profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSwitchAccount = async (account: UserSession) => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: account.email,
          password: account.role === "TEACHER" ? "teacher123" : "student123",
          expectedRole: account.role,
        }),
      });
    } catch {}

    setProfileDropdownOpen(false);
    setSession(account);

    if (account.role === "TEACHER") {
      router.push("/faculty-course-intelligence");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {}
    setProfileDropdownOpen(false);
    router.push("/login");
    router.refresh();
  };

  // Format dateline in IST
  const now = new Date();
  const dayStr = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  const dateline = `${dateStr} · ${dayStr}`;

  // Derive route friendly title
  const getSectionTitle = () => {
    if (pathname === "/dashboard") return "Workspace / Dashboard";
    if (pathname === "/inbox") return "Workspace / Notice Ingestion (NLP)";
    if (pathname === "/tasks") return "Workspace / Task Deliverables";
    if (pathname === "/calendar") return "Workspace / Academic Calendar";
    if (pathname === "/courses") return "Workspace / Course Registry";
    if (pathname === "/notifications") return "Academic Intelligence / Adaptive Alerts";
    if (pathname === "/analytics") return "Academic Intelligence / Workload Analytics";
    if (pathname === "/assistant") return "Academic Intelligence / Grounded Assistant";
    if (pathname === "/syllabus") return "Academic Resources / Syllabus Intelligence";
    if (pathname === "/rubrics") return "Academic Resources / Rubric Intelligence";
    if (pathname === "/documents") return "Academic Resources / Multimodal OCR & Documents";
    if (pathname === "/faculty-course-intelligence") return "Teacher / Course Intelligence";
    if (pathname === "/faculty-review") return "Teacher / Defense Review Suite";
    if (pathname === "/evaluation") return "Teacher / Model Evaluation Benchmarks";
    if (pathname === "/settings") return "Account / Preferences";
    if (pathname === "/about") return "Platform / Architecture & Defense";
    return "AcademicAI Platform";
  };

  return (
    <>
      <header
        className="app-top-header"
        style={{
          height: "56px",
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.5rem",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Left: Mobile hamburger & breadcrumb title */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={onMenuToggle}
            aria-label="Open Navigation Drawer"
            style={{
              display: "none", // visible on mobile via css
              padding: "0.4rem",
              background: "transparent",
              border: "1px solid var(--border-default)",
              borderRadius: "6px",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <Menu size={18} />
          </button>

          <div
            style={{
              fontSize: "0.86rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              letterSpacing: "-0.01em",
            }}
          >
            {getSectionTitle()}
          </div>
        </div>

        {/* Right: Search, Date, Assistant, Alerts, Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Dateline */}
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              display: "none", // responsive via media query
            }}
            className="header-dateline"
          >
            {dateline}
          </span>

          {/* Global Search trigger (⌘K) */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open Search (⌘K)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-canvas)",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <Search size={13} />
            <span className="search-placeholder-text">Search...</span>
            <span
              style={{
                fontSize: "0.65rem",
                padding: "0.1rem 0.35rem",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.06)",
                fontWeight: 600,
              }}
            >
              ⌘K
            </span>
          </button>

          {/* Quick AI Assistant Link */}
          <Link
            href="/assistant"
            title="Open AI Assistant"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              background: "rgba(99, 102, 241, 0.08)",
              color: "var(--accent-ai)",
              textDecoration: "none",
            }}
          >
            <Sparkles size={16} />
          </Link>

          {/* Notifications Link with badge */}
          <Link
            href="/notifications"
            title="Notifications"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-canvas)",
              color: "var(--text-secondary)",
              position: "relative",
              textDecoration: "none",
            }}
          >
            <Bell size={16} />
            <span
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#ef4444",
              }}
            />
          </Link>

          {/* Role badge */}
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              padding: "0.2rem 0.5rem",
              borderRadius: "999px",
              background: session.role === "TEACHER" ? "rgba(139, 92, 246, 0.12)" : "rgba(37, 99, 235, 0.12)",
              color: session.role === "TEACHER" ? "#7c3aed" : "#2563eb",
              border: `1px solid ${session.role === "TEACHER" ? "rgba(139, 92, 246, 0.3)" : "rgba(37, 99, 235, 0.3)"}`,
            }}
          >
            {session.role}
          </span>

          {/* Profile Dropdown & Fast Account Switcher */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((v) => !v)}
              aria-label="User profile menu"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid var(--border-default)",
                background: "var(--bg-surface)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: session.role === "TEACHER" ? "#7c3aed" : "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                }}
              >
                {session.name ? session.name[0] : "U"}
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  maxWidth: "90px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {session.name.split(" ")[0]}
              </span>
              <ChevronDown size={12} color="var(--text-muted)" />
            </button>

            {profileDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "0.4rem",
                  width: "280px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.14)",
                  padding: "0.85rem",
                  zIndex: 100,
                }}
              >
                {/* Active user header */}
                <div
                  style={{
                    paddingBottom: "0.65rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    marginBottom: "0.65rem",
                  }}
                >
                  <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {session.name}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                    {session.rollNumber} &bull; {session.email}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: "0.3rem",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "0.1rem 0.4rem",
                      borderRadius: "4px",
                      background: session.role === "TEACHER" ? "rgba(139, 92, 246, 0.15)" : "rgba(37, 99, 235, 0.15)",
                      color: session.role === "TEACHER" ? "#7c3aed" : "#2563eb",
                    }}
                  >
                    Role: {session.role}
                  </div>
                </div>

                {/* Quick Account Switcher */}
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    marginBottom: "0.4rem",
                  }}
                >
                  Switch Demo Account (Instant)
                </div>

                {/* Students */}
                <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                  Students:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.5rem" }}>
                  {DEMO_STUDENTS.map((s) => {
                    const isSelected = s.id === session.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSwitchAccount(s)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.35rem 0.5rem",
                          borderRadius: "4px",
                          background: isSelected ? "rgba(37, 99, 235, 0.08)" : "transparent",
                          border: isSelected ? "1px solid rgba(37, 99, 235, 0.3)" : "1px solid transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: "0.73rem",
                          color: isSelected ? "#2563eb" : "var(--text-primary)",
                        }}
                      >
                        <span>{s.name}</span>
                        {isSelected && <CheckCircle2 size={13} color="#2563eb" />}
                      </button>
                    );
                  })}
                </div>

                {/* Teachers */}
                <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                  Faculty / Teachers:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.65rem" }}>
                  {DEMO_TEACHERS.map((t) => {
                    const isSelected = t.id === session.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSwitchAccount(t)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.35rem 0.5rem",
                          borderRadius: "4px",
                          background: isSelected ? "rgba(139, 92, 246, 0.08)" : "transparent",
                          border: isSelected ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: "0.73rem",
                          color: isSelected ? "#7c3aed" : "var(--text-primary)",
                        }}
                      >
                        <span>{t.name}</span>
                        {isSelected && <CheckCircle2 size={13} color="#7c3aed" />}
                      </button>
                    );
                  })}
                </div>

                {/* Sign Out Button */}
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      borderRadius: "4px",
                      background: "rgba(239, 68, 68, 0.06)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                    }}
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ⌘K Command Palette */}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}
