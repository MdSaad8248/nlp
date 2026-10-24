/**
 * scripts/test-milestone8-rubric.ts
 *
 * Milestone 8-C — Rubric & Requirement Intelligence Evaluation Suite
 * Evaluates rubric parsing, marks extraction, mandatory/optional detection,
 * task-to-requirement completion linking, and grounded query resolution
 * across 16 comprehensive scenarios.
 */

import { RubricEngine } from "../lib/intelligence/rubric-engine";
import { RubricStore } from "../lib/intelligence/rubric-store";
import { M8_RUBRIC_SCENARIOS, RubricScenario } from "../lib/evaluation/m8-rubric-fixtures";

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  errors: string[];
}

async function runRubricEvaluation() {
  console.log("================================================================================");
  console.log("  ACADEMICAI — MILESTONE 8-C: RUBRIC & REQUIREMENT INTELLIGENCE SUITE");
  console.log("================================================================================\n");

  const results: TestResult[] = [];
  let passedCount = 0;

  for (const scenario of M8_RUBRIC_SCENARIOS) {
    const errors: string[] = [];
    let parsed: any = null;

    try {
      parsed = RubricEngine.parseRubric(scenario.rawText, {
        taskTitleHint: scenario.expected.taskTitle,
        courseCodeHint: scenario.expected.courseCode,
      });

      // 1. Check isMalformed
      if (scenario.expected.isMalformed !== undefined) {
        if (parsed.isMalformed !== scenario.expected.isMalformed) {
          errors.push(
            `Expected isMalformed=${scenario.expected.isMalformed}, but got ${parsed.isMalformed}`
          );
        }
      }

      // 2. Check minRequirements
      if (scenario.expected.minRequirements !== undefined) {
        if (parsed.requirements.length < scenario.expected.minRequirements) {
          errors.push(
            `Expected at least ${scenario.expected.minRequirements} requirements, but got ${parsed.requirements.length}`
          );
        }
      }

      // 3. Check expectedTotalMarks
      if (scenario.expected.expectedTotalMarks !== undefined) {
        if (parsed.totalMarks !== scenario.expected.expectedTotalMarks) {
          errors.push(
            `Expected totalMarks=${scenario.expected.expectedTotalMarks}, but got ${parsed.totalMarks}`
          );
        }
      }

      // 4. Check highest mark component
      const summary = RubricEngine.getStatusSummary(parsed);
      if (scenario.expected.expectedHighestMarks !== undefined) {
        if (summary.highestMarkRequirement?.marks !== scenario.expected.expectedHighestMarks) {
          errors.push(
            `Expected highest marks=${scenario.expected.expectedHighestMarks}, but got ${summary.highestMarkRequirement?.marks}`
          );
        }
      }

      if (scenario.expected.expectedHighestMarkTitle) {
        const hTitle = summary.highestMarkRequirement?.title?.toLowerCase() || "";
        if (!hTitle.includes(scenario.expected.expectedHighestMarkTitle.toLowerCase())) {
          errors.push(
            `Expected highest mark title containing "${scenario.expected.expectedHighestMarkTitle}", but got "${summary.highestMarkRequirement?.title}"`
          );
        }
      }

      // 5. Check optional / bonus requirements
      if (scenario.expected.hasOptionalRequirements) {
        const hasOpt = parsed.requirements.some((r: any) => !r.isMandatory);
        if (!hasOpt) {
          errors.push(`Expected optional/bonus requirements, but all were marked mandatory.`);
        }
      }

      // 6. Check task completion linking
      if (scenario.completedItems && scenario.completedItems.length > 0) {
        parsed = RubricEngine.linkTaskStatus(parsed, scenario.completedItems);
        const linkedSummary = RubricEngine.getStatusSummary(parsed);

        if (
          scenario.expected.expectedCompletedCount !== undefined &&
          linkedSummary.completedCount !== scenario.expected.expectedCompletedCount
        ) {
          errors.push(
            `Expected completedCount=${scenario.expected.expectedCompletedCount}, but got ${linkedSummary.completedCount}`
          );
        }
        if (
          scenario.expected.expectedMissingCount !== undefined &&
          linkedSummary.missingCount !== scenario.expected.expectedMissingCount
        ) {
          errors.push(
            `Expected missingCount=${scenario.expected.expectedMissingCount}, but got ${linkedSummary.missingCount}`
          );
        }
      }

      // 7. Check query handling
      if (scenario.category === "QUERY" && scenario.expected.query) {
        RubricStore.registerRubric(parsed);
        const queryRes = RubricStore.handleAssistantQuery(scenario.expected.query);

        if (!queryRes.matched) {
          errors.push(`Expected query "${scenario.expected.query}" to match, but matched=false`);
        }
        if (!queryRes.answer || queryRes.answer.length < 20) {
          errors.push(`Query response was empty or too brief.`);
        }
      }

      // 8. Evidence preservation
      if (!parsed.isMalformed) {
        for (const req of parsed.requirements) {
          if (!req.sourceEvidence?.snippet) {
            errors.push(`Requirement "${req.title}" missing source evidence snippet.`);
            break;
          }
        }
      }

      const passed = errors.length === 0;
      if (passed) passedCount++;

      let details = "";
      if (parsed.isMalformed) {
        details = `Malformed document gracefully handled (${parsed.warnings[0] || "No criteria"})`;
      } else if (scenario.category === "QUERY") {
        details = `Query answered: "${scenario.expected.query}"`;
      } else {
        details = `Criteria: ${parsed.requirements.length} | Marks: ${parsed.totalMarks || "N/A"} | Highest: ${summary.highestMarkRequirement?.title || "N/A"} (${summary.highestMarkRequirement?.marks || 0}m)`;
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

  // Report table
  console.log(
    "| ID        | Scenario Name                                            | Status | Details"
  );
  console.log(
    "|-----------|----------------------------------------------------------|--------|-------------------------------------------------"
  );

  for (const r of results) {
    const statusStr = r.passed ? "PASS" : "FAIL";
    const namePadded = r.name.padEnd(56).slice(0, 56);
    console.log(`| ${r.id.padEnd(9)} | ${namePadded} | ${statusStr.padEnd(6)} | ${r.details}`);
    if (!r.passed) {
      r.errors.forEach((e) => console.log(`  └─ ERROR: ${e}`));
    }
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`  RESULTS: ${passedCount} / ${M8_RUBRIC_SCENARIOS.length} PASSED (${Math.round((passedCount / M8_RUBRIC_SCENARIOS.length) * 100)}%)`);
  console.log("--------------------------------------------------------------------------------\n");

  if (passedCount < M8_RUBRIC_SCENARIOS.length) {
    process.exit(1);
  }
}

runRubricEvaluation();
