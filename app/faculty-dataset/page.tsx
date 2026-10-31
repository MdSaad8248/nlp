"use client";

import { useState, useEffect, useRef } from "react";
import Shell from "@/components/layout/Shell";
import {
  Users,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Check,
  X,
  FileCheck2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import { getCurrentSession, getClientCookieSession, UserSession } from "@/lib/auth/session";
import { useRouter } from "next/navigation";

interface StudentRecord {
  enrollmentId: string;
  studentId: string;
  userId: string;
  name: string;
  email: string;
  courseCode: string;
  courseTitle: string;
  courseColor: string;
  section: string;
  semester: number;
  academicYear: string;
  status: string;
  progress: number;
  enrolledAt: string;
}

interface PreviewRow {
  index: number;
  studentId: string;
  studentName: string;
  email: string;
  courseCode: string;
  academicYear: string;
  semester: number;
  section: string;
  enrollmentStatus: string;
  isValid: boolean;
  isExistingStudent: boolean;
  errors: string[];
}

export default function FacultyStudentDatasetPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession>(() => getClientCookieSession());
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [availableCourses, setAvailableCourses] = useState<{ id: string; code: string; title: string }[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [recentImports, setRecentImports] = useState<any[]>([]);

  // CSV Upload & Preview state
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{
    summary: any;
    previewRows: PreviewRow[];
    allValid: boolean;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);

  // Role Protection with server fallback
  useEffect(() => {
    setMounted(true);
    const current = getClientCookieSession();
    setSession(current);
    if (current.role !== "TEACHER") {
      fetch("/api/auth")
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user?.role === "TEACHER") {
            document.cookie = `academic_student_id=${encodeURIComponent(data.user.id)}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = `academic_user_role=TEACHER; path=/; max-age=604800; SameSite=Lax`;
            setSession({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              rollNumber: data.user.rollNumber || "FAC-01",
              program: data.user.program || "",
            });
            loadRecords();
          } else {
            router.replace("/dashboard");
          }
        })
        .catch(() => {
          router.replace("/dashboard");
        });
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Load records from backend API
  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCourse) params.append("courseCode", selectedCourse);
      if (selectedSection) params.append("section", selectedSection);
      if (selectedStatus) params.append("status", selectedStatus);

      const res = await fetch(`/api/student-dataset?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          router.replace("/dashboard");
          return;
        }
        throw new Error(`Failed to load student records (HTTP ${res.status})`);
      }

      const json = await res.json();
      if (json.success) {
        setRecords(json.records || []);
        if (json.filters) {
          setAvailableCourses(json.filters.courses || []);
          setAvailableSections(json.filters.sections || []);
        }
        if (json.recentImports) {
          setRecentImports(json.recentImports);
        }
      } else {
        throw new Error(json.error || "Failed to load data");
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve student records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session.role === "TEACHER") {
      loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse, selectedSection, selectedStatus, session.role]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRecords();
  };

  // Parse CSV text to JSON objects
  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      if (currentline.length === headers.length) {
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = currentline[j];
        }
        rows.push(obj);
      }
    }
    return rows;
  };

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setImportSuccessMessage(null);

    try {
      setValidating(true);
      const text = await selected.text();
      const parsedRows = parseCSV(text);

      if (parsedRows.length === 0) {
        alert("The selected file contains no readable records or has invalid CSV headers.");
        setFile(null);
        setValidating(false);
        return;
      }

      // Send to server-side preview validation
      const res = await fetch("/api/student-dataset/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows, filename: selected.name }),
      });

      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
      } else {
        alert(data.error || "Dataset preview failed");
        setFile(null);
      }
    } catch (err: any) {
      alert("Error parsing CSV file: " + err.message);
      setFile(null);
    } finally {
      setValidating(false);
    }
  };

  // Confirm and commit import
  const handleConfirmImport = async () => {
    if (!previewData || !previewData.previewRows) return;

    try {
      setImporting(true);
      const validRowsToImport = previewData.previewRows.filter((r) => r.isValid);

      const res = await fetch("/api/student-dataset/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRowsToImport,
          filename: file?.name || "students_dataset.csv",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setImportSuccessMessage(
          `Successfully imported ${data.results.createdStudents} new students and created ${data.results.createdEnrollments} course enrollments.`
        );
        setFile(null);
        setPreviewData(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadRecords(); // Refresh table
      } else {
        alert(data.error || "Import failed");
      }
    } catch (err: any) {
      alert("Import request failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  if (session.role !== "TEACHER") {
    return null;
  }

  return (
    <Shell>
      {/* ── TOP HEADER ROW ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#4658C8",
              marginBottom: "0.3rem",
            }}
          >
            <Shield size={13} />
            <span>Authorized Faculty Portal &bull; Student Records Management</span>
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              fontFamily: "var(--font-sans)",
              color: "#172033",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Student Dataset Management
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#647089", margin: "0.25rem 0 0 0" }}>
            Import, validate, and manage enrolled student cohorts across your authorized university courses.
          </p>
        </div>

        {/* Action button: Download CSV Template */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a
            href="/api/student-dataset/template"
            className="btn btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.95rem",
              borderRadius: "8px",
              background: "#FFFFFF",
              border: "1px solid #E4E8F1",
              fontSize: "0.84rem",
              fontWeight: 600,
              color: "#172033",
              textDecoration: "none",
            }}
          >
            <Download size={15} color="#4658C8" />
            <span>Download CSV Template</span>
          </a>
        </div>
      </div>

      {/* ── METRIC CARDS ────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>Total Enrolled Records</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#172033", marginTop: "0.2rem" }}>
              {records.length}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#10B981", fontWeight: 600, marginTop: "0.15rem" }}>
              Active in courses
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(70, 88, 200, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4658C8",
            }}
          >
            <Users size={22} />
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>Active Courses</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#172033", marginTop: "0.2rem" }}>
              {availableCourses.length}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#4658C8", fontWeight: 600, marginTop: "0.15rem" }}>
              Under management
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10B981",
            }}
          >
            <Layers size={22} />
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>Active Cohorts / Sections</div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#172033", marginTop: "0.2rem" }}>
              {availableSections.length || 1}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#647089", fontWeight: 600, marginTop: "0.15rem" }}>
              Section A &bull; Section B &bull; Section C
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(245, 158, 11, 0.09)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#D97706",
            }}
          >
            <FileSpreadsheet size={22} />
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E8F1",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#647089", fontWeight: 500 }}>Last Import Status</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#172033", marginTop: "0.5rem" }}>
              {recentImports[0]?.status || "Verified"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#647089", marginTop: "0.2rem" }}>
              {recentImports[0]
                ? new Date(recentImports[0].createdAt).toLocaleDateString()
                : "Database synced"}
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10B981",
            }}
          >
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* ── CSV UPLOAD DROPZONE & PREVIEW SECTION ──────────────────── */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E4E8F1",
          borderRadius: "14px",
          padding: "1.5rem",
          marginBottom: "1.75rem",
          boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UploadCloud size={20} color="#4658C8" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#172033", margin: 0 }}>
              Import Student Records (CSV)
            </h2>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#647089" }}>
            Supported fields: student_id, student_name, email, course_code, academic_year, semester, section, enrollment_status
          </span>
        </div>

        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed #CBD5E1",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            background: "#F8FAFC",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#4658C8")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#CBD5E1")}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            style={{ display: "none" }}
          />
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(70, 88, 200, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4658C8",
              margin: "0 auto 0.75rem",
            }}
          >
            <FileSpreadsheet size={24} />
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#172033" }}>
            {file ? file.name : "Click to browse or drag & drop student CSV file"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#647089", marginTop: "0.3rem" }}>
            CSV file size limit up to 10MB &bull; Previews automatically before database commit
          </div>
        </div>

        {/* Validating indicator */}
        {validating && (
          <div style={{ padding: "1rem", textAlign: "center", color: "#4658C8", fontSize: "0.85rem", fontWeight: 600 }}>
            <RefreshCw size={16} className="animate-spin" style={{ display: "inline", marginRight: "0.4rem" }} />
            Validating columns, checking duplicates and course matching...
          </div>
        )}

        {/* Success Alert Banner */}
        {importSuccessMessage && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.85rem 1rem",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={18} />
            <span>{importSuccessMessage}</span>
          </div>
        )}

        {/* Preview Modal / Table if file parsed */}
        {previewData && (
          <div
            style={{
              marginTop: "1.5rem",
              borderTop: "1px solid #E4E8F1",
              paddingTop: "1.25rem",
            }}
          >
            {/* Preview Summary Pills */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <span
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: "6px",
                    background: "#F5F7FC",
                    border: "1px solid #E4E8F1",
                    fontSize: "0.78rem",
                    color: "#172033",
                    fontWeight: 600,
                  }}
                >
                  Total Rows: {previewData.summary.totalRows}
                </span>
                <span
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    fontSize: "0.78rem",
                    color: "#059669",
                    fontWeight: 600,
                  }}
                >
                  Valid: {previewData.summary.validRows}
                </span>
                {previewData.summary.invalidRows > 0 && (
                  <span
                    style={{
                      padding: "0.3rem 0.65rem",
                      borderRadius: "6px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      fontSize: "0.78rem",
                      color: "#DC2626",
                      fontWeight: 600,
                    }}
                  >
                    Invalid: {previewData.summary.invalidRows}
                  </span>
                )}
                <span
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: "6px",
                    background: "rgba(70, 88, 200, 0.1)",
                    border: "1px solid rgba(70, 88, 200, 0.25)",
                    fontSize: "0.78rem",
                    color: "#4658C8",
                    fontWeight: 600,
                  }}
                >
                  New Students: {previewData.summary.newStudentsCount}
                </span>
              </div>

              {/* Confirm Import button */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewData(null);
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.5rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid #E4E8F1",
                    background: "#FFFFFF",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importing || previewData.summary.validRows === 0}
                  onClick={handleConfirmImport}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "8px",
                    background: "#4658C8",
                    color: "#FFFFFF",
                    border: "none",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    boxShadow: "0 2px 8px rgba(70, 88, 200, 0.3)",
                  }}
                >
                  {importing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Writing to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Confirm &amp; Import ({previewData.summary.validRows} Records)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div style={{ overflowX: "auto", maxHeight: "280px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#F5F7FC", borderBottom: "1px solid #E4E8F1", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem 0.8rem", color: "#647089" }}>Row</th>
                    <th style={{ padding: "0.6rem 0.8rem", color: "#647089" }}>Status</th>
                    <th style={{ padding: "0.6rem 0.8rem", color: "#647089" }}>Student ID</th>
                    <th style={{ padding: "0.6rem 0.8rem", color: "#647089" }}>Full Name</th>
                    <th style={{ padding: "0.6rem 0.8rem", color: "#647089" }}>Email</th>
                    <th style={{ padding: "0.6rem 0.8rem", color: "#647089" }}>Course</th>
                    <th style={{ padding: "0.6rem 0.8rem", color: "#647089" }}>Sec</th>
                    <th style={{ padding: "0.6rem 0.8rem", color: "#647089" }}>Validation Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.previewRows.map((row) => (
                    <tr
                      key={row.index}
                      style={{
                        borderBottom: "1px solid #E4E8F1",
                        background: row.isValid ? "#FFFFFF" : "rgba(239, 68, 68, 0.04)",
                      }}
                    >
                      <td style={{ padding: "0.55rem 0.8rem", color: "#647089" }}>#{row.index}</td>
                      <td style={{ padding: "0.55rem 0.8rem" }}>
                        {row.isValid ? (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "4px",
                              background: "rgba(16, 185, 129, 0.1)",
                              color: "#059669",
                              fontWeight: 700,
                            }}
                          >
                            VALID
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "4px",
                              background: "rgba(239, 68, 68, 0.12)",
                              color: "#DC2626",
                              fontWeight: 700,
                            }}
                          >
                            INVALID
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.55rem 0.8rem", fontWeight: 600, color: "#172033" }}>{row.studentId}</td>
                      <td style={{ padding: "0.55rem 0.8rem", color: "#172033" }}>{row.studentName}</td>
                      <td style={{ padding: "0.55rem 0.8rem", color: "#647089" }}>{row.email}</td>
                      <td style={{ padding: "0.55rem 0.8rem", fontWeight: 600, color: "#4658C8" }}>{row.courseCode}</td>
                      <td style={{ padding: "0.55rem 0.8rem", color: "#647089" }}>{row.section}</td>
                      <td style={{ padding: "0.55rem 0.8rem" }}>
                        {row.errors.length > 0 ? (
                          <span style={{ color: "#DC2626", fontSize: "0.72rem" }}>
                            {row.errors.join("; ")}
                          </span>
                        ) : row.isExistingStudent ? (
                          <span style={{ color: "#D97706", fontSize: "0.72rem" }}>Existing student record</span>
                        ) : (
                          <span style={{ color: "#059669", fontSize: "0.72rem" }}>Ready to create</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── SEARCH & FILTER CONTROLS ──────────────────────────────── */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E4E8F1",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.25rem",
          boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          {/* Search bar */}
          <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
            <Search
              size={15}
              color="#8F9CAE"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search by student name, ID (e.g. S001), or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 1rem 0.5rem 2.2rem",
                borderRadius: "8px",
                border: "1px solid #E4E8F1",
                background: "#F5F7FC",
                fontSize: "0.85rem",
                color: "#172033",
                outline: "none",
              }}
            />
          </div>

          {/* Filters row */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{
                fontSize: "0.82rem",
                padding: "0.5rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #E4E8F1",
                background: "#FFFFFF",
                color: "#172033",
              }}
            >
              <option value="">All Courses</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              style={{
                fontSize: "0.82rem",
                padding: "0.5rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #E4E8F1",
                background: "#FFFFFF",
                color: "#172033",
              }}
            >
              <option value="">All Sections</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                fontSize: "0.82rem",
                padding: "0.5rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #E4E8F1",
                background: "#FFFFFF",
                color: "#172033",
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DROPPED">Dropped</option>
              <option value="AUDIT">Audit</option>
            </select>

            <button
              type="submit"
              style={{
                padding: "0.5rem 0.95rem",
                borderRadius: "8px",
                background: "#4658C8",
                color: "#FFFFFF",
                border: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* ── STUDENT ROSTER DATA TABLE ─────────────────────────────── */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E4E8F1",
          borderRadius: "14px",
          boxShadow: "0 1px 3px rgba(24, 36, 71, 0.03)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "1.15rem 1.5rem",
            borderBottom: "1px solid #E4E8F1",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <FileSpreadsheet size={18} color="#4658C8" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#172033", margin: 0 }}>
              Enrolled Student Cohort Records ({records.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={loadRecords}
            style={{
              background: "transparent",
              border: "none",
              color: "#647089",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.78rem",
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#647089" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 0.75rem", display: "block" }} />
            Loading student records from verified database...
          </div>
        ) : error ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#DC2626" }}>
            <AlertTriangle size={24} style={{ margin: "0 auto 0.5rem", display: "block" }} />
            {error}
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#647089" }}>
            <Users size={32} style={{ margin: "0 auto 0.75rem", display: "block", color: "#8F9CAE" }} />
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#172033" }}>No student records found</div>
            <div style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
              Upload a CSV file or adjust filter criteria to view enrolled student records.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr style={{ background: "#F5F7FC", borderBottom: "1px solid #E4E8F1", textAlign: "left" }}>
                  <th style={{ padding: "0.8rem 1.25rem", color: "#647089", fontWeight: 600 }}>ID</th>
                  <th style={{ padding: "0.8rem 1.25rem", color: "#647089", fontWeight: 600 }}>Student Name</th>
                  <th style={{ padding: "0.8rem 1.25rem", color: "#647089", fontWeight: 600 }}>Email</th>
                  <th style={{ padding: "0.8rem 1.25rem", color: "#647089", fontWeight: 600 }}>Course</th>
                  <th style={{ padding: "0.8rem 1.25rem", color: "#647089", fontWeight: 600 }}>Section</th>
                  <th style={{ padding: "0.8rem 1.25rem", color: "#647089", fontWeight: 600 }}>Semester</th>
                  <th style={{ padding: "0.8rem 1.25rem", color: "#647089", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "0.8rem 1.25rem", color: "#647089", fontWeight: 600, minWidth: "140px" }}>
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr
                    key={rec.enrollmentId}
                    style={{
                      borderBottom: "1px solid #E4E8F1",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "0.8rem 1.25rem", fontWeight: 700, color: "#172033" }}>
                      {rec.studentId}
                    </td>
                    <td style={{ padding: "0.8rem 1.25rem", fontWeight: 600, color: "#172033" }}>
                      {rec.name}
                    </td>
                    <td style={{ padding: "0.8rem 1.25rem", color: "#647089" }}>{rec.email}</td>
                    <td style={{ padding: "0.8rem 1.25rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          background: "rgba(70, 88, 200, 0.08)",
                          color: "#4658C8",
                          border: "1px solid rgba(70, 88, 200, 0.2)",
                        }}
                      >
                        {rec.courseCode}
                      </span>
                    </td>
                    <td style={{ padding: "0.8rem 1.25rem", color: "#172033" }}>{rec.section}</td>
                    <td style={{ padding: "0.8rem 1.25rem", color: "#647089" }}>Sem {rec.semester}</td>
                    <td style={{ padding: "0.8rem 1.25rem" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          background:
                            rec.status === "ACTIVE"
                              ? "rgba(16, 185, 129, 0.1)"
                              : rec.status === "DROPPED"
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(245, 158, 11, 0.1)",
                          color:
                            rec.status === "ACTIVE"
                              ? "#059669"
                              : rec.status === "DROPPED"
                              ? "#DC2626"
                              : "#D97706",
                        }}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.8rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                          style={{
                            flex: 1,
                            height: "6px",
                            borderRadius: "999px",
                            background: "#E4E8F1",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${rec.progress}%`,
                              background:
                                rec.progress >= 75
                                  ? "#4658C8"
                                  : rec.progress >= 50
                                  ? "#10B981"
                                  : "#F59E0B",
                              borderRadius: "999px",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#172033" }}>
                          {rec.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
