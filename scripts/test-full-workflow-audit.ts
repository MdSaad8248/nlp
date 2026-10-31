import { prisma } from "../lib/db/prisma";
import {
  evaluateSubmissionWithRubric,
  normalizeRubricCriteria,
  getSampleCapstoneReportText,
} from "../lib/ai/gemini-evaluator";

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
    process.exit(1);
  }
}

async function runFullWorkflowAudit() {
  const BASE_URL = "http://localhost:3000";

  console.log("==========================================================================");
  console.log("       ACADEMIC AI — FULL SUBMISSION & GRADING WORKFLOW AUDIT             ");
  console.log("==========================================================================");

  // Helper for requests
  async function makeReq(path: string, options: RequestInit = {}) {
    return fetch(`${BASE_URL}${path}`, options);
  }

  // --- 1. Login as Faculty Dr. P. Raman ---
  console.log("\n>>> Step 1: Faculty Authentication (Dr. P. Raman)");
  const loginRes = await makeReq("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "faculty.raman@academic.ai",
      password: "teacher123",
      expectedRole: "TEACHER",
    }),
  });
  assert(loginRes.status === 200, "Faculty login succeeds (200 OK)");
  const ramanCookies = (loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [])
    .map((c) => c.split(";")[0])
    .join("; ");
  assert(ramanCookies.length > 0, "Faculty session cookie established");

  // --- 2. Login as Student Saad ---
  console.log("\n>>> Step 2: Student Authentication (Saad)");
  const studentLoginRes = await makeReq("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "saad@academic.ai",
      password: "student123",
      expectedRole: "STUDENT",
    }),
  });
  assert(studentLoginRes.status === 200, "Student login succeeds (200 OK)");
  const studentCookies = (studentLoginRes.headers.getSetCookie ? studentLoginRes.headers.getSetCookie() : [])
    .map((c) => c.split(";")[0])
    .join("; ");
  assert(studentCookies.length > 0, "Student session cookie established");

  // --- 3. Verify Student Cannot Access Faculty Endpoints ---
  console.log("\n>>> Step 3: Authorization Check — Student Blocked from Review Actions");
  const studentReviewAttempt = await makeReq("/api/submissions", {
    headers: { Cookie: studentCookies },
  });
  assert(studentReviewAttempt.status === 403, "Student cannot query /api/submissions (403 Forbidden)");

  const studentEvaluateAttempt = await makeReq("/api/submissions/evaluate", {
    method: "POST",
    headers: { Cookie: studentCookies, "Content-Type": "application/json" },
    body: JSON.stringify({ taskId: "task-synth-nlp-capstone-002" }),
  });
  assert(studentEvaluateAttempt.status === 403, "Student cannot trigger /api/submissions/evaluate (403 Forbidden)");

  // --- 4. Test Unreadable Document Handling ---
  console.log("\n>>> Step 4: Robustness Test — Unreadable Document");
  const unreadableRes = await makeReq("/api/submissions/evaluate", {
    method: "POST",
    headers: { Cookie: ramanCookies, "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: "task-synth-nlp-capstone-002",
      documentText: "corrupt/unreadable binary data \x00\x01\x02",
    }),
  });
  assert(unreadableRes.status === 422, "Unreadable document rejected with HTTP 422 Unprocessable Entity");
  const unreadableData = await unreadableRes.json();
  assert(unreadableData.code === "DOCUMENT_UNREADABLE", "Honest error code DOCUMENT_UNREADABLE returned without fake success");

  // Direct evaluator test with empty text
  const emptyEvalResult = await evaluateSubmissionWithRubric({
    documentText: "",
    rubricCriteria: [
      { id: "crit-1", title: "Methodology", marks: 25 },
      { id: "crit-2", title: "Results", marks: 25 },
    ],
    courseCode: "CSE4001",
    taskTitle: "Capstone Review",
  });
  assert(emptyEvalResult.success === false, "Empty document directly returns success: false");
  assert(emptyEvalResult.totalMarksAwarded === 0, "Empty document awards 0 marks");

  // --- 5. Test Controlled Valid Evaluation with Verbatim Evidence ---
  console.log("\n>>> Step 5: Controlled Evaluation with Exact Verbatim Excerpts");
  const testDoc = `ACADEMIC CAPSTONE REPORT: CSE4001
Title: Disambiguation of Academic Notices Using Transformers
Author: Synthetic Test Student

1. PROBLEM DEFINITION & LITERATURE SURVEY
The fundamental problem in university workflow management is detecting whether incoming notices reschedule or cancel events. We benchmark against classic TF-IDF baselines and cite contemporary transformer architectures.

2. METHODOLOGY & ARCHITECTURE DESIGN
Our pipeline uses DeBERTa-v3 with specialized attention heads. Positional encodings ensure temporal coherence, and cross-entropy loss with AdamW optimization is used.

3. EMPIRICAL IMPLEMENTATION & CODE QUALITY
We implemented modular PyTorch code across classifier.py and ner.py, with reproducible seed=42 and modular units tested via pytest.

4. EVALUATION METRICS & ERROR ANALYSIS
Evaluation on our test partition achieves a macro-F1 of 88.57% and accuracy of 89.2%. Error analysis reveals confusion between urgent circulars and assignment extensions.

5. TECHNICAL REPORT & PRESENTATION
This report strictly follows IEEE conference formatting with concise subsections and honest disclosure of compute limitations.`;

  const validEvalRes = await makeReq("/api/submissions/evaluate", {
    method: "POST",
    headers: { Cookie: ramanCookies, "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: "task-synth-nlp-capstone-002",
      documentText: testDoc,
    }),
  });
  assert(validEvalRes.status === 200, "Valid submission evaluation succeeds (200 OK)");
  const evalData = await validEvalRes.json();
  assert(evalData.success === true, "Evaluation returned success: true");
  assert(evalData.evaluation.criteriaResults.length >= 5, "All 5 rubric criteria evaluated");

  // Verify that criteria scores are bounded and total marks calculated accurately
  let calculatedTotal = 0;
  for (const crit of evalData.evaluation.criteriaResults) {
    assert(crit.awardedMarks >= 0 && crit.awardedMarks <= crit.maxMarks, `Criterion '${crit.title}' score (${crit.awardedMarks}) is within [0, ${crit.maxMarks}]`);
    calculatedTotal += crit.awardedMarks;
    // Verify evidence quote
    if (crit.evidenceQuote) {
      assert(testDoc.includes(crit.evidenceQuote.slice(0, 30)), `Evidence quote for '${crit.title}' is an exact excerpt from the report`);
    }
  }
  calculatedTotal = Math.min(evalData.evaluation.maxPossibleMarks, Math.round(calculatedTotal * 10) / 10);
  assert(Math.abs(evalData.evaluation.totalMarksAwarded - calculatedTotal) < 0.1, "Total marks exactly matches the sum of validated criteria marks calculated in code");

  // Verify evaluator model attribution (truthful attribution)
  console.log(`  ℹ Evaluator Model attributed: "${evalData.evaluation.evaluatorModel}"`);
  assert(
    evalData.evaluation.evaluatorModel.includes("Google Gemini") ||
    evalData.evaluation.evaluatorModel.includes("AcademicAI Deterministic Rubric Evaluator"),
    "Evaluator model is honestly identified (no false claims)"
  );

  // --- 6. Missing Evidence Identification Test ---
  console.log("\n>>> Step 6: Missing Evidence Identification");
  // Test with document missing Implementation and Error Analysis
  const partialDoc = `ACADEMIC REPORT: CSE4001
Title: Literature Review on NLP
1. PROBLEM DEFINITION & LITERATURE SURVEY
We review historical statistical language modeling and n-gram perplexity. Contemporary transformer models offer significant contextual improvements.`;

  const partialEval = await evaluateSubmissionWithRubric({
    documentText: partialDoc,
    rubricCriteria: [
      { id: "crit-1", title: "Problem Definition & Literature Survey", marks: 20 },
      { id: "crit-2", title: "Empirical Implementation & Code Quality", marks: 25 },
      { id: "crit-3", title: "Evaluation Metrics & Error Analysis", marks: 25 },
    ],
    courseCode: "CSE4001",
    taskTitle: "Partial Report",
  });

  const missingCrit = partialEval.criteriaResults.find((c) => c.criterionId === "crit-2");
  assert(missingCrit !== undefined, "Implementation criterion found in results");
  assert(Boolean(missingCrit?.missingEvidence), "Missing evidence is explicitly flagged when absent from document");
  assert(missingCrit?.awardedMarks! < missingCrit?.maxMarks! * 0.5, "Marks penalized appropriately for missing evidence");

  // --- 7. Faculty Review & Override Persistence ---
  console.log("\n>>> Step 7: Faculty Edits, Decision & Database Persistence");
  const targetTaskId = "task-synth-nlp-capstone-002";
  const facultyCustomMarks = 93.5;
  const facultyCustomFeedback = "Exceptional clarity in the DeBERTa attention heads analysis. Code structure is robust and reproducible.";

  const patchRes = await makeReq("/api/submissions", {
    method: "PATCH",
    headers: { Cookie: ramanCookies, "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: targetTaskId,
      status: "COMPLETED",
      percentage: 100,
      marks: facultyCustomMarks,
      feedback: facultyCustomFeedback,
    }),
  });
  assert(patchRes.status === 200, "Faculty review PATCH committed successfully (200 OK)");

  // Verify in database directly
  const updatedTask = await prisma.task.findUnique({
    where: { id: targetTaskId },
    include: { progress: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  assert(Boolean(updatedTask && updatedTask.status === "COMPLETED"), "Task status updated to COMPLETED in database");
  const progressNote = updatedTask?.progress?.[0]?.note || "";
  assert(progressNote.includes("93.5"), "Faculty custom marks (93.5) persisted in task progress note");
  assert(progressNote.includes("Dr. P. Raman"), "Faculty name attributed in task progress note");
  assert(progressNote.includes(facultyCustomFeedback), "Faculty feedback persisted in database");

  // --- 8. Multi-Faculty Data Isolation Verification ---
  console.log("\n>>> Step 8: Multi-Faculty Scoping Verification");
  // Login as Dr. S. Kulkarni (faculty.kulkarni@academic.ai)
  const kulkarniLoginRes = await makeReq("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "faculty.kulkarni@academic.ai",
      password: "teacher123",
      expectedRole: "TEACHER",
    }),
  });
  assert(kulkarniLoginRes.status === 200, "Dr. Kulkarni logged in");
  const kulkarniCookies = (kulkarniLoginRes.headers.getSetCookie ? kulkarniLoginRes.headers.getSetCookie() : [])
    .map((c) => c.split(";")[0])
    .join("; ");

  // Dr. Kulkarni attempts to review Dr. Raman's CSE4001 submission
  const unauthorizedPatchRes = await makeReq("/api/submissions", {
    method: "PATCH",
    headers: { Cookie: kulkarniCookies, "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: targetTaskId,
      status: "COMPLETED",
      marks: 50,
      feedback: "Tampering attempt",
    }),
  });
  assert(unauthorizedPatchRes.status === 403, "Dr. Kulkarni blocked from modifying Dr. Raman's submission (403 Forbidden)");

  console.log("\n==========================================================================");
  console.log("🏁 ALL WORKFLOW & GRADING INTEGRITY AUDIT CHECKS PASSED (100%)");
  console.log("==========================================================================");
}

runFullWorkflowAudit()
  .catch((e) => {
    console.error("Workflow audit failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
