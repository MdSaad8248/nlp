import Shell from "@/components/layout/Shell";
import {
  BarChart3,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles,
  Info,
  Calendar,
  FileText,
  CalendarDays,
  Flame,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getDashboardData } from "@/lib/services/dashboard.service";

export default async function AnalyticsPage() {
  const dashboardData = await getDashboardData();
  const { stats, workload, intelligence } = dashboardData;

  // Real database distributions from Prisma
  const tasks = await prisma.task.findMany({
    include: { course: true },
  });

  const priorityDistribution = {
    CRITICAL: tasks.filter((t) => t.priority === "CRITICAL" && t.status !== "COMPLETED" && t.status !== "CANCELLED").length,
    HIGH: tasks.filter((t) => t.priority === "HIGH" && t.status !== "COMPLETED" && t.status !== "CANCELLED").length,
    MEDIUM: tasks.filter((t) => t.priority === "MEDIUM" && t.status !== "COMPLETED" && t.status !== "CANCELLED").length,
    LOW: tasks.filter((t) => t.priority === "LOW" && t.status !== "COMPLETED" && t.status !== "CANCELLED").length,
  };

  const completedTasksCount = stats.completedCount;
  const pendingTasksCount = stats.taskCount;
  const totalActiveTasks = stats.taskCount || 1;

  const nlpMetrics = [
    {
      name: "Classification F1",
      targetScope: "Multi-class notice intent & circular classification",
      status: "Not evaluated yet",
      note: "Run evaluation to generate results",
    },
    {
      name: "NER F1",
      targetScope: "Academic course code, venue & deliverable entity extraction",
      status: "Not evaluated yet",
      note: "Run evaluation to generate results",
    },
    {
      name: "Temporal Extraction Accuracy",
      targetScope: "Normalized deadline, timestamp & date range resolution",
      status: "Not evaluated yet",
      note: "Run evaluation to generate results",
    },
    {
      name: "Duplicate Detection F1",
      targetScope: "Blended Jaccard similarity & character n-gram cosine matching",
      status: "Not evaluated yet",
      note: "Run evaluation to generate results",
    },
    {
      name: "Change Detection F1",
      targetScope: "Deadline extension & venue transition tracking",
      status: "Not evaluated yet",
      note: "Run evaluation to generate results",
    },
  ];

  return (
    <Shell>
      {/* Top Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
            Academic Intelligence &amp; Analytics
          </h1>
          <span className="badge badge-indigo">Milestone 4 Engine</span>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Multi-horizon workload pressure, daily deadline concentrations, cognitive effort distribution, and syllabus tracking.
        </p>
      </div>

      {/* Top 4 Summary Metrics */}
      <div className="grid-4col" style={{ marginBottom: "1.5rem" }}>
        <div className="metric-tile">
          <div className="metric-label">
            <span>Next 7 Days Effort</span>
            <Activity size={15} style={{ color: "var(--info-accent)" }} />
          </div>
          <div className="metric-value">{workload.today ? workload.next7Days.estimatedHours : workload.totalEstimatedHours}h</div>
          <div className="metric-sub">{workload.level} cognitive pressure</div>
        </div>

        <div className="metric-tile">
          <div className="metric-label">
            <span>Pending Deliverables</span>
            <Clock size={15} style={{ color: "var(--priority-high)" }} />
          </div>
          <div className="metric-value">{pendingTasksCount}</div>
          <div className="metric-sub">{completedTasksCount} tasks completed</div>
        </div>

        <div className="metric-tile">
          <div className="metric-label">
            <span>High &amp; Critical Priority</span>
            <ShieldAlert size={15} style={{ color: "var(--priority-critical)" }} />
          </div>
          <div className="metric-value" style={{ color: "var(--priority-critical)" }}>
            {priorityDistribution.CRITICAL + priorityDistribution.HIGH}
          </div>
          <div className="metric-sub">
            {stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : "Immediate focus required"}
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-label">
            <span>Courses Tracked</span>
            <CheckCircle2 size={15} style={{ color: "var(--priority-low)" }} />
          </div>
          <div className="metric-value">{stats.courseCount}</div>
          <div className="metric-sub">{stats.noticeCount} circulars ingested</div>
        </div>
      </div>

      {/* MULTI-HORIZON WORKLOAD INTELLIGENCE STRIP */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Multi-Horizon Workload &amp; Pressure Matrix
            </h2>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
              Evaluates incomplete tasks, exams, and deadline concentrations across key academic planning windows.
            </div>
          </div>
          <span className={`badge ${workload.level === "CRITICAL" ? "badge-critical" : workload.level === "HIGH" ? "badge-critical" : "badge-medium"}`}>
            Overall Pressure: {workload.level}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem" }}>
          {[
            { period: "TODAY", label: "Today", m: intelligence.workload.today },
            { period: "TOMORROW", label: "Tomorrow", m: intelligence.workload.tomorrow },
            { period: "NEXT_7_DAYS", label: "Next 7 Days", m: intelligence.workload.next7Days },
            { period: "NEXT_30_DAYS", label: "Next 30 Days", m: intelligence.workload.next30Days },
          ].map(({ period, label, m }) => (
            <div
              key={period}
              style={{
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-primary)" }}>
                  {label}
                </span>
                <span
                  className={`badge ${
                    m.pressureLevel === "CRITICAL"
                      ? "badge-critical"
                      : m.pressureLevel === "HIGH"
                      ? "badge-high"
                      : m.pressureLevel === "MEDIUM"
                      ? "badge-medium"
                      : "badge-low"
                  }`}
                  style={{ fontSize: "0.62rem" }}
                >
                  {m.pressureLevel}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  {m.incompleteTasks + m.exams}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  deliverables ({m.estimatedHours}h est.)
                </span>
              </div>

              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.4rem" }}>
                Tasks: {m.incompleteTasks} &bull; Exams: {m.exams} &bull; Overdue: {m.overdueTasks}
              </div>

              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                {m.pressureSummary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* DAILY WORKLOAD TIMELINE BUCKETS */}
      {intelligence.workload.byDay && intelligence.workload.byDay.length > 0 && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <CalendarDays size={16} style={{ color: "var(--accent-primary)" }} />
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-display)", margin: 0 }}>
              Daily Deadline Density (Next 10 Days)
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.6rem" }}>
            {intelligence.workload.byDay.map((day, idx) => (
              <div
                key={idx}
                style={{
                  background: day.isToday ? "rgba(99, 102, 241, 0.05)" : "var(--bg-surface-elevated)",
                  border: day.isToday ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.65rem 0.75rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: day.isToday ? "var(--accent-primary)" : "var(--text-secondary)" }}>
                  {day.dayLabel}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", margin: "0.2rem 0" }}>
                  {day.totalDeadlines}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                  {day.examCount > 0 ? `${day.examCount} exam` : day.taskCount > 0 ? `${day.taskCount} task(s)` : "No items"}
                </div>
                {day.pressureLevel !== "LOW" && (
                  <span
                    className={`badge ${day.pressureLevel === "CRITICAL" ? "badge-critical" : "badge-medium"}`}
                    style={{ fontSize: "0.55rem", padding: "0.05rem 0.3rem", marginTop: "0.3rem", display: "inline-block" }}
                  >
                    {day.pressureLevel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real Workload & Distribution Charts */}
      <div className="grid-2col" style={{ marginBottom: "1.5rem" }}>
        {/* Workload by Course */}
        <div className="card-clean">
          <div className="card-header-clean">
            <div className="card-title-clean">
              <BarChart3 size={16} style={{ color: "var(--accent-primary)" }} />
              <span>Workload by Course</span>
            </div>
            <span className="badge badge-indigo">Database State</span>
          </div>

          {workload.byCourse.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              No task workload data recorded.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {workload.byCourse.map((c, idx) => {
                const totalH = Math.max(1, workload.totalEstimatedHours);
                const pct = Math.min(100, Math.round((c.estimatedHours / totalH) * 100));
                return (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {c.courseCode} &bull; {c.courseTitle}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {c.estimatedHours} hrs ({pct}%)
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="card-clean">
          <div className="card-header-clean">
            <div className="card-title-clean">
              <ShieldAlert size={16} style={{ color: "var(--priority-high)" }} />
              <span>Priority Distribution (Active Items)</span>
            </div>
            <span className="badge badge-neutral">Syllabus Density</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--priority-critical)", fontWeight: 600 }}>Critical (Score &ge; 80)</span>
                <span style={{ color: "var(--text-muted)" }}>{priorityDistribution.CRITICAL} tasks</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(priorityDistribution.CRITICAL / totalActiveTasks) * 100}%`, background: "var(--priority-critical)" }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--priority-high)", fontWeight: 600 }}>High (Score 60-79)</span>
                <span style={{ color: "var(--text-muted)" }}>{priorityDistribution.HIGH} tasks</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(priorityDistribution.HIGH / totalActiveTasks) * 100}%`, background: "var(--priority-high)" }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--priority-medium)", fontWeight: 600 }}>Medium (Score 40-59)</span>
                <span style={{ color: "var(--text-muted)" }}>{priorityDistribution.MEDIUM} tasks</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(priorityDistribution.MEDIUM / totalActiveTasks) * 100}%`, background: "var(--priority-medium)" }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--priority-low)", fontWeight: 600 }}>Low (Score &lt; 40)</span>
                <span style={{ color: "var(--text-muted)" }}>{priorityDistribution.LOW} tasks</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(priorityDistribution.LOW / totalActiveTasks) * 100}%`, background: "var(--priority-low)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NLP SYSTEM PERFORMANCE */}
      <div className="card-clean">
        <div className="card-header-clean">
          <div className="card-title-clean">
            <Cpu size={16} style={{ color: "var(--accent-primary)" }} />
            <span>NLP SYSTEM PERFORMANCE</span>
          </div>
          <span className="badge badge-neutral">Evaluation Harness</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 0.85rem",
            borderRadius: "var(--radius-xs)",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            marginBottom: "1rem",
          }}
        >
          <Info size={14} style={{ color: "var(--info-accent)", flexShrink: 0 }} />
          <span>
            These metrics represent empirical evaluation results against standardized benchmark circulars. Values are displayed only when an official evaluation suite execution has occurred.
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
          {nlpMetrics.map((m, idx) => (
            <div
              key={idx}
              style={{
                padding: "0.9rem 1rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                {m.name}
              </div>

              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  letterSpacing: "-0.01em",
                  marginBottom: "0.35rem",
                }}
              >
                {m.status}
              </div>

              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "0.3rem" }}>
                {m.targetScope}
              </div>

              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--accent-primary)",
                  fontWeight: 500,
                }}
              >
                &bull; {m.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
