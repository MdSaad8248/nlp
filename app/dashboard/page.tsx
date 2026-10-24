import Shell from "@/components/layout/Shell";
import {
  ArrowRight,
  Sparkles,
  Bot,
  Inbox,
  RefreshCw,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/services/dashboard.service";
import { getCurrentSession } from "@/lib/auth/session";
import AcademicPulse from "@/components/dashboard/AcademicPulse";

// Compute greeting
function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const first = name.split(" ")[0];
  if (hour < 12) return `Good morning, ${first}.`;
  if (hour < 17) return `Good afternoon, ${first}.`;
  return `Good evening, ${first}.`;
}

// Priority → CSS class
function priorityClass(p: string | undefined): string {
  if (!p) return "p-low";
  const up = p.toUpperCase();
  if (up === "CRITICAL") return "p-critical";
  if (up === "HIGH") return "p-high";
  if (up === "MEDIUM") return "p-medium";
  return "p-low";
}

import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const studentCookie = cookieStore.get("academic_student_id")?.value;
  const session = getCurrentSession(studentCookie);

  if (session.role === "TEACHER") {
    redirect("/faculty-course-intelligence");
  }

  const data = await getDashboardData(session.id);
  const { stats, todayPriorities, upcomingEvents, recentChanges, workload, aiBrief, recommendation, pulseEvents, intelligence, riskRadar, smartPlan } = data;

  const greeting = getGreeting(session.name);

  return (
    <Shell>
      {/* ── HEADER ROW ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "0.25rem",
        }}
      >
        {/* Greeting block */}
        <div className="acc-greeting-block">
          <h1 className="acc-greeting">{greeting}</h1>
          <p className="acc-greeting-sub">
            {session.program} &bull; Semester {session.semester}
          </p>
        </div>

        {/* CTA buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            alignItems: "center",
            paddingTop: "0.35rem",
          }}
        >
          <Link href="/assistant" className="btn btn-ai">
            <Bot size={14} />
            <span>Ask AcademicAI</span>
          </Link>
          <Link href="/inbox" className="btn btn-primary">
            <Inbox size={14} />
            <span>Ingest Notice</span>
          </Link>
        </div>
      </div>

      {/* ── NOTIFICATIONS ATTENTION BANNER ───────────────────────── */}
      {data.notifications && data.notifications.unreadCount > 0 && (
        <div
          style={{
            background: "rgba(180, 50, 40, 0.05)",
            border: "1px solid rgba(180, 50, 40, 0.2)",
            borderLeft: "4px solid var(--status-critical)",
            borderRadius: "var(--radius-sm)",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
          role="alert"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(180, 50, 40, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--status-critical)",
                flexShrink: 0,
              }}
            >
              <Bell size={15} />
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {data.notifications.topAlert?.title || `${data.notifications.unreadCount} Unread Notifications Require Attention`}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {data.notifications.topAlert?.message || "Check the Attention Center for urgent deadline signals and schedule changes."}
              </div>
            </div>
          </div>
          <Link
            href="/notifications"
            className="btn btn-outline btn-sm"
            style={{ fontSize: "0.74rem", whiteSpace: "nowrap" }}
          >
            <span>View Attention Center ({data.notifications.unreadCount})</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ── STAT STRIP ────────────────────────────────────────────── */}
      <div className="stat-strip" role="region" aria-label="Academic status">
        <div className="stat-item">
          <span
            className={`stat-number ${stats.highPriorityCount > 0 ? "critical" : ""}`}
            aria-label={`${stats.taskCount} tasks due`}
          >
            {stats.taskCount}
          </span>
          <span className="stat-label">Tasks due</span>
          <span className="stat-sub">Active deliverables</span>
        </div>
        <div className="stat-item">
          <span className="stat-number" aria-label={`${stats.eventCount} events upcoming`}>
            {stats.eventCount}
          </span>
          <span className="stat-label">Upcoming events</span>
          <span className="stat-sub">Exams &amp; sessions</span>
        </div>
        <div className="stat-item">
          <span
            className={`stat-number ${stats.highPriorityCount > 0 ? "high" : ""}`}
            aria-label={`${stats.highPriorityCount} high priority items`}
          >
            {stats.highPriorityCount}
          </span>
          <span className="stat-label">High priority</span>
          <span className="stat-sub">
            {stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : "Need immediate action"}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-number" aria-label={`${stats.noticeCount} notices processed`}>
            {stats.noticeCount}
          </span>
          <span className="stat-label">Notices processed</span>
          <span className="stat-sub">NLP-parsed circulars</span>
        </div>
      </div>

      {/* ── ACADEMIC PULSE ────────────────────────────────────────── */}
      <AcademicPulse events={pulseEvents && pulseEvents.length > 0 ? pulseEvents : undefined} />

      <div className="rule" role="separator" />

      {/* ── WHAT SHOULD I WORK ON NOW? (RECOMMENDED FOCUS BLOCK) ───── */}
      {recommendation && recommendation.recommendedItem && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--accent-academic)",
            borderRadius: "var(--radius-md)",
            padding: "1.25rem 1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
          aria-label="What Should I Work On Now recommendation"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--accent-academic)",
                  fontFamily: "var(--font-sans)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Zap size={13} />
                <span>What Should I Work On Now?</span>
              </span>
              <span className={`badge ${priorityClass(recommendation.recommendedItem.priorityLevel)}`}>
                {recommendation.recommendedItem.priorityLevel} &bull; Score {recommendation.recommendedItem.priorityScore}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
              <Clock size={13} />
              <span>Suggested session: <strong>{recommendation.estimatedTimeBlockMinutes} min</strong></span>
            </div>
          </div>

          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
              marginBottom: "0.35rem",
              letterSpacing: "-0.01em",
            }}
          >
            {recommendation.headline}
          </h2>

          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
            {recommendation.actionAdvice}
          </p>

          <div style={{ background: "rgba(255,255,255,0.4)", borderRadius: "var(--radius-xs)", padding: "0.6rem 0.85rem", border: "1px solid var(--border-subtle)", marginBottom: "0.85rem" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Why this item first (Transparent Intelligence Factors)
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {recommendation.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/tasks" className="btn btn-primary btn-sm">
              <span>Open Deliverable Details</span>
              <ArrowRight size={12} />
            </Link>
            <Link href="/assistant" className="btn btn-secondary btn-sm">
              <span>Ask AI Focus Breakdown</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── M8-D ACADEMIC RISK RADAR & SMART PLAN ───────────────── */}
      {riskRadar && smartPlan && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          {/* ACADEMIC RISK RADAR */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--status-critical)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <ShieldAlert size={14} />
                <span>Academic Risk Radar</span>
              </span>
              <span className={`badge ${priorityClass(riskRadar.overallRiskLevel)}`}>
                {riskRadar.overallRiskLevel} RISK
              </span>
            </div>

            <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              {riskRadar.headline}
            </div>

            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.45 }}>
              {riskRadar.summary}
            </div>

            {riskRadar.mainTriggers.length > 0 && (
              <div style={{ background: "rgba(0,0,0,0.02)", borderRadius: "var(--radius-xs)", padding: "0.6rem 0.75rem", border: "1px solid var(--border-subtle)", marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Main Triggers
                </div>
                <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.74rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {riskRadar.mainTriggers.map((trig) => (
                    <li key={trig.id}>
                      <strong>{trig.title}:</strong> {trig.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {riskRadar.highestRiskCourse && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>Highest risk course: <strong>{riskRadar.highestRiskCourse}</strong></span>
                <Link href="/assistant" style={{ color: "var(--accent-ai)", textDecoration: "underline" }}>
                  Ask Assistant &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* SMART PLAN */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--accent-academic)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Zap size={14} />
                <span>Smart Academic Plan</span>
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {smartPlan.planDate}
              </span>
            </div>

            <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Next focus: {smartPlan.nextImmediateFocus ? smartPlan.nextImmediateFocus.moduleOrRequirementTitle : "Coursework"}
            </div>

            {smartPlan.nextImmediateFocus && (
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                <strong>Reason:</strong> {smartPlan.nextImmediateFocus.whyNow.join(" + ")}
              </div>
            )}

            {smartPlan.sessions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                {smartPlan.sessions.slice(0, 3).map((sess) => (
                  <div
                    key={sess.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.45rem 0.65rem",
                      borderRadius: "var(--radius-xs)",
                      background: "rgba(0,0,0,0.02)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.74rem",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{sess.timeSlot}</span>
                      <span style={{ color: "var(--text-muted)", margin: "0 0.4rem" }}>&bull;</span>
                      <span style={{ color: "var(--text-secondary)" }}>{sess.taskTitle} — {sess.moduleOrRequirementTitle}</span>
                    </div>
                    {sess.marksAtStake && (
                      <span className="badge p-medium" style={{ fontSize: "0.62rem" }}>
                        {sess.marksAtStake} marks
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                {smartPlan.summary}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)" }}>
              <span>{smartPlan.totalPlannedMinutes} min total focus</span>
              <Link href="/tasks" style={{ color: "var(--accent-ai)", textDecoration: "underline" }}>
                View Tasks &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN EDITORIAL GRID ───────────────────────────────────── */}
      <div className="home-grid">

        {/* LEFT — What needs attention */}
        <div>
          <div className="section-label">What needs attention</div>
          <div className="attention-feed" role="list" aria-label="Priority tasks">
            {todayPriorities.length === 0 ? (
              <div className="empty-state-box">
                <div className="empty-state-icon"><Sparkles size={18} /></div>
                <div className="empty-state-title">All clear</div>
                <div className="empty-state-sub">No pending tasks or upcoming deadlines.</div>
              </div>
            ) : (
              todayPriorities.map((task, idx) => {
                const pCls = priorityClass(task.priority);
                return (
                  <div
                    key={task.id}
                    className="attention-item"
                    style={{ animationDelay: `${idx * 60}ms` }}
                    role="listitem"
                  >
                    <span className="attention-item-num">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="attention-item-body">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.15rem" }}>
                        {task.courseCode && (
                          <div className="attention-item-course">{task.courseCode}</div>
                        )}
                        <span className={`badge ${pCls}`} style={{ fontSize: "0.62rem", padding: "0.1rem 0.4rem" }}>
                          {task.priority} &bull; {task.priorityScore} pts
                        </span>
                      </div>

                      <div className="attention-item-title" title={task.title}>
                        {task.title}
                      </div>

                      <div className="attention-item-meta">
                        <span className="attention-item-deadline">
                          {task.normalizedDeadline || "Deadline scheduled"}
                        </span>
                        <span className={`attention-item-remaining ${task.isOverdue ? "critical" : ""}`}>
                          {task.timeRemainingLabel}
                        </span>
                      </div>

                      {/* Contributing Factors Breakdown */}
                      {task.factors && task.factors.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.35rem" }}>
                          {task.factors
                            .filter((f) => f.scoreContribution > 0)
                            .map((f, fi) => (
                              <span
                                key={fi}
                                title={f.detail}
                                style={{
                                  fontSize: "0.65rem",
                                  padding: "0.1rem 0.35rem",
                                  borderRadius: "var(--radius-xs)",
                                  background: "rgba(0,0,0,0.03)",
                                  border: "1px solid var(--border-subtle)",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {f.name}: +{f.scoreContribution}
                              </span>
                            ))}
                        </div>
                      )}

                      {task.priorityReason && (
                        <p
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            marginTop: "0.3rem",
                            lineHeight: 1.45,
                          }}
                        >
                          {task.priorityReason}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/tasks"
                      style={{
                        color: "var(--text-muted)",
                        flexShrink: 0,
                        marginTop: "0.25rem",
                        transition: "color 0.14s",
                      }}
                      aria-label={`Open ${task.title}`}
                    >
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                );
              })
            )}

            {/* Upcoming events below priorities */}
            {upcomingEvents.length > 0 && (
              <>
                <div className="flow-stage" style={{ marginTop: "1.5rem" }}>
                  <span className="flow-stage-label">Upcoming</span>
                  <div className="flow-stage-line" />
                  <Link
                    href="/calendar"
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--accent-ai)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span>Full calendar</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {upcomingEvents.slice(0, 4).map((evt, idx) => {
                  const d = new Date(evt.startTime);
                  const isToday = new Date().toDateString() === d.toDateString();
                  return (
                    <div
                      key={evt.id}
                      className="attention-item"
                      style={{ animationDelay: `${(todayPriorities.length + idx) * 55}ms` }}
                      role="listitem"
                    >
                      <span className="attention-item-num" style={{ minWidth: "48px" }}>
                        {isToday
                          ? "TODAY"
                          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}
                      </span>
                      <div className="attention-item-body">
                        <div className="attention-item-title">{evt.title}</div>
                        <div className="attention-item-meta">
                          {evt.venue && (
                            <span className="attention-item-deadline">{evt.venue}</span>
                          )}
                          <span className="attention-item-deadline">
                            {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="badge badge-academic" style={{ textTransform: "uppercase" }}>
                            {evt.eventType || "EVENT"}
                          </span>
                          {evt.isRescheduled && (
                            <span className="badge badge-medium">RESCHEDULED</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* RIGHT — AI Observation + changes + workload */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* AI Observation Card */}
          <div className="ai-brief-card" aria-label="AI Observation">
            <div className="ai-brief-tag">
              <Sparkles size={12} aria-hidden="true" />
              <span>AI Academic Observation</span>
            </div>

            {intelligence.observations && intelligence.observations.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.3rem" }}>
                {intelligence.observations.slice(0, 2).map((obs) => (
                  <div key={obs.id} style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.6rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                      <span
                        className={`badge ${
                          obs.severity === "CRITICAL"
                            ? "badge-critical"
                            : obs.severity === "HIGH"
                            ? "badge-high"
                            : "badge-neutral"
                        }`}
                        style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem" }}
                      >
                        {obs.severity}
                      </span>
                      {obs.courseCode && (
                        <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--accent-academic)" }}>
                          [{obs.courseCode}]
                        </span>
                      )}
                    </div>
                    <p className="ai-brief-reason" style={{ marginBottom: "0.3rem" }}>
                      {obs.observationText}
                    </p>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                      {obs.actionAdvice}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ai-brief-reason" style={{ fontStyle: "italic" }}>
                Your academic calendar is clear. Stay ahead of upcoming deliverables.
              </p>
            )}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <Link href="/assistant" className="btn btn-ai btn-sm">
                <Bot size={12} />
                <span>Ask Advice</span>
              </Link>
              <Link href="/analytics" className="btn btn-secondary btn-sm">
                <span>View Analytics</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Deadline changes */}
          {recentChanges.length > 0 && (
            <div className="change-detection-card" aria-label="Recent Changes">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--status-medium)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <RefreshCw size={12} aria-hidden="true" />
                  <span>Academic Change Intelligence</span>
                </div>
              </div>

              {recentChanges.slice(0, 2).map((change) => (
                <div key={change.id} style={{ marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-display)",
                      marginBottom: "0.3rem",
                    }}
                  >
                    {change.courseCode ? `[${change.courseCode}] ` : ""}
                    {change.taskTitle}
                  </div>
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.45,
                      marginTop: "0.3rem",
                    }}
                  >
                    {change.note.replace("Change Detected: ", "")}
                  </p>
                  <Link
                    href="/inbox"
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--accent-ai)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.2rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <span>View source notice</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Academic workload summary */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
            }}
            aria-label="Academic workload summary"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Workload Pressure
              </span>
              <span
                className={`badge ${
                  workload.level === "CRITICAL"
                    ? "badge-critical"
                    : workload.level === "HIGH"
                    ? "badge-critical"
                    : workload.level === "MODERATE"
                    ? "badge-medium"
                    : "badge-low"
                }`}
              >
                {workload.level}
              </span>
            </div>

            {/* Time horizon mini-strip */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "0.4rem",
                marginBottom: "0.85rem",
                textAlign: "center",
              }}
            >
              <div style={{ background: "var(--bg-canvas)", padding: "0.4rem 0.2rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Today</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {workload.today?.deadlineConcentration || 0}
                </div>
                <div style={{ fontSize: "0.55rem", color: workload.today?.pressureLevel === "CRITICAL" ? "var(--status-critical)" : "var(--text-dim)" }}>
                  {workload.today?.pressureLevel || "LOW"}
                </div>
              </div>

              <div style={{ background: "var(--bg-canvas)", padding: "0.4rem 0.2rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Tmrw</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {workload.tomorrow?.deadlineConcentration || 0}
                </div>
                <div style={{ fontSize: "0.55rem", color: workload.tomorrow?.pressureLevel === "CRITICAL" ? "var(--status-critical)" : "var(--text-dim)" }}>
                  {workload.tomorrow?.pressureLevel || "LOW"}
                </div>
              </div>

              <div style={{ background: "var(--bg-canvas)", padding: "0.4rem 0.2rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", textTransform: "uppercase" }}>7 Days</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {workload.next7Days?.deadlineConcentration || 0}
                </div>
                <div style={{ fontSize: "0.55rem", color: workload.next7Days?.pressureLevel === "CRITICAL" ? "var(--status-critical)" : "var(--text-dim)" }}>
                  {workload.next7Days?.pressureLevel || "LOW"}
                </div>
              </div>

              <div style={{ background: "var(--bg-canvas)", padding: "0.4rem 0.2rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", textTransform: "uppercase" }}>30 Days</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {workload.next30Days?.deadlineConcentration || 0}
                </div>
                <div style={{ fontSize: "0.55rem", color: workload.next30Days?.pressureLevel === "CRITICAL" ? "var(--status-critical)" : "var(--text-dim)" }}>
                  {workload.next30Days?.pressureLevel || "LOW"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                marginBottom: "0.35rem",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Estimated effort (7 days)</span>
              <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                {workload.totalEstimatedHours}h
              </strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (workload.totalEstimatedHours / 25) * 100)}%`,
                  background:
                    workload.level === "CRITICAL"
                      ? "var(--status-critical)"
                      : workload.level === "HIGH"
                      ? "var(--status-critical)"
                      : workload.level === "MODERATE"
                      ? "var(--status-medium)"
                      : "var(--status-done)",
                }}
                role="progressbar"
                aria-valuenow={workload.totalEstimatedHours}
                aria-valuemax={25}
                aria-label="Weekly workload"
              />
            </div>
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                marginTop: "0.4rem",
              }}
            >
              {workload.riskSummary}
            </p>

            {workload.byCourse.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "0.75rem",
                  marginTop: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  By course
                </div>
                {workload.byCourse.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.74rem",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.66rem",
                          color: "var(--accent-academic)",
                          marginRight: "0.35rem",
                        }}
                      >
                        {c.courseCode}
                      </span>
                      {c.courseTitle}
                    </span>
                    <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                      {c.estimatedHours}h
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
