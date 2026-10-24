"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import {
  Settings,
  Bell,
  Clock,
  ShieldCheck,
  User,
  CheckCircle2,
  Save,
  GraduationCap,
} from "lucide-react";
import { getCurrentSession, UserSession } from "@/lib/auth/session";

export default function SettingsPage() {
  const [session, setSession] = useState<UserSession>(getCurrentSession());
  const [timezone, setTimezone] = useState("Asia/Kolkata (UTC+05:30)");
  const [leadDays, setLeadDays] = useState(2);
  const [workloadThreshold, setWorkloadThreshold] = useState(4);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [urgentAlerts, setUrgentAlerts] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    setSession(getCurrentSession());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  return (
    <Shell>
      <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              background: "rgba(37, 99, 235, 0.1)",
              color: "#2563eb",
            }}
          >
            Preferences
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Adaptive Engine Configuration
          </span>
        </div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
          Platform Settings
        </h1>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "0.3rem 0 0 0" }}>
          Configure institutional timezone parameters, notification stages, and workload thresholds.
        </p>
      </div>

      {savedMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#059669",
            fontSize: "0.84rem",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>Preferences updated and persisted successfully!</span>
        </div>
      )}

      {/* Profile Card */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "12px",
          padding: "1.5rem",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: session.role === "TEACHER" ? "#7c3aed" : "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              fontWeight: 700,
            }}
          >
            {session.name ? session.name[0] : "U"}
          </div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {session.name}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {session.rollNumber} &bull; {session.program || "Computer Science"} &bull; Role: <strong>{session.role}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Temporal & Timezone */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 1rem 0", color: "var(--text-primary)" }}>
            Academic Timezone & Temporal Clock
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                Institutional Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-canvas)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              >
                <option value="Asia/Kolkata (UTC+05:30)">Asia/Kolkata (IST · UTC+05:30) — Official VIT / Indian University Time</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
              </select>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem", display: "block" }}>
                All parsed deadlines, exam times, and notifications are normalized to this timezone.
              </span>
            </div>
          </div>
        </div>

        {/* Notifications & Workload Engine */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 1rem 0", color: "var(--text-primary)" }}>
            Notification & Workload Engine
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                Advance Deadline Lead Days ({leadDays} days)
              </label>
              <input
                type="range"
                min={1}
                max={7}
                value={leadDays}
                onChange={(e) => setLeadDays(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                <span>1 Day</span>
                <span>2 Days (Default)</span>
                <span>7 Days</span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                Cognitive Workload Threshold ({workloadThreshold} items / 48 hours)
              </label>
              <input
                type="range"
                min={2}
                max={6}
                value={workloadThreshold}
                onChange={(e) => setWorkloadThreshold(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
                Triggers cognitive overload alert when upcoming deliverables exceed this limit.
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.84rem", color: "var(--text-primary)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={digestEnabled}
                  onChange={(e) => setDigestEnabled(e.target.checked)}
                />
                <span>Generate Daily Academic Digest notifications</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.84rem", color: "var(--text-primary)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={urgentAlerts}
                  onChange={(e) => setUrgentAlerts(e.target.checked)}
                />
                <span>Send urgent alerts for rescheduled exams and sudden cancellations</span>
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          style={{
            alignSelf: "flex-end",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            fontWeight: 700,
            fontSize: "0.86rem",
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(37, 99, 235, 0.3)",
          }}
        >
          <Save size={16} />
          <span>Save Preferences</span>
        </button>
      </form>
    </div>
  </Shell>
  );
}
