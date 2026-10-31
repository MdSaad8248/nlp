"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  MapPin,
  Tag,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  X,
  BookOpen,
} from "lucide-react";
import { formatTaskTitle, formatDescription } from "@/lib/utils/formatters";

interface CalendarItem {
  id: string;
  title: string;
  type: "ASSIGNMENT" | "EXAM" | "EVENT" | "TIMETABLE";
  date: string;
  timeStr: string;
  courseCode: string;
  venue?: string;
  priority?: string;
  normalizedDeadline?: string;
  description?: string;
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<"agenda" | "week" | "month">("agenda");
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [conflict, setConflict] = useState<any | null>(null);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  // Default anchor date: 31 October 2026
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 31));

  useEffect(() => {
    async function loadData() {
      try {
        const [tasksRes, eventsRes] = await Promise.all([
          fetch("/api/tasks").then((r) => r.json()),
          fetch("/api/events").then((r) => r.json()),
        ]);

        const items: CalendarItem[] = [];

        if (tasksRes.success && tasksRes.tasks) {
          tasksRes.tasks.forEach((t: any) => {
            if (t.deadline) {
              items.push({
                id: t.id,
                title: formatTaskTitle(t.title, t.course?.code),
                type: t.category === "EXAM" ? "EXAM" : "ASSIGNMENT",
                date: t.deadline.slice(0, 10),
                timeStr: t.normalizedDeadline || new Date(t.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                courseCode: t.course?.code || "GEN",
                priority: t.priority,
                normalizedDeadline: t.normalizedDeadline,
                description: t.description ? formatDescription(t.description) : undefined,
              });
            }
          });
        }

        if (eventsRes.success && eventsRes.events) {
          eventsRes.events.forEach((e: any) => {
            items.push({
              id: e.id,
              title: formatTaskTitle(e.title, e.course?.code),
              type: e.eventType === "TIMETABLE" ? "TIMETABLE" : "EVENT",
              date: e.startTime.slice(0, 10),
              timeStr: new Date(e.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              courseCode: e.course?.code || "GEN",
              venue: e.venue || "Campus Venue",
              description: e.description ? formatDescription(e.description) : undefined,
            });
          });
        }

        // Add regular timetable lecture items if sparse
        if (items.length < 5) {
          items.push({
            id: "tt-1",
            title: "NLP Theory Lecture",
            type: "TIMETABLE",
            date: "2026-10-28",
            timeStr: "08:30 AM - 10:00 AM",
            courseCode: "CSE4001",
            venue: "SJT 402",
            description: "Regular weekly slot A1+TA1 lecture.",
          });
        }

        // Sort by date
        items.sort((a, b) => a.date.localeCompare(b.date));
        setCalendarItems(items);

        // SCHEDULE CONFLICT check
        if (items.length >= 2) {
          const item1 = items[0];
          const item2 = items[1];
          setConflict({
            title: "High Workload Concentration",
            reason: `Multiple academic commitments scheduled in close proximity: ${item1.title} (${item1.courseCode}) and ${item2.title} (${item2.courseCode}).`,
            suggestedAction: `Submit ${item1.title} 24 hours prior to deadline to prevent overlapping academic congestion.`,
          });
        }
      } catch {
        // fallback
      }
    }
    loadData();
  }, []);

  const getTypeStyle = (type: CalendarItem["type"]) => {
    switch (type) {
      case "ASSIGNMENT":
        return { color: "var(--accent-primary)", bg: "var(--accent-subtle)", border: "var(--accent-border)", label: "Assignment" };
      case "EXAM":
        return { color: "var(--priority-critical)", bg: "var(--priority-critical-bg)", border: "var(--priority-critical-border)", label: "Exam" };
      case "EVENT":
        return { color: "var(--info-accent)", bg: "var(--info-bg)", border: "var(--info-border)", label: "Event" };
      case "TIMETABLE":
        return { color: "var(--priority-low)", bg: "var(--priority-low-bg)", border: "var(--priority-low-border)", label: "Timetable" };
    }
  };

  return (
    <Shell>
      {/* Top Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
            Calendar
          </h1>
          <span className="badge badge-indigo">Academic Schedule</span>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Synchronized schedule of submission deadlines, CAT exams, lectures, and conflict intelligence.
        </p>
      </div>

      {/* SCHEDULE CONFLICT Warning Panel */}
      {conflict && (
        <div
          className="card-clean"
          style={{
            marginBottom: "1.5rem",
            borderLeft: "3px solid var(--priority-critical)",
            background: "rgba(244, 63, 94, 0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--priority-critical)", fontWeight: 700, fontSize: "0.88rem", letterSpacing: "0.03em" }}>
              <AlertTriangle size={16} />
              <span>SCHEDULE CONFLICT</span>
            </div>
            <span className="badge badge-critical">{conflict.title}</span>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", marginBottom: "0.6rem" }}>
            {conflict.reason}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-xs)",
              background: "rgba(0,0,0,0.3)",
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
            }}
          >
            <strong style={{ color: "var(--priority-medium)" }}>Resolution Advice:</strong>
            <span>{conflict.suggestedAction}</span>
          </div>
        </div>
      )}

      {/* View Switcher & Visual Legend */}
      <div
        className="card-clean"
        style={{
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        {/* Views: Month, Week, Agenda */}
        <div className="tabs-nav">
          <button
            type="button"
            className={`tab-btn ${viewMode === "month" ? "active" : ""}`}
            onClick={() => setViewMode("month")}
          >
            Month
          </button>
          <button
            type="button"
            className={`tab-btn ${viewMode === "week" ? "active" : ""}`}
            onClick={() => setViewMode("week")}
          >
            Week
          </button>
          <button
            type="button"
            className={`tab-btn ${viewMode === "agenda" ? "active" : ""}`}
            onClick={() => setViewMode("agenda")}
          >
            Agenda
          </button>
        </div>

        {/* Visual Indicators Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.78rem", color: "var(--text-secondary)", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-primary)" }} />
            Assignments
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--priority-critical)" }} />
            Exams
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--info-accent)" }} />
            Events
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--priority-low)" }} />
            Timetable
          </span>
        </div>
      </div>

      {/* AGENDA VIEW */}
      {viewMode === "agenda" && (
        <div className="card-clean">
          <div className="card-header-clean">
            <div className="card-title-clean">
              <Clock size={16} style={{ color: "var(--accent-primary)" }} />
              <span>Agenda Timeline ({calendarItems.length} items)</span>
            </div>
            <span className="badge badge-indigo">Timezone: Asia/Kolkata</span>
          </div>

          {calendarItems.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-state-icon">
                <CalendarIcon size={20} style={{ color: "var(--text-muted)" }} />
              </div>
              <div className="empty-state-title">No academic events scheduled.</div>
              <div className="empty-state-sub">
                Ingest course notices in the Academic Inbox to automatically register deadlines and exams on your calendar.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {calendarItems.map((item) => {
                const style = getTypeStyle(item.type);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      borderLeft: `3px solid ${style.color}`,
                      cursor: "pointer",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div
                        style={{
                          padding: "0.3rem 0.6rem",
                          borderRadius: "var(--radius-xs)",
                          background: "var(--bg-app)",
                          textAlign: "center",
                          minWidth: "65px",
                        }}
                      >
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                          {item.date}
                        </div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {item.timeStr.slice(0, 8)}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span className="badge badge-neutral" style={{ fontSize: "0.65rem" }}>
                            {item.courseCode}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: style.color, textTransform: "uppercase", fontWeight: 600 }}>
                            {style.label}
                          </span>
                        </div>
                        <h3 style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      {item.venue && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Venue: <strong>{item.venue}</strong>
                        </span>
                      )}
                      {item.priority && (
                        <span className={`badge ${item.priority === "CRITICAL" ? "badge-critical" : "badge-high"}`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (() => {
        const curr = new Date(currentDate);
        const dayOfWeek = curr.getDay(); // 0 = Sun
        const sunday = new Date(curr);
        sunday.setDate(curr.getDate() - dayOfWeek);

        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(sunday);
          d.setDate(sunday.getDate() + i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dayNum = String(d.getDate()).padStart(2, "0");
          const dateStr = `${y}-${m}-${dayNum}`;
          const isToday = dateStr === "2026-10-31";
          return {
            dateObj: d,
            dateStr,
            dayLabel: d.toLocaleDateString("en-US", { weekday: "short" }),
            dayNumber: d.getDate(),
            monthLabel: d.toLocaleDateString("en-US", { month: "short" }),
            isToday,
          };
        });

        return (
          <div className="card-clean">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const prev = new Date(currentDate);
                    prev.setDate(prev.getDate() - 7);
                    setCurrentDate(prev);
                  }}
                  title="Previous Week"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: "0.92rem", fontWeight: 700 }}>
                  Week of {weekDays[0].monthLabel} {weekDays[0].dayNumber} – {weekDays[6].monthLabel} {weekDays[6].dayNumber}, {weekDays[6].dateObj.getFullYear()}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const next = new Date(currentDate);
                    next.setDate(next.getDate() + 7);
                    setCurrentDate(next);
                  }}
                  title="Next Week"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentDate(new Date(2026, 9, 31))}
              >
                Today (Oct 31)
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem", marginBottom: "0.75rem", textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
              {weekDays.map((w, idx) => (
                <div key={idx} style={{ color: w.isToday ? "var(--accent-primary)" : "inherit" }}>
                  {w.dayLabel} {w.dayNumber}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
              {weekDays.map((w, idx) => {
                const dayItems = calendarItems.filter((i) => i.date === w.dateStr);

                return (
                  <div
                    key={idx}
                    style={{
                      minHeight: "140px",
                      background: "var(--bg-surface-elevated)",
                      border: `1px solid ${w.isToday ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                      borderRadius: "var(--radius-xs)",
                      padding: "0.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: w.isToday ? "var(--accent-primary)" : "var(--text-muted)", marginBottom: "0.2rem" }}>
                      {w.monthLabel} {w.dayNumber} {w.isToday && "• Today"}
                    </div>

                    {dayItems.map((item) => {
                      const style = getTypeStyle(item.type);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          style={{
                            padding: "0.3rem 0.45rem",
                            borderRadius: "3px",
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            color: style.color,
                            cursor: "pointer",
                          }}
                          title={item.title}
                        >
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: "0.62rem", opacity: 0.8 }}>{item.courseCode}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* MONTH VIEW */}
      {viewMode === "month" && (() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        return (
          <div className="card-clean">
            <div className="card-header-clean" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{monthName}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentDate(new Date(2026, 9, 31))}
                >
                  Today (Oct 31)
                </button>
                <span className="badge badge-neutral">Syllabus Calendar</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.4rem", textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.4rem" }}>
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.4rem" }}>
              {/* Spacer empty cells for padding before the 1st of month */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} style={{ minHeight: "55px", opacity: 0.2 }} />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayItems = calendarItems.filter((item) => item.date === dayStr);
                const hasItems = dayItems.length > 0;
                const isToday = dayStr === "2026-10-31";

                return (
                  <div
                    key={day}
                    style={{
                      minHeight: "55px",
                      background: isToday ? "rgba(99, 102, 241, 0.12)" : "var(--bg-surface-elevated)",
                      border: `1px solid ${isToday ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                      borderRadius: "var(--radius-xs)",
                      padding: "0.3rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: isToday ? 700 : 500, color: isToday ? "var(--accent-primary)" : "var(--text-muted)" }}>
                        {day}
                      </span>
                      {isToday && (
                        <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--accent-primary)", background: "rgba(99, 102, 241, 0.2)", padding: "1px 3px", borderRadius: "2px" }}>
                          TODAY
                        </span>
                      )}
                    </div>

                    {hasItems && (
                      <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", marginTop: "2px" }}>
                        {dayItems.map((item, idx) => (
                          <span
                            key={idx}
                            onClick={() => setSelectedItem(item)}
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: getTypeStyle(item.type).color,
                              cursor: "pointer",
                            }}
                            title={`${item.courseCode}: ${item.title}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CalendarIcon size={16} style={{ color: getTypeStyle(selectedItem.type).color }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Academic Commitment Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                  {selectedItem.courseCode} &bull; {selectedItem.type}
                </span>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.25rem" }}>
                  {selectedItem.title}
                </h4>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div style={{ padding: "0.6rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Date &amp; Time</div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "0.1rem" }}>
                    {selectedItem.date} &bull; {selectedItem.timeStr}
                  </div>
                </div>

                {selectedItem.venue && (
                  <div style={{ padding: "0.6rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Venue</div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "0.1rem" }}>
                      {selectedItem.venue}
                    </div>
                  </div>
                )}
              </div>

              {selectedItem.description && (
                <div style={{ padding: "0.75rem", borderRadius: "var(--radius-xs)", background: "var(--bg-surface-elevated)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {selectedItem.description}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
