"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Calendar,
  BookOpen,
  Bell,
  BarChart3,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface CommandResult {
  id: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
  href: string;
  category: string;
}

const COMMANDS: CommandResult[] = [
  { id: "home",          label: "Academic Command Center", sub: "Home dashboard",             icon: LayoutDashboard, href: "/dashboard",      category: "Navigate" },
  { id: "inbox",         label: "Academic Inbox",          sub: "Ingest & analyze notices",   icon: Inbox,           href: "/inbox",          category: "Navigate" },
  { id: "tasks",         label: "Academic Flow",           sub: "All tasks & deliverables",   icon: CheckSquare,     href: "/tasks",          category: "Navigate" },
  { id: "calendar",      label: "Time Map",                sub: "Calendar & schedule",        icon: Calendar,        href: "/calendar",       category: "Navigate" },
  { id: "courses",       label: "Course Intelligence",     sub: "Enrolled courses",           icon: BookOpen,        href: "/courses",        category: "Navigate" },
  { id: "notifications", label: "Attention Center",        sub: "Notifications & changes",    icon: Bell,            href: "/notifications",  category: "Navigate" },
  { id: "analytics",     label: "Academic Analytics",      sub: "Workload & progress data",   icon: BarChart3,       href: "/analytics",      category: "Navigate" },
  { id: "assistant",     label: "Ask AcademicAI",          sub: "AI assistant workspace",     icon: Sparkles,        href: "/assistant",      category: "AI" },
];

interface CommandPaletteProps {
  onClose: () => void;
}

export default function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.sub?.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) navigate(filtered[highlighted].href);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="command-palette-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="command-palette-box"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="command-palette-input-row">
          <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Navigate to page, search tasks, ask AI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Command palette search"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Results */}
        <div className="command-palette-results" role="listbox">
          {filtered.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            (() => {
              let lastCategory = "";
              return filtered.map((cmd, idx) => {
                const Icon = cmd.icon;
                const showCategory = cmd.category !== lastCategory;
                lastCategory = cmd.category;
                return (
                  <div key={cmd.id}>
                    {showCategory && (
                      <div
                        style={{
                          padding: "0.4rem 0.85rem 0.15rem",
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {cmd.category}
                      </div>
                    )}
                    <div
                      className={`command-palette-result ${idx === highlighted ? "highlighted" : ""}`}
                      onClick={() => navigate(cmd.href)}
                      onMouseEnter={() => setHighlighted(idx)}
                      role="option"
                      aria-selected={idx === highlighted}
                    >
                      <Icon
                        size={15}
                        style={{
                          color: cmd.category === "AI" ? "var(--accent-ai)" : "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.84rem" }}>
                          {cmd.label}
                        </div>
                        {cmd.sub && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.05rem" }}>
                            {cmd.sub}
                          </div>
                        )}
                      </div>
                      <ArrowRight size={13} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Footer hints */}
        <div className="command-palette-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
