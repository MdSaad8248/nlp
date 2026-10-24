/**
 * scripts/test-milestone8-contradiction.ts
 *
 * Milestone 8-B — Academic Contradiction Detection Evaluation Suite
 * Evaluates conflicting academic information detection across 16 scenarios:
 * - Schedule, deadline, venue, platform, marks, and exam conflicts
 * - Source A and Source B preservation with evidence snippets
 * - Distinguishing legitimate explicit updates from unverified conflicts
 * - Ensuring "Conflict requires verification" is preferred over guessing
 */

import { ContradictionDetector } from "../lib/nlp/contradiction-detector";
import { checkAcademicChanges, ExistingKnowledgeState } from "../lib/nlp/change-intelligence";
import { processAcademicNotice } from "../lib/nlp/pipeline";
import { M8_CONTRADICTION_SCENARIOS, ContradictionScenario } from "../lib/evaluation/m8-contradiction-fixtures";

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  errors: string[];
}

async function runContradictionEvaluation() {
  console.log("================================================================================");
  console.log("  ACADEMICAI — MILESTONE 8-B: ACADEMIC CONTRADICTION DETECTION SUITE");
  console.log("================================================================================\n");

  const results: TestResult[] = [];
  let passedCount = 0;

  for (const scenario of M8_CONTRADICTION_SCENARIOS) {
    const errors: string[] = [];

    try {
      // 1. Process incoming notice through M2 NLP Pipeline
      const nlpAnalysis = await processAcademicNotice(scenario.incomingNotice.rawText);

      // 2. Run M3 Change Intelligence with existing state containing the scenario's existing record
      const existingState: ExistingKnowledgeState = {
        tasks: scenario.existingRecord.itemType === "TASK" ? [scenario.existingRecord] : [],
        events: scenario.existingRecord.itemType === "EVENT" ? [scenario.existingRecord] : [],
        exams: scenario.existingRecord.itemType === "EXAM" ? [scenario.existingRecord] : [],
      };

      const changeResult = checkAcademicChanges(nlpAnalysis, existingState);

      // Construct candidate item using all extracted entities and temporal results
      const eventOrExamOrTask =
        nlpAnalysis.events[0] ||
        nlpAnalysis.exams?.[0] ||
        nlpAnalysis.tasks[0] || {
          title: scenario.incomingNotice.title,
          itemType: scenario.existingRecord.itemType,
          courseCode: scenario.existingRecord.courseCode,
        };

      const candStartTime =
        (eventOrExamOrTask as any).startTime ||
        (eventOrExamOrTask as any).examDate ||
        nlpAnalysis.temporalSpans?.find((s) => s.raw.includes(":") && s.iso)?.iso ||
        nlpAnalysis.temporalSpans?.find((s) => s.iso)?.iso ||
        null;

      const candDeadline =
        (eventOrExamOrTask as any).deadline ||
        nlpAnalysis.temporalSpans?.find((s) => s.type === "deadline" && s.iso)?.iso ||
        nlpAnalysis.temporalSpans?.find((s) => s.type === "date" && s.iso)?.iso ||
        null;

      const candVenue =
        (eventOrExamOrTask as any).venue ||
        nlpAnalysis.keyEntities?.venues?.[0] ||
        null;

      const candPlatform =
        (eventOrExamOrTask as any).submissionPlatform ||
        nlpAnalysis.keyEntities?.platforms?.[0] ||
        null;

      const marksVal = nlpAnalysis.entities.find((e) => e.type === "MARKS_WEIGHTAGE")?.normalizedValue;
      const candMarks =
        (eventOrExamOrTask as any).marks ||
        (marksVal ? parseInt(marksVal, 10) : null) ||
        null;

      const directResult = ContradictionDetector.detectContradiction(
        {
          title: (eventOrExamOrTask as any).title || scenario.incomingNotice.title,
          itemType: scenario.existingRecord.itemType,
          courseCode: (eventOrExamOrTask as any).courseCode || scenario.existingRecord.courseCode,
          deadline: candDeadline,
          startTime: candStartTime,
          venue: candVenue,
          submissionPlatform: candPlatform,
          marks: candMarks,
        },
        scenario.existingRecord,
        {
          sourceTitle: scenario.incomingNotice.title,
          rawText: scenario.incomingNotice.rawText,
          channel: scenario.incomingNotice.channel,
          existingSourceTitle: scenario.existingRecord.title,
        }
      );

      const hasContradiction = changeResult.contradiction !== undefined || directResult.hasContradiction;
      const contradiction = (changeResult.contradiction as any) || directResult.contradictions[0];

      // Verification 1: hasContradiction flag
      if (hasContradiction !== scenario.expected.hasContradiction) {
        errors.push(
          `Expected hasContradiction=${scenario.expected.hasContradiction}, but got ${hasContradiction}`
        );
      }

      // Verification 2: Check conflict type if contradiction expected
      if (scenario.expected.hasContradiction) {
        if (!contradiction) {
          errors.push(`Expected contradiction object to be populated, but it was undefined.`);
        } else {
          if (scenario.expected.conflictingField && contradiction.field !== scenario.expected.conflictingField) {
            errors.push(
              `Expected conflicting field "${scenario.expected.conflictingField}", but got "${contradiction.field}"`
            );
          }
          if (
            scenario.expected.conflictType &&
            contradiction.conflictType !== scenario.expected.conflictType
          ) {
            errors.push(
              `Expected conflictType "${scenario.expected.conflictType}", but got "${contradiction.conflictType}"`
            );
          }

          // Verify Source A and Source B evidence preservation
          if (!contradiction.sourceA?.value || !contradiction.sourceB?.value) {
            errors.push(`Contradiction must retain values for both Source A and Source B.`);
          }
          if (!contradiction.sourceA?.evidenceSnippet || !contradiction.sourceB?.evidenceSnippet) {
            errors.push(`Contradiction must preserve evidence snippets for both sources.`);
          }

          // Verify resolution status recommends verification rather than guessing
          if (
            scenario.expected.requiresVerification &&
            contradiction.resolutionStatus !== "REQUIRES_VERIFICATION"
          ) {
            errors.push(
              `Expected resolutionStatus="REQUIRES_VERIFICATION", but got "${contradiction.resolutionStatus}"`
            );
          }
        }
      }

      const passed = errors.length === 0;
      if (passed) passedCount++;

      let details = "";
      if (scenario.expected.hasContradiction) {
        details = `Conflict: [${contradiction?.field || "detected"}] | Source A: ${contradiction?.sourceA?.value} vs Source B: ${contradiction?.sourceB?.value}`;
      } else {
        details = `Clean resolution: ${changeResult.relationship} (No unverified contradiction)`;
      }

      results.push({
        id: scenario.id,
        name: scenario.name,
        passed,
        details,
        errors,
      });
    } catch (err: any) {
      results.push({
        id: scenario.id,
        name: scenario.name,
        passed: false,
        details: `Exception: ${err.message}`,
        errors: [err.message],
      });
    }
  }

  // Report Table
  console.log(
    "| ID          | Scenario Name                                            | Status | Details"
  );
  console.log(
    "|-------------|----------------------------------------------------------|--------|-------------------------------------------------"
  );

  for (const r of results) {
    const statusStr = r.passed ? "PASS" : "FAIL";
    const namePadded = r.name.padEnd(56).slice(0, 56);
    console.log(`| ${r.id.padEnd(11)} | ${namePadded} | ${statusStr.padEnd(6)} | ${r.details}`);
    if (!r.passed) {
      r.errors.forEach((e) => console.log(`  └─ ERROR: ${e}`));
    }
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`  RESULTS: ${passedCount} / ${M8_CONTRADICTION_SCENARIOS.length} PASSED (${Math.round((passedCount / M8_CONTRADICTION_SCENARIOS.length) * 100)}%)`);
  console.log("--------------------------------------------------------------------------------\n");

  if (passedCount < M8_CONTRADICTION_SCENARIOS.length) {
    process.exit(1);
  }
}

runContradictionEvaluation();
