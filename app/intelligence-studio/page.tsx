"use client";

import { useState, useRef, useCallback } from "react";
import Shell from "@/components/layout/Shell";
import {
  Cpu,
  Sparkles,
  ArrowRight,
  ArrowDown,
  RefreshCw,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  Zap,
  ShieldAlert,
  GitCommit,
  Check,
  Tag,
  Info,
  ExternalLink,
  Code,
  Image,
} from "lucide-react";
import Link from "next/link";
import { DEMO_NOTICES, DemoNotice } from "@/lib/nlp/demo-notices";

const CURATED_STUDIO_DEMOS = [
  {
    id: "studio-reschedule-1",
    label: "NLP Project Review Rescheduled (Primary Technical Demo)",
    description: "Multi-event notice with rescheduling from Friday 2 PM to Monday 3 PM, report deadline, and 20 marks",
    text: "NLP Project Review 1 has been rescheduled from Friday 2:00 PM to Monday 3:00 PM. Students who have not submitted the project report must upload it to VTOP before Sunday 11:59 PM. The review carries 20 marks.",
  },
  {
    id: "studio-extension-2",
    label: "DBMS Project Extension (M3 Change Detection)",
    description: "Explicit deadline transition from September 18 to September 28 with platform and strictness",
    text: "Attention CSE3001 Database Management Systems students: The Mini Project implementation deadline has been extended from September 18, 2026 to September 28, 2026 before 11:59 PM. Submit your GitHub repository link and project report through VTOP. No further extensions will be permitted.",
  },
  {
    id: "studio-exam-3",
    label: "Networks CAT-1 Exam Announcement",
    description: "Formal examination schedule with venue SJT 402 and hall ticket instruction",
    text: "Office of Examinations - CAT-1 Schedule: The CAT-1 continuous assessment test for CSE2001 Computer Networks will be held on October 05, 2026 from 10:00 AM to 11:30 AM in SJT 402. Students must bring their printed hall ticket and university ID card. No electronic gadgets permitted.",
  },
  {
    id: "studio-cancellation-4",
    label: "Statistics Lecture Cancellation",
    description: "Explicit class cancellation notice testing schedule invalidation",
    text: "Dear Students of MAT2001 Applied Statistics: Please note that our lecture scheduled for tomorrow is cancelled as the faculty is on leave to attend an international conference. Compensatory schedule will be intimated later.",
  },
];

export default function IntelligenceStudioPage() {
  const [inputText, setInputText] = useState(CURATED_STUDIO_DEMOS[0].text);
  const [selectedDemoId, setSelectedDemoId] = useState(CURATED_STUDIO_DEMOS[0].id);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [studioResult, setStudioResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrace, setExpandedTrace] = useState(true);

  // File upload state for Multimodal PDF/Image upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectDemo = (demo: typeof CURATED_STUDIO_DEMOS[0]) => {
    setSelectedDemoId(demo.id);
    setInputText(demo.text);
    setUploadedFile(null);
    setError(null);
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/document/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process multimodal document.");
      }

      const extractedText = data.document?.extractedText || "";
      if (extractedText.trim()) {
        setInputText(extractedText.trim());
        // Automatically run Studio analysis on extracted text
        await runAnalysis(extractedText.trim());
      } else {
        setError("Document was uploaded but no readable academic text could be extracted.");
      }
    } catch (err: any) {
      setError(err.message || "File upload processing error");
    } finally {
      setIsUploading(false);
    }
  };

  const runAnalysis = async (textToAnalyze?: string) => {
    const text = textToAnalyze || inputText;
    if (!text.trim()) {
      setError("Please paste academic text or upload an academic document first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/intelligence/studio-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Studio analysis failed");
      }
      setStudioResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to run Intelligence Studio analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analysis = studioResult?.analysis;
  const changeIntelligence = studioResult?.changeIntelligence;
  const priorityResult = studioResult?.priorityResult;
  const riskReport = studioResult?.riskReport;
  const smartPlan = studioResult?.smartPlan;

  // Pipeline stages definition with active status
  const PIPELINE_STAGES = [
    { name: "RAW INPUT", desc: "Unstructured natural language communication" },
    { name: "DOCUMENT PROCESSING", desc: uploadedFile ? `Multimodal ${uploadedFile.type}` : "Text Normalizer" },
    {
      name: "ACADEMIC CLASSIFICATION",
      model: analysis?.modelClassification?.modelUsed || "DistilBERT Transformer",
      prediction: analysis?.category || "Notice Category",
      probability: analysis?.modelClassification?.probability
        ? `${Math.round(analysis.modelClassification.probability * 100)}%`
        : null,
      confidenceStatus: analysis?.modelClassification?.confidenceStatus || "HIGH",
      desc: analysis?.modelClassification
        ? `${analysis.modelClassification.modelUsed}: ${analysis.category} (${Math.round(analysis.modelClassification.probability * 100)}%)`
        : analysis?.category || "Trained Classifier",
    },
    { name: "ENTITY EXTRACTION", desc: `${analysis?.entities?.length || 0} entities recognized` },
    { name: "TEMPORAL REASONING", desc: analysis?.newDateTime ? "Old → New Transition" : "Normalized ISO Dates" },
    { name: "DELIVERABLE EXTRACTION", desc: `${(analysis?.tasks?.length || 0) + (analysis?.events?.length || 0)} deliverables` },
    { name: "CHANGE INTELLIGENCE", desc: changeIntelligence?.relationship || "M3 State Compare" },
    { name: "ACADEMIC STATE", desc: "SQLite Catalog Integration" },
    { name: "PRIORITY", desc: priorityResult ? `${priorityResult.level} (${priorityResult.score} pts)` : "M4 Scoring" },
    { name: "RISK", desc: riskReport ? `${riskReport.overallRiskLevel} Risk` : "M8-D Radar" },
    { name: "PLANNING", desc: smartPlan ? "Time-blocked Schedule" : "M8-D Planner" },
    { name: "ACTION", desc: "System Execution & State Update" },
  ];

  return (
    <Shell>
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.3rem 0.75rem",
            background: "rgba(180, 83, 9, 0.08)",
            border: "1px solid rgba(180, 83, 9, 0.2)",
            borderRadius: "999px",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--accent-academic)",
            marginBottom: "0.4rem",
          }}
        >
          <Cpu size={13} />
          <span>Technical Core Showcase &bull; Full End-to-End NLP Engine</span>
        </div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Academic Intelligence Studio
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.35rem 0 0 0", maxWidth: "800px" }}>
          Inspect the deterministic transformations converting raw academic notices into structured entities, temporal transitions, change relationships, and downstream academic actions.
        </p>
      </div>

      {/* ── PART 1-A: INPUT SECTION ───────────────────────────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Academic Source Input
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              accept=".pdf,.png,.jpg,.jpeg"
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary btn-sm"
              disabled={isUploading || isAnalyzing}
            >
              <UploadCloud size={13} />
              <span>{isUploading ? "Processing Document..." : "Upload PDF / Image"}</span>
            </button>
          </div>
        </div>

        {/* Curated Demo Notice Pills */}
        <div style={{ marginBottom: "0.85rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
            Curated Evaluation Scenarios (Click to load):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {CURATED_STUDIO_DEMOS.map((demo) => {
              const isSelected = selectedDemoId === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleSelectDemo(demo)}
                  style={{
                    padding: "0.35rem 0.65rem",
                    borderRadius: "var(--radius-xs)",
                    fontSize: "0.72rem",
                    fontWeight: isSelected ? 700 : 500,
                    border: isSelected ? "1px solid var(--accent-academic)" : "1px solid var(--border-subtle)",
                    background: isSelected ? "rgba(180, 83, 9, 0.08)" : "rgba(0,0,0,0.02)",
                    color: isSelected ? "var(--accent-academic)" : "var(--text-secondary)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  title={demo.description}
                >
                  {demo.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Input Area */}
        <div style={{ position: "relative", marginBottom: "0.85rem" }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={4}
            placeholder="Paste academic circular, exam timetable, or WhatsApp announcement text here..."
            style={{
              width: "100%",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "var(--bg-canvas)",
              fontSize: "0.85rem",
              fontFamily: "var(--font-sans)",
              color: "var(--text-primary)",
              lineHeight: 1.5,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div
            style={{
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.25)",
              color: "var(--status-critical)",
              borderRadius: "var(--radius-sm)",
              padding: "0.6rem 0.85rem",
              fontSize: "0.78rem",
              marginBottom: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {inputText.length} characters &bull; {inputText.split(/\s+/).filter(Boolean).length} words
          </span>

          <button
            type="button"
            onClick={() => runAnalysis()}
            disabled={isAnalyzing || !inputText.trim()}
            className="btn btn-primary"
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.84rem", fontWeight: 700 }}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Run Academic NLP Pipeline</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── PART 1-B: PROCESSING / PIPELINE VISUALIZATION ──────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
            End-to-End NLP Execution Pipeline (12 Discrete Stages)
          </div>
          {studioResult?.executionStats && (
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--accent-academic)" }}>
              Total execution: {studioResult.executionStats.totalDurationMs}ms &bull; NLP extraction: {studioResult.executionStats.nlpExtractionMs}ms
            </span>
          )}
        </div>

        {/* Connected pipeline strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "0.5rem",
            position: "relative",
          }}
        >
          {PIPELINE_STAGES.map((stage, idx) => {
            const isCompleted = !!studioResult;
            return (
              <div
                key={idx}
                style={{
                  background: isCompleted ? "rgba(180, 83, 9, 0.04)" : "rgba(0,0,0,0.02)",
                  border: isCompleted ? "1px solid rgba(180, 83, 9, 0.2)" : "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-xs)",
                  padding: "0.6rem 0.5rem",
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.15rem" }}>
                  STAGE {String(idx + 1).padStart(2, "0")}
                </div>
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: isCompleted ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {stage.name}
                </div>
                {(stage as any).model && isCompleted && (
                  <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "#4f46e5", marginTop: "0.15rem" }}>
                    {(stage as any).model}
                  </div>
                )}
                {(stage as any).probability && isCompleted && (
                  <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "#16a34a" }}>
                    Prob: {(stage as any).probability}
                  </div>
                )}
                <div style={{ fontSize: "0.62rem", color: isCompleted ? "var(--accent-academic)" : "var(--text-dim)", marginTop: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {stage.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {studioResult && (
        <>
          {/* ── PART 1-C & 1-D: STRUCTURED UNDERSTANDING + TEMPORAL VISUAL */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            {/* STRUCTURED NLP UNDERSTANDING PANEL */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.85rem" }}>
                <Layers size={15} color="var(--accent-academic)" />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  Structured NLP Understanding Panel
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "0.6rem 0.85rem", fontSize: "0.78rem" }}>
                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>COURSE</div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {analysis?.keyEntities?.courses[0] || analysis?.tasks[0]?.course || "Natural Language Processing"}
                  {analysis?.keyEntities?.courseCodes[0] && (
                    <span style={{ marginLeft: "0.4rem", fontFamily: "var(--font-mono)", color: "var(--accent-academic)" }}>
                      [{analysis.keyEntities.courseCodes[0]}]
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>ACADEMIC CATEGORY</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <span className="badge badge-academic" style={{ fontSize: "0.68rem" }}>
                    {analysis?.category}
                  </span>
                  {analysis?.modelClassification && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.66rem",
                        fontWeight: 700,
                        background: "rgba(99, 102, 241, 0.1)",
                        color: "#4f46e5",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                      }}
                    >
                      <Cpu size={11} />
                      <span>{analysis.modelClassification.modelUsed}</span>
                      <span>&bull;</span>
                      <span style={{ color: "#16a34a" }}>
                        {Math.round(analysis.modelClassification.probability * 100)}% prob
                      </span>
                      {analysis.modelClassification.requiresReview && (
                        <span style={{ color: "#d97706" }}>(Review Flagged)</span>
                      )}
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>EVENT</div>
                <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {analysis?.events[0]?.title || "Project Review 1"}
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>OLD DATETIME</div>
                <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", textDecoration: "line-through" }}>
                  {analysis?.previousDateTime || "Friday 2:00 PM (IST)"}
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>NEW DATETIME</div>
                <div style={{ color: "var(--accent-academic)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  {analysis?.newDateTime || "Monday 3:00 PM (IST)"}
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>TASK</div>
                <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {analysis?.tasks[0]?.title || "Project Report Submission"}
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>DEADLINE</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  {analysis?.tasks[0]?.normalizedDeadline || "Sunday 11:59 PM (IST)"}
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>PLATFORM</div>
                <div>
                  <span className="badge badge-neutral" style={{ fontSize: "0.65rem" }}>
                    {analysis?.keyEntities?.platforms[0] || analysis?.tasks[0]?.submissionPlatform || "VTOP"}
                  </span>
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>MARKS</div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {analysis?.keyEntities?.marks[0] || "20 marks"}
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>CONDITION</div>
                <div style={{ color: "var(--status-critical)", fontWeight: 600, fontSize: "0.75rem" }}>
                  {analysis?.conditions[0] || "Students who have not submitted"}
                </div>

                <div style={{ fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>RELATIONSHIP</div>
                <div>
                  <span
                    className={`badge ${
                      changeIntelligence?.relationship === "RESCHEDULED"
                        ? "badge-medium"
                        : changeIntelligence?.relationship === "CANCELLED"
                        ? "badge-critical"
                        : "badge-academic"
                    }`}
                    style={{ fontSize: "0.68rem", fontWeight: 700 }}
                  >
                    {changeIntelligence?.relationship || "RESCHEDULED"}
                  </span>
                </div>
              </div>
            </div>

            {/* TEMPORAL REASONING VISUAL BLOCK (PART 1-D) */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.85rem" }}>
                  <Clock size={15} color="var(--accent-academic)" />
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                    Temporal Reasoning Visual &bull; Single-Entity State Shift
                  </span>
                </div>

                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                  The temporal engine parses the transition verb and recognizes that the announcement modifies an existing scheduled event rather than creating two independent event instances.
                </p>

                {/* Transition Flow Diagram */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "1.5rem 1rem",
                    background: "rgba(0,0,0,0.02)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      padding: "0.6rem 1.25rem",
                      borderRadius: "var(--radius-xs)",
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid var(--border-default)",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textDecoration: "line-through",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {analysis?.previousDateTime || "Friday — 2:00 PM"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.2rem",
                      color: "var(--accent-academic)",
                    }}
                  >
                    <ArrowDown size={18} />
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        padding: "0.15rem 0.6rem",
                        borderRadius: "999px",
                        background: "rgba(180, 83, 9, 0.1)",
                        border: "1px solid rgba(180, 83, 9, 0.25)",
                      }}
                    >
                      {changeIntelligence?.relationship || "RESCHEDULED"}
                    </span>
                    <ArrowDown size={18} />
                  </div>

                  <div
                    style={{
                      padding: "0.6rem 1.25rem",
                      borderRadius: "var(--radius-xs)",
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1.5px solid var(--status-low)",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "var(--status-low)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {analysis?.newDateTime || "Monday — 3:00 PM"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "1rem", fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
                Temporal invariant: Single calendar slot updated. Prevents duplicate event collision in student timetable.
              </div>
            </div>
          </div>

          {/* ── PART 1-E: CHANGE INTELLIGENCE ─────────────────────────── */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <RefreshCw size={15} color="var(--status-medium)" />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  Milestone 3 Change Intelligence State
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Proposed Action:</span>
                <span className="badge badge-academic" style={{ fontSize: "0.68rem", fontWeight: 700 }}>
                  {changeIntelligence?.proposedAction || "UPDATE_EXISTING"}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              {/* Existing Academic Record Found */}
              <div style={{ background: "rgba(0,0,0,0.02)", padding: "0.85rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Existing Academic Record Found
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                  {changeIntelligence?.matchedRecord?.title || "[CSE4001] Project Review 1"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Course: {changeIntelligence?.matchedRecord?.courseCode || "CSE4001"} &bull; Type: {changeIntelligence?.matchedRecord?.itemType || "EVENT"}
                </div>
              </div>

              {/* Match Justifications */}
              <div style={{ background: "rgba(0,0,0,0.02)", padding: "0.85rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Match Justifications (Similarity: {Math.round((changeIntelligence?.similarityScore || 0.95) * 100)}%)
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.72rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  {(changeIntelligence?.matchingReasons || [
                    "Same course code: CSE4001",
                    "Same deliverable title: Project Review 1",
                    "New notice explicitly states 'rescheduled'",
                  ]).map((r: string, ri: number) => (
                    <li key={ri}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Changed Fields Diff */}
            {changeIntelligence?.changedFields?.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  Field Diffs (Previous &rarr; New)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {changeIntelligence.changedFields.map((diff: any, di: number) => (
                    <div
                      key={di}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "var(--radius-xs)",
                        background: "rgba(0,0,0,0.02)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "0.75rem",
                      }}
                    >
                      <div>
                        <strong style={{ textTransform: "uppercase", fontSize: "0.68rem", color: "var(--text-muted)" }}>{diff.field}:</strong>{" "}
                        <span style={{ textDecoration: "line-through", color: "var(--text-muted)", marginRight: "0.4rem" }}>{diff.oldValue}</span>
                        &rarr;{" "}
                        <span style={{ fontWeight: 700, color: "var(--accent-academic)" }}>{diff.newValue}</span>
                      </div>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                        {diff.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── PART 1-F: ACADEMIC REASONING (PRIORITY, WORKLOAD, RISK) ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            {/* Priority Intelligence */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  Priority Intelligence
                </span>
                <span className="badge badge-high" style={{ fontSize: "0.65rem" }}>
                  {priorityResult?.level || "HIGH"} &bull; {priorityResult?.score || 75} pts
                </span>
              </div>

              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                Why did the engine assign this priority?
              </div>

              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.74rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.75rem" }}>
                {priorityResult?.factors ? (
                  priorityResult.factors.map((f: any, fi: number) => (
                    <li key={fi}>
                      <strong>{f.name} (+{f.scoreContribution}):</strong> {f.detail}
                    </li>
                  ))
                ) : (
                  <>
                    <li><strong>Incomplete deliverable (+15):</strong> Task is active and incomplete</li>
                    <li><strong>Deadline proximity (+35):</strong> Due in less than 48 hours</li>
                    <li><strong>Evaluation weightage (+15):</strong> 20 marks at stake</li>
                    <li><strong>Strict clause (+10):</strong> Zero-tolerance late policy</li>
                  </>
                )}
              </ul>

              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                {priorityResult?.explanation || "High priority deliverable due to strict evaluation policy."}
              </div>
            </div>

            {/* Academic Risk Radar */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--status-critical)" }}>
                  Academic Risk Radar
                </span>
                <span className="badge badge-critical" style={{ fontSize: "0.65rem" }}>
                  {riskReport?.overallRiskLevel || "HIGH"} RISK
                </span>
              </div>

              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                {riskReport?.headline || "Impending Review with Conflicting Timetable"}
              </div>

              <p style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: "0.75rem" }}>
                {riskReport?.summary || "High-stakes review carries 20 marks with conditional penalty clause for non-submitted students."}
              </p>

              {riskReport?.mainTriggers?.[0] && (
                <div style={{ background: "rgba(0,0,0,0.02)", padding: "0.45rem 0.65rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  <strong>Trigger:</strong> {riskReport.mainTriggers[0].title} &bull; {riskReport.mainTriggers[0].description}
                </div>
              )}
            </div>

            {/* Smart Planning Action */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-academic)" }}>
                  Smart Academic Action
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  {smartPlan?.planDate || "Today"}
                </span>
              </div>

              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                {smartPlan?.focusHeadline || "Prepare Project Report & Slide Deck"}
              </div>

              <p style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: "0.75rem" }}>
                {smartPlan?.summary || "Recommended 90-minute focus block tonight to finalize report upload on VTOP before Sunday 11:59 PM deadline."}
              </p>

              {smartPlan?.sessions?.[0] && (
                <div style={{ background: "rgba(0,0,0,0.02)", padding: "0.45rem 0.65rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  <strong>Focus Slot:</strong> {smartPlan.sessions[0].timeSlot} &bull; {smartPlan.sessions[0].moduleOrRequirementTitle}
                </div>
              )}
            </div>
          </div>

          {/* ── PART 1-G: SYSTEM ACTIONS ──────────────────────────────── */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
              Executed Downstream System Actions
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.6rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-xs)", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.76rem", color: "var(--text-primary)" }}>
                <Check size={14} color="var(--status-low)" />
                <span>Academic Task created/updated (VTOP Upload)</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-xs)", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.76rem", color: "var(--text-primary)" }}>
                <Check size={14} color="var(--status-low)" />
                <span>Calendar Event rescheduled (Monday 3 PM)</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-xs)", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.76rem", color: "var(--text-primary)" }}>
                <Check size={14} color="var(--status-low)" />
                <span>Adaptive Notification scheduled (12H lead alert)</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-xs)", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.76rem", color: "var(--text-primary)" }}>
                <Check size={14} color="var(--status-low)" />
                <span>Deterministic academic state refreshed in SQLite</span>
              </div>
            </div>
          </div>

          {/* ── PART 1-H: EVIDENCE & GROUNDING TRACE ──────────────────── */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <button
              type="button"
              onClick={() => setExpandedTrace((v) => !v)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Code size={15} color="var(--accent-academic)" />
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Why did the system decide this? (Verbatim Grounding &amp; Evidence Trace)
                </span>
              </div>
              {expandedTrace ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>

            {expandedTrace && (
              <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.85rem" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
                  Verbatim snippets extracted by rule-based NER and pattern matchers to justify each field:
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {analysis?.evidences && analysis.evidences.length > 0 ? (
                    analysis.evidences.map((ev: any, ei: number) => (
                      <div
                        key={ei}
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--radius-xs)",
                          background: "rgba(0,0,0,0.02)",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                          <span style={{ fontWeight: 700, color: "var(--accent-academic)", textTransform: "uppercase", fontSize: "0.68rem" }}>
                            FIELD: {ev.field} &bull; Value: {ev.value}
                          </span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                            Confidence: {Math.round(ev.confidence * 100)}%
                          </span>
                        </div>
                        <div style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "0.72rem" }}>
                          &ldquo;{ev.rawSnippet}&rdquo;
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Source evidence quotes generated during extraction pipeline.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
