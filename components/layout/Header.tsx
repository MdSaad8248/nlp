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
  userRole?: "STUDENT" | "TEACHER";
}

export default function Header({ onMenuToggle, isCollapsed, userRole }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Deterministic initial session matching route context
  const isFacultyPath = pathname ? (pathname.startsWith("/faculty-") || pathname === "/evaluation" || pathname === "/submissions") : false;
  const initialSession = userRole === "TEACHER" || isFacultyPath ? DEMO_TEACHERS[0] : DEMO_STUDENTS[0];
  const [session, setSession] = useState<UserSession>(initialSession);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync session from authenticated server session with cookie fallback
  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          const u = data.user;
          const userSession: UserSession = {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            rollNumber: u.rollNumber || "",
            department: u.department || "",
            program: u.program || "",
            assignedCourses: u.managedCourseCodes || [],
          };
          setSession(userSession);
        } else {
          const cookies = document.cookie.split("; ");
          const studentCookie = cookies.find((c) => c.startsWith("academic_student_id="));
          const studentId = studentCookie ? decodeURIComponent(studentCookie.split("=")[1]) : null;
          if (studentId) {
            setSession(getCurrentSession(studentId));
          }
        }
      })
      .catch(() => {
        const cookies = document.cookie.split("; ");
        const studentCookie = cookies.find((c) => c.startsWith("academic_student_id="));
        const studentId = studentCookie ? decodeURIComponent(studentCookie.split("=")[1]) : null;
        if (studentId) {
          setSession(getCurrentSession(studentId));
        }
      });
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
    if (pathname === "/dashboard") return session.role === "TEACHER" ? "Faculty / Dashboard" : "Workspace / My Dashboard";
    if (pathname === "/inbox") return "Workspace / Notice Ingestion (NLP)";
    if (pathname === "/tasks") return "Workspace / My Tasks & Deadlines";
    if (pathname === "/calendar") return "Workspace / Academic Calendar";
    if (pathname === "/courses") return session.role === "TEACHER" ? "Faculty / Assigned Courses" : "Workspace / Enrolled Courses";
    if (pathname === "/notifications") return "Academic Intelligence / Adaptive Alerts";
    if (pathname === "/analytics") return session.role === "TEACHER" ? "Faculty / Class & NLP Analytics" : "Academic Intelligence / Personal Workload";
    if (pathname === "/assistant") return "Academic Intelligence / Grounded Assistant";
    if (pathname === "/syllabus") return "Academic Resources / Syllabus Intelligence";
    if (pathname === "/rubrics") return "Academic Resources / Rubric Intelligence";
    if (pathname === "/documents") return "Academic Resources / Multimodal OCR & Documents";
    if (pathname === "/faculty-course-intelligence") return "Faculty / Course Intelligence & Submissions";
    if (pathname === "/submissions") return "Faculty / Student Submissions & Deliverables";
    if (pathname === "/faculty-review") return "Faculty / Submission Verification & Review";
    if (pathname === "/evaluation") return "Faculty / NLP Model Benchmarks";
    if (pathname === "/settings") return "Account / Preferences";
    if (pathname === "/about") return "Platform / Architecture & Defense";
    return "AcademicAI Platform";
  };

  return (
    <>
      <header
        className="app-top-header"
        style={{
          height: "64px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E4E8F1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Left: Mobile hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={onMenuToggle}
            aria-label="Open Navigation Drawer"
            style={{
              display: "none",
              padding: "0.4rem",
              background: "transparent",
              border: "1px solid #E4E8F1",
              borderRadius: "6px",
              cursor: "pointer",
              color: "#172033",
            }}
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Center: Search input matching reference screenshot */}
        <div style={{ flex: 1, maxWidth: "480px", margin: "0 1.5rem", position: "relative" }}>
          <div
            onClick={() => setPaletteOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              background: "#F5F7FC",
              border: "1px solid #E4E8F1",
              borderRadius: "999px",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              transition: "border-color 0.15s ease",
            }}
          >
            <Search size={15} color="#8F9CAE" />
            <span style={{ fontSize: "0.85rem", color: "#8F9CAE", flex: 1 }}>
              {session.role === "TEACHER" ? "Search tasks, classes..." : "Search courses, tasks, notices..."}
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                padding: "0.1rem 0.4rem",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.05)",
                color: "#647089",
                fontWeight: 600,
              }}
            >
              ⌘K
            </span>
          </div>
        </div>

        {/* Right: Notification Bell & User Profile Chip */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Notification Bell with red dot indicator */}
          <Link
            href="/notifications"
            title="Notifications"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#F5F7FC",
              color: "#647089",
              border: "1px solid #E4E8F1",
              position: "relative",
              textDecoration: "none",
              transition: "background 0.15s ease",
            }}
          >
            <Bell size={17} />
            <span
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#EF4444",
                border: "1.5px solid #FFFFFF",
              }}
            />
          </Link>

          {/* Profile Dropdown & Fast Account Switcher Chip */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((v) => !v)}
              aria-label="User profile menu"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.35rem 0.6rem 0.35rem 0.35rem",
                borderRadius: "999px",
                border: "1px solid #E4E8F1",
                background: "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#4658C8",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {session.role === "TEACHER" ? "PR" : "SA"}
              </div>
              <div style={{ textAlign: "left", lineHeight: 1.15 }}>
                <div
                  style={{
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    color: "#172033",
                  }}
                >
                  {session.role === "TEACHER" ? "Dr. P. Raman" : "Saad Ahmed"}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#647089",
                  }}
                >
                  {session.role === "TEACHER" ? "Faculty" : "Student"}
                </div>
              </div>
              <ChevronDown size={14} color="#647089" style={{ marginLeft: "0.15rem" }} />
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
