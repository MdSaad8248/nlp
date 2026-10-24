/**
 * scripts/test-milestone8-syllabus.ts
 *
 * Milestone 8-A — Syllabus Intelligence Evaluation Suite
 * Evaluates syllabus parsing, module extraction, topic identification,
 * assessment breakdown, evidence grounding, malformed input handling,
 * and cross-referencing queries across 16 scenarios.
 */

import { SyllabusEngine } from "../lib/intelligence/syllabus-engine";
import { SyllabusStore } from "../lib/intelligence/syllabus-store";
import { M8_SYLLABUS_SCENARIOS, SyllabusScenario } from "../lib/evaluation/m8-syllabus-fixtures";

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  errors: string[];
}

async function runSyllabusEvaluation() {
  console.log("================================================================================");
  console.log("  ACADEMICAI — MILESTONE 8-A: SYLLABUS INTELLIGENCE EVALUATION SUITE");
  console.log("================================================================================\n");

  const results: TestResult[] = [];
  let passedCount = 0;

  for (const scenario of M8_SYLLABUS_SCENARIOS) {
    const errors: string[] = [];
    let parsed: any = null;

    try {
      if (scenario.category === "QUERY") {
        // Query evaluation
        parsed = SyllabusEngine.parseSyllabus(scenario.rawText, {
          defaultCourseCode: scenario.expected.courseCode,
        });
        SyllabusStore.registerSyllabus(parsed);

        const queryRes = SyllabusStore.query(scenario.expected.query!, scenario.expected.courseCode);

        if (!queryRes.matched) {
          errors.push(`Query "${scenario.expected.query}" did not match any syllabus module.`);
        } else if (
          scenario.expected.expectedMatchedModuleNumber !== undefined &&
          queryRes.moduleMatch?.moduleNumber !== scenario.expected.expectedMatchedModuleNumber
        ) {
          errors.push(
            `Expected module ${scenario.expected.expectedMatchedModuleNumber}, but got module ${queryRes.moduleMatch?.moduleNumber} (${queryRes.moduleMatch?.moduleTitle})`
          );
        }

        if (queryRes.evidence.length === 0) {
          errors.push(`Expected evidence snippet for query, but none was returned.`);
        }
      } else {
        // Standard parsing evaluation
        parsed = SyllabusEngine.parseSyllabus(scenario.rawText, {
          defaultCourseCode: scenario.expected.courseCode,
        });

        // 1. Check malformed flag
        if (scenario.expected.isMalformed !== undefined) {
          if (parsed.isMalformed !== scenario.expected.isMalformed) {
            errors.push(
              `Expected isMalformed=${scenario.expected.isMalformed}, got isMalformed=${parsed.isMalformed}`
            );
          }
        }

        // 2. Course Code verification
        if (scenario.expected.courseCode) {
          if (parsed.courseCode !== scenario.expected.courseCode) {
            errors.push(`Expected courseCode=${scenario.expected.courseCode}, got ${parsed.courseCode}`);
          }
        }

        // 3. Modules Count verification
        if (scenario.expected.minModules !== undefined) {
          if (parsed.modules.length < scenario.expected.minModules) {
            errors.push(
              `Expected at least ${scenario.expected.minModules} modules, got ${parsed.modules.length}`
            );
          }
        }

        // 4. Expected Module Titles
        if (scenario.expected.expectedModuleTitles) {
          for (const title of scenario.expected.expectedModuleTitles) {
            const hasTitle = parsed.modules.some((m: any) =>
              m.title.toLowerCase().includes(title.toLowerCase())
            );
            if (!hasTitle) {
              errors.push(`Expected module title containing "${title}" not found in parsed modules.`);
            }
          }
        }

        // 5. Assessments verification
        if (scenario.expected.expectedAssessments) {
          for (const expAss of scenario.expected.expectedAssessments) {
            const found = parsed.assessments.find((a: any) => a.category === expAss.category);
            if (!found) {
              errors.push(`Expected assessment category "${expAss.category}" not found.`);
            } else {
              if (
                expAss.weightagePercentage !== undefined &&
                found.weightagePercentage !== expAss.weightagePercentage
              ) {
                errors.push(
                  `Expected ${expAss.category} weightage=${expAss.weightagePercentage}%, got ${found.weightagePercentage}%`
                );
              }
              if (expAss.marks !== undefined && found.marks !== expAss.marks) {
                errors.push(`Expected ${expAss.category} marks=${expAss.marks}, got ${found.marks}`);
              }
            }
          }
        }

        // 6. Source Evidence preservation
        if (!parsed.isMalformed && parsed.sourceEvidences.length === 0) {
          errors.push(`Source evidence was empty for non-malformed syllabus.`);
        }
      }

      const passed = errors.length === 0;
      if (passed) passedCount++;

      let details = "";
      if (scenario.category === "QUERY") {
        details = `Query: "${scenario.expected.query}" -> Matched Module ${parsed ? "Verified" : ""}`;
      } else {
        details = `Course: ${parsed.courseCode} | Modules: ${parsed.modules.length} | Assessments: ${parsed.assessments.length} | Evidence: ${parsed.sourceEvidences.length} items`;
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
        details: `Exception thrown: ${err.message}`,
        errors: [err.message],
      });
    }
  }

  // Report table
  console.log(
    "| ID     | Scenario Name                                            | Status | Details"
  );
  console.log(
    "|--------|----------------------------------------------------------|--------|-------------------------------------------------"
  );

  for (const r of results) {
    const statusStr = r.passed ? "PASS" : "FAIL";
    const namePadded = r.name.padEnd(56).slice(0, 56);
    console.log(`| ${r.id.padEnd(6)} | ${namePadded} | ${statusStr.padEnd(6)} | ${r.details}`);
    if (!r.passed) {
      r.errors.forEach((e) => console.log(`  └─ ERROR: ${e}`));
    }
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`  RESULTS: ${passedCount} / ${M8_SYLLABUS_SCENARIOS.length} PASSED (${Math.round((passedCount / M8_SYLLABUS_SCENARIOS.length) * 100)}%)`);
  console.log("--------------------------------------------------------------------------------\n");

  if (passedCount < M8_SYLLABUS_SCENARIOS.length) {
    process.exit(1);
  }
}

runSyllabusEvaluation();
