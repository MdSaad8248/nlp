"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Sparkles,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BookOpen,
  BarChart3,
  Menu,
  GraduationCap,
  Cpu,
  LogOut,
  Users,
  ChevronDown,
  FlaskConical,
} from "lucide-react";
import { getCurrentSession, DEMO_STUDENTS } from "@/lib/auth/session";
import { useState, useEffect, useRef } from "react";
import CommandPalette from "@/components/ui/CommandPalette";

// Structured navigation strictly adhering to Part 4 requirements:
// Student: Dashboard, Intelligence Studio, Tasks, Calendar, Notifications, Courses, Analytics, Assistant
// Faculty: Faculty Course Intelligence, Faculty Review, Model Evaluation
const STUDENT_NAV_LINKS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Intelligence Studio", href: "/intelligence-studio", icon: Cpu, badge: "CORE NLP" },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Courses", href: "/courses", icon: BookOpen },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const FACULTY_NAV_LINKS = [
  { name: "Course Intelligence", href: "/faculty-course-intelligence", icon: Users, badge: "COHORT" },
  { name: "Faculty Review", href: "/faculty-review", icon: GraduationCap, badge: "DEFENSE" },
  { name: "Model Evaluation", href: "/evaluation", icon: FlaskConical, badge: "RESEARCH" },
];

interface TopNavProps {
  onMenuToggle?: () => void;
}

function getDateline(): string {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  return `${date} · ${day}`;
}

export default function TopNav({ onMenuToggle }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentSession, setCurrentSession] = useState(getCurrentSession());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync session from cookie on mount
  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const studentCookie = cookies.find((c) => c.startsWith("academic_student_id="));
    const studentId = studentCookie ? decodeURIComponent(studentCookie.split("=")[1]) : null;
    setCurrentSession(getCurrentSession(studentId));
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

  const handleSwitchStudent = async (studentId: string) => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: studentId }),
    });
    setProfileDropdownOpen(false);
    setCurrentSession(getCurrentSession(studentId));
    router.refresh();
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setProfileDropdownOpen(false);
    router.push("/login");
    router.refresh();
  };

  const isAIActive = pathname === "/assistant" || pathname?.startsWith("/assistant");

  return (
    <>
      <nav className="top-nav" aria-label="Main Navigation">
        {/* Left: brand + nav links */}
        <div className="top-nav-left">
          {/* Mobile menu toggle */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={onMenuToggle}
            aria-label="Open Navigation"
            style={{ marginRight: "0.25rem" }}
          >
            <Menu size={18} />
          </button>

          {/* Wordmark */}
          <Link href="/dashboard" className="top-nav-brand" aria-label="AcademicAI Home">
            <span className="top-nav-brand-wordmark">AcademicAI</span>
            <span className="top-nav-brand-sup">NLP</span>
          </Link>

          {/* Nav links — hidden on mobile */}
          <div className="top-nav-links" role="navigation">
            {STUDENT_NAV_LINKS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`top-nav-link ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.name}
                  {item.badge && (
                    <span
                      className="badge badge-ai"
                      style={{
                        marginLeft: "0.25rem",
                        padding: "0.08rem 0.35rem",
                        fontSize: "0.55rem",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Subtle separator before faculty routes */}
            <div
              style={{
                width: "1px",
                height: "14px",
                background: "var(--border-default)",
                margin: "0 0.3rem",
              }}
            />

            {FACULTY_NAV_LINKS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`top-nav-link ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.name}
                  {item.badge && (
                    <span
                      className="badge"
                      style={{
                        marginLeft: "0.25rem",
                        padding: "0.08rem 0.35rem",
                        fontSize: "0.55rem",
                        background: "rgba(99, 102, 241, 0.1)",
                        color: "var(--accent-ai)",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: date, search, AI, notifications, profile */}
        <div className="top-nav-right">
          <span className="top-nav-date" aria-label="Today's date">
            {getDateline()}
          </span>

          {/* Search / ⌘K */}
          <button
            type="button"
            className="nav-search-trigger"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette (⌘K)"
          >
            <Search size={13} />
            <span>Search...</span>
            <span className="nav-search-key">⌘K</span>
          </button>

          {/* AI Assistant shortcut */}
          <Link
            href="/assistant"
            className={`nav-icon-btn ${isAIActive ? "active-ai" : ""}`}
            title="Open AI Assistant"
            aria-label="AI Assistant"
            style={isAIActive ? { background: "var(--accent-ai-bg)", borderColor: "var(--accent-ai-border)" } : {}}
          >
            <Sparkles size={16} />
          </Link>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="nav-icon-btn"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="badge-dot" aria-hidden="true" />
          </Link>

          {/* Profile with Interactive Dropdown for Quick Student Switch / Sign Out */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <div
              className="nav-profile"
              onClick={() => setProfileDropdownOpen((v) => !v)}
              title={`${currentSession.name} · ${currentSession.rollNumber}`}
              role="button"
              tabIndex={0}
              aria-label={`Profile: ${currentSession.name}`}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <div className="nav-avatar" aria-hidden="true">
                {currentSession.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="nav-profile-name">{currentSession.name.split(" ")[0]}</span>
              <ChevronDown size={11} style={{ opacity: 0.6 }} />
            </div>

            {profileDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "0.4rem",
                  width: "260px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
                  padding: "0.75rem",
                  zIndex: 100,
                }}
              >
                <div style={{ paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {currentSession.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    {currentSession.rollNumber} &bull; {currentSession.program}
                  </div>
                </div>

                <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Switch Demo Student
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.6rem" }}>
                  {DEMO_STUDENTS.map((s) => {
                    const isSelected = s.id === currentSession.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSwitchStudent(s.id)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.4rem 0.6rem",
                          borderRadius: "var(--radius-xs)",
                          background: isSelected ? "rgba(180, 83, 9, 0.08)" : "transparent",
                          border: isSelected ? "1px solid rgba(180, 83, 9, 0.25)" : "1px solid transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: "0.74rem",
                          color: isSelected ? "var(--accent-academic)" : "var(--text-primary)",
                        }}
                      >
                        <span>{s.name}</span>
                        {isSelected && <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>ACTIVE</span>}
                      </button>
                    );
                  })}
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      width: "100%",
                      padding: "0.4rem 0.6rem",
                      borderRadius: "var(--radius-xs)",
                      background: "transparent",
                      border: "none",
                      color: "var(--status-critical)",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    <LogOut size={13} />
                    <span>Sign Out / Switch Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Command Palette */}
      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}
    </>
  );
}
