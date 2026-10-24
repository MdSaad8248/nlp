"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Calendar,
  BookOpen,
  Bell,
  BarChart3,
  Bot,
  ScrollText,
  FileCheck2,
  FileText,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  GraduationCap,
  Users,
  FlaskConical,
  X,
  Shield,
  UserCheck,
} from "lucide-react";
import { getCurrentSession, UserSession, DEMO_STUDENTS, DEMO_TEACHERS } from "@/lib/auth/session";

interface SidebarProps {
  isOpen: boolean; // For mobile drawer
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession>(getCurrentSession());
  const [unreadCount, setUnreadCount] = useState<number>(3);

  // Sync session on mount / path change
  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const studentCookie = cookies.find((c) => c.startsWith("academic_student_id="));
    const studentId = studentCookie ? decodeURIComponent(studentCookie.split("=")[1]) : null;
    const current = getCurrentSession(studentId);
    setSession(current);

    // Fetch live notifications count
    fetch("/api/notifications?status=SCHEDULED&limit=20")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.notifications)) {
          const unread = data.notifications.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread || data.notifications.length);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {}
    router.push("/login");
    router.refresh();
  };

  const isTeacher = session.role === "TEACHER";

  const WORKSPACE_NAV: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Ingest Notice", href: "/inbox", icon: Inbox, badge: "NLP" },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Courses", href: "/courses", icon: BookOpen },
  ];

  const INTELLIGENCE_NAV: NavItem[] = [
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
      badge: unreadCount > 0 ? String(unreadCount) : undefined,
      badgeColor: "#ef4444",
    },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "AI Assistant", href: "/assistant", icon: Bot, badge: "PRO", badgeColor: "#6366f1" },
  ];

  const RESOURCES_NAV: NavItem[] = [
    { name: "Syllabus", href: "/syllabus", icon: ScrollText, badge: "NEW" },
    { name: "Rubric Intelligence", href: "/rubrics", icon: FileCheck2 },
    { name: "Documents & OCR", href: "/documents", icon: FileText },
  ];

  const TEACHER_NAV: NavItem[] = [
    { name: "Teacher Dashboard", href: "/faculty-course-intelligence", icon: Users, badge: "COHORT" },
    { name: "Defense Review", href: "/faculty-review", icon: GraduationCap, badge: "DEMO" },
    { name: "Model Benchmark", href: "/evaluation", icon: FlaskConical },
  ];

  const ACCOUNT_NAV: NavItem[] = [
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "About & Defense", href: "/about", icon: Info },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="sidebar-group" style={{ marginBottom: "1.25rem" }}>
      {!isCollapsed && (
        <div
          style={{
            padding: "0 0.85rem 0.45rem",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{title}</span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={isCollapsed ? item.name : undefined}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "space-between",
                padding: isCollapsed ? "0.65rem 0" : "0.55rem 0.85rem",
                borderRadius: "8px",
                color: isActive ? "#ffffff" : "#94a3b8",
                background: isActive ? "rgba(59, 130, 246, 0.16)" : "transparent",
                borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.84rem",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                <Icon
                  size={17}
                  style={{
                    color: isActive ? "#3b82f6" : "#94a3b8",
                    flexShrink: 0,
                  }}
                />
                {!isCollapsed && (
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </span>
                )}
              </div>
              {!isCollapsed && item.badge && (
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "999px",
                    background: item.badgeColor
                      ? `${item.badgeColor}22`
                      : "rgba(59, 130, 246, 0.15)",
                    color: item.badgeColor || "#60a5fa",
                    border: `1px solid ${item.badgeColor ? `${item.badgeColor}44` : "rgba(59, 130, 246, 0.3)"}`,
                    marginLeft: "0.5rem",
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
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 90,
          }}
        />
      )}

      {/* Primary Sidebar Container */}
      <aside
        className={`sidebar-shell ${isOpen ? "mobile-open" : ""}`}
        style={{
          width: isCollapsed ? "72px" : "260px",
          background: "#090d16",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 100,
          transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s ease",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            padding: isCollapsed ? "0" : "0 1rem",
            borderBottom: "1px solid #1e293b",
            flexShrink: 0,
          }}
        >
          {!isCollapsed ? (
            <Link
              href={isTeacher ? "/faculty-course-intelligence" : "/dashboard"}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: isTeacher
                    ? "linear-gradient(135deg, #8b5cf6, #6366f1)"
                    : "linear-gradient(135deg, #2563eb, #3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 2px 10px rgba(59, 130, 246, 0.3)",
                  flexShrink: 0,
                }}
              >
                {isTeacher ? <GraduationCap size={18} /> : <Sparkles size={18} />}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      color: "#f8fafc",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    AcademicAI
                  </span>
                  <span
                    style={{
                      fontSize: "0.55rem",
                      fontWeight: 800,
                      padding: "0.1rem 0.3rem",
                      background: isTeacher ? "rgba(139, 92, 246, 0.2)" : "rgba(59, 130, 246, 0.2)",
                      color: isTeacher ? "#c084fc" : "#60a5fa",
                      borderRadius: "4px",
                      border: `1px solid ${isTeacher ? "rgba(139, 92, 246, 0.4)" : "rgba(59, 130, 246, 0.4)"}`,
                    }}
                  >
                    {isTeacher ? "FACULTY" : "PRO"}
                  </span>
                </div>
                <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                  Intelligence Platform
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
              title="AcademicAI Home"
            >
              <Sparkles size={18} />
            </Link>
          )}

          {/* Collapse Toggle / Mobile Close */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* Desktop collapse button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="desktop-collapse-btn"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                display: "none", // enabled via CSS media query on desktop
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid #1e293b",
                background: "rgba(255, 255, 255, 0.04)",
                color: "#94a3b8",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onClose}
              className="mobile-close-btn"
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid #1e293b",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: isCollapsed ? "1rem 0.4rem" : "1rem 0.65rem",
          }}
        >
          {renderNavGroup("Workspace", WORKSPACE_NAV)}
          {renderNavGroup("Academic Intelligence", INTELLIGENCE_NAV)}
          {renderNavGroup("Academic Resources", RESOURCES_NAV)}
          {isTeacher && renderNavGroup("Teacher Workspace", TEACHER_NAV)}
          {renderNavGroup("Account", ACCOUNT_NAV)}
        </div>

        {/* User Account / Footer */}
        <div
          style={{
            padding: isCollapsed ? "0.75rem 0.4rem" : "0.75rem 0.85rem",
            borderTop: "1px solid #1e293b",
            background: "#060910",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "space-between",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: isTeacher ? "#7c3aed" : "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  flexShrink: 0,
                  border: "2px solid rgba(255, 255, 255, 0.1)",
                }}
                title={`${session.name} (${session.role})`}
              >
                {session.name ? session.name.slice(0, 2).toUpperCase() : "US"}
              </div>

              {!isCollapsed && (
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#f1f5f9",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {session.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: isTeacher ? "#c084fc" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <span>{session.role}</span>
                    <span>&bull;</span>
                    <span>{session.rollNumber}</span>
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out / Switch user"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ef4444",
                  padding: "0.35rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s ease",
                }}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
