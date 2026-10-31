"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import {
  ScrollText,
  Search,
  BookOpen,
  Upload,
  Plus,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  Send,
  Bot,
  GraduationCap,
  Calendar,
  Layers,
} from "lucide-react";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface SyllabusModule {
  moduleNumber: number | string;
  title: string;
  topics: string[];
  hours?: number;
}

interface SyllabusRecord {
  id: string;
  courseCode: string;
  title: string;
  semester: string;
  sourceFilename?: string;
  rawText: string;
  modules: SyllabusModule[];
  courseOutcomes: string[];
  assessments: { component: string; weight: number }[];
  version: number;
  updatedAt: string;
}

function SyllabusContent() {
  const searchParams = useSearchParams();
  const queryCourseCode = searchParams.get("courseCode")?.toUpperCase() || null;

  const [syllabi, setSyllabi] = useState<SyllabusRecord[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>(queryCourseCode || "CSE4001");
  const [activeSyllabus, setActiveSyllabus] = useState<SyllabusRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Q&A state
  const [userQuery, setUserQuery] = useState<string>("");
  const [answering, setAnswering] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; text: string; evidence?: string[] }[]>([
    {
      role: "assistant",
      text: "Welcome to Grounded Syllabus Intelligence. Ask any question about this course syllabus (e.g., 'Which topics are in Module 3?', 'What are the course outcomes?', 'How is the course assessed?'). Answers are strictly cited from the verified course document.",
    },
  ]);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadCourseCode, setUploadCourseCode] = useState<string>("");
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadText, setUploadText] = useState<string>("");
  const [uploadSemester, setUploadSemester] = useState<string>("Fall 2026-27");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Load all verified syllabi from persistent API
  const fetchSyllabi = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/syllabus");
      const data = await res.json();
      if (data.success && Array.isArray(data.syllabi)) {
        setSyllabi(data.syllabi);
        if (data.syllabi.length > 0) {
          const targetCode = queryCourseCode || selectedCode;
          const match = data.syllabi.find((s: SyllabusRecord) => s.courseCode === targetCode) || data.syllabi[0];
          setSelectedCode(match.courseCode);
          setActiveSyllabus(match);
        }
      }
    } catch (e) {
      console.error("Error fetching syllabi:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryCourseCode]);

  const handleSelectCourse = (code: string) => {
    setSelectedCode(code);
    const found = syllabi.find((s) => s.courseCode === code);
    setActiveSyllabus(found || null);
    setChatHistory([
      {
        role: "assistant",
        text: `Switched context to ${code} syllabus. What would you like to verify regarding this course curriculum?`,
      },
    ]);
  };

  const handleAskQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userQuery.trim() || answering) return;

    const query = userQuery.trim();
    setUserQuery("");
    setChatHistory((prev) => [...prev, { role: "user", text: query }]);
    setAnswering(true);

    try {
      const res = await fetch(`/api/syllabus?courseCode=${encodeURIComponent(selectedCode)}&query=${encodeURIComponent(query)}`);
      const data = await res.json();

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "No verified information found in this syllabus for that question.",
          evidence: data.evidence,
        },
      ]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "An error occurred while querying the grounded syllabus knowledge base.",
        },
      ]);
    } finally {
      setAnswering(false);
    }
  };

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCourseCode.trim() || !uploadText.trim()) return;

    setUploading(true);
    setUploadSuccess(null);

    try {
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: uploadCourseCode.trim().toUpperCase(),
          title: uploadTitle.trim() || undefined,
          rawText: uploadText.trim(),
          semester: uploadSemester.trim(),
          sourceFilename: `${uploadCourseCode.trim().toUpperCase()}_Syllabus.pdf`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUploadSuccess(`Syllabus for ${uploadCourseCode} successfully persisted to database!`);
        setTimeout(() => {
          setUploadModalOpen(false);
          setUploadSuccess(null);
          setUploadCourseCode("");
          setUploadTitle("");
          setUploadText("");
          fetchSyllabi();
        }, 1200);
      } else {
        alert(data.error || "Failed to save syllabus");
      }
    } catch (e: any) {
      alert(e.message || "Failed to save syllabus");
    } finally {
      setUploading(false);
    }
  };

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
                background: "rgba(52, 72, 165, 0.08)",
                color: "#3448A5",
              }}
            >
              Curriculum Grounding
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Persistent SQLite Storage
            </span>
          </div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
            Syllabus Intelligence
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "0.3rem 0 0 0" }}>
            Upload, inspect, and interrogate course syllabi with strict source citations and zero hallucination.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
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
            <span>Upload Course Syllabus</span>
          </button>
        </div>
      </div>

      {/* Course Selection Pills Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          overflowX: "auto",
          paddingBottom: "0.35rem",
        }}
      >
        {Array.from(new Set(["CSE4001", "CSE3002", "CSE2004", "CSE2001", "CSE3001", "MAT2001", ...syllabi.map((s) => s.courseCode)])).map((code) => {
          const isSelected = selectedCode === code;
          const hasUploaded = syllabi.some((s) => s.courseCode === code);

          return (
            <button
              key={code}
              type="button"
              onClick={() => handleSelectCourse(code)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.55rem 0.95rem",
                borderRadius: "8px",
                border: isSelected ? "2px solid #3448A5" : "1px solid var(--border-default)",
                background: isSelected ? "rgba(52, 72, 165, 0.08)" : "var(--bg-surface)",
                color: isSelected ? "#3448A5" : "var(--text-primary)",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <span>{code}</span>
              {hasUploaded ? (
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} title="Verified syllabus in DB" />
              ) : (
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>(unloaded)</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Left = Syllabus Viewer, Right = Grounded Q&A Assistant */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Left: Syllabus Content & Modules */}
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
              Loading syllabus from database...
            </div>
          ) : activeSyllabus ? (
            <div>
              {/* Document Metadata Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    {activeSyllabus.title}
                  </h2>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Semester: {activeSyllabus.semester} &bull; Document: {activeSyllabus.sourceFilename || "syllabus.pdf"} (Version {activeSyllabus.version})
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <CheckCircle2 size={12} />
                  <span>PERSISTED</span>
                </span>
              </div>

              {/* Course Outcomes */}
              {activeSyllabus.courseOutcomes && activeSyllabus.courseOutcomes.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    Course Learning Outcomes (COs)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {activeSyllabus.courseOutcomes.map((co, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          padding: "0.5rem 0.75rem",
                          background: "var(--bg-canvas)",
                          borderRadius: "6px",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {co}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured Modules Accordion / List */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.65rem" }}>
                  Curriculum Modules ({activeSyllabus.modules?.length || 0} Units)
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {activeSyllabus.modules && activeSyllabus.modules.length > 0 ? (
                    activeSyllabus.modules.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          padding: "0.85rem",
                          background: "var(--bg-canvas)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                          <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            Module {m.moduleNumber}: {m.title}
                          </span>
                          {m.hours && (
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              {m.hours} Hours
                            </span>
                          )}
                        </div>
                        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                          {m.topics.map((t, tidx) => (
                            <li key={tidx}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Raw text syllabus stored. Use the AI Assistant to parse specific sections.
                    </div>
                  )}
                </div>
              </div>

              {/* Assessment Structure */}
              {activeSyllabus.assessments && activeSyllabus.assessments.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    Weightage & Evaluation Breakdown
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {activeSyllabus.assessments.map((a, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "0.45rem 0.75rem",
                          borderRadius: "6px",
                          background: "var(--bg-canvas)",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ color: "var(--text-primary)" }}>{a.component}: </span>
                        <span style={{ color: "#3448A5", fontWeight: 700 }}>{a.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Honest Missing Syllabus State */
            <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "12px",
                  background: "rgba(239, 68, 68, 0.08)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                }}
              >
                <AlertCircle size={26} />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>
                No Syllabus Document Uploaded for {selectedCode}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "420px", margin: "0 auto 1.5rem auto", lineHeight: 1.5 }}>
                Under institutional zero-hallucination policy, we do not fabricate course modules or outcomes.
                Please upload the syllabus PDF or paste text to enable grounded Q&A.
              </p>
              <button
                type="button"
                onClick={() => {
                  setUploadCourseCode(selectedCode);
                  setUploadModalOpen(true);
                }}
                style={{
                  padding: "0.6rem 1.1rem",
                  borderRadius: "8px",
                  background: "#3448A5",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Upload {selectedCode} Syllabus Now
              </button>
            </div>
          )}
        </div>

        {/* Right: Grounded Q&A Assistant */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            height: "640px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          }}
        >
          {/* Assistant Header */}
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
              <Bot size={18} color="#3448A5" />
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Grounded Syllabus Assistant
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Context: {selectedCode} &bull; Strict Source Citation
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                background: "rgba(52, 72, 165, 0.08)",
                color: "#3448A5",
              }}
            >
              ZERO-FABRICATION
            </span>
          </div>

          {/* Chat Messages Log */}
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
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
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

                {/* Evidence citations if provided */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div
                    style={{
                      marginTop: "0.4rem",
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <span>Cited from:</span>
                    <span style={{ fontWeight: 600, color: "#3448A5" }}>{msg.evidence.join(", ")}</span>
                  </div>
                )}
              </div>
            ))}
            {answering && (
              <div style={{ alignSelf: "flex-start", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                Grounded search across {selectedCode} syllabus...
              </div>
            )}
          </div>

          {/* Suggested Quick Questions */}
          <div
            style={{
              padding: "0.5rem 1rem",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: "0.4rem",
              overflowX: "auto",
              background: "rgba(0,0,0,0.01)",
            }}
          >
            {[
              "What topics are in Module 3?",
              "What are the course outcomes?",
              "What is the assessment breakdown?",
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setUserQuery(q);
                }}
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

          {/* Query Input */}
          <form
            onSubmit={handleAskQuestion}
            style={{
              padding: "0.85rem 1rem",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder={`Ask a question about ${selectedCode} syllabus...`}
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
              disabled={answering || !userQuery.trim()}
              style={{
                padding: "0.6rem 0.95rem",
                borderRadius: "8px",
                background: "#3448A5",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Upload & Parse Syllabus Modal */}
      {uploadModalOpen && (
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
                  Upload & Index Course Syllabus
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
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

            <form onSubmit={handleSaveUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                    Academic Semester
                  </label>
                  <input
                    type="text"
                    value={uploadSemester}
                    onChange={(e) => setUploadSemester(e.target.value)}
                    placeholder="Fall 2026-27"
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
                  Course Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Natural Language Processing"
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
                  Syllabus Content (Paste text from PDF or document)
                </label>
                <textarea
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  required
                  rows={8}
                  placeholder={`Module 1: Text Processing\n- Tokenization, Stemming, and Lemmatization\n\nModule 2: Language Models\n- N-gram Language Modeling\n\nAssessment:\nAssignment - 20%\nProject - 30%`}
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
                  onClick={() => setUploadModalOpen(false)}
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
                  {uploading ? "Parsing & Persisting..." : "Parse & Save Syllabus"}
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

export default function SyllabusPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading syllabus...</div>}>
      <SyllabusContent />
    </Suspense>
  );
}
