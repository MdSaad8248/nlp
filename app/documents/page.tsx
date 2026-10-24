"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/Shell";
import {
  FileText,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Eye,
  FileCheck,
  FileWarning,
} from "lucide-react";

export default function DocumentsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Document processing failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred during document processing.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSendToNLPInbox = () => {
    if (!result?.text) return;
    try {
      sessionStorage.setItem("nlp_inbox_prefill", result.text);
    } catch {}
    router.push("/inbox");
  };

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
              background: "rgba(99, 102, 241, 0.1)",
              color: "var(--accent-ai)",
            }}
          >
            Multimodal Intelligence
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            PDF Text &bull; Tesseract OCR &bull; Magic Byte Validation
          </span>
        </div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
          Academic Document Intelligence & OCR
        </h1>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "0.3rem 0 0 0" }}>
          Ingest institutional circulars, scanned assignment guidelines, and exam schedules with verifiable source grounding.
        </p>
      </div>

      {/* Main Container */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Upload Zone */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "12px",
            padding: "1.75rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1rem 0", color: "var(--text-primary)" }}>
            Upload Institutional Document
          </h2>

          <div
            style={{
              border: "2px dashed var(--border-default)",
              borderRadius: "10px",
              padding: "2rem 1.5rem",
              textAlign: "center",
              background: "var(--bg-canvas)",
              marginBottom: "1.25rem",
              cursor: "pointer",
            }}
          >
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="doc-file-upload"
            />
            <label htmlFor="doc-file-upload" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(37, 99, 235, 0.1)",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <Upload size={22} />
              </div>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {file ? file.name : "Click to select or drag document here"}
              </span>
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Supported: Digital PDF, Scanned Image (PNG, JPG) &bull; Max 10MB
              </span>
            </label>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "rgba(220, 38, 38, 0.08)",
                border: "1px solid rgba(220, 38, 38, 0.25)",
                color: "#dc2626",
                fontSize: "0.8rem",
                marginBottom: "1rem",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            disabled={!file || processing}
            onClick={handleUploadAndProcess}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              background: file && !processing ? "#2563eb" : "var(--border-default)",
              color: file && !processing ? "#ffffff" : "var(--text-muted)",
              border: "none",
              fontWeight: 700,
              fontSize: "0.86rem",
              cursor: file && !processing ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            {processing ? "Extracting Text & Provenance..." : "Process Document"}
            <ArrowRight size={15} />
          </button>

          {/* Validation Guarantees */}
          <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Security & Extraction Protections
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CheckCircle2 size={13} color="#10b981" />
                <span>Magic bytes verified (%PDF, \x89PNG, \xFFD8FF)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CheckCircle2 size={13} color="#10b981" />
                <span>Executable scripts & tags rejected automatically</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CheckCircle2 size={13} color="#10b981" />
                <span>Page-level provenance and verbatim snippets preserved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Extraction Result & Evidence Inspector */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "12px",
            padding: "1.75rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Extracted Content & Provenance
            </h2>
            {result && (
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#059669",
                }}
              >
                {result.extractionMethod || "EXTRACTED"}
              </span>
            )}
          </div>

          {result ? (
            <div>
              {/* Document stats */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                  padding: "0.6rem 0.85rem",
                  background: "var(--bg-canvas)",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>File: </span>
                  {result.filename || "Uploaded File"}
                </div>
                <div>&bull;</div>
                <div>
                  <span style={{ fontWeight: 600 }}>Pages: </span>
                  {result.pageCount || 1}
                </div>
                <div>&bull;</div>
                <div>
                  <span style={{ fontWeight: 600 }}>Length: </span>
                  {result.text?.length || 0} chars
                </div>
              </div>

              {/* Extracted text viewport */}
              <div
                style={{
                  background: "var(--bg-canvas)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "8px",
                  padding: "1rem",
                  maxHeight: "340px",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  marginBottom: "1.25rem",
                }}
              >
                {result.text}
              </div>

              {/* Action: Send to NLP Ingestion */}
              <button
                type="button"
                onClick={handleSendToNLPInbox}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 2px 10px rgba(37, 99, 235, 0.3)",
                }}
              >
                <Sparkles size={16} />
                <span>Parse in NLP Ingestion Pipeline</span>
              </button>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1.5rem",
                color: "var(--text-muted)",
              }}
            >
              <FileText size={36} style={{ margin: "0 auto 0.75rem auto", opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: "0.86rem" }}>
                Upload a document on the left to extract text layers, view page boundaries, and verify source evidence.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </Shell>
  );
}
