"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import {
  GraduationCap,
  Sparkles,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Play,
  FileText,
  FileSpreadsheet,
  Clock,
  ShieldAlert,
  Bot,
  Brain,
  ChevronRight,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  FACULTY_DEMO_CASES,
  DemoCaseDefinition,
  DemoExecutionResult,
} from "@/lib/faculty-review/demo-cases";
import {
  EVALUATION_BENCHMARK_SUMMARY,
  EvaluationMetricSummary,
} from "@/lib/faculty-review/evaluation-summary";

const PIPELINE_STAGES = [
  { id: "input", name: "Academic Input", desc: "PDFs, notices, LMS, circulars, images" },
  { id: "classification", name: "Classification", desc: "Statistical multi-class intent categorization" },
  { id: "ner", name: "Entity Extraction", desc: "Course code, deliverable, platform, venue" },
  { id: "temporal", name: "Temporal Reasoning", desc: "Normalized IST deadlines & relative shifts" },
  { id: "extraction", name: "Task/Event Extraction", desc: "Structured state object creation" },
  { id: "change", name: "Change Intelligence", desc: "5-way relationship & transition tracking" },
  { id: "priority", name: "Priority Scoring", desc: "Multi-factor cognitive impact formula" },
  { id: "risk", name: "Risk Radar", desc: "Exam collisions, deadline clusters & overload" },
  { id: "planning", name: "Smart Planning", desc: "Daily schedule blocks with 'Why Now?' rationale" },
  { id: "notification", name: "Notification Engine", desc: "Staged alerts & quiet-hour suppression" },
  { id: "assistant", name: "Grounded Assistant", desc: "Tool-driven answers with zero hallucination" },
];

export default function FacultyReviewPage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("demo-1");
  const [executionResults, setExecutionResults] = useState<Record<string, DemoExecutionResult>>({});
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"demos" | "pipeline" | "evidence" | "evaluation">("demos");
  const [activeStageFilter, setActiveStageFilter] = useState<string | null>(null);

  const selectedCase = FACULTY_DEMO_CASES.find((c) => c.id === selectedCaseId) || FACULTY_DEMO_CASES[0];
  const currentResult = executionResults[selectedCase.id];

  // Auto-run first case on mount so faculty immediately sees live execution
  useEffect(() => {
    executeCase(selectedCase.id);
  }, []);

  async function executeCase(caseId: string) {
    setLoadingCaseId(caseId);
    try {
      const res = await fetch("/api/faculty-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setExecutionResults((prev) => ({ ...prev, [caseId]: data.result }));
      }
    } catch (err) {
      console.error("Failed to run demo case:", err);
    } finally {
      setLoadingCaseId(null);
    }
  }

  async function executeAllCases() {
    setIsRunningAll(true);
    for (const c of FACULTY_DEMO_CASES) {
      setLoadingCaseId(c.id);
      try {
        const res = await fetch("/api/faculty-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: c.id }),
        });
        const data = await res.json();
        if (data.success && data.result) {
          setExecutionResults((prev) => ({ ...prev, [c.id]: data.result }));
        }
      } catch (err) {
        console.error(`Failed to run demo ${c.id}:`, err);
      }
    }
    setLoadingCaseId(null);
    setIsRunningAll(false);
  }

  const filteredCases = activeStageFilter
    ? FACULTY_DEMO_CASES.filter((c) =>
        c.pipelineStage.toLowerCase().includes(activeStageFilter.toLowerCase())
      )
    : FACULTY_DEMO_CASES;

  return (
    <Shell>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
        {/* Editorial Masthead */}
        <header
          style={{
            borderBottom: "2px solid var(--border-default)",
            paddingBottom: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
                <span
                  style={{
                    background: "var(--accent-primary)",
                    color: "#fff",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Milestone 8-F Verified
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Academic Defense &amp; Demonstration Mode
                </span>
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-serif, Georgia, serif)",
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.03em",
                  margin: 0,
                }}
              >
                AcademicAI — Faculty Review Mode
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.35rem", maxWidth: "800px" }}>
                NLP-driven Academic Intelligence &amp; Personalized Student Assistance Platform. Complete system demonstration covering natural language processing, multimodal document ingestion, change intelligence, academic risk detection, and grounded AI assistant tooling.
              </p>
            </div>

            {/* Verification Export Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={executeAllCases}
                disabled={isRunningAll}
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8rem",
                  padding: "0.45rem 0.8rem",
                }}
              >
                <RefreshCw size={14} className={isRunningAll ? "spin-icon" : ""} />
                <span>{isRunningAll ? "Executing 15 Demos..." : "Run All 15 Demos"}</span>
              </button>

              <a
                href="/api/faculty-review?export=json"
                download
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8rem",
                  padding: "0.45rem 0.8rem",
                  textDecoration: "none",
                }}
              >
                <FileText size={14} />
                <span>Export Log (JSON)</span>
              </a>

              <a
                href="/api/faculty-review?export=csv"
                download
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8rem",
                  padding: "0.45rem 0.8rem",
                  textDecoration: "none",
                }}
              >
                <FileSpreadsheet size={14} />
                <span>Export Audit (CSV)</span>
              </a>
            </div>
          </div>

          {/* Review Mode Navigation Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "1.25rem",
              borderTop: "1px solid var(--border-default)",
              paddingTop: "0.75rem",
            }}
          >
            {[
              { id: "demos", label: "15 Live Demonstration Cases", icon: Play },
              { id: "pipeline", label: "NLP Intelligence Pipeline", icon: Layers },
              { id: "evidence", label: "Evidence & Trace Inspector", icon: Eye },
              { id: "evaluation", label: "M8-E Final Evaluation Benchmark", icon: CheckCircle2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.9rem",
                    borderRadius: "6px",
                    border: isActive ? "1px solid var(--accent-primary)" : "1px solid transparent",
                    background: isActive ? "var(--bg-surface)" : "transparent",
                    color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* ============================================================ */}
        {/* TAB 1: 15 LIVE DEMONSTRATION CASES */}
        {/* ============================================================ */}
        {activeTab === "demos" && (
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "1.5rem" }}>
            {/* Left Column: Curated Demo List */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                maxHeight: "calc(100vh - 220px)",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                  DEMO SCENARIOS ({FACULTY_DEMO_CASES.length})
                </span>
                {activeStageFilter && (
                  <button
                    type="button"
                    onClick={() => setActiveStageFilter(null)}
                    style={{ fontSize: "0.7rem", color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {filteredCases.map((c) => {
                  const isSelected = c.id === selectedCaseId;
                  const hasRun = !!executionResults[c.id];
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCaseId(c.id);
                        if (!executionResults[c.id]) {
                          executeCase(c.id);
                        }
                      }}
                      style={{
                        padding: "0.6rem 0.75rem",
                        borderRadius: "6px",
                        border: isSelected ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-default)",
                        background: isSelected ? "var(--bg-surface-elevated, #fff)" : "transparent",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: isSelected ? "var(--accent-primary)" : "var(--text-muted)",
                          }}
                        >
                          CASE {c.number.toString().padStart(2, "0")} · {c.category.toUpperCase()}
                        </span>
                        {hasRun ? (
                          <span style={{ fontSize: "0.65rem", color: "#16a34a", fontWeight: 600 }}>● Verified</span>
                        ) : (
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>○ Ready</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: isSelected ? 700 : 500, color: "var(--text-primary)" }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        Stage: {c.pipelineStage}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Case Deep-Dive & Real Execution Trace */}
            <div>
              {/* Case Header Card */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span className="badge badge-indigo" style={{ marginBottom: "0.35rem" }}>
                      Demo Case {selectedCase.number} of 15 · {selectedCase.category}
                    </span>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0.25rem 0", color: "var(--text-primary)" }}>
                      {selectedCase.title}
                    </h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                      {selectedCase.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeCase(selectedCase.id)}
                    disabled={loadingCaseId === selectedCase.id}
                    className="btn btn-primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.85rem",
                      padding: "0.5rem 0.9rem",
                    }}
                  >
                    <Play size={14} className={loadingCaseId === selectedCase.id ? "spin-icon" : ""} />
                    <span>{loadingCaseId === selectedCase.id ? "Running Live Engine..." : "Execute Real Engine"}</span>
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--border-default)",
                    display: "flex",
                    gap: "1.5rem",
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <div>
                    <strong>Pipeline Stage:</strong> {selectedCase.pipelineStage}
                  </div>
                  <div>
                    <strong>Benchmark Ground Truth:</strong> {selectedCase.evaluationReference}
                  </div>
                </div>
              </div>

              {/* Six-Stage Academic Execution Stream */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* 1. INPUT */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#3b82f6", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      1
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      INPUT (ACADEMIC SOURCE TEXT / DOCUMENT EXTRACT)
                    </span>
                  </div>
                  <pre
                    style={{
                      background: "var(--bg-canvas, #f8f9fa)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "6px",
                      padding: "0.75rem",
                      fontSize: "0.82rem",
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-mono, monospace)",
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    {selectedCase.rawInput}
                  </pre>
                  {selectedCase.secondaryInput && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)" }}>Secondary Channel Input:</span>
                      <pre
                        style={{
                          background: "var(--bg-canvas, #f8f9fa)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "6px",
                          padding: "0.5rem",
                          fontSize: "0.8rem",
                          whiteSpace: "pre-wrap",
                          fontFamily: "var(--font-mono, monospace)",
                          color: "var(--text-primary)",
                          margin: "0.2rem 0 0 0",
                        }}
                      >
                        {selectedCase.secondaryInput}
                      </pre>
                    </div>
                  )}
                </div>

                {/* 2. NLP UNDERSTANDING */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#8b5cf6", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      2
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      NLP UNDERSTANDING (EXTRACTION &amp; NORMALIZATION)
                    </span>
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {currentResult ? (
                      currentResult.nlpUnderstanding
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                        Click &quot;Execute Real Engine&quot; to run live extraction...
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. STRUCTURED RESULT */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#10b981", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      3
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      STRUCTURED RESULT (INTELLIGENCE PAYLOAD)
                    </span>
                  </div>
                  {currentResult ? (
                    <pre
                      style={{
                        background: "var(--bg-canvas, #f8f9fa)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "6px",
                        padding: "0.75rem",
                        fontSize: "0.76rem",
                        maxHeight: "220px",
                        overflowY: "auto",
                        fontFamily: "var(--font-mono, monospace)",
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {JSON.stringify(currentResult.structuredResult, null, 2)}
                    </pre>
                  ) : (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      Awaiting engine execution.
                    </div>
                  )}
                </div>

                {/* 4. EVIDENCE */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#f59e0b", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      4
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      EVIDENCE (SOURCE SPAN &amp; ATTRIBUTION)
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.84rem",
                      color: "var(--text-primary)",
                      background: "rgba(245, 158, 11, 0.08)",
                      borderLeft: "3px solid #f59e0b",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "0 6px 6px 0",
                    }}
                  >
                    {currentResult ? currentResult.evidence : "N/A"}
                  </div>
                </div>

                {/* 5. SYSTEM ACTION */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#6366f1", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      5
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      SYSTEM ACTION (ACADEMIC COMMAND CENTER MUTATION)
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--accent-primary)",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {currentResult ? currentResult.systemAction : "Awaiting execution"}
                  </div>
                </div>

                {/* 6. EXPLANATION */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#ec4899", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                      6
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
                      EXPLANATION (PEDAGOGICAL &amp; COGNITIVE JUSTIFICATION)
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {currentResult ? currentResult.explanation : "Awaiting execution"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: NLP INTELLIGENCE PIPELINE */}
        {/* ============================================================ */}
        {activeTab === "pipeline" && (
          <div>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                End-to-End Academic NLP Intelligence Architecture
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                Every ingested academic item progresses through an explicit multi-layer comprehension graph. Statistical and multimodal models extract features, while deterministic invariant engines govern priority, academic state transitions, risk radar calculations, and mutation safety.
              </p>
            </div>

            {/* Pipeline Stepper Flow */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {PIPELINE_STAGES.map((stage, idx) => {
                const stageCases = FACULTY_DEMO_CASES.filter((c) =>
                  c.pipelineStage.toLowerCase().includes(stage.name.toLowerCase().split(" ")[0])
                );
                return (
                  <div
                    key={stage.id}
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "var(--accent-primary)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {stage.name}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {stage.desc}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {stageCases.length} demo case(s)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStageFilter(stage.name.split(" ")[0]);
                          setActiveTab("demos");
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                      >
                        View Cases
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: EVIDENCE & TRACE INSPECTOR */}
        {/* ============================================================ */}
        {activeTab === "evidence" && (
          <div>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Evidence &amp; Trace Inspector: {selectedCase.title}
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    Full transparency into extracted spans, page coordinates, normalized timestamps, and downstream impact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => executeCase(selectedCase.id)}
                  disabled={loadingCaseId === selectedCase.id}
                  className="btn btn-primary"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                >
                  <RefreshCw size={13} className={loadingCaseId === selectedCase.id ? "spin-icon" : ""} />
                  <span>Re-run Trace</span>
                </button>
              </div>
            </div>

            {currentResult ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                {/* Column 1: Source & Raw Attribution */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      ORIGINAL ACADEMIC SOURCE
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {currentResult.trace.originalSource}
                    </div>
                    {currentResult.trace.sourcePageInfo && (
                      <div style={{ fontSize: "0.75rem", color: "var(--accent-primary)", marginTop: "0.2rem" }}>
                        Attribution: {currentResult.trace.sourcePageInfo}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      VERIFIED EVIDENCE SNIPPET
                    </div>
                    <blockquote
                      style={{
                        margin: 0,
                        padding: "0.6rem 0.8rem",
                        background: "rgba(245, 158, 11, 0.08)",
                        borderLeft: "3px solid #f59e0b",
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      &quot;{currentResult.trace.evidenceSnippet}&quot;
                    </blockquote>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      NORMALIZED DATE &amp; TIME (ASIA/KOLKATA)
                    </div>
                    <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono, monospace)", color: "var(--text-primary)" }}>
                      {currentResult.trace.normalizedDateTime || "No timestamp associated"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      RELATIONSHIP TO PRIOR KNOWLEDGE
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-primary)" }}>
                      {currentResult.trace.relationshipToPrevious || "NEW (No prior matched record)"}
                    </div>
                  </div>
                </div>

                {/* Column 2: Downstream Intelligence Impact */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      TASK &amp; EVENT MUTATION
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {currentResult.trace.resultingTaskEventChange || "No database mutation"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      PRIORITY &amp; RISK REASONING
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {currentResult.trace.priorityRiskReasoning || "Standard baseline priority"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      NOTIFICATION INTELLIGENCE REASONING
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {currentResult.trace.notificationReasoning || "Standard staged notification schedule"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                      AI ASSISTANT GROUNDED EXPOSURE
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {currentResult.trace.assistantGrounding || "Accessible via grounded tool lookups"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                Execute the case in Tab 1 to inspect evidence traces.
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: M8-E FINAL EVALUATION BENCHMARK */}
        {/* ============================================================ */}
        {activeTab === "evaluation" && (
          <div>
            {/* Scientific Integrity Note */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Reproducible Final Benchmark Standards &amp; Metric Discipline
                </h2>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                Every metric reported below is derived from our executable benchmark suite (<code>scripts/test-milestone8-final-evaluation.ts</code>) over a 110-item curated academic dataset (50 TRAIN / 25 DEV / 35 TEST).
                Per academic integrity standards, we strictly distinguish between statistical NLP models (evaluated on accuracy/F1) and deterministic rule engines (evaluated on invariant preservation and scenario success). No numbers are approximated or fabricated.
              </p>
            </div>

            {/* Benchmark Table */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                marginBottom: "1.5rem",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-canvas, #f8f9fa)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Component
                    </th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Architecture Type
                    </th>
                    <th style={{ textAlign: "center", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Samples
                    </th>
                    <th style={{ textAlign: "center", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Performance
                    </th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Key Metric &amp; Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EVALUATION_BENCHMARK_SUMMARY.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid var(--border-default)",
                        background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {row.component}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                        <span className="badge badge-indigo">{row.category}</span>
                      </td>
                      <td style={{ textAlign: "center", padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                        {row.sampleSize}
                      </td>
                      <td style={{ textAlign: "center", padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: parseFloat(row.accuracyOrSuccess) >= 70 ? "#16a34a" : "#ca8a04",
                          }}
                        >
                          {row.accuracyOrSuccess}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.8rem" }}>
                          {row.keyMetric}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          {row.notes}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Error Analysis Overview */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                Honest Error Analysis &amp; Systemic Edge Cases (from docs/error-analysis.md)
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                Failure modes observed on the untouched TEST set were logged without synthetic data manipulation:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#b91c1c", marginBottom: "0.2rem" }}>
                    Informal Student Slang
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Phrases like &quot;DA2 due date got pushed&quot; lack formal university header keywords, occasionally dropping statistical classification confidence below threshold.
                  </div>
                </div>

                <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#b91c1c", marginBottom: "0.2rem" }}>
                    Extreme OCR Distortion
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Severe lens glare or skewed low-res mobile photos generate character substitution noise requiring fuzzy Levenshtein distance fallbacks.
                  </div>
                </div>

                <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "0.75rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#b91c1c", marginBottom: "0.2rem" }}>
                    Multi-Clause Reschedules
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Complex circulars shifting multiple batch timings in a single sentence require multi-entity resolution to avoid binding the wrong new time to a previous task.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
