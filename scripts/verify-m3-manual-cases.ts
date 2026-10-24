import { extractAcademicNotice } from "../lib/nlp/extractor";
import { checkAcademicChanges, ExistingKnowledgeState } from "../lib/nlp/change-intelligence";
import { M3_TEST_ANCHOR_DATE } from "../lib/evaluation/m3-test-fixtures";

async function verifyManualCases() {
  console.log("==================================================================================");
  console.log("🔍 MANUAL VERIFICATION SUITE: CASES A, B, C, D (EXACT PROMPT SPECIFICATION)");
  console.log("==================================================================================\n");

  let allPassed = true;

  // ─────────────────────────────────────────────────────────────
  // CASE A: Rescheduled Review
  // Existing: NLP Project Review — Friday 2 PM
  // Incoming: "The NLP project review has been shifted from Friday at 2 PM to Monday at 3 PM."
  // Expected: RESCHEDULED, Old = Friday 2 PM, New = Monday 3 PM
  // ─────────────────────────────────────────────────────────────
  console.log("--- CASE A: Rescheduled Review ---");
  const caseA_Text = "The NLP project review has been shifted from Friday at 2 PM to Monday at 3 PM.";
  const caseA_Existing: ExistingKnowledgeState = {
    tasks: [],
    events: [
      {
        id: "event-a",
        itemType: "EVENT",
        title: "NLP Project Review",
        category: "REVIEW",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        startTime: new Date("2026-09-25T08:30:00.000Z"), // Friday Sep 25, 2026 at 2:00 PM IST
        endTime: new Date("2026-09-25T09:30:00.000Z"),
        normalizedDeadline: "September 25, 2026 at 2:00 PM",
      },
    ],
    exams: [],
  };

  const caseA_Analysis = extractAcademicNotice(caseA_Text, { referenceDate: M3_TEST_ANCHOR_DATE });
  const caseA_Result = checkAcademicChanges(caseA_Analysis, caseA_Existing);

  const caseA_RelPassed = caseA_Result.relationship === "RESCHEDULED";
  const caseA_Diff = caseA_Result.changedFields.find((f) => f.field === "deadline" || f.field === "time");
  const oldValLower = (caseA_Diff?.oldValue || "").toLowerCase();
  const newValLower = (caseA_Diff?.newValue || "").toLowerCase();
  const caseA_OldPassed = Boolean(oldValLower.includes("25") && (oldValLower.includes("september") || oldValLower.includes("sep")) && oldValLower.includes("2:00"));
  const caseA_NewPassed = Boolean(newValLower.includes("21") && (newValLower.includes("september") || newValLower.includes("sep")) && newValLower.includes("3:00"));

  console.log(`  Relationship : ${caseA_Result.relationship} (Expected: RESCHEDULED) -> ${caseA_RelPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Old DateTime : ${caseA_Diff?.oldValue} -> ${caseA_OldPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  New DateTime : ${caseA_Diff?.newValue} -> ${caseA_NewPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Reasons      :\n    ${caseA_Result.matchingReasons.join("\n    ")}`);

  if (!caseA_RelPassed || !caseA_OldPassed || !caseA_NewPassed) allPassed = false;

  // ─────────────────────────────────────────────────────────────
  // CASE B: Duplicate Assignment Reminder
  // Existing: NLP Assignment 2 — Sep 20, 11:59 PM
  // Incoming: "Reminder: NLP Assignment 2 is due September 20 at 11:59 PM through VTOP."
  // Expected: DUPLICATE, No second task created.
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- CASE B: Duplicate Assignment Reminder ---");
  const caseB_Text = "Reminder: NLP Assignment 2 is due September 20 at 11:59 PM through VTOP.";
  const caseB_Existing: ExistingKnowledgeState = {
    tasks: [
      {
        id: "task-b",
        itemType: "TASK",
        title: "NLP Assignment 2",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"), // Sep 20, 2026, 11:59 PM IST
        normalizedDeadline: "September 20, 2026 at 11:59 PM",
        submissionPlatform: "VTOP",
        marks: 20,
        status: "PENDING",
      },
    ],
    events: [],
    exams: [],
  };

  const caseB_Analysis = extractAcademicNotice(caseB_Text, { referenceDate: M3_TEST_ANCHOR_DATE });
  const caseB_Result = checkAcademicChanges(caseB_Analysis, caseB_Existing);

  const caseB_RelPassed = caseB_Result.relationship === "DUPLICATE";
  const caseB_ActionPassed = caseB_Result.proposedAction === "MARK_DUPLICATE";
  const caseB_NoChangesPassed = caseB_Result.changedFields.length === 0;

  console.log(`  Relationship   : ${caseB_Result.relationship} (Expected: DUPLICATE) -> ${caseB_RelPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Proposed Action: ${caseB_Result.proposedAction} (Expected: MARK_DUPLICATE) -> ${caseB_ActionPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  No 2nd Task    : 0 changed fields, action prevents re-creation -> ${caseB_NoChangesPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Reasons        :\n    ${caseB_Result.matchingReasons.join("\n    ")}`);

  if (!caseB_RelPassed || !caseB_ActionPassed || !caseB_NoChangesPassed) allPassed = false;

  // ─────────────────────────────────────────────────────────────
  // CASE C: Updated Marks
  // Existing: NLP Assignment 2 — 20 marks
  // Incoming: "NLP Assignment 2 will now carry 25 marks."
  // Expected: UPDATED, Changed field: marks, 20 → 25
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- CASE C: Updated Marks ---");
  const caseC_Text = "NLP Assignment 2 will now carry 25 marks.";
  const caseC_Existing: ExistingKnowledgeState = {
    tasks: [
      {
        id: "task-c",
        itemType: "TASK",
        title: "NLP Assignment 2",
        category: "ASSIGNMENT",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        deadline: new Date("2026-09-20T18:29:00.000Z"),
        normalizedDeadline: "September 20, 2026 at 11:59 PM",
        marks: 20,
        submissionPlatform: "VTOP",
        status: "PENDING",
      },
    ],
    events: [],
    exams: [],
  };

  const caseC_Analysis = extractAcademicNotice(caseC_Text, { referenceDate: M3_TEST_ANCHOR_DATE });
  const caseC_Result = checkAcademicChanges(caseC_Analysis, caseC_Existing);

  const caseC_RelPassed = caseC_Result.relationship === "UPDATED";
  const caseC_MarksDiff = caseC_Result.changedFields.find((f) => f.field === "marks");
  const caseC_DiffPassed = Boolean(caseC_MarksDiff?.oldValue?.includes("20") && caseC_MarksDiff?.newValue?.includes("25"));

  console.log(`  Relationship   : ${caseC_Result.relationship} (Expected: UPDATED) -> ${caseC_RelPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Changed Field  : ${caseC_MarksDiff?.field} (${caseC_MarksDiff?.oldValue} → ${caseC_MarksDiff?.newValue}) -> ${caseC_DiffPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Proposed Action: ${caseC_Result.proposedAction} (Expected: UPDATE_EXISTING) -> ${caseC_Result.proposedAction === "UPDATE_EXISTING" ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Reasons        :\n    ${caseC_Result.matchingReasons.join("\n    ")}`);

  if (!caseC_RelPassed || !caseC_DiffPassed) allPassed = false;

  // ─────────────────────────────────────────────────────────────
  // CASE D: Cancelled Review
  // Existing: NLP Project Review — Monday 3 PM
  // Incoming: "The NLP project review scheduled for Monday has been cancelled."
  // Expected: CANCELLED, Existing event marked cancelled instead of creating new
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- CASE D: Cancelled Review ---");
  const caseD_Text = "The NLP project review scheduled for Monday has been cancelled.";
  const caseD_Existing: ExistingKnowledgeState = {
    tasks: [],
    events: [
      {
        id: "event-d",
        itemType: "EVENT",
        title: "NLP Project Review",
        category: "REVIEW",
        courseCode: "CSE4001",
        courseTitle: "Natural Language Processing",
        startTime: new Date("2026-09-21T09:30:00.000Z"), // Monday 3 PM
        endTime: new Date("2026-09-21T10:30:00.000Z"),
        status: "ACTIVE",
      },
    ],
    exams: [],
  };

  const caseD_Analysis = extractAcademicNotice(caseD_Text, { referenceDate: M3_TEST_ANCHOR_DATE });
  const caseD_Result = checkAcademicChanges(caseD_Analysis, caseD_Existing);

  const caseD_RelPassed = caseD_Result.relationship === "CANCELLED";
  const caseD_StatusDiff = caseD_Result.changedFields.find((f) => f.field === "status");
  const caseD_DiffPassed = caseD_StatusDiff?.newValue === "CANCELLED";
  const caseD_ActionPassed = caseD_Result.proposedAction === "CANCEL_EXISTING";

  console.log(`  Relationship   : ${caseD_Result.relationship} (Expected: CANCELLED) -> ${caseD_RelPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Changed Field  : ${caseD_StatusDiff?.field} (${caseD_StatusDiff?.oldValue} → ${caseD_StatusDiff?.newValue}) -> ${caseD_DiffPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Proposed Action: ${caseD_Result.proposedAction} (Expected: CANCEL_EXISTING) -> ${caseD_ActionPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Reasons        :\n    ${caseD_Result.matchingReasons.join("\n    ")}`);

  if (!caseD_RelPassed || !caseD_DiffPassed || !caseD_ActionPassed) allPassed = false;

  console.log("\n==================================================================================");
  if (allPassed) {
    console.log("🎉 ALL 4 MANUAL VERIFICATION CASES (A, B, C, D) PASSED WITH 100% ACCURACY!");
  } else {
    console.error("❌ Some manual verification cases failed.");
    process.exit(1);
  }
  console.log("==================================================================================\n");
}

verifyManualCases()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Manual verification failed:", err);
    process.exit(1);
  });
