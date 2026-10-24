import { M3_TEST_FIXTURES, Milestone3TestCase } from "../lib/evaluation/m3-test-fixtures";
import { extractAcademicNotice } from "../lib/nlp/extractor";
import { checkAcademicChanges, ExistingKnowledgeState } from "../lib/nlp/change-intelligence";

async function runMilestone3Evaluation() {
  console.log("==================================================================================");
  console.log("🧪 ACADEMIC AI - MILESTONE 3: DUPLICATE & CHANGE INTELLIGENCE EVALUATION SUITE");
  console.log("==================================================================================\n");

  let totalCases = M3_TEST_FIXTURES.length;
  let correctRelationships = 0;

  let trueDuplicates = 0;
  let falseDuplicates = 0;
  let actualDuplicates = 0;
  let falseNonDuplicates = 0; // expected DUPLICATE, but predicted something else

  let totalExpectedChangedFields = 0;
  let correctChangedFields = 0;

  console.log("Running Evaluation across " + totalCases + " Benchmark Fixtures...\n");

  const results: Array<{
    id: string;
    label: string;
    coverage: string;
    expected: string;
    predicted: string;
    matchedTitle: string | null;
    reasonsCount: number;
    passed: boolean;
    errorNote?: string;
  }> = [];

  for (const fixture of M3_TEST_FIXTURES) {
    // 1. Run Milestone 2 NLP Extraction Pipeline with anchor date
    const analysis = extractAcademicNotice(fixture.incomingNoticeText, {
      referenceDate: fixture.referenceDate,
    });

    // 2. Prepare candidate existing records
    const existingState: ExistingKnowledgeState = {
      tasks: fixture.existingRecords.filter((r) => r.itemType === "TASK"),
      events: fixture.existingRecords.filter((r) => r.itemType === "EVENT"),
      exams: fixture.existingRecords.filter((r) => r.itemType === "EXAM"),
    };

    // 3. Run Milestone 3 Change Intelligence Engine
    const changeResult = checkAcademicChanges(analysis, existingState);

    // Evaluate Relationship
    const relationshipMatches = changeResult.relationship === fixture.expectedRelationship;
    if (relationshipMatches) {
      correctRelationships++;
    }

    // Evaluate Duplicate Metrics
    if (fixture.expectedRelationship === "DUPLICATE") {
      actualDuplicates++;
      if (changeResult.relationship === "DUPLICATE") {
        trueDuplicates++;
      } else {
        falseNonDuplicates++;
      }
    } else {
      if (changeResult.relationship === "DUPLICATE") {
        falseDuplicates++;
      }
    }

    // Evaluate Changed Field Detection
    if (fixture.expectedChangedFields && fixture.expectedChangedFields.length > 0) {
      totalExpectedChangedFields += fixture.expectedChangedFields.length;
      const detectedFieldNames = changeResult.changedFields.map((f) => f.field.toLowerCase());
      for (const expectedField of fixture.expectedChangedFields) {
        if (
          detectedFieldNames.includes(expectedField.toLowerCase()) ||
          // Allow interchangeability between "deadline" and "time" when rescheduling events/tasks
          (expectedField === "deadline" && detectedFieldNames.includes("time")) ||
          (expectedField === "time" && detectedFieldNames.includes("deadline"))
        ) {
          correctChangedFields++;
        }
      }
    }

    const passed = relationshipMatches;
    let errorNote: string | undefined;
    if (!relationshipMatches) {
      errorNote = `Expected ${fixture.expectedRelationship}, got ${changeResult.relationship}`;
    }

    results.push({
      id: fixture.id,
      label: fixture.label,
      coverage: fixture.categoryCoverage,
      expected: fixture.expectedRelationship,
      predicted: changeResult.relationship,
      matchedTitle: changeResult.matchedRecord?.title || null,
      reasonsCount: changeResult.matchingReasons.length,
      passed,
      errorNote,
    });

    const statusIcon = passed ? "✅" : "❌";
    console.log(
      `  ${statusIcon} [${fixture.id}] ${fixture.label.padEnd(46)} | Exp: ${fixture.expectedRelationship.padEnd(11)} | Got: ${changeResult.relationship.padEnd(11)} | Reasons: ${changeResult.matchingReasons.length}`
    );
    if (!passed) {
      console.log(`     ⚠️  Mismatch details: ${errorNote}`);
    }
  }

  // 4. Calculate Mathematical Evaluation Metrics
  const duplicatePrecision =
    trueDuplicates + falseDuplicates > 0
      ? trueDuplicates / (trueDuplicates + falseDuplicates)
      : 1.0;

  const duplicateRecall =
    actualDuplicates > 0 ? trueDuplicates / actualDuplicates : 1.0;

  const relationshipAccuracy = correctRelationships / totalCases;

  const changedFieldAccuracy =
    totalExpectedChangedFields > 0
      ? correctChangedFields / totalExpectedChangedFields
      : 1.0;

  console.log("\n==================================================================================");
  console.log("📊 MILESTONE 3 MEASURABLE EVALUATION METRICS (FROM ACTUAL FIXTURES)");
  console.log("==================================================================================");
  console.log(`  • Duplicate Detection Precision    : ${(duplicatePrecision * 100).toFixed(2)}% (${trueDuplicates} / ${trueDuplicates + falseDuplicates} predicted duplicates)`);
  console.log(`  • Duplicate Detection Recall       : ${(duplicateRecall * 100).toFixed(2)}% (${trueDuplicates} / ${actualDuplicates} actual duplicates)`);
  console.log(`  • Relationship Classification Acc  : ${(relationshipAccuracy * 100).toFixed(2)}% (${correctRelationships} / ${totalCases} test cases)`);
  console.log(`  • Correct Changed-Field Detection  : ${(changedFieldAccuracy * 100).toFixed(2)}% (${correctChangedFields} / ${totalExpectedChangedFields} fields correctly identified)`);
  console.log("==================================================================================\n");

  // Print Detailed Fixture Summary Table
  console.log("Detailed Breakdown of 16 Category Coverage Cases:");
  console.table(
    results.map((r) => ({
      ID: r.id,
      Category: r.coverage,
      Expected: r.expected,
      Predicted: r.predicted,
      MatchedRecord: r.matchedTitle || "None (New)",
      Reasons: r.reasonsCount,
      Pass: r.passed ? "PASS" : "FAIL",
    }))
  );

  if (relationshipAccuracy < 0.90) {
    throw new Error(`Evaluation failed to meet minimum 90% accuracy target: ${(relationshipAccuracy * 100).toFixed(2)}%`);
  }

  console.log("\n🎉 ALL MILESTONE 3 TESTS & EVALUATION METRICS VERIFIED SUCCESSFULLY!\n");
}

runMilestone3Evaluation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Evaluation Suite failed:", err);
    process.exit(1);
  });
