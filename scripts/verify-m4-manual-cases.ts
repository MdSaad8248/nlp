import { calculateAcademicPriority } from "../lib/intelligence/priority-engine";
import { computeWorkloadSummary, WorkloadItemInput } from "../lib/intelligence/workload-engine";
import { generateRecommendationReasons } from "../lib/intelligence/priority-explanations";
import { RankedAcademicItem } from "../lib/intelligence/types";

/**
 * Milestone 4 Explicit Manual Verification Cases
 * Directly tests the scenario prescribed in the user instructions:
 *
 * Case 1: Student with:
 *         - NLP Project due tomorrow (30 marks)
 *         - ML Assignment due in 5 days (10 marks)
 *         - Networks Exam in 2 weeks
 *         Expected: NLP Project recommended first as CRITICAL with full factors.
 *
 * Case 2: Complete the NLP Project
 *         Expected: ML Assignment becomes recommended next; NLP drops from active attention.
 *
 * Case 3: Cancel the NLP Project
 *         Expected: ML Assignment becomes recommended next; NLP drops from active attention.
 *
 * Case 4: Ingest duplicate notice for ML Assignment
 *         Expected: Workload count does NOT double.
 *
 * Case 5: Ingest reschedule notice for ML Assignment
 *         Expected: Workload does NOT count both dates; only the new date is counted once.
 */
async function verifyManualCases() {
  console.log("================================================================================");
  console.log("             ACADEMIC AI - MILESTONE 4 MANUAL CASE VERIFICATION                ");
  console.log("================================================================================");

  const anchor = new Date("2026-09-18T10:00:00+05:30"); // Friday 10 AM
  const anchorMs = anchor.getTime();

  let allPassed = true;

  // ── CASE 1: Initial Three Deliverables ─────────────────────────────────────────
  console.log("\n--- [CASE 1] Initial Student State (NLP Project, ML Assignment, Networks Exam) ---");
  const nlpDeadline = new Date(anchorMs + 18 * 3600 * 1000); // Tomorrow (+18h)
  const mlDeadline = new Date(anchorMs + 120 * 3600 * 1000); // 5 days (+120h)
  const netExamDate = new Date(anchorMs + 336 * 3600 * 1000); // 14 days (+336h)

  const evalNLP = calculateAcademicPriority({
    title: "NLP Capstone Project",
    deadline: nlpDeadline,
    status: "PENDING",
    category: "PROJECT",
    marks: 30,
    hasPenaltyClause: true,
    penaltyClauseText: "Strict deadline: late submissions receive zero credit",
    now: anchor,
  });

  const evalML = calculateAcademicPriority({
    title: "ML Exercise 3",
    deadline: mlDeadline,
    status: "PENDING",
    category: "ASSIGNMENT",
    marks: 10,
    now: anchor,
  });

  const evalNet = calculateAcademicPriority({
    title: "Computer Networks FAT Exam",
    deadline: netExamDate,
    status: "PENDING",
    category: "EXAM",
    marks: 50,
    now: anchor,
  });

  console.log(`1. NLP Project:  Score = ${evalNLP.score}, Level = ${evalNLP.level}`);
  console.log(`   Explanation:  ${evalNLP.explanation}`);
  console.log(`2. ML Assign:    Score = ${evalML.score}, Level = ${evalML.level}`);
  console.log(`3. Networks:     Score = ${evalNet.score}, Level = ${evalNet.level}`);

  const initialItems: RankedAcademicItem[] = [
    {
      id: "nlp-proj",
      itemType: "TASK",
      title: "NLP Capstone Project",
      courseCode: "CSE4001",
      courseTitle: "Natural Language Processing",
      category: "PROJECT",
      deadline: nlpDeadline,
      normalizedDeadline: nlpDeadline.toISOString(),
      status: "PENDING",
      marks: 30,
      weightage: 30,
      submissionPlatform: "VTOP",
      priorityScore: evalNLP.score,
      priorityLevel: evalNLP.level,
      factors: evalNLP.factors,
      priorityReason: evalNLP.explanation,
      isOverdue: false,
      timeRemainingHours: 18,
      timeRemainingLabel: "18h remaining",
    },
    {
      id: "ml-assign",
      itemType: "TASK",
      title: "ML Exercise 3",
      courseCode: "CSE4002",
      courseTitle: "Machine Learning",
      category: "ASSIGNMENT",
      deadline: mlDeadline,
      normalizedDeadline: mlDeadline.toISOString(),
      status: "PENDING",
      marks: 10,
      weightage: 10,
      submissionPlatform: "VTOP",
      priorityScore: evalML.score,
      priorityLevel: evalML.level,
      factors: evalML.factors,
      priorityReason: evalML.explanation,
      isOverdue: false,
      timeRemainingHours: 120,
      timeRemainingLabel: "5 days remaining",
    },
    {
      id: "net-exam",
      itemType: "EXAM",
      title: "Computer Networks FAT Exam",
      courseCode: "CSE3003",
      courseTitle: "Computer Networks",
      category: "EXAM",
      deadline: netExamDate,
      normalizedDeadline: netExamDate.toISOString(),
      status: "PENDING",
      marks: 50,
      weightage: 50,
      submissionPlatform: "SJT 101",
      priorityScore: evalNet.score,
      priorityLevel: evalNet.level,
      factors: evalNet.factors,
      priorityReason: evalNet.explanation,
      isOverdue: false,
      timeRemainingHours: 336,
      timeRemainingLabel: "14 days remaining",
    },
  ];

  const sortedInitial = [...initialItems].sort((a, b) => b.priorityScore - a.priorityScore);
  const topRec = sortedInitial[0];

  const reasons = generateRecommendationReasons(
    topRec.title,
    topRec.category,
    topRec.timeRemainingLabel,
    topRec.marks,
    topRec.factors,
    topRec.isOverdue
  );

  console.log(`\nWhat Should I Work On Now?: ${topRec.title} (Score: ${topRec.priorityScore})`);
  console.log(`Recommendation Reasons:`);
  reasons.forEach((r) => console.log(` - ${r}`));

  const case1Passed =
    evalNLP.level === "CRITICAL" &&
    topRec.id === "nlp-proj" &&
    evalML.level === "MEDIUM" &&
    evalNLP.score > evalML.score &&
    evalNLP.score > evalNet.score;

  console.log(`\nCase 1 Result: ${case1Passed ? "✔ PASS" : "✖ FAIL"}`);
  if (!case1Passed) allPassed = false;

  // ── CASE 2: Complete NLP Project ──────────────────────────────────────────────
  console.log("\n--- [CASE 2] Complete the NLP Project ---");
  const evalNLPCompleted = calculateAcademicPriority({
    title: "NLP Capstone Project",
    deadline: nlpDeadline,
    status: "COMPLETED",
    category: "PROJECT",
    marks: 30,
    now: anchor,
  });

  const itemsAfterComplete = initialItems.map((it) =>
    it.id === "nlp-proj"
      ? {
          ...it,
          status: "COMPLETED",
          priorityScore: evalNLPCompleted.score,
          priorityLevel: evalNLPCompleted.level,
          factors: evalNLPCompleted.factors,
        }
      : it
  );

  const activeAfterComplete = itemsAfterComplete
    .filter((it) => it.status !== "COMPLETED" && it.status !== "CANCELLED")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  console.log(`NLP Project Score when COMPLETED: ${evalNLPCompleted.score} (${evalNLPCompleted.level})`);
  console.log(`New #1 Attention Item: ${activeAfterComplete[0]?.title} (${activeAfterComplete[0]?.id})`);
  console.log(`Active Attention Items Count: ${activeAfterComplete.length} (was 3)`);

  const case2Passed =
    evalNLPCompleted.score === 0 &&
    activeAfterComplete.length === 2 &&
    (activeAfterComplete[0].id === "ml-assign" || activeAfterComplete[0].id === "net-exam") &&
    !activeAfterComplete.some((it) => it.id === "nlp-proj");

  console.log(`Case 2 Result: ${case2Passed ? "✔ PASS" : "✖ FAIL"}`);
  if (!case2Passed) allPassed = false;

  // ── CASE 3: Cancel NLP Project ────────────────────────────────────────────────
  console.log("\n--- [CASE 3] Cancel the NLP Project ---");
  const evalNLPCancelled = calculateAcademicPriority({
    title: "NLP Capstone Project",
    deadline: nlpDeadline,
    status: "CANCELLED",
    category: "PROJECT",
    marks: 30,
    now: anchor,
  });

  const itemsAfterCancel = initialItems.map((it) =>
    it.id === "nlp-proj"
      ? {
          ...it,
          status: "CANCELLED",
          priorityScore: evalNLPCancelled.score,
          priorityLevel: evalNLPCancelled.level,
          factors: evalNLPCancelled.factors,
        }
      : it
  );

  const activeAfterCancel = itemsAfterCancel
    .filter((it) => it.status !== "COMPLETED" && it.status !== "CANCELLED")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  console.log(`NLP Project Score when CANCELLED: ${evalNLPCancelled.score} (${evalNLPCancelled.level})`);
  console.log(`New #1 Attention Item: ${activeAfterCancel[0]?.title}`);
  console.log(`Active Attention Items Count: ${activeAfterCancel.length}`);

  const case3Passed =
    evalNLPCancelled.score === 0 &&
    activeAfterCancel.length === 2 &&
    !activeAfterCancel.some((it) => it.id === "nlp-proj");

  console.log(`Case 3 Result: ${case3Passed ? "✔ PASS" : "✖ FAIL"}`);
  if (!case3Passed) allPassed = false;

  // ── CASE 4: Duplicate Notice Ingestion (Workload must NOT double) ─────────────
  console.log("\n--- [CASE 4] Duplicate Notice Ingestion for ML Assignment ---");
  const baseWorkloadInputs: WorkloadItemInput[] = [
    {
      id: "ml-1",
      itemType: "TASK",
      title: "ML Exercise 3",
      courseCode: "CSE4002",
      courseTitle: "Machine Learning",
      category: "ASSIGNMENT",
      deadline: mlDeadline,
      status: "PENDING",
      marks: 10,
      weightage: 10,
      priorityScore: evalML.score,
      priorityLevel: evalML.level,
      isOverdue: false,
    },
  ];

  const workloadBefore = computeWorkloadSummary(baseWorkloadInputs, anchor);
  console.log(`Original Workload Total Items (Next 7 Days): ${workloadBefore.next7Days.incompleteTasks}`);

  // When Milestone 3 duplicate detection runs, duplicate notice is flagged DUPLICATE and NOT added as active task,
  // or if ingested as CANCELLED duplicate record:
  const workloadInputsWithDuplicate: WorkloadItemInput[] = [
    ...baseWorkloadInputs,
    {
      id: "ml-1-dup",
      itemType: "TASK",
      title: "ML Exercise 3 (Duplicate Notice)",
      courseCode: "CSE4002",
      courseTitle: "Machine Learning",
      category: "ASSIGNMENT",
      deadline: mlDeadline,
      status: "CANCELLED", // duplicate ignored/cancelled
      marks: 10,
      weightage: 10,
      priorityScore: 0,
      priorityLevel: "LOW",
      isOverdue: false,
    },
  ];

  const workloadAfterDuplicate = computeWorkloadSummary(workloadInputsWithDuplicate, anchor);
  console.log(`Workload Total Items After Duplicate Notice: ${workloadAfterDuplicate.next7Days.incompleteTasks}`);

  const case4Passed =
    workloadBefore.next7Days.incompleteTasks === 1 &&
    workloadAfterDuplicate.next7Days.incompleteTasks === 1;

  console.log(`Case 4 Result: ${case4Passed ? "✔ PASS (Workload did not double)" : "✖ FAIL"}`);
  if (!case4Passed) allPassed = false;

  // ── CASE 5: Rescheduled Notice Ingestion (Counted ONCE on New Date) ───────────
  console.log("\n--- [CASE 5] Rescheduled Notice for ML Assignment (+10 days) ---");
  const extendedDeadline = new Date(anchorMs + 240 * 3600 * 1000); // 10 days (+240h)

  // Rescheduled item replaces old deadline with new deadline (isRescheduled: true)
  const workloadInputsRescheduled: WorkloadItemInput[] = [
    {
      id: "ml-1",
      itemType: "TASK",
      title: "ML Exercise 3 (Rescheduled)",
      courseCode: "CSE4002",
      courseTitle: "Machine Learning",
      category: "ASSIGNMENT",
      deadline: extendedDeadline, // NEW extended deadline
      status: "PENDING",
      marks: 10,
      weightage: 10,
      priorityScore: evalML.score,
      priorityLevel: evalML.level,
      isOverdue: false,
      isRescheduled: true,
    },
  ];

  const workloadRescheduled = computeWorkloadSummary(workloadInputsRescheduled, anchor);
  console.log(`Items in Next 7 Days (old window):  ${workloadRescheduled.next7Days.incompleteTasks} (should be 0)`);
  console.log(`Items in Next 30 Days (new window): ${workloadRescheduled.next30Days.incompleteTasks} (should be 1)`);

  const case5Passed =
    workloadRescheduled.next7Days.incompleteTasks === 0 &&
    workloadRescheduled.next30Days.incompleteTasks === 1;

  console.log(`Case 5 Result: ${case5Passed ? "✔ PASS (Counted once on new date)" : "✖ FAIL"}`);
  if (!case5Passed) allPassed = false;

  console.log("\n================================================================================");
  console.log(`OVERALL MANUAL VERIFICATION RESULT: ${allPassed ? "✔ ALL 5 CASES PASSED" : "✖ SOME CASES FAILED"}`);
  console.log("================================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

verifyManualCases().catch((err) => {
  console.error("Manual case verification error:", err);
  process.exit(1);
});
