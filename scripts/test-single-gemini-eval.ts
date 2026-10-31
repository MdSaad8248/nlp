import { evaluateSubmissionWithRubric, getSampleCapstoneReportText } from "../lib/ai/gemini-evaluator";
import { runGeminiDiagnostic } from "./diagnose-gemini";

import fs from "fs";
import path from "path";

// Load .env.local safely into process.env for the evaluation test
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("GEMINI_API_KEY=")) {
      process.env.GEMINI_API_KEY = trimmed.slice("GEMINI_API_KEY=".length).trim();
    }
  }
}

async function main() {
  console.log("================================================================================");
  console.log("       STEP 1: DIAGNOSE CURRENTLY CONFIGURED MODEL VIA MINIMAL PROBE            ");
  console.log("================================================================================\n");

  const diag = await runGeminiDiagnostic();
  console.log(`Configured Model:        "${diag.model}"`);
  console.log(`Diagnostic Category:     ${diag.category}`);
  console.log(`HTTP Status:             ${diag.httpStatus ?? "N/A"}`);
  console.log(`Latency:                 ${diag.latencyMs}ms`);
  console.log(`Diagnostic Message:      ${diag.message}`);
  if (diag.rawDetails) {
    console.log(`Raw Status Identifier:   ${diag.rawDetails}`);
  }

  console.log("\n================================================================================");
  console.log("       STEP 2: RUN CONTROLLED REAL EVALUATION ON VERIFIED GEMINI MODEL           ");
  console.log("================================================================================\n");

  // We test the evaluation function with gemini-2.5-flash (active on Google's endpoint)
  const prevModel = process.env.GEMINI_MODEL;
  process.env.GEMINI_MODEL = "gemini-2.5-flash";

  const sampleDoc = getSampleCapstoneReportText("CSE4001", "Capstone Project Review 1", "Saad (Student A)");
  const rubricCriteria = [
    { id: "crit-1", title: "Problem Definition & Literature Survey", marks: 20 },
    { id: "crit-2", title: "Methodology & Architecture Design", marks: 25 },
    { id: "crit-3", title: "Empirical Implementation & Code Quality", marks: 25 },
    { id: "crit-4", title: "Evaluation Metrics & Error Analysis", marks: 20 },
    { id: "crit-5", title: "Technical Report & Presentation", marks: 10 },
  ];

  console.log("Calling evaluateSubmissionWithRubric() using model: gemini-2.5-flash...");
  const result = await evaluateSubmissionWithRubric({
    documentText: sampleDoc,
    rubricCriteria,
    courseCode: "CSE4001",
    taskTitle: "Capstone Project Review 1",
    studentName: "Saad (Student A)",
    totalMarks: 100,
  });

  console.log(`\nEvaluation Result:`);
  console.log(`  Success:               ${result.success}`);
  console.log(`  Evaluator Model:       ${result.evaluatorModel}`);
  console.log(`  isAIGenerated:         ${result.isAIGenerated}`);
  console.log(`  Duration:              ${result.evaluationDurationMs}ms`);
  console.log(`  Total Marks Awarded:   ${result.totalMarksAwarded} / ${result.maxPossibleMarks} (${result.percentageScore}%)`);
  console.log(`  Overall Feedback:      ${result.overallFeedback?.slice(0, 160)}...`);
  console.log(`  Criteria Evaluated:    ${result.criteriaResults?.length}`);

  for (const c of result.criteriaResults) {
    console.log(`    • [${c.title}] Awarded: ${c.awardedMarks} / ${c.maxMarks}`);
    console.log(`      Quote: "${c.evidenceQuote?.slice(0, 90)}..."`);
    if (c.missingEvidence) {
      console.log(`      Missing: ${c.missingEvidence}`);
    }
  }

  // Restore env
  if (prevModel) process.env.GEMINI_MODEL = prevModel;
  else delete process.env.GEMINI_MODEL;

  console.log("\n================================================================================\n");
}

main().catch((err) => {
  console.error("Evaluation execution error:", err);
  process.exit(1);
});
