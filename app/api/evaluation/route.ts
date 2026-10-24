import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/evaluation
 *
 * Serves real, unmanipulated NLP evaluation reports and dataset records
 * generated from actual model training and test-set evaluation.
 */
export async function GET(req: NextRequest) {
  try {
    const projectRoot = process.cwd();
    const reportsDir = path.join(projectRoot, "ml", "reports");
    const dataDir = path.join(projectRoot, "ml", "data");

    // 1. Read Generated JSON Reports
    const statsPath = path.join(reportsDir, "dataset_statistics.json");
    const classReportPath = path.join(reportsDir, "classification_report.json");
    const comparisonPath = path.join(reportsDir, "baseline_vs_transformer.json");
    const errorAnalysisPath = path.join(reportsDir, "error_analysis.json");
    const splitMetaPath = path.join(dataDir, "split_metadata.json");

    const datasetStatistics = fs.existsSync(statsPath)
      ? JSON.parse(fs.readFileSync(statsPath, "utf-8"))
      : null;

    const classificationReport = fs.existsSync(classReportPath)
      ? JSON.parse(fs.readFileSync(classReportPath, "utf-8"))
      : null;

    const baselineVsTransformer = fs.existsSync(comparisonPath)
      ? JSON.parse(fs.readFileSync(comparisonPath, "utf-8"))
      : null;

    const errorAnalysis = fs.existsSync(errorAnalysisPath)
      ? JSON.parse(fs.readFileSync(errorAnalysisPath, "utf-8"))
      : null;

    const splitMetadata = fs.existsSync(splitMetaPath)
      ? JSON.parse(fs.readFileSync(splitMetaPath, "utf-8"))
      : null;

    // 2. Read Dataset Records for Interactive Inspector
    const datasetCsvPath = path.join(projectRoot, "data", "Academic_NLP_Dataset_350.csv");
    let records: any[] = [];
    if (fs.existsSync(datasetCsvPath)) {
      const csvContent = fs.readFileSync(datasetCsvPath, "utf-8");
      const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        // Parse CSV headers and lines handling quotes
        const headers = parseCsvLine(lines[0]);
        records = lines.slice(1).map((line) => {
          const values = parseCsvLine(line);
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h.trim()] = values[idx] !== undefined ? values[idx].trim() : "";
          });
          return obj;
        });
      }
    }

    // Filter query parameters if provided
    const url = new URL(req.url);
    const categoryFilter = url.searchParams.get("category");
    const courseFilter = url.searchParams.get("course");
    const relationshipFilter = url.searchParams.get("relationship");
    const searchFilter = url.searchParams.get("q")?.toLowerCase();

    let filteredRecords = records;
    if (categoryFilter && categoryFilter !== "ALL") {
      filteredRecords = filteredRecords.filter((r) => r.category === categoryFilter);
    }
    if (courseFilter && courseFilter !== "ALL") {
      filteredRecords = filteredRecords.filter(
        (r) => r.course_code === courseFilter || r.course_name === courseFilter
      );
    }
    if (relationshipFilter && relationshipFilter !== "ALL") {
      filteredRecords = filteredRecords.filter((r) => r.relationship === relationshipFilter);
    }
    if (searchFilter) {
      filteredRecords = filteredRecords.filter(
        (r) =>
          r.text?.toLowerCase().includes(searchFilter) ||
          r.course_name?.toLowerCase().includes(searchFilter) ||
          r.task?.toLowerCase().includes(searchFilter) ||
          r.venue?.toLowerCase().includes(searchFilter)
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      datasetStatistics,
      splitMetadata,
      classificationReport,
      baselineVsTransformer,
      errorAnalysis,
      totalRecords: records.length,
      filteredCount: filteredRecords.length,
      records: filteredRecords.slice(0, 100), // Return paginated slice for fast rendering
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load evaluation reports" },
      { status: 500 }
    );
  }
}

/**
 * Robust CSV Line Parser that handles commas inside quotes
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
