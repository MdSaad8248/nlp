"use client";

import { useEffect, useState } from "react";

interface PulseEvent {
  id: string;
  hour: number;       // 0–23
  minute?: number;
  label: string;
  state: "class" | "upcoming" | "deadline" | "critical" | "done" | "exam";
}

interface AcademicPulseProps {
  events?: PulseEvent[];
}

// State → unicode marker + tooltip colour
const STATE_MARKERS: Record<PulseEvent["state"], string> = {
  class:    "●",
  upcoming: "◆",
  deadline: "▲",
  critical: "★",
  done:     "○",
  exam:     "◆",
};

const STATE_CSS: Record<PulseEvent["state"], string> = {
  class:    "state-class",
  upcoming: "state-upcoming",
  deadline: "state-deadline",
  critical: "state-critical",
  done:     "state-done",
  exam:     "state-upcoming",
};

const START_HOUR = 7;
const END_HOUR   = 23;
const SPAN       = END_HOUR - START_HOUR;

// Default demo events (shown when no real data)
const DEFAULT_EVENTS: PulseEvent[] = [
  { id: "e1", hour: 9,  label: "ML Lab",       state: "class"    },
  { id: "e2", hour: 11, label: "NLP Review",   state: "upcoming" },
  { id: "e3", hour: 14, label: "DBMS Lab",     state: "class"    },
  { id: "e4", hour: 18, label: "Deadline",     state: "critical" },
  { id: "e5", hour: 21, label: "Submission",   state: "deadline" },
];

function toPercent(hour: number, minute = 0) {
  const decimal = hour + minute / 60;
  return ((decimal - START_HOUR) / SPAN) * 100;
}

function currentHourPercent(): number {
  const now = new Date();
  return toPercent(now.getHours(), now.getMinutes());
}

export default function AcademicPulse({ events = DEFAULT_EVENTS }: AcademicPulseProps) {
  const [nowPct, setNowPct] = useState(currentHourPercent());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    const interval = setInterval(() => setNowPct(currentHourPercent()), 60_000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  const hourTicks = Array.from({ length: SPAN + 1 }, (_, i) => START_HOUR + i);

  const showNow = nowPct >= 0 && nowPct <= 100;

  return (
    <div className="academic-pulse-wrapper" aria-label="Academic Pulse Timeline">
      {/* Label */}
      <div className="pulse-label">
        <span>Academic Pulse</span>
      </div>

      {/* Timeline strip */}
      <div className="pulse-timeline">
        {/* Baseline track */}
        <div className="pulse-track" />

        {/* Hour ticks */}
        <div className="pulse-hours" aria-hidden="true">
          {hourTicks.filter((_, i) => i % 2 === 0).map((h) => {
            const pct = ((h - START_HOUR) / SPAN) * 100;
            return (
              <div
                key={h}
                className="pulse-hour-tick"
                style={{ left: `${pct}%` }}
              >
                <div className="pulse-hour-mark" />
                <span className="pulse-hour-label">
                  {h.toString().padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>

        {/* "Now" indicator */}
        {showNow && (
          <div
            className="pulse-now"
            style={{ left: `${nowPct}%` }}
            aria-label={`Current time`}
          >
            <div className="pulse-now-line" />
            <span className="pulse-now-label">NOW</span>
          </div>
        )}

        {/* Events */}
        {events.map((evt, idx) => {
          const pct = toPercent(evt.hour, evt.minute);
          // Clamp to avoid overflow
          if (pct < 0 || pct > 100) return null;
          return (
            <div
              key={evt.id}
              className={`pulse-event ${STATE_CSS[evt.state]}`}
              style={{
                left: `${pct}%`,
                animationDelay: `${idx * 45}ms`,
                opacity: visible ? 1 : 0,
              }}
              title={`${evt.label} · ${evt.hour.toString().padStart(2, "0")}:${(evt.minute ?? 0).toString().padStart(2, "0")}`}
              role="img"
              aria-label={`${evt.label} at ${evt.hour}:${String(evt.minute ?? 0).padStart(2, "0")}`}
            >
              <span className="pulse-event-marker" aria-hidden="true">
                {STATE_MARKERS[evt.state]}
              </span>
              <span className="pulse-event-label">{evt.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          marginTop: "2rem",
          flexWrap: "wrap",
        }}
        aria-label="Timeline legend"
      >
        {(
          [
            ["class",    "Class / Lab",  "var(--text-muted)"],
            ["upcoming", "Event / Exam", "var(--accent-academic)"],
            ["deadline", "Deadline",     "var(--status-high)"],
            ["critical", "Critical",     "var(--status-critical)"],
            ["done",     "Completed",    "var(--status-done)"],
          ] as const
        ).map(([state, label, color]) => (
          <div
            key={state}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span style={{ color, fontSize: "0.75rem", lineHeight: 1 }}>
              {STATE_MARKERS[state]}
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text-muted)",
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
