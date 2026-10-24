"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/layout/Shell";
import {
  Bell,
  Clock,
  RefreshCw,
  FileText,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Check,
  X,
  ArrowRight,
  Zap,
  Info,
  Layers,
} from "lucide-react";
import Link from "next/link";

interface AdaptiveNotificationDTO {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  urgency: "CRITICAL" | "URGENT" | "NORMAL" | "INFO";
  targetItemType: "TASK" | "EVENT" | "EXAM" | "WORKLOAD" | "DIGEST";
  targetItemId: string | null;
  courseCode: string | null;
  scheduledFor: string;
  status: "SCHEDULED" | "SENT" | "READ" | "DISMISSED" | "CANCELLED";
  stage: string | null;
  dedupKey: string;
  whyBullets: string[];
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: string;
  readAt: string | null;
  dismissedAt: string | null;
}

interface DailyAcademicDigestDTO {
  date: string;
  headline: string;
  criticalCount: number;
  dueTodayCount: number;
  dueTomorrowCount: number;
  rescheduledCount: number;
  topFocusItem: {
    id: string;
    title: string;
    courseCode: string | null;
    priorityScore: number;
  } | null;
  workloadPressure: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summaryText: string;
}

interface NotificationGroups {
  actionRequired: AdaptiveNotificationDTO[];
  changed: AdaptiveNotificationDTO[];
  upcoming: AdaptiveNotificationDTO[];
  insights: AdaptiveNotificationDTO[];
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [digest, setDigest] = useState<DailyAcademicDigestDTO | null>(null);
  const [groups, setGroups] = useState<NotificationGroups>({
    actionRequired: [],
    changed: [],
    upcoming: [],
    insights: [],
  });
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTION" | "CHANGED" | "UPCOMING" | "INSIGHTS">("ALL");

  const fetchNotifications = useCallback(async (sync = false) => {
    try {
      if (sync) setSyncing(true);
      const url = sync ? "/api/notifications?sync=true" : "/api/notifications";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setUnreadCount(json.data.unreadCount || 0);
        setTotalCount(json.data.totalCount || 0);
        setDigest(json.data.digest || null);
        setGroups(json.data.groups || { actionRequired: [], changed: [], upcoming: [], insights: [] });
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMarkRead = async (id: string) => {
    // Optimistic UI update
    setGroups((prev) => {
      const updateList = (list: AdaptiveNotificationDTO[]) =>
        list.map((n) => (n.id === id ? { ...n, status: "READ" as const, readAt: new Date().toISOString() } : n));
      return {
        actionRequired: updateList(prev.actionRequired),
        changed: updateList(prev.changed),
        upcoming: updateList(prev.upcoming),
        insights: updateList(prev.insights),
      };
    });
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const handleDismiss = async (id: string) => {
    // Optimistic UI remove
    let wasUnread = false;
    setGroups((prev) => {
      const filterList = (list: AdaptiveNotificationDTO[]) =>
        list.filter((n) => {
          if (n.id === id) {
            if (n.status !== "READ" && !n.readAt) wasUnread = true;
            return false;
          }
          return true;
        });
      return {
        actionRequired: filterList(prev.actionRequired),
        changed: filterList(prev.changed),
        upcoming: filterList(prev.upcoming),
        insights: filterList(prev.insights),
      };
    });
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    setTotalCount((t) => Math.max(0, t - 1));

    try {
      await fetch(`/api/notifications/${id}/dismiss`, { method: "POST" });
    } catch (err) {
      console.error("Error dismissing notification:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setGroups((prev) => {
      const readAll = (list: AdaptiveNotificationDTO[]) =>
        list.map((n) => ({ ...n, status: "READ" as const, readAt: new Date().toISOString() }));
      return {
        actionRequired: readAll(prev.actionRequired),
        changed: readAll(prev.changed),
        upcoming: readAll(prev.upcoming),
        insights: readAll(prev.insights),
      };
    });
    setUnreadCount(0);

    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const renderIcon = (type: string, urgency: string) => {
    if (type === "OVERDUE_ALERT" || urgency === "CRITICAL") {
      return <AlertCircle size={16} style={{ color: "var(--status-critical)" }} />;
    }
    if (type === "URGENT_DEADLINE") {
      return <Clock size={16} style={{ color: "var(--status-critical)" }} />;
    }
    if (type === "RESCHEDULED_EVENT" || type === "CANCELLED_EVENT" || type === "UPDATED_ACADEMIC_ITEM") {
      return <RefreshCw size={16} style={{ color: "#d97706" }} />;
    }
    if (type === "EXAM_REMINDER") {
      return <ShieldAlert size={16} style={{ color: "var(--accent-academic)" }} />;
    }
    if (type === "DAILY_DIGEST" || type === "WORKLOAD_ALERT") {
      return <Sparkles size={16} style={{ color: "var(--accent-ai)" }} />;
    }
    return <Calendar size={16} style={{ color: "var(--text-secondary)" }} />;
  };

  const urgencyBadgeClass = (urgency: string) => {
    switch (urgency) {
      case "CRITICAL":
        return "badge-critical";
      case "URGENT":
        return "badge-high";
      case "NORMAL":
        return "badge-neutral";
      default:
        return "badge-neutral";
    }
  };

  const formatDisplayTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  const allItemsCount =
    groups.actionRequired.length +
    groups.changed.length +
    groups.upcoming.length +
    groups.insights.length;

  return (
    <Shell>
      {/* ── PAGE HEADER ────────────────────────────────────────── */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 className="page-title">Attention Center</h1>
            {unreadCount > 0 && <span className="badge badge-critical">{unreadCount} Unread</span>}
            <span className="badge badge-neutral">{totalCount} Active Signals</span>
          </div>
          <p className="page-sub">
            Deterministic, explainable notification intelligence tracking deadlines, changes, and workload.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => fetchNotifications(true)}
            disabled={syncing}
            className="btn btn-outline btn-sm"
            title="Re-evaluate academic state & sync signals"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} aria-hidden="true" />
            <span>{syncing ? "Evaluating..." : "Refresh & Sync"}</span>
          </button>
          {unreadCount > 0 && (
            <button type="button" onClick={handleMarkAllRead} className="btn btn-primary btn-sm">
              <Check size={13} aria-hidden="true" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* ── DAILY ACADEMIC DIGEST HIGHLIGHT ─────────────────────── */}
      {digest && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--accent-ai)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--accent-ai)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Sparkles size={13} />
                <span>Daily Academic Digest</span>
              </span>
              <span className="badge badge-neutral" style={{ fontSize: "0.62rem" }}>
                {digest.date}
              </span>
              <span className={`badge ${digest.workloadPressure === "CRITICAL" || digest.workloadPressure === "HIGH" ? "badge-critical" : "badge-neutral"}`} style={{ fontSize: "0.62rem" }}>
                {digest.workloadPressure} Workload
              </span>
            </div>

            {digest.topFocusItem && (
              <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                Top Focus: <strong>{digest.topFocusItem.title}</strong> (Score {digest.topFocusItem.priorityScore})
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: "0.98rem",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
              marginTop: "0.4rem",
              marginBottom: "0.25rem",
            }}
          >
            {digest.headline}
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
            {digest.summaryText}
          </p>
        </div>
      )}

      {/* ── FILTER NAVIGATION PILLS ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "0.75rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`btn btn-sm ${activeTab === "ALL" ? "btn-primary" : "btn-outline"}`}
          style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem" }}
        >
          All Signals ({allItemsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ACTION")}
          className={`btn btn-sm ${activeTab === "ACTION" ? "btn-primary" : "btn-outline"}`}
          style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem" }}
        >
          Action Required ({groups.actionRequired.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("CHANGED")}
          className={`btn btn-sm ${activeTab === "CHANGED" ? "btn-primary" : "btn-outline"}`}
          style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem" }}
        >
          Changed ({groups.changed.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("UPCOMING")}
          className={`btn btn-sm ${activeTab === "UPCOMING" ? "btn-primary" : "btn-outline"}`}
          style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem" }}
        >
          Upcoming ({groups.upcoming.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("INSIGHTS")}
          className={`btn btn-sm ${activeTab === "INSIGHTS" ? "btn-primary" : "btn-outline"}`}
          style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem" }}
        >
          Insights ({groups.insights.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 0.75rem" }} />
          <div>Evaluating academic state & notifications...</div>
        </div>
      ) : allItemsCount === 0 ? (
        <div className="empty-state-box">
          <div className="empty-state-icon">
            <CheckCircle2 size={24} style={{ color: "var(--status-done)" }} aria-hidden="true" />
          </div>
          <div className="empty-state-title">All clear.</div>
          <div className="empty-state-sub">
            No active notification signals or urgent academic items requiring immediate attention.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* 1. ACTION REQUIRED GROUP */}
          {(activeTab === "ALL" || activeTab === "ACTION") && groups.actionRequired.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                  color: "var(--status-critical)",
                }}
              >
                <AlertCircle size={15} />
                <span className="section-label" style={{ margin: 0, color: "var(--status-critical)" }}>
                  ACTION REQUIRED ({groups.actionRequired.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {groups.actionRequired.map((item) => renderNotificationCard(item))}
              </div>
            </div>
          )}

          {/* 2. CHANGED GROUP */}
          {(activeTab === "ALL" || activeTab === "CHANGED") && groups.changed.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                  color: "#d97706",
                }}
              >
                <RefreshCw size={15} />
                <span className="section-label" style={{ margin: 0, color: "#d97706" }}>
                  CHANGED ({groups.changed.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {groups.changed.map((item) => renderNotificationCard(item))}
              </div>
            </div>
          )}

          {/* 3. UPCOMING GROUP */}
          {(activeTab === "ALL" || activeTab === "UPCOMING") && groups.upcoming.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <Calendar size={15} style={{ color: "var(--text-secondary)" }} />
                <span className="section-label" style={{ margin: 0 }}>
                  UPCOMING ({groups.upcoming.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {groups.upcoming.map((item) => renderNotificationCard(item))}
              </div>
            </div>
          )}

          {/* 4. INSIGHTS GROUP */}
          {(activeTab === "ALL" || activeTab === "INSIGHTS") && groups.insights.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                  color: "var(--accent-ai)",
                }}
              >
                <Sparkles size={15} />
                <span className="section-label" style={{ margin: 0, color: "var(--accent-ai)" }}>
                  INSIGHTS ({groups.insights.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {groups.insights.map((item) => renderNotificationCard(item))}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );

  function renderNotificationCard(item: AdaptiveNotificationDTO) {
    const isRead = item.status === "READ" || !!item.readAt;
    const isExpanded = !!expandedWhy[item.id];

    return (
      <div
        key={item.id}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderLeft:
            item.urgency === "CRITICAL"
              ? "4px solid var(--status-critical)"
              : item.urgency === "URGENT"
              ? "4px solid #f59e0b"
              : item.type === "RESCHEDULED_EVENT" || item.type === "CANCELLED_EVENT"
              ? "4px solid #d97706"
              : "4px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          padding: "1rem",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          opacity: isRead ? 0.72 : 1,
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          {/* Icon Box */}
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "var(--radius-xs)",
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: "2px",
            }}
          >
            {renderIcon(item.type, item.urgency)}
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header row: title, badges, date */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: "0.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {item.title}
                </span>
                {item.courseCode && (
                  <span className="badge badge-academic" style={{ fontSize: "0.62rem" }}>
                    {item.courseCode}
                  </span>
                )}
                <span className={`badge ${urgencyBadgeClass(item.urgency)}`} style={{ fontSize: "0.62rem" }}>
                  {item.urgency}
                </span>
                {item.stage && (
                  <span className="badge badge-neutral" style={{ fontSize: "0.58rem" }}>
                    {item.stage}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {formatDisplayTime(item.scheduledFor)}
                </span>
                {!isRead && (
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: "var(--accent-ai)",
                      display: "inline-block",
                    }}
                    title="Unread"
                  />
                )}
              </div>
            </div>

            {/* Message Body */}
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                margin: "0 0 0.5rem 0",
              }}
            >
              {item.message}
            </p>

            {/* Expandable "Why this notification?" checklist */}
            {item.whyBullets && item.whyBullets.length > 0 && (
              <div style={{ marginBottom: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => toggleWhy(item.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "0.15rem 0",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--accent-ai)",
                    cursor: "pointer",
                  }}
                >
                  <Info size={12} />
                  <span>Why this notification?</span>
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: "0.4rem",
                      padding: "0.6rem 0.85rem",
                      background: "rgba(0, 0, 0, 0.02)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-xs)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--text-muted)",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Transparent Intelligence Justifications
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "1rem",
                        fontSize: "0.74rem",
                        color: "var(--text-secondary)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      {item.whyBullets.map((bullet, idx) => (
                        <li key={idx} style={{ lineHeight: 1.4 }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "0.4rem",
                paddingTop: "0.4rem",
                borderTop: "1px solid rgba(0,0,0,0.03)",
              }}
            >
              <div>
                {item.actionUrl && (
                  <Link
                    href={item.actionUrl}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      color: "var(--accent-academic)",
                    }}
                  >
                    <span>{item.actionLabel || "Open Deliverable"}</span>
                    <ArrowRight size={11} />
                  </Link>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {!isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(item.id)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}
                    title="Mark as Read"
                  >
                    <Check size={11} />
                    <span>Mark read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDismiss(item.id)}
                  className="btn btn-outline btn-sm"
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.2rem 0.45rem",
                    color: "var(--text-muted)",
                  }}
                  title="Dismiss notification"
                >
                  <X size={11} />
                  <span>Dismiss</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
