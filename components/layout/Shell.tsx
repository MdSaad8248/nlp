"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync collapsed state with localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("academic_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("academic_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Auth / Landing pages render full-width without the dashboard sidebar shell
  const isAuthOrLandingPage = pathname === "/" || pathname === "/login";

  if (isAuthOrLandingPage) {
    return <main className="landing-auth-shell">{children}</main>;
  }

  const sidebarWidth = isCollapsed ? 72 : 260;

  return (
    <div className="academic-platform-shell" style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left Collapsible Navigation Sidebar */}
      <Sidebar
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Application Container */}
      <div
        className="academic-main-area"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          marginLeft: `${sidebarWidth}px`,
          transition: "margin-left 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
          background: "var(--bg-canvas)",
        }}
      >
        {/* Top Header Bar */}
        <Header
          onMenuToggle={() => setMobileDrawerOpen(true)}
          isCollapsed={isCollapsed}
        />

        {/* Content Viewport */}
        <main
          className="academic-content-viewport"
          style={{
            flex: 1,
            padding: "1.75rem 2rem",
            maxWidth: "1480px",
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>

        {/* Mobile bottom nav fallback for small screens */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
