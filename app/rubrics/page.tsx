"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import {
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Upload,
  Bot,
  Send,
  HelpCircle,
  Award,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface RubricRequirement {
  id: string;
  title: string;
  marks?: number;
  description?: string;
  status?: "COMPLETED" | "IN_PROGRESS" | "PENDING";
}

interface RubricRecord {
  id: string;
  courseCode: string;
  taskTitle: string;
  title: string;
  totalMarks: number;
  sourceDocument?: string;
  criteria: RubricRequirement[];
  guidelines: string[];
  version: number;
  updatedAt: string;
}

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RubricsContent() {
  const searchParams = useSearchParams();
  const queryCourseCode = searchParams.get("courseCode")?.toUpperCase() || null;

  const [rubrics, setRubrics] = useState<RubricRecord[]>([]);
  const [activeRubric, setActiveRubric] = useState<RubricRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Q&A state
  const [query, setQuery] = useState<string>("");
  const [answering, setAnswering] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: "Welcome to Rubric Intelligence. Ask questions about your project or assignment criteria (e.g. 'What requirements am I missing?', 'Which part carries the most marks?', 'What are the submission guidelines?').",
    },
  ]);

  // Upload modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadCourseCode, setUploadCourseCode] = useState(queryCourseCode || "CSE4001");
  const [uploadTaskTitle, setUploadTaskTitle] = useState("");
  const [uploadTotalMarks, setUploadTotalMarks] = useState("100");
  const [uploadText, setUploadText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fetchRubrics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rubrics");
      const data = await res.json();
      if (data.success && Array.isArray(data.rubrics)) {
        setRubrics(data.rubrics);
        if (data.rubrics.length > 0) {
          const match = queryCourseCode
            ? data.rubrics.find((r: RubricRecord) => r.courseCode.toUpperCase() === queryCourseCode)
            : null;
          setActiveRubric(match || data.rubrics[0]);
        }
      }
    } catch (e) {
      console.error("Error fetching rubrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRubrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryCourseCode]);

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || answering) return;

    const userText = query.trim();
    setQuery("");
    setChatHistory((prev) => [...prev, { role: "user", text: userText }]);
    setAnswering(true);

    try {
      const codeHint = activeRubric ? activeRubric.courseCode : undefined;
      const res = await fetch(`/api/rubrics?query=${encodeURIComponent(userText)}${codeHint ? `&courseCode=${encodeURIComponent(codeHint)}` : ""}`);
      const data = await res.json();

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "No specific requirement information matched for this query.",
        },
      ]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "An error occurred while evaluating the rubric requirements.",
        },
      ]);
    } finally {
      setAnswering(false);
    }
  };

  const handleSaveRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCourseCode.trim() || !uploadTaskTitle.trim() || !uploadText.trim()) return;

    setUploading(true);
    setUploadSuccess(null);

    try {
      const res = await fetch("/api/rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: uploadCourseCode.trim().toUpperCase(),
          taskTitle: uploadTaskTitle.trim(),
          totalMarks: Number(uploadTotalMarks) || 100,
          rawText: uploadText.trim(),
          sourceDocument: `${uploadCourseCode.trim()}_${uploadTaskTitle.trim().replace(/\s+/g, "_")}_Rubric.pdf`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUploadSuccess("Assessment rubric successfully parsed and saved to database!");
        setTimeout(() => {
          setModalOpen(false);
          setUploadSuccess(null);
          setUploadTaskTitle("");
          setUploadText("");
          fetchRubrics();
        }, 1200);
      } else {
        alert(data.error || "Failed to save rubric");
      }
    } catch (e: any) {
      alert(e.message || "Failed to save rubric");
    } finally {
      setUploading(false);
    }
  };

  // Calculate sum of criteria marks and detect discrepancies
  const sumCriteriaMarks = activeRubric
    ? activeRubric.criteria.reduce((acc, c) => acc + (c.marks || 0), 0)
    : 0;
  const hasMarksDiscrepancy =
    activeRubric &&
    sumCriteriaMarks > 0 &&
    Math.abs(sumCriteriaMarks - activeRubric.totalMarks) > 0.01;

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
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
                background: "rgba(16, 185, 129, 0.1)",
                color: "#059669",
              }}
            >
              Evaluation Criteria
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Persistent Database Records
            </span>
          </div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
            Rubric & Requirement Intelligence
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "0.3rem 0 0 0" }}>
            Verify deliverable weightages, track criteria completion, and evaluate academic requirements without fabrication.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            background: "#3448A5",
            color: "#ffffff",
            border: "none",
            fontWeight: 600,
            fontSize: "0.84rem",
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(52, 72, 165, 0.25)",
          }}
        >
          <Upload size={15} />
          <span>Upload Assessment Rubric</span>
        </button>
      </div>

      {/* Rubric Selector Cards */}
      <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.35rem" }}>
        {rubrics.map((r) => {
          const isSelected = activeRubric?.id === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRubric(r)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: isSelected ? "2px solid #3448A5" : "1px solid var(--border-default)",
                background: isSelected ? "rgba(52, 72, 165, 0.08)" : "var(--bg-surface)",
                cursor: "pointer",
                textAlign: "left",
                minWidth: "240px",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#3448A5" }}>
                  {r.courseCode}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {r.totalMarks} Marks
                </span>
              </div>
              <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                {r.taskTitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Left: Rubric Criteria Breakdown */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          }}
        >
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              Loading rubrics from database...
            </div>
          ) : activeRubric ? (
            <div>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    {activeRubric.title}
                  </h2>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Source: {activeRubric.sourceDocument || "rubric.pdf"} &bull; Version {activeRubric.version}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#3448A5" }}>
                    {activeRubric.totalMarks} Marks
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Total Weightage</div>
                </div>
              </div>

              {/* Discrepancy warning banner if criteria sum doesn't match total */}
              {hasMarksDiscrepancy && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    color: "#b45309",
                    fontSize: "0.78rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>
                    Note: Sum of itemized criteria marks ({sumCriteriaMarks}) differs from total scale ({activeRubric.totalMarks}). Displaying original instructor values without fabrication.
                  </span>
                </div>
              )}

              {/* Criteria List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {activeRubric.criteria.map((crit, idx) => (
                  <div
                    key={crit.id || idx}
                    style={{
                      padding: "0.9rem",
                      borderRadius: "8px",
                      background: "var(--bg-canvas)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3448A5" }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {crit.title}
                        </span>
                      </div>
                      {crit.description && (
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.2rem 0 0 0", lineHeight: 1.45 }}>
                          {crit.description}
                        </p>
                      )}
                    </div>
                    {crit.marks !== undefined && (
                      <span
                        style={{
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.6rem",
                          borderRadius: "4px",
                          background: "rgba(52, 72, 165, 0.08)",
                          color: "#3448A5",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {crit.marks} Marks
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Guidelines */}
              {activeRubric.guidelines && activeRubric.guidelines.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    Submission & Evaluation Guidelines
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {activeRubric.guidelines.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
              No rubrics found. Click Upload to add your first assessment rubric.
            </div>
          )}
        </div>

        {/* Right: Rubric Assistant */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            height: "600px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Bot size={18} color="#059669" />
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Requirement Intelligence
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Grounded in Saved Criteria
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                background: "rgba(16, 185, 129, 0.1)",
                color: "#059669",
              }}
            >
              VERIFIED
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: msg.role === "user" ? "#3448A5" : "var(--bg-canvas)",
                    color: msg.role === "user" ? "#ffffff" : "var(--text-primary)",
                    border: msg.role === "user" ? "none" : "1px solid var(--border-subtle)",
                    fontSize: "0.84rem",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {answering && (
              <div style={{ alignSelf: "flex-start", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                Evaluating criteria breakdown...
              </div>
            )}
          </div>

          {/* Quick buttons */}
          <div
            style={{
              padding: "0.5rem 1rem",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: "0.4rem",
              overflowX: "auto",
            }}
          >
            {[
              "What requirements am I missing?",
              "Which part carries the most marks?",
              "How many requirements have I completed?",
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuery(q)}
                style={{
                  fontSize: "0.7rem",
                  padding: "0.25rem 0.55rem",
                  borderRadius: "999px",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={handleAsk}
            style={{
              padding: "0.85rem 1rem",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about rubric requirements..."
              disabled={answering}
              style={{
                flex: 1,
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--border-default)",
                background: "var(--bg-canvas)",
                fontSize: "0.84rem",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={answering || !query.trim()}
              style={{
                padding: "0.6rem 0.95rem",
                borderRadius: "8px",
                background: "#3448A5",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Upload Rubric Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 150,
          }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "14px",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Upload size={18} color="#3448A5" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  Upload & Index Assessment Rubric
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem" }}
              >
                &times;
              </button>
            </div>

            {uploadSuccess && (
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#059669",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                }}
              >
                {uploadSuccess}
              </div>
            )}

            <form onSubmit={handleSaveRubric} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    Course Code (e.g. CSE4001)
                  </label>
                  <input
                    type="text"
                    value={uploadCourseCode}
                    onChange={(e) => setUploadCourseCode(e.target.value)}
                    required
                    placeholder="CSE4001"
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-canvas)",
                      color: "var(--text-primary)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={uploadTotalMarks}
                    onChange={(e) => setUploadTotalMarks(e.target.value)}
                    required
                    placeholder="100"
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-canvas)",
                      color: "var(--text-primary)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                  Task Title (e.g. Capstone Project, Assignment 2)
                </label>
                <input
                  type="text"
                  value={uploadTaskTitle}
                  onChange={(e) => setUploadTaskTitle(e.target.value)}
                  required
                  placeholder="Capstone Project"
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-canvas)",
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                  Rubric Criteria Text (Paste criteria with marks)
                </label>
                <textarea
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  required
                  rows={8}
                  placeholder={`1. Literature Survey — 10 marks\n- Review 5 papers\n\n2. Implementation — 30 marks\n- Modular code\n\n3. Evaluation — 20 marks`}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-canvas)",
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-default)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "6px",
                    border: "none",
                    background: "#3448A5",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {uploading ? "Parsing..." : "Save Rubric"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </Shell>
  );
}

export default function RubricsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading rubrics...</div>}>
      <RubricsContent />
    </Suspense>
  );
}
