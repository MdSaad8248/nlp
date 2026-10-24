import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  action?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  badge,
  action,
}: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1rem",
        marginBottom: "1.25rem",
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {title}
          </h1>
          {badge && <span className="badge badge-indigo">{badge}</span>}
        </div>
        {description && (
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            {description}
          </p>
        )}
      </div>

      {action && <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>{action}</div>}
    </div>
  );
}
