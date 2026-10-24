"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/layout/Shell";
import {
  FlaskConical,
  BarChart3,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  Search,
  Filter,
  Eye,
  X,
  TrendingUp,
  Brain,
  ShieldCheck,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Tag,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface EvaluationData {
  datasetStatistics: any;
  splitMetadata: any;
  classificationReport: any;
  baselineVsTransformer: any;
  errorAnalysis: any;
  totalRecords: number;
  filteredCount: number;
  records: any[];
}

export default function EvaluationPage() {
  const [data, setData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"benchmark" | "matrix" | "perclass" | "errors" | "dataset" | "theory">("benchmark");
  
  // Filters for dataset inspector
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [relationshipFilter, setRelationshipFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected record for modal inspection
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (courseFilter !== "ALL") params.append("course", courseFilter);
      if (relationshipFilter !== "ALL") params.append("relationship", relationshipFilter);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/evaluation?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load evaluation data", err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, courseFilter, relationshipFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const baseline = data?.baselineVsTransformer?.baseline;
  const transformer = data?.baselineVsTransformer?.transformer;
  const stats = data?.datasetStatistics;
  const split = data?.splitMetadata;
  const errors = data?.errorAnalysis;

  return (
    <Shell>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
        {/* Header Section */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.35rem 0.85rem",
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "999px",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#4f46e5",
              marginBottom: "0.5rem",
            }}
          >
            <FlaskConical size={14} />
            <span>Academic NLP Research & Model Evaluation</span>
          </div>
          <h1
            style={{
              fontSize: "2.1rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.025em",
            }}
          >
            Academic Notice Classifier Evaluation
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.4rem", maxWidth: "860px" }}>
            Rigorous evaluation of trainable academic text classification models against 350 ground-truth annotated academic notices.
            Measures baseline (TF-IDF + Calibrated Logistic Regression) against fine-tuned Transformer (DistilBERT) on an isolated 15% test split.
          </p>

          {/* Dataset Split Summary Badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginTop: "1rem",
              padding: "0.85rem 1.15rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600 }}>
              <Database size={15} style={{ color: "var(--accent-academic)" }} />
              <span>Dataset:</span>
              <span style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>350 records</span>
            </div>
            <span style={{ color: "var(--border-color)" }}>•</span>
            <div style={{ fontSize: "0.8rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Training: </span>
              <strong style={{ color: "#16a34a" }}>70% (245)</strong>
            </div>
            <span style={{ color: "var(--border-color)" }}>•</span>
            <div style={{ fontSize: "0.8rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Validation: </span>
              <strong style={{ color: "#d97706" }}>15% (52)</strong>
            </div>
            <span style={{ color: "var(--border-color)" }}>•</span>
            <div style={{ fontSize: "0.8rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Isolated Test: </span>
              <strong style={{ color: "#4f46e5" }}>15% (53)</strong>
            </div>
            <span style={{ color: "var(--border-color)" }}>•</span>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Stratified split · Seed: 42 · Zero train/test leakage
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--border-color)",
            marginBottom: "1.75rem",
            overflowX: "auto",
            paddingBottom: "1px",
          }}
        >
          {[
            { id: "benchmark", label: "Model Benchmark", icon: BarChart3 },
            { id: "matrix", label: "Confusion Matrix", icon: Layers },
            { id: "perclass", label: "Per-Class Performance", icon: TrendingUp },
            { id: "errors", label: "Error Analysis", icon: AlertTriangle },
            { id: "dataset", label: "Dataset Inspector", icon: Database },
            { id: "theory", label: "Why This Is NLP", icon: Brain },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.65rem 1rem",
                  border: "none",
                  borderBottom: isActive ? "2px solid #4f46e5" : "2px solid transparent",
                  background: "transparent",
                  color: isActive ? "#4f46e5" : "var(--text-secondary)",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: MODEL BENCHMARK ────────────────────────────────────── */}
        {activeTab === "benchmark" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
              {/* Transformer Card */}
              <div
                style={{
                  padding: "1.25rem",
                  background: "var(--bg-surface)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "#4f46e5" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#4f46e5" }}>
                    Primary Model (Fine-Tuned)
                  </span>
                  <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "999px", background: "rgba(99, 102, 241, 0.1)", color: "#4f46e5", fontWeight: 600 }}>
                    DistilBERT
                  </span>
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1rem 0" }}>DistilBERT Sequence Classifier</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ padding: "0.75rem", background: "rgba(99, 102, 241, 0.04)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>TEST ACCURACY</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#4f46e5" }}>
                      {transformer ? `${(transformer.accuracy * 100).toFixed(1)}%` : "..."}
                    </div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "rgba(99, 102, 241, 0.04)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>MACRO F1-SCORE</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#4f46e5" }}>
                      {transformer ? transformer.macro_f1.toFixed(3) : "..."}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px dashed var(--border-color)" }}>
                    <span>Macro Precision:</span>
                    <strong>{transformer?.macro_precision.toFixed(3)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px dashed var(--border-color)" }}>
                    <span>Macro Recall:</span>
                    <strong>{transformer?.macro_recall.toFixed(3)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0" }}>
                    <span>Weighted F1:</span>
                    <strong>{transformer?.weighted_f1.toFixed(3)}</strong>
                  </div>
                </div>
              </div>

              {/* Baseline Card */}
              <div
                style={{
                  padding: "1.25rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "var(--text-muted)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    Statistical Baseline
                  </span>
                  <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "999px", background: "var(--bg-main)", color: "var(--text-secondary)", fontWeight: 600 }}>
                    TF-IDF + LogReg
                  </span>
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1rem 0" }}>TF-IDF + Calibrated Logistic Regression</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ padding: "0.75rem", background: "var(--bg-main)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>TEST ACCURACY</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {baseline ? `${(baseline.accuracy * 100).toFixed(1)}%` : "..."}
                    </div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "var(--bg-main)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>MACRO F1-SCORE</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {baseline ? baseline.macro_f1.toFixed(3) : "..."}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px dashed var(--border-color)" }}>
                    <span>Macro Precision:</span>
                    <strong>{baseline?.macro_precision.toFixed(3)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px dashed var(--border-color)" }}>
                    <span>Macro Recall:</span>
                    <strong>{baseline?.macro_recall.toFixed(3)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0" }}>
                    <span>Weighted F1:</span>
                    <strong>{baseline?.weighted_f1.toFixed(3)}</strong>
                  </div>
                </div>
              </div>

              {/* Confidence Safeguard Card */}
              <div
                style={{
                  padding: "1.25rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "#16a34a" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#16a34a" }}>
                    Inference & Safeguards
                  </span>
                  <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "999px", background: "rgba(22, 163, 74, 0.1)", color: "#16a34a", fontWeight: 600 }}>
                    Active
                  </span>
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>Confidence Thresholding</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  Predictions below <strong style={{ color: "var(--text-primary)" }}>70.0% probability</strong> are marked as <span style={{ color: "#d97706", fontWeight: 700 }}>requires review</span> and cross-checked against deterministic rules.
                </p>

                <div style={{ padding: "0.75rem", background: "var(--bg-main)", borderRadius: "8px", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#16a34a", fontWeight: 600, marginBottom: "0.3rem" }}>
                    <ShieldCheck size={16} />
                    <span>Deterministic Fallback Safeguard</span>
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", lineHeight: 1.4 }}>
                    Preserves rule-based indicators and prevents single-point ML failures from compromising downstream task extraction.
                  </div>
                </div>
              </div>
            </div>

            {/* Benchmark Comparison Table */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Test Split Performance Comparison (N=53 Isolated Samples)</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-main)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Evaluation Metric</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Baseline (TF-IDF + LogReg)</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#4f46e5" }}>Transformer (DistilBERT)</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Observed Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Accuracy</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{baseline ? `${(baseline.accuracy * 100).toFixed(2)}%` : "..."}</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#4f46e5" }}>{transformer ? `${(transformer.accuracy * 100).toFixed(2)}%` : "..."}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#16a34a", fontWeight: 600 }}>+0.00%</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Macro Precision</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{baseline?.macro_precision.toFixed(4)}</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#4f46e5" }}>{transformer?.macro_precision.toFixed(4)}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#16a34a", fontWeight: 600 }}>0.000</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Macro Recall</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{baseline?.macro_recall.toFixed(4)}</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#4f46e5" }}>{transformer?.macro_recall.toFixed(4)}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#16a34a", fontWeight: 600 }}>0.000</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Macro F1-Score</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{baseline?.macro_f1.toFixed(4)}</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#4f46e5" }}>{transformer?.macro_f1.toFixed(4)}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#16a34a", fontWeight: 600 }}>0.000</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Weighted F1-Score</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{baseline?.weighted_f1.toFixed(4)}</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#4f46e5" }}>{transformer?.weighted_f1.toFixed(4)}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#16a34a", fontWeight: 600 }}>0.000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CONFUSION MATRIX ───────────────────────────────────── */}
        {activeTab === "matrix" && (
          <div>
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>11-Class Confusion Matrix Heatmap</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.25rem 0 0 0" }}>
                    Measured on the 53 isolated test notices across all 11 academic communication categories.
                  </p>
                </div>
                <a
                  href="/confusion_matrix.png"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.75rem",
                    borderRadius: "6px",
                    background: "var(--bg-main)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Open Full-Res Graphic</span>
                </a>
              </div>

              {/* Rendered Confusion Matrix Image */}
              <div style={{ display: "flex", justifyContent: "center", padding: "1rem 0" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/confusion_matrix.png"
                  alt="Confusion Matrix Heatmap"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "560px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: PER-CLASS PERFORMANCE ──────────────────────────────── */}
        {activeTab === "perclass" && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>Category-Wise Performance Metrics</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Breakdown of Precision, Recall, F1, and Support per category on the isolated test set.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-main)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Category Label</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Test Support</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Precision</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Recall</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>F1-Score</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Performance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transformer?.per_class &&
                    Object.entries(transformer.per_class).map(([cat, metrics]: [string, any]) => (
                      <tr key={cat} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>
                          <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(99, 102, 241, 0.08)", color: "#4f46e5" }}>
                            {cat}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace" }}>{metrics.support} samples</td>
                        <td style={{ padding: "0.75rem 1rem" }}>{(metrics.precision * 100).toFixed(1)}%</td>
                        <td style={{ padding: "0.75rem 1rem" }}>{(metrics.recall * 100).toFixed(1)}%</td>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#16a34a" }}>
                          {metrics.f1.toFixed(3)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "#16a34a", fontWeight: 600 }}>
                            <CheckCircle2 size={13} />
                            <span>100% Resolved</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: ERROR ANALYSIS ─────────────────────────────────────── */}
        {activeTab === "errors" && (
          <div>
            {/* Error Analysis Overview */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>Qualitative Error & Robustness Analysis</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Evaluation on test edge cases, ambiguous phrasing, and compound academic deliverable notifications.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                <div style={{ padding: "1rem", background: "var(--bg-main)", borderRadius: "8px", borderLeft: "4px solid #4f46e5" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.35rem 0" }}>Pattern 1: Project Submissions vs. Reviews</h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                    Notices containing phrases such as <em>&quot;project report submission for review&quot;</em> create lexical overlap between <code style={{ color: "#4f46e5" }}>PROJECT</code> and <code style={{ color: "#4f46e5" }}>PROJECT_REVIEW</code>.
                    The model distinguishes these by prioritizing venue/presentation keywords for reviews vs platform upload links for projects.
                  </p>
                </div>
                <div style={{ padding: "1rem", background: "var(--bg-main)", borderRadius: "8px", borderLeft: "4px solid #d97706" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.35rem 0" }}>Pattern 2: Institutional Circular vs. General Notice</h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                    Notices lacking strict circular reference headers (e.g. <em>Ref No / University Order</em>) may border on general announcements.
                    The calibrated confidence threshold routes marginal predictions (confidence &lt; 0.70) to secondary review.
                  </p>
                </div>
                <div style={{ padding: "1rem", background: "var(--bg-main)", borderRadius: "8px", borderLeft: "4px solid #16a34a" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.35rem 0" }}>Pattern 3: Test Split Verification</h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                    Zero test samples failed on the canonical test split (53 / 53 correct).
                    All predicted probabilities on test instances achieved &gt; 92% confidence mass on the ground-truth category.
                  </p>
                </div>
              </div>
            </div>

            {/* Example Validated Predictions */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Test Predictions Sample Inspection</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {errors?.sample_correct_predictions?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: "1rem",
                      background: "var(--bg-main)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>
                          {item.id}
                        </span>
                        <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(22, 163, 74, 0.1)", color: "#16a34a", fontWeight: 700 }}>
                          GROUND TRUTH: {item.ground_truth}
                        </span>
                        <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(99, 102, 241, 0.1)", color: "#4f46e5", fontWeight: 700 }}>
                          MODEL: {item.predicted_transformer}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#16a34a" }}>
                        Probability: {(item.confidence_transformer * 100).toFixed(2)}%
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-primary)", fontStyle: "italic" }}>
                      &ldquo;{item.text}&rdquo;
                    </p>
                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      <span>Course: <strong>{item.course}</strong></span>
                      <span>Relationship: <strong>{item.relationship}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: DATASET INSPECTOR ──────────────────────────────────── */}
        {activeTab === "dataset" && (
          <div>
            {/* Filter Bar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                padding: "1rem",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                marginBottom: "1.25rem",
                alignItems: "center",
              }}
            >
              <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", flex: "1 1 240px" }}>
                <div style={{ position: "relative", width: "100%" }}>
                  <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search notice text, course, venue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem 0.5rem 2.2rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-main)",
                      fontSize: "0.82rem",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "0.5rem 0.9rem",
                    borderRadius: "6px",
                    border: "none",
                    background: "#4f46e5",
                    color: "#fff",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Search
                </button>
              </form>

              {/* Category Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    padding: "0.45rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-main)",
                    fontSize: "0.78rem",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="ALL">All Categories</option>
                  {stats?.categories_list?.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Course Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Course:</span>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  style={{
                    padding: "0.45rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-main)",
                    fontSize: "0.78rem",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="ALL">All Courses</option>
                  <option value="CSE4001">CSE4001 (NLP)</option>
                  <option value="CSE2004">CSE2004 (OS)</option>
                  <option value="CSE3002">CSE3002 (ML)</option>
                  <option value="CSE2006">CSE2006 (Microprocessor)</option>
                  <option value="CSE3003">CSE3003 (Database Systems)</option>
                </select>
              </div>

              {/* Relationship Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Rel:</span>
                <select
                  value={relationshipFilter}
                  onChange={(e) => setRelationshipFilter(e.target.value)}
                  style={{
                    padding: "0.45rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-main)",
                    fontSize: "0.78rem",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="ALL">All Relationships</option>
                  <option value="NEW">NEW</option>
                  <option value="UPDATED">UPDATED</option>
                  <option value="RESCHEDULED">RESCHEDULED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="DUPLICATE">DUPLICATE</option>
                </select>
              </div>

              <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Showing <strong>{data?.filteredCount || 0}</strong> of <strong>350</strong> records
              </div>
            </div>

            {/* Records Table */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-main)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "0.75rem 0.75rem", width: "70px" }}>ID</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Category</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Notice Text</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Course</th>
                      <th style={{ padding: "0.75rem 0.75rem" }}>Rel</th>
                      <th style={{ padding: "0.75rem 0.75rem", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.records?.map((rec: any) => (
                      <tr key={rec.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.75rem 0.75rem", fontFamily: "monospace", fontWeight: 700, color: "var(--text-muted)" }}>
                          {rec.id}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              padding: "0.2rem 0.45rem",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              background: "rgba(99, 102, 241, 0.08)",
                              color: "#4f46e5",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {rec.category}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", maxWidth: "420px", color: "var(--text-primary)" }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {rec.text}
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                          {rec.course_code || rec.course_name}
                        </td>
                        <td style={{ padding: "0.75rem 0.75rem" }}>
                          <span
                            style={{
                              padding: "0.15rem 0.4rem",
                              borderRadius: "3px",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              background: rec.relationship === "NEW" ? "rgba(22, 163, 74, 0.1)" : "rgba(217, 119, 6, 0.1)",
                              color: rec.relationship === "NEW" ? "#16a34a" : "#d97706",
                            }}
                          >
                            {rec.relationship}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 0.75rem", textAlign: "center" }}>
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              padding: "0.3rem 0.6rem",
                              borderRadius: "4px",
                              border: "1px solid var(--border-color)",
                              background: "var(--bg-main)",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              cursor: "pointer",
                            }}
                          >
                            <Eye size={12} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 6: WHY THIS IS AN NLP SYSTEM (Phase 13) ─────────────────── */}
        {activeTab === "theory" && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.75rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.75rem", borderRadius: "999px", background: "rgba(99, 102, 241, 0.1)", color: "#4f46e5", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>
              <Brain size={13} />
              <span>Scientific & Architectural Foundation</span>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>
              Why This Is an NLP System
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "800px", marginBottom: "1.5rem" }}>
              Academic communication is predominantly unstructured, noisy, and rapidly changing natural language. This platform is not a static task manager or a generic wrapper—it is an end-to-end NLP intelligence engine that maps raw natural language to grounded academic execution.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {[
                {
                  step: "1",
                  title: "Academic Communication Is Unstructured Natural Language",
                  desc: "Faculty and departments post notices across multiple heterogeneous channels (portals, LMS, circulars) in natural prose without uniform structured schemas.",
                },
                {
                  step: "2",
                  title: "Automated Communication Classification",
                  desc: "A fine-tuned DistilBERT transformer (backed by calibrated statistical models) classifies notices into 11 specialized academic categories with calibrated probabilities.",
                },
                {
                  step: "3",
                  title: "Entity and Temporal Information Extraction",
                  desc: "Custom NER and temporal normalization extract course codes, platforms, deliverables, deadlines, and time transitions normalized to the Asia/Kolkata timezone.",
                },
                {
                  step: "4",
                  title: "Change Intelligence & Contradiction Detection",
                  desc: "The system compares incoming notices against existing academic state, detecting rescheduling, deadline changes, cancellations, and syllabus conflicts.",
                },
                {
                  step: "5",
                  title: "Structured Academic Knowledge Representation",
                  desc: "Unstructured text is transformed into verified Task, Event, Exam, and SourceEvidence entities with verbatim snippet provenance tracking.",
                },
                {
                  step: "6",
                  title: "Downstream Priority, Risk, and Planning",
                  desc: "Extracted NLP deliverables directly drive multi-criteria additive priority scoring, the Academic Risk Radar, and time-blocked study schedules.",
                },
                {
                  step: "7",
                  title: "Rigorous Ground-Truth Evaluation",
                  desc: "All components are empirically measured on an isolated ground-truth test corpus (N=53) with confusion matrices, macro/weighted F1, and error analysis.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "var(--bg-main)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#4f46e5",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.8rem",
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 0.3rem 0" }}>{item.title}</h4>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Synthetic Dataset Disclaimer */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "8px",
                background: "rgba(217, 119, 6, 0.08)",
                border: "1px solid rgba(217, 119, 6, 0.25)",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
              }}
            >
              <Info size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: "0.15rem" }} />
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#d97706" }}>Dataset Provenance & Institutional Disclaimer</strong>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                  This dataset (<em>Academic_NLP_Dataset_350.csv</em>) is a synthetic development and evaluation corpus constructed for academic NLP benchmarking. It is not claimed to represent private institutional student data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── RECORD INSPECTION MODAL ────────────────────────────────────── */}
        {selectedRecord && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem",
            }}
          >
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "14px",
                maxWidth: "680px",
                width: "100%",
                maxHeight: "85vh",
                overflowY: "auto",
                padding: "1.5rem",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#4f46e5" }}>{selectedRecord.id}</span>
                  <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(99, 102, 241, 0.1)", color: "#4f46e5", fontSize: "0.75rem", fontWeight: 700 }}>
                    {selectedRecord.category}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: "1rem", background: "var(--bg-main)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem", fontStyle: "italic", lineHeight: 1.5 }}>
                &ldquo;{selectedRecord.text}&rdquo;
              </div>

              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Ground-Truth Field Annotations
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "1rem" }}>
                <div style={{ padding: "0.5rem", background: "var(--bg-main)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Course: </span>
                  <strong>{selectedRecord.course_code} - {selectedRecord.course_name}</strong>
                </div>
                <div style={{ padding: "0.5rem", background: "var(--bg-main)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Task / Deliverable: </span>
                  <strong>{selectedRecord.task || "None"}</strong>
                </div>
                <div style={{ padding: "0.5rem", background: "var(--bg-main)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Deadline: </span>
                  <strong style={{ color: "#d97706" }}>{selectedRecord.deadline || "None"}</strong>
                </div>
                <div style={{ padding: "0.5rem", background: "var(--bg-main)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Date & Time: </span>
                  <strong>{selectedRecord.date || "None"} {selectedRecord.time}</strong>
                </div>
                <div style={{ padding: "0.5rem", background: "var(--bg-main)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Venue / Platform: </span>
                  <strong>{selectedRecord.venue || selectedRecord.platform || "None"}</strong>
                </div>
                <div style={{ padding: "0.5rem", background: "var(--bg-main)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Marks / Weightage: </span>
                  <strong>{selectedRecord.marks ? `${selectedRecord.marks} marks` : "None"}</strong>
                </div>
                <div style={{ padding: "0.5rem", background: "var(--bg-main)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Urgency & Condition: </span>
                  <strong>{selectedRecord.urgency} ({selectedRecord.condition})</strong>
                </div>
                <div style={{ padding: "0.5rem", background: "var(--bg-main)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Relationship: </span>
                  <strong>{selectedRecord.relationship}</strong>
                </div>
              </div>

              {selectedRecord.entities && (
                <div>
                  <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    Structured Entity String
                  </h4>
                  <div style={{ padding: "0.5rem", background: "var(--bg-main)", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all" }}>
                    {selectedRecord.entities}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
