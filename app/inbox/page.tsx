"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Shell from "@/components/layout/Shell";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Calendar,
  Clock,
  MapPin,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Quote,
  Layers,
  X,
  ArrowRight,
  UploadCloud,
  FileText,
  Edit3,
  Trash2,
  Check,
  Award,
  AlertCircle,
  ExternalLink,
  BookOpen,
  GitCompare,
  Image,
  File,
  Link2,
} from "lucide-react";
import type {
  NLPAnalysisResult,
  ExtractedTask,
  ExtractedEvent,
  ExtractedExam,
  ChangeCheckResult,
  ProposedAction,
} from "@/lib/nlp/schemas";
import { DEMO_NOTICES, DemoNotice } from "@/lib/nlp/demo-notices";

export default function AcademicInboxPage() {
  // ── Existing text-paste state ───────────────────────────────────────────
  const [noticeText, setNoticeText] = useState("");
  const [selectedDemoId, setSelectedDemoId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<NLPAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSuccess, setConfirmationSuccess] = useState<string | null>(null);

  // Milestone 3 Change Intelligence state
  const [changeCheckResult, setChangeCheckResult] = useState<ChangeCheckResult | null>(null);
  const [isCheckingChanges, setIsCheckingChanges] = useState(false);

  // Editable state (allows user to edit extracted deliverables before confirmation)
  const [isEditing, setIsEditing] = useState(false);
  const [editableTasks, setEditableTasks] = useState<ExtractedTask[]>([]);
  const [editableEvents, setEditableEvents] = useState<ExtractedEvent[]>([]);
  const [editableExams, setEditableExams] = useState<ExtractedExam[]>([]);

  // Ingestion history
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [showEvidenceDrawer, setShowEvidenceDrawer] = useState(false);
  const [activeEvidenceItem, setActiveEvidenceItem] = useState<any | null>(null);

  // ── M7-E: Document upload state ─────────────────────────────────────────
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docDragOver, setDocDragOver] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [docResult, setDocResult] = useState<any | null>(null); // DocumentIngestionResult
  const [docError, setDocError] = useState<string | null>(null);
  const [docConfirmSuccess, setDocConfirmSuccess] = useState<string | null>(null);
  const [docConfirming, setDocConfirming] = useState(false);
  const [docChangeCheck, setDocChangeCheck] = useState<ChangeCheckResult | null>(null);
  const [docCheckingChanges, setDocCheckingChanges] = useState(false);
  const [showDocEvidence, setShowDocEvidence] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecentNotices = async () => {
    try {
      const res = await fetch("/api/notices");
      const data = await res.json();
      if (data.success && data.notices) {
        setRecentNotices(data.notices);
      }
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    fetchRecentNotices();
    try {
      const prefill = sessionStorage.getItem("nlp_inbox_prefill");
      if (prefill) {
        setNoticeText(prefill);
        sessionStorage.removeItem("nlp_inbox_prefill");
      }
    } catch {}
  }, []);

  // ── M7-E: Document upload handlers ────────────────────────────────────

  const handleDocFileSelect = useCallback((file: File) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(file.type) && !(["pdf", "png", "jpg", "jpeg"].includes(ext || ""))) {
      setDocError(`Unsupported file type: "${file.name}". Please upload a PDF, PNG, or JPG/JPEG file.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocError(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
      return;
    }
    setDocFile(file);
    setDocResult(null);
    setDocError(null);
    setDocConfirmSuccess(null);
    setDocChangeCheck(null);
    setShowDocEvidence(false);
  }, []);

  const handleDocDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDocDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleDocFileSelect(file);
    },
    [handleDocFileSelect]
  );

  const handleDocUpload = async () => {
    if (!docFile) return;
    setDocUploading(true);
    setDocError(null);
    setDocResult(null);
    setDocConfirmSuccess(null);
    setDocChangeCheck(null);
    setShowDocEvidence(false);

    try {
      const formData = new FormData();
      formData.append("file", docFile);

      const res = await fetch("/api/document/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setDocError(data.error || "Failed to process document.");
        // If the server returned a partial document result (e.g. unreadable image), show it
        if (data.document) setDocResult({ document: data.document, nlpAnalysis: null });
        return;
      }

      setDocResult(data);

      // Run M3 Change Intelligence check on the extracted NLP analysis
      if (data.nlpAnalysis) {
        setDocCheckingChanges(true);
        try {
          const checkRes = await fetch("/api/ingest/change-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysis: data.nlpAnalysis }),
          });
          const checkData = await checkRes.json();
          if (checkRes.ok && checkData.success) {
            setDocChangeCheck(checkData);
          }
        } catch {
          // non-fatal
        } finally {
          setDocCheckingChanges(false);
        }
      }
    } catch (err: any) {
      setDocError(err.message || "Unexpected error during document processing.");
    } finally {
      setDocUploading(false);
    }
  };

  const handleDocConfirm = async (action: string = "CREATE_NEW") => {
    if (!docResult?.nlpAnalysis) return;
    setDocConfirming(true);
    setDocError(null);
    const analysis = docResult.nlpAnalysis as NLPAnalysisResult;
    try {
      const payload = {
        rawText: analysis.rawText,
        title:
          analysis.tasks[0]?.title ||
          analysis.events[0]?.title ||
          `${analysis.category.replace(/_/g, " ")} — ${docResult.document?.filename || "Document"}`,
        category: analysis.category,
        channel: "DOCUMENT_UPLOAD",
        tasks: analysis.tasks,
        events: analysis.events,
        exams: analysis.exams,
        evidences: analysis.evidences,
        action,
        relationship: docChangeCheck?.relationship || "NEW",
        targetId: docChangeCheck?.matchedRecord?.id,
        targetType: docChangeCheck?.matchedRecord?.itemType || "TASK",
        changedFields: docChangeCheck?.changedFields || [],
        matchingReasons: docChangeCheck?.matchingReasons || [],
        // M7-E: Pass document source context so AcademicSource gets provenance
        documentSource: docResult.documentSource || null,
      };

      const res = await fetch("/api/ingest/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save.");
      setDocConfirmSuccess(data.message || "Saved to academic database.");
      fetchRecentNotices();
    } catch (err: any) {
      setDocError(err.message || "Error saving document results.");
    } finally {
      setDocConfirming(false);
    }
  };

  const handleDocClear = () => {
    setDocFile(null);
    setDocResult(null);
    setDocError(null);
    setDocConfirmSuccess(null);
    setDocChangeCheck(null);
    setShowDocEvidence(false);
    if (docFileInputRef.current) docFileInputRef.current.value = "";
  };

  const handleSelectDemo = (demo: DemoNotice) => {
    setSelectedDemoId(demo.id);
    setNoticeText(demo.text);
    setAnalysisResult(null);
    setChangeCheckResult(null);
    setConfirmationSuccess(null);
    setError(null);
    setIsEditing(false);
  };

  // Step 1: Submit to /api/ingest (NLP analysis only, NO auto-save)
  const handleAnalyze = async () => {
    if (!noticeText.trim()) {
      setError("Please enter or paste an academic notice first.");
      return;
    }

    setError(null);
    setConfirmationSuccess(null);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setChangeCheckResult(null);
    setIsEditing(false);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: noticeText.trim(),
          channel: "MANUAL_PASTE",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze academic notice.");
      }

      setAnalysisResult(data.analysis);
      setEditableTasks(data.analysis.tasks || []);
      setEditableEvents(data.analysis.events || []);
      setEditableExams(data.analysis.exams || []);

      // Step 1B: Run Milestone 3 Academic Change Intelligence check
      setIsCheckingChanges(true);
      try {
        const checkRes = await fetch("/api/ingest/change-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis: data.analysis }),
        });
        const checkData = await checkRes.json();
        if (checkRes.ok && checkData.success) {
          setChangeCheckResult(checkData);
        }
      } catch (checkErr) {
        console.warn("[ChangeCheck] Non-fatal change check warning:", checkErr);
      } finally {
        setIsCheckingChanges(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during NLP analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Confirm and commit to database via /api/ingest/confirm
  const handleConfirm = async (chosenAction?: ProposedAction) => {
    if (!analysisResult) return;

    setIsConfirming(true);
    setError(null);

    const actionToApply: ProposedAction = chosenAction || changeCheckResult?.proposedAction || "CREATE_NEW";

    try {
      const payload = {
        rawText: analysisResult.rawText,
        title:
          analysisResult.tasks[0]?.title ||
          analysisResult.events[0]?.title ||
          `${analysisResult.category.replace(/_/g, " ")} Announcement`,
        category: analysisResult.category,
        channel: "MANUAL_PASTE",
        tasks: editableTasks,
        events: editableEvents,
        exams: editableExams,
        evidences: analysisResult.evidences,
        action: actionToApply,
        relationship: changeCheckResult?.relationship || "NEW",
        targetId: changeCheckResult?.matchedRecord?.id,
        targetType: changeCheckResult?.matchedRecord?.itemType,
        changedFields: changeCheckResult?.changedFields || [],
        matchingReasons: changeCheckResult?.matchingReasons || [],
      };

      const res = await fetch("/api/ingest/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save confirmed deliverables to database.");
      }

      setConfirmationSuccess(data.message || "Successfully synchronized to academic database!");
      fetchRecentNotices();
    } catch (err: any) {
      setError(err.message || "Error saving confirmed notice to database.");
    } finally {
      setIsConfirming(false);
    }
  };

  // Step 3: Discard candidate extraction
  const handleDiscard = () => {
    setAnalysisResult(null);
    setChangeCheckResult(null);
    setConfirmationSuccess(null);
    setError(null);
    setIsEditing(false);
  };

  return (
    <Shell>
      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
          <h1 className="page-title">Academic Inbox</h1>
          <span className="badge badge-ai">Milestones 2–7 Ingestion</span>
        </div>
        <p className="page-sub">
          Academic text &rarr; NLP analysis &rarr; Structured information &rarr; User confirmation &rarr; Database.
          Now with PDF / image / screenshot document upload (M7).
        </p>
      </div>

      {/* ── M7-E: DOCUMENT UPLOAD PANEL ─────────────────────────────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UploadCloud size={16} style={{ color: "var(--accent-academic)" }} />
            <span style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Academic Document Upload
            </span>
            <span className="badge badge-ai" style={{ fontSize: "0.6rem" }}>M7 — PDF / PNG / JPG</span>
          </div>
          {docFile && (
            <button type="button" onClick={handleDocClear} className="btn btn-outline btn-sm" style={{ fontSize: "0.72rem" }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Drop Zone */}
        {!docFile && (
          <div
            id="doc-drop-zone"
            onDragOver={(e) => { e.preventDefault(); setDocDragOver(true); }}
            onDragLeave={() => setDocDragOver(false)}
            onDrop={handleDocDrop}
            onClick={() => docFileInputRef.current?.click()}
            style={{
              border: `2px dashed ${docDragOver ? "var(--accent-academic)" : "var(--border-default)"}`,
              borderRadius: "var(--radius-md)",
              padding: "2rem",
              textAlign: "center",
              cursor: "pointer",
              background: docDragOver ? "var(--accent-ai-bg)" : "var(--bg-paper)",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <UploadCloud size={28} style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }} />
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Drop PDF / Screenshot / Image here
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              or <span style={{ color: "var(--accent-academic)", textDecoration: "underline" }}>Browse Files</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              PDF • PNG • JPG • JPEG • Max 10 MB
            </div>
            <input
              ref={docFileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              aria-label="Upload academic document"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleDocFileSelect(file);
              }}
            />
          </div>
        )}

        {/* Selected File Preview */}
        {docFile && !docResult && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.85rem 1rem",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "0.75rem",
            }}
          >
            <FileText size={20} style={{ color: docFile.type === "application/pdf" ? "var(--accent-academic)" : "var(--accent-ai)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {docFile.name}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {(docFile.size / 1024).toFixed(1)} KB • {docFile.type || "file"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDocUpload}
              disabled={docUploading}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
            >
              {docUploading ? (
                <><RefreshCw size={13} className="spin" /><span>Processing...</span></>
              ) : (
                <><Sparkles size={13} /><span>Extract &amp; Analyze</span></>
              )}
            </button>
          </div>
        )}

        {/* Document Error */}
        {docError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--status-critical-bg)",
              border: "1px solid var(--status-critical-border)",
              color: "var(--status-critical)",
              fontSize: "0.82rem",
              marginTop: "0.5rem",
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            <span>{docError}</span>
          </div>
        )}

        {/* Document Confirm Success */}
        {docConfirmSuccess && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--status-done-bg)",
              border: "1px solid var(--status-done-border)",
              color: "var(--status-done)",
              fontSize: "0.82rem",
              marginTop: "0.5rem",
            }}
          >
            <CheckCircle2 size={15} />
            <span><strong>Saved:</strong> {docConfirmSuccess}</span>
          </div>
        )}

        {/* Document Result: 5-step display */}
        {docResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.75rem" }}>
            {/* Step 1: Document */}
            <div style={{ padding: "0.85rem 1rem", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  1. Document
                </span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {docResult.document?.documentFileType && <span className="badge badge-neutral" style={{ fontSize: "0.62rem" }}>{docResult.document.documentFileType}</span>}
                  {docResult.document?.primaryExtractionMethod && <span className="badge badge-neutral" style={{ fontSize: "0.62rem" }}>{docResult.document.primaryExtractionMethod.replace(/_/g, " ")}</span>}
                  {docResult.document?.totalPages > 1 && <span className="badge badge-ai" style={{ fontSize: "0.62rem" }}>{docResult.document.totalPages} pages</span>}
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{docResult.document?.filename}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                {docResult.document?.sizeBytes ? `${(docResult.document.sizeBytes / 1024).toFixed(1)} KB` : ""}
                {docResult.meta?.extractionTimeMs ? ` • Extracted in ${docResult.meta.extractionTimeMs}ms` : ""}
              </div>
              {docResult.document?.extractionWarning && (
                <div style={{ marginTop: "0.4rem", padding: "0.4rem 0.6rem", background: "rgba(234,88,12,0.08)", borderLeft: "2px solid #ea580c", borderRadius: "var(--radius-xs)", fontSize: "0.76rem", color: "#ea580c" }}>
                  {docResult.document.extractionWarning}
                </div>
              )}
            </div>

            {/* Step 2: Extracted Text */}
            {docResult.document?.combinedText && (
              <div style={{ padding: "0.85rem 1rem", background: "var(--bg-paper)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  2. Extracted Text
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-wrap", maxHeight: "180px", overflowY: "auto" }}>
                  {docResult.document.combinedText}
                </div>
                {docResult.document?.pages?.length > 1 && (
                  <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {docResult.document.pages.map((p: any, i: number) => (
                      <span key={i} className="badge badge-neutral" style={{ fontSize: "0.62rem" }}>
                        P{p.pageNumber}: {p.text.length} chars
                        {p.ocrConfidence !== undefined ? ` • OCR ${Math.round(p.ocrConfidence * 100)}%` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: AI Understanding */}
            {docResult.nlpAnalysis && (
              <div style={{ padding: "0.85rem 1rem", background: "var(--accent-ai-bg)", borderLeft: "2px solid var(--accent-ai)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-ai)", marginBottom: "0.4rem" }}>
                  3. AI Understanding
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
                  <span className="badge badge-academic">{(docResult.nlpAnalysis as any).category?.replace(/_/g, " ")}</span>
                  {(docResult.nlpAnalysis as any).keyEntities?.courses?.map((c: string, i: number) => <span key={i} className="badge badge-academic">Course: {c}</span>)}
                  {(docResult.nlpAnalysis as any).keyEntities?.courseCodes?.map((cc: string, i: number) => <span key={i} className="badge badge-medium">Code: {cc}</span>)}
                  {(docResult.nlpAnalysis as any).keyEntities?.dates?.map((d: string, i: number) => <span key={i} className="badge badge-low">Date: {d}</span>)}
                  {(docResult.nlpAnalysis as any).keyEntities?.times?.map((t: string, i: number) => <span key={i} className="badge badge-medium">Time: {t}</span>)}
                  {(docResult.nlpAnalysis as any).keyEntities?.venues?.map((v: string, i: number) => <span key={i} className="badge badge-neutral">Venue: {v}</span>)}
                  {(docResult.nlpAnalysis as any).keyEntities?.platforms?.map((p: string, i: number) => <span key={i} className="badge badge-neutral">Platform: {p}</span>)}
                  {(docResult.nlpAnalysis as any).keyEntities?.marks?.map((m: string, i: number) => <span key={i} className="badge badge-high">Marks: {m}</span>)}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-primary)", lineHeight: 1.5, margin: 0 }}>
                  {(docResult.nlpAnalysis as any).summary}
                </p>
                {/* Events with rescheduling */}
                {(docResult.nlpAnalysis as any).events?.map((e: any, i: number) => (
                  <div key={i} style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--text-primary)" }}>
                    <strong>{e.title}</strong>
                    {e.isRescheduled && <span className="badge badge-high" style={{ fontSize: "0.6rem", marginLeft: "0.35rem" }}>RESCHEDULED</span>}
                    {e.previousDateTime && e.newDateTime && (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}> {e.previousDateTime} → {e.newDateTime}</span>
                    )}
                  </div>
                ))}
                {/* Tasks */}
                {(docResult.nlpAnalysis as any).tasks?.map((t: any, i: number) => (
                  <div key={i} style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--text-primary)" }}>
                    <strong>{t.title}</strong>
                    {t.normalizedDeadline && <span style={{ color: "var(--text-muted)" }}> — {t.normalizedDeadline}</span>}
                    {t.marks && <span className="badge badge-high" style={{ fontSize: "0.6rem", marginLeft: "0.35rem" }}>{t.marks} marks</span>}
                  </div>
                ))}
                {/* Academic Relationship */}
                <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <GitCompare size={12} style={{ color: "var(--text-muted)" }} />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Relationship:</span>
                  {docCheckingChanges ? (
                    <span className="badge badge-medium" style={{ fontSize: "0.62rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <RefreshCw size={10} className="spin" /> Checking...
                    </span>
                  ) : (
                    <span className={`badge ${ docChangeCheck?.relationship === "RESCHEDULED" ? "badge-high" : docChangeCheck?.relationship === "CANCELLED" ? "badge-critical" : docChangeCheck?.relationship === "DUPLICATE" ? "badge-medium" : "badge-ai" }`} style={{ fontSize: "0.65rem" }}>
                      {docChangeCheck?.relationship || "NEW"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Source Evidence — M7-E */}
            {(docResult.nlpAnalysis as any)?.evidences?.length > 0 && (
              <div style={{ padding: "0.85rem 1rem", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", cursor: "pointer" }}
                  onClick={() => setShowDocEvidence((v) => !v)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Link2 size={12} style={{ color: "var(--accent-academic)" }} />
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                      4. Source Evidence &amp; Grounding
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.6rem" }}>
                      {(docResult.nlpAnalysis as any).evidences.length} item(s)
                    </span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{showDocEvidence ? "▲" : "▼"}</span>
                </div>
                {showDocEvidence && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {(docResult.nlpAnalysis as any).evidences.slice(0, 8).map((ev: any, i: number) => (
                      <div key={i} style={{ padding: "0.5rem 0.75rem", background: "var(--bg-paper)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xs)", fontSize: "0.76rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
                          <span style={{ fontWeight: 700, color: "var(--accent-academic)", textTransform: "uppercase", fontSize: "0.64rem" }}>{ev.field}</span>
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            {ev.sourceFilename && <span className="badge badge-neutral" style={{ fontSize: "0.58rem" }}>{ev.sourceFilename}</span>}
                            {ev.pageNumber && <span className="badge badge-neutral" style={{ fontSize: "0.58rem" }}>p.{ev.pageNumber}</span>}
                            {ev.ocrConfidence !== undefined && (
                              <span className={`badge ${ev.ocrConfidence >= 0.7 ? "badge-low" : "badge-medium"}`} style={{ fontSize: "0.58rem" }}>
                                OCR {Math.round(ev.ocrConfidence * 100)}%
                              </span>
                            )}
                            {ev.boundingBox && (
                              <span className="badge badge-neutral" style={{ fontSize: "0.58rem" }} title={`bbox: (${ev.boundingBox.bbox.x0},${ev.boundingBox.bbox.y0})–(${ev.boundingBox.bbox.x1},${ev.boundingBox.bbox.y1})`}>
                                bbox
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                          &ldquo;{ev.rawSnippet}&rdquo;
                        </div>
                        {ev.extractionMethod && (
                          <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                            via {ev.extractionMethod.replace(/_/g, " ")}
                          </div>
                        )}
                      </div>
                    ))}
                    {(docResult.nlpAnalysis as any).evidences.length > 8 && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
                        +{(docResult.nlpAnalysis as any).evidences.length - 8} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Action */}
            {docResult.nlpAnalysis && !docConfirmSuccess && (
              <div style={{ padding: "0.85rem 1rem", background: "var(--bg-paper)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>5. Action</span>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>
                  Records will NOT be created or modified until you explicitly confirm.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <button type="button" disabled={docConfirming} onClick={() => handleDocConfirm("CREATE_NEW")} className={`btn btn-sm ${!docChangeCheck?.matchedRecord ? "btn-primary" : "btn-outline"}`}>
                    <Check size={13} /> <span>Create New</span>
                  </button>
                  {docChangeCheck?.matchedRecord && (
                    <>
                      <button type="button" disabled={docConfirming} onClick={() => handleDocConfirm(docChangeCheck?.relationship === "RESCHEDULED" ? "RESCHEDULE_EXISTING" : "UPDATE_EXISTING")} className={`btn btn-sm ${["UPDATE_EXISTING","RESCHEDULE_EXISTING"].includes(docChangeCheck?.proposedAction||"") ? "btn-primary" : "btn-outline"}`}>
                        <Edit3 size={13} /> <span>{docChangeCheck?.relationship === "RESCHEDULED" ? "Reschedule Existing" : "Update Existing"}</span>
                      </button>
                      <button type="button" disabled={docConfirming} onClick={() => handleDocConfirm("CANCEL_EXISTING")} className="btn btn-outline btn-sm">
                        <X size={13} /> <span>Apply Cancellation</span>
                      </button>
                      <button type="button" disabled={docConfirming} onClick={() => handleDocConfirm("MARK_DUPLICATE")} className="btn btn-outline btn-sm">
                        <Copy size={13} /> <span>Mark Duplicate</span>
                      </button>
                    </>
                  )}
                  <button type="button" disabled={docConfirming} onClick={handleDocClear} className="btn btn-outline btn-sm">
                    <Trash2 size={13} /> <span>Discard</span>
                  </button>
                </div>
                {docConfirming && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    <RefreshCw size={12} className="spin" /> Saving to database...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── INGESTION INPUT WORKSPACE (text-paste — unchanged) ───────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Benchmark / Demo selector strip */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
              Load Test Circulars (16 Categories):
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {DEMO_NOTICES.length} curated evaluation notices
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", maxHeight: "110px", overflowY: "auto", paddingBottom: "0.25rem" }}>
            {DEMO_NOTICES.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => handleSelectDemo(demo)}
                className={`btn btn-sm ${selectedDemoId === demo.id ? "btn-primary" : "btn-outline"}`}
                style={{ fontSize: "0.72rem", padding: "0.3rem 0.65rem" }}
                title={demo.description}
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Area */}
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <textarea
            value={noticeText}
            onChange={(e) => {
              setNoticeText(e.target.value);
              setConfirmationSuccess(null);
            }}
            placeholder="Paste university announcement, email, WhatsApp notice, or course circular text here..."
            aria-label="Academic notice text"
            style={{
              width: "100%",
              minHeight: "160px",
              background: "var(--bg-paper)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "1rem",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.84rem",
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>

        {/* Action Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => {
              setNoticeText("");
              setAnalysisResult(null);
              setConfirmationSuccess(null);
              setError(null);
              setSelectedDemoId("");
            }}
            className="btn btn-outline btn-sm"
          >
            Clear Text
          </button>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleAnalyze}
              className="btn btn-primary"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Analyzing with NLP...</span>
                </>
              ) : isCheckingChanges ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Evaluating Changes...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Analyze Academic Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--status-critical-bg)",
              border: "1px solid var(--status-critical-border)",
              color: "var(--status-critical)",
              fontSize: "0.82rem",
              marginTop: "1rem",
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {confirmationSuccess && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              padding: "0.85rem 1.15rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--status-done-bg)",
              border: "1px solid var(--status-done-border)",
              color: "var(--status-done)",
              fontSize: "0.85rem",
              marginTop: "1rem",
            }}
          >
            <CheckCircle2 size={18} />
            <div>
              <strong>Saved to Database:</strong> {confirmationSuccess}
            </div>
          </div>
        )}
      </div>

      {/* ── STAGE 2 & 3: SOURCE & AI UNDERSTANDING & CONFIRMATION ──── */}
      {analysisResult && (
        <div style={{ marginBottom: "2rem" }}>
          <div className="inbox-studio">
            {/* LEFT PANEL: Original Source & Classification */}
            <div className="inbox-source-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <div className="inbox-panel-label">1. Original Announcement Source</div>
                <div
                  style={{
                    padding: "1rem",
                    background: "var(--bg-paper)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.82rem",
                    lineHeight: 1.6,
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    border: "1px solid var(--border-subtle)",
                    maxHeight: "260px",
                    overflowY: "auto",
                  }}
                >
                  {analysisResult.rawText}
                </div>
              </div>

              {/* Classification Salience Card */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                    Classification Result
                  </span>
                  <span className="badge badge-academic" style={{ fontWeight: 700 }}>
                    {analysisResult.category.replace(/_/g, " ")}
                  </span>
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 600, marginBottom: "0.3rem" }}>
                  Classification Score:{" "}
                  <span style={{ color: "var(--accent-academic)", fontWeight: 700 }}>
                    {analysisResult.classificationScore !== undefined ? analysisResult.classificationScore : Number((analysisResult.classificationConfidence * 4).toFixed(1))}
                  </span>{" "}
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}>(Rule-Based Salience)</span>
                </div>

                {analysisResult.indicators.length > 0 && (
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    <strong>Triggering rules:</strong> {analysisResult.indicators.join(" • ")}
                  </div>
                )}
              </div>

              {/* AI Structured Interpretation Summary */}
              <div
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-ai-bg)",
                  borderLeft: "2px solid var(--accent-ai)",
                  fontSize: "0.8rem",
                }}
              >
                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--accent-ai)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "0.25rem" }}>
                  NLP Semantic Summary
                </span>
                <p style={{ color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {analysisResult.summary}
                </p>
              </div>
            </div>

            {/* RIGHT PANEL: AI Structured Entities & Deliverables */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <Sparkles size={15} style={{ color: "var(--accent-ai)" }} />
                    <span style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent-ai)" }}>
                      2. AI Extraction &amp; Evidence Grounding
                    </span>
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {analysisResult.processingTimeMs}ms execution
                  </span>
                </div>

                {/* Extracted Entity Badges */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <div className="section-label">Normalized Entities &amp; Provenance</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {analysisResult.keyEntities.courses.map((c, i) => (
                      <span key={`course-${i}`} className="badge badge-academic">Course: {c}</span>
                    ))}

                    {/* Course Code with explicit origin distinction */}
                    {analysisResult.keyEntities.courseResolutions && analysisResult.keyEntities.courseResolutions.length > 0 ? (
                      analysisResult.keyEntities.courseResolutions.map((res, i) => (
                        <span
                          key={`res-${i}`}
                          className={`badge ${res.codeOrigin === "EXTRACTED_FROM_SOURCE" ? "badge-academic" : "badge-medium"}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                          title={res.resolutionNote || ""}
                        >
                          <strong>{res.code}</strong>
                          <span style={{ fontSize: "0.62rem", opacity: 0.9, textTransform: "uppercase", fontWeight: 600 }}>
                            {res.codeOrigin === "EXTRACTED_FROM_SOURCE" ? "• Extracted from source" : "• Resolved from academic database"}
                          </span>
                        </span>
                      ))
                    ) : (
                      analysisResult.keyEntities.courseCodes.map((cc, i) => (
                        <span key={`code-${i}`} className="badge badge-academic">
                          Code: {cc} <span style={{ fontSize: "0.6rem", opacity: 0.8 }}>• Extracted from source</span>
                        </span>
                      ))
                    )}

                    {analysisResult.keyEntities.dates.map((d, i) => (
                      <span key={`date-${i}`} className="badge badge-low">Date: {d}</span>
                    ))}
                    {analysisResult.keyEntities.times.map((t, i) => (
                      <span key={`time-${i}`} className="badge badge-medium">Time: {t}</span>
                    ))}
                    {analysisResult.keyEntities.venues.map((v, i) => (
                      <span key={`venue-${i}`} className="badge badge-neutral">Venue: {v}</span>
                    ))}
                    {analysisResult.keyEntities.platforms.map((p, i) => (
                      <span key={`platform-${i}`} className="badge badge-neutral">Platform: {p}</span>
                    ))}
                    {analysisResult.keyEntities.marks.map((m, i) => (
                      <span key={`marks-${i}`} className="badge badge-high">Marks: {m}</span>
                    ))}
                  </div>
                </div>

                {/* Conditional Rules Highlight */}
                {analysisResult.conditions.length > 0 && (
                  <div
                    style={{
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-xs)",
                      background: "rgba(234, 88, 12, 0.08)",
                      borderLeft: "2px solid #ea580c",
                      fontSize: "0.78rem",
                      color: "var(--text-primary)",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <strong style={{ color: "#ea580c" }}>Conditional Constraint:</strong>{" "}
                    {analysisResult.conditions.join("; ")}
                  </div>
                )}

                {/* Candidate Tasks */}
                {editableTasks.length > 0 && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div className="section-label">Actionable Tasks &amp; Deadlines</div>
                    {editableTasks.map((task, idx) => (
                      <div
                        key={`task-${idx}`}
                        style={{
                          padding: "0.85rem",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-subtle)",
                          marginBottom: "0.65rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                          <div>
                            {isEditing ? (
                              <input
                                type="text"
                                value={task.title}
                                onChange={(e) => {
                                  const updated = [...editableTasks];
                                  updated[idx].title = e.target.value;
                                  setEditableTasks(updated);
                                }}
                                style={{
                                  fontSize: "0.88rem",
                                  fontWeight: 700,
                                  padding: "0.2rem 0.4rem",
                                  borderRadius: "var(--radius-xs)",
                                  border: "1px solid var(--border-default)",
                                  width: "100%",
                                  background: "var(--bg-paper)",
                                }}
                              />
                            ) : (
                              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                                {task.title}
                              </h4>
                            )}
                            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.2rem", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
                              <span>{task.courseCode || task.course || "General"} &bull; {task.category}</span>
                              {task.courseCode && (
                                <span
                                  className={task.courseCodeOrigin === "RESOLVED_FROM_REGISTRY" ? "badge badge-medium" : "badge badge-neutral"}
                                  style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem" }}
                                  title={task.courseCodeOrigin === "RESOLVED_FROM_REGISTRY" ? "Course code inferred from academic registry catalog" : "Course code extracted verbatim from source text"}
                                >
                                  {task.courseCodeOrigin === "RESOLVED_FROM_REGISTRY" ? "Resolved from registry" : "Extracted from source"}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`badge ${task.priority === "HIGH" || task.priority === "CRITICAL" ? "badge-high" : "badge-medium"}`}>
                            {task.priority}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", fontSize: "0.76rem" }}>
                          <div>
                            <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.62rem", textTransform: "uppercase" }}>
                              Normalized Deadline (Asia/Kolkata)
                            </span>
                            <strong>{task.normalizedDeadline || "Not specified"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.62rem", textTransform: "uppercase" }}>
                              Platform
                            </span>
                            <strong>{task.submissionPlatform || "Standard Submission"}</strong>
                          </div>
                        </div>

                        {/* Explicit Rescheduled Transition */}
                        {task.isRescheduled && task.previousDateTime && (
                          <div style={{ marginTop: "0.4rem", padding: "0.35rem 0.5rem", borderRadius: "var(--radius-xs)", background: "rgba(234, 88, 12, 0.08)", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                            <span className="badge badge-high" style={{ fontSize: "0.6rem" }}>Rescheduled</span>
                            <span style={{ textDecoration: "line-through", opacity: 0.75 }}>{task.previousDateTime}</span>
                            <span>&rarr;</span>
                            <strong style={{ color: "#047857" }}>{task.newDateTime || task.normalizedDeadline}</strong>
                          </div>
                        )}

                        {/* Evidence snippets for this task */}
                        {task.evidences && task.evidences.length > 0 && (
                          <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border-subtle)" }}>
                            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                              Source Grounding Evidence:
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.2rem" }}>
                              {task.evidences.map((ev, evIdx) => (
                                <span
                                  key={evIdx}
                                  style={{
                                    fontSize: "0.7rem",
                                    fontFamily: "var(--font-mono)",
                                    background: "var(--bg-paper)",
                                    padding: "0.15rem 0.4rem",
                                    borderRadius: "var(--radius-xs)",
                                    border: "1px solid var(--border-subtle)",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  &ldquo;{ev.rawSnippet}&rdquo; &rarr; <em>{ev.field}</em>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Candidate Events */}
                {editableEvents.length > 0 && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div className="section-label">Academic Events &amp; Sessions</div>
                    {editableEvents.map((evt, idx) => (
                      <div
                        key={`event-${idx}`}
                        style={{
                          padding: "0.85rem",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-subtle)",
                          marginBottom: "0.65rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.3rem" }}>
                          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                            {evt.title}
                          </h4>
                          <span className="badge badge-academic">{evt.eventType}</span>
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                          <strong>When:</strong> {evt.formattedTime || "Scheduled timing"} &bull;{" "}
                          <strong>Where:</strong> {evt.venue || evt.platform || "Department"}
                          {evt.courseCode && (
                            <span
                              className={evt.courseCodeOrigin === "RESOLVED_FROM_REGISTRY" ? "badge badge-medium" : "badge badge-neutral"}
                              style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem", marginLeft: "0.4rem" }}
                              title={evt.courseCodeOrigin === "RESOLVED_FROM_REGISTRY" ? "Course code inferred from academic registry catalog" : "Course code extracted verbatim from source text"}
                            >
                              {evt.courseCodeOrigin === "RESOLVED_FROM_REGISTRY" ? "Resolved from registry" : "Extracted from source"}
                            </span>
                          )}
                          {evt.isRescheduled && (
                            <span style={{ color: "#ea580c", fontWeight: 700, marginLeft: "0.5rem" }}>
                              (RESCHEDULED)
                            </span>
                          )}
                        </div>
                        {evt.isRescheduled && evt.previousDateTime && (
                          <div style={{ marginTop: "0.4rem", padding: "0.35rem 0.5rem", borderRadius: "var(--radius-xs)", background: "rgba(234, 88, 12, 0.08)", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                            <span className="badge badge-high" style={{ fontSize: "0.6rem" }}>Rescheduled</span>
                            <span style={{ textDecoration: "line-through", opacity: 0.75 }}>{evt.previousDateTime}</span>
                            <span>&rarr;</span>
                            <strong style={{ color: "#047857" }}>{evt.newDateTime || evt.formattedTime}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Candidate Exams */}
                {editableExams.length > 0 && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div className="section-label">Examination Records</div>
                    {editableExams.map((ex, idx) => (
                      <div
                        key={`exam-${idx}`}
                        style={{
                          padding: "0.85rem",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-subtle)",
                          marginBottom: "0.65rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                            {ex.title}
                          </h4>
                          <span className="badge badge-high">EXAM</span>
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                          <strong>Date &amp; Time:</strong> {ex.startTime || "Scheduled window"} &bull;{" "}
                          <strong>Venue:</strong> {ex.venue || "Exam Hall"} &bull;{" "}
                          <strong>Weightage:</strong> {ex.weightage ? `${ex.weightage} marks` : "Standard"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── ACADEMIC RELATIONSHIP INTELLIGENCE (Milestone 3) ── */}
                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-paper)",
                    border: "1px solid var(--border-default)",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <GitCompare size={16} style={{ color: "var(--accent-academic)" }} />
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                        Academic Relationship
                      </span>
                    </div>

                    {isCheckingChanges ? (
                      <span className="badge badge-medium" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <RefreshCw size={11} className="spin" /> Checking Database...
                      </span>
                    ) : (
                      <span
                        className={`badge ${
                          changeCheckResult?.relationship === "DUPLICATE"
                            ? "badge-medium"
                            : changeCheckResult?.relationship === "RESCHEDULED"
                            ? "badge-high"
                            : changeCheckResult?.relationship === "UPDATED"
                            ? "badge-academic"
                            : changeCheckResult?.relationship === "CANCELLED"
                            ? "badge-critical"
                            : "badge-ai"
                        }`}
                        style={{ fontWeight: 700, fontSize: "0.75rem", padding: "0.25rem 0.65rem" }}
                      >
                        {changeCheckResult?.relationship || "NEW"}
                      </span>
                    )}
                  </div>

                  {/* Summary string */}
                  {changeCheckResult?.summary && (
                    <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 500, marginBottom: "0.75rem" }}>
                      {changeCheckResult.summary}
                    </p>
                  )}

                  {/* Explainable Matching Box */}
                  {changeCheckResult?.matchedRecord ? (
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.85rem 1rem",
                        marginBottom: "0.85rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
                        <span style={{ fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                          MATCH FOUND IN ACADEMIC RECORDS
                        </span>
                        <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                          Confidence: {Math.round((changeCheckResult.similarityScore || 0) * 100)}%
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                        Existing: {changeCheckResult.matchedRecord.title}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                        {changeCheckResult.matchedRecord.courseCode ? `Course: ${changeCheckResult.matchedRecord.courseCode}` : ""}
                        {changeCheckResult.matchedRecord.deadline
                          ? ` • Deadline: ${new Date(changeCheckResult.matchedRecord.deadline).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                          : ""}
                        {changeCheckResult.matchedRecord.startTime
                          ? ` • Time: ${new Date(changeCheckResult.matchedRecord.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                          : ""}
                        {changeCheckResult.matchedRecord.venue ? ` • Venue: ${changeCheckResult.matchedRecord.venue}` : ""}
                        {changeCheckResult.matchedRecord.platform ? ` • Platform: ${changeCheckResult.matchedRecord.platform}` : ""}
                        {changeCheckResult.matchedRecord.marks ? ` • ${changeCheckResult.matchedRecord.marks} marks` : ""}
                      </div>

                      {/* Explainable matching reasons */}
                      {changeCheckResult.matchingReasons.length > 0 && (
                        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.45rem" }}>
                          <span style={{ fontSize: "0.64rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.25rem", textTransform: "uppercase" }}>
                            Reasons:
                          </span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            {changeCheckResult.matchingReasons.map((r, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                                <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
                                <span>{r.replace(/^✓\s*/, "")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.75rem 1rem",
                        marginBottom: "0.85rem",
                        fontSize: "0.78rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Check size={14} style={{ color: "var(--accent-ai)" }} />
                        <span>No existing task or event matches this notice. This is a <strong>NEW</strong> academic item.</span>
                      </div>
                    </div>
                  )}

                  {/* Changed Fields (Previous → New) */}
                  {changeCheckResult?.changedFields && changeCheckResult.changedFields.length > 0 && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>
                        Changes Detected:
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {changeCheckResult.changedFields.map((f, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "0.6rem 0.8rem",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border-subtle)",
                              fontSize: "0.78rem",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                              <strong style={{ textTransform: "uppercase", fontSize: "0.68rem", color: "var(--accent-academic)" }}>
                                {f.field}
                              </strong>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{f.reason}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
                              <span style={{ textDecoration: "line-through", color: "var(--text-muted)" }}>
                                {f.oldValue || "Unspecified"}
                              </span>
                              <span style={{ color: "var(--text-secondary)" }}>&rarr;</span>
                              <strong style={{ color: "#047857" }}>{f.newValue || "Updated"}</strong>
                            </div>
                            {f.evidenceSnippet && (
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: "0.25rem" }}>
                                Evidence: &ldquo;{f.evidenceSnippet}&rdquo;
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* STAGE 3: Confirmation Decision Controls */}
                <div
                  style={{
                    padding: "1.1rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-paper)",
                    border: "1px solid var(--border-default)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                    marginTop: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", display: "block" }}>
                        3. Confirmation Decision
                      </span>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.1rem", margin: 0 }}>
                        Select the action to apply. Records will NOT be altered or created without explicit confirmation.
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={handleDiscard}
                        className="btn btn-outline btn-sm"
                        title="Discard candidate extraction without database commit"
                      >
                        <Trash2 size={13} />
                        <span>Discard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className="btn btn-secondary btn-sm"
                        title="Edit deliverable fields before confirmation"
                      >
                        <Edit3 size={13} />
                        <span>{isEditing ? "Finish Editing" : "Edit Details"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginRight: "0.25rem" }}>
                      Actions:
                    </span>

                    <button
                      type="button"
                      disabled={isConfirming}
                      onClick={() => handleConfirm("CREATE_NEW")}
                      className={`btn btn-sm ${changeCheckResult?.proposedAction === "CREATE_NEW" || !changeCheckResult?.matchedRecord ? "btn-primary" : "btn-outline"}`}
                      title="Create this deliverable as a brand new item"
                    >
                      <Check size={13} />
                      <span>Create New</span>
                    </button>

                    {changeCheckResult?.matchedRecord && (
                      <>
                        <button
                          type="button"
                          disabled={isConfirming}
                          onClick={() => handleConfirm(changeCheckResult?.relationship === "RESCHEDULED" ? "RESCHEDULE_EXISTING" : "UPDATE_EXISTING")}
                          className={`btn btn-sm ${["UPDATE_EXISTING", "RESCHEDULE_EXISTING"].includes(changeCheckResult?.proposedAction || "") ? "btn-primary" : "btn-outline"}`}
                          title="Apply changes to the matched existing academic record"
                        >
                          <Edit3 size={13} />
                          <span>{changeCheckResult?.relationship === "RESCHEDULED" ? "Reschedule Existing" : "Update Existing"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isConfirming}
                          onClick={() => handleConfirm("MARK_DUPLICATE")}
                          className={`btn btn-sm ${changeCheckResult?.proposedAction === "MARK_DUPLICATE" ? "btn-primary" : "btn-outline"}`}
                          title="Mark notice as duplicate without creating a redundant task"
                        >
                          <Copy size={13} />
                          <span>Mark Duplicate</span>
                        </button>

                        <button
                          type="button"
                          disabled={isConfirming}
                          onClick={() => handleConfirm("CANCEL_EXISTING")}
                          className={`btn btn-sm ${changeCheckResult?.proposedAction === "CANCEL_EXISTING" ? "btn-danger" : "btn-outline"}`}
                          style={changeCheckResult?.proposedAction === "CANCEL_EXISTING" ? { background: "var(--status-critical)", color: "#fff" } : {}}
                          title="Mark the matched existing item as cancelled"
                        >
                          <X size={13} />
                          <span>Apply Cancellation</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={isConfirming}
                      onClick={() => handleConfirm("IGNORE")}
                      className="btn btn-outline btn-sm"
                      title="Ignore this notice without altering any records"
                    >
                      <span>Ignore</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INGESTION HISTORY ─────────────────────────────────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginTop: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers size={14} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
              Ingested Academic Knowledge Base
            </span>
          </div>
          <button type="button" onClick={fetchRecentNotices} className="btn btn-outline btn-sm">
            Refresh
          </button>
        </div>

        {recentNotices.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-state-icon">
              <FileText size={22} style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="empty-state-title">No confirmed notices in database</div>
            <div className="empty-state-sub">
              Paste or load test circulars above to extract and confirm deliverables into your database.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {recentNotices.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  fontSize: "0.82rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.title || "Academic Announcement"}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    {item.rawText.slice(0, 100)}...
                  </div>
                  {item.evidences && item.evidences.length > 0 && (
                    <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.3rem" }}>
                      <span className="badge badge-neutral" style={{ fontSize: "0.62rem" }}>
                        {item.evidences.length} evidence quotes
                      </span>
                      {item.evidences[0]?.task && (
                        <span className="badge badge-academic" style={{ fontSize: "0.62rem" }}>
                          Task: {item.evidences[0].task.title}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  <span className="badge badge-neutral">{item.channel}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
