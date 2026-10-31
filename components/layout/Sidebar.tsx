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
  userRole?: "STUDENT" | "TEACHER";
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
  userRole,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Deterministic initial session matching route context
  const isFacultyPath = pathname ? (pathname.startsWith("/faculty-") || pathname === "/evaluation" || pathname === "/submissions") : false;
  const initialSession = userRole === "TEACHER" || isFacultyPath ? DEMO_TEACHERS[0] : DEMO_STUDENTS[0];
  const [session, setSession] = useState<UserSession>(initialSession);
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(3);

  // Sync session on mount / path change
  useEffect(() => {
    setMounted(true);

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
          const current = getCurrentSession(studentId);
          setSession(current);
        }
      })
      .catch(() => {
        const cookies = document.cookie.split("; ");
        const studentCookie = cookies.find((c) => c.startsWith("academic_student_id="));
        const studentId = studentCookie ? decodeURIComponent(studentCookie.split("=")[1]) : null;
        const current = getCurrentSession(studentId);
        setSession(current);
      });

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

  // Deterministic role evaluation: identical on SSR and client initial hydration
  const isTeacher = userRole
    ? userRole === "TEACHER"
    : (isFacultyPath || (mounted && session.role === "TEACHER"));

  // Student-specific navigation items matching reference image
  const STUDENT_NAV: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Courses", href: "/courses", icon: BookOpen },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
      badge: unreadCount > 0 ? String(unreadCount) : "3",
      badgeColor: "#EF4444",
    },
    { name: "Inbox", href: "/inbox", icon: Inbox },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Syllabus", href: "/syllabus", icon: ScrollText },
    { name: "Rubrics", href: "/rubrics", icon: FileCheck2 },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "AI Assistant", href: "/assistant", icon: Bot },
  ];

  // Faculty-specific navigation items matching reference image + Student Dataset
  const FACULTY_NAV: NavItem[] = [
    { name: "Dashboard", href: "/faculty-course-intelligence", icon: LayoutDashboard },
    { name: "Courses", href: "/courses", icon: BookOpen },
    { name: "Submissions", href: "/submissions", icon: CheckSquare },
    { name: "Faculty Review", href: "/faculty-review", icon: GraduationCap },
    { name: "Student Dataset", href: "/faculty-dataset", icon: Users, badge: "NEW", badgeColor: "#4658C8" },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Evaluation", href: "/evaluation", icon: FlaskConical },
    { name: "Syllabus", href: "/syllabus", icon: ScrollText },
    { name: "Rubrics", href: "/rubrics", icon: FileCheck2 },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Inbox", href: "/inbox", icon: Inbox },
  ];

  const renderNavList = (items: NavItem[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" &&
            item.href !== "/faculty-course-intelligence" &&
            pathname?.startsWith(item.href));

        return (
          <Link
            key={item.name + item.href}
            href={item.href}
            onClick={onClose}
            title={isCollapsed ? item.name : undefined}
            className={`sidebar-link ${isActive ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "space-between",
              padding: isCollapsed ? "0.65rem 0" : "0.62rem 0.95rem",
              borderRadius: "8px",
              color: isActive ? "#ffffff" : "#8F9CAE",
              background: isActive ? "#4658C8" : "transparent",
              fontWeight: isActive ? 600 : 500,
              fontSize: "0.88rem",
              textDecoration: "none",
              transition: "all 0.15s ease",
              boxShadow: isActive ? "0 2px 8px rgba(70, 88, 200, 0.35)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
              <Icon
                size={18}
                style={{
                  color: isActive ? "#ffffff" : "#8F9CAE",
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
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: "0.2rem 0.45rem",
                  borderRadius: "999px",
                  background: item.badgeColor || "#EF4444",
                  color: "#ffffff",
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
          background: "#182447",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 100,
          transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s ease",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: "68px",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            padding: isCollapsed ? "0" : "0 1.15rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
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
                gap: "0.75rem",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#4658C8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 2px 10px rgba(70, 88, 200, 0.35)",
                  flexShrink: 0,
                }}
              >
                <GraduationCap size={20} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                    fontSize: "1.15rem",
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.15,
                  }}
                >
                  AcademicAI
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "#8F9CAE",
                    letterSpacing: "-0.01em",
                    marginTop: "2px",
                  }}
                >
                  Smarter Learning, Brighter Future.
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href={isTeacher ? "/faculty-course-intelligence" : "/dashboard"}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#4658C8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
              title={isTeacher ? "Faculty Dashboard" : "AcademicAI Home"}
            >
              <GraduationCap size={20} />
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
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "rgba(255, 255, 255, 0.04)",
                color: "#8F9CAE",
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
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "transparent",
                color: "#8F9CAE",
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
            padding: isCollapsed ? "1rem 0.4rem" : "1rem 0.85rem",
          }}
        >
          {isTeacher ? renderNavList(FACULTY_NAV) : renderNavList(STUDENT_NAV)}
        </div>

        {/* User Account / Footer matching reference */}
        <div
          style={{
            padding: isCollapsed ? "0.75rem 0.4rem" : "0.85rem 1rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "#182447",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "space-between",
              padding: isCollapsed ? "0" : "0.55rem 0.75rem",
              background: isCollapsed ? "transparent" : "rgba(255, 255, 255, 0.05)",
              border: isCollapsed ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: isTeacher ? "#4658C8" : "#4658C8",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  flexShrink: 0,
                  border: "2px solid rgba(255, 255, 255, 0.15)",
                }}
                title={`${session.name} (${session.role})`}
              >
                {session.name ? session.name.slice(0, 2).toUpperCase() : "US"}
              </div>

              {!isCollapsed && (
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {session.name || (session.role === "TEACHER" ? "Faculty" : "Student")}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#8F9CAE",
                      lineHeight: 1.2,
                    }}
                  >
                    {session.role === "TEACHER" ? (session.department || "Faculty Member") : (session.program || "Student")}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#8F9CAE",
                    padding: "0.25rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8F9CAE")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
