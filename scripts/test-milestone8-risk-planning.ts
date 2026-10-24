/**
 * scripts/test-milestone8-risk-planning.ts
 *
 * Milestone 8-D — Academic Risk Radar + Smart Planning Evaluation Suite
 * Evaluates academic risk detection (deadline clusters, exam collisions, overdue deliverables,
 * course overload, rubric penalties) and deterministic smart planning ranking across 21 scenarios.
 */

import { AcademicRiskRadar } from "../lib/intelligence/academic-risk-radar";
import { SmartPlanner } from "../lib/intelligence/smart-planner";
import { M8_RISK_PLANNING_SCENARIOS, M8RiskPlanningScenario } from "../lib/evaluation/m8-risk-planning-fixtures";

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  errors: string[];
}

async function runRiskPlanningEvaluation() {
  console.log("================================================================================");
  console.log("  ACADEMICAI — MILESTONE 8-D: ACADEMIC RISK RADAR & SMART PLANNING SUITE");
  console.log("================================================================================\n");

  const results: TestResult[] = [];
  let passedCount = 0;

  for (const scenario of M8_RISK_PLANNING_SCENARIOS) {
    const errors: string[] = [];

    try {
      // 1. Evaluate Academic Risk Radar
      const riskReport = AcademicRiskRadar.evaluateRisk(scenario.input);

      // Verify Expected Risk Level
      if (scenario.expected.expectedRiskLevel) {
        if (riskReport.overallRiskLevel !== scenario.expected.expectedRiskLevel) {
          errors.push(
            `Risk Level mismatch: Expected ${scenario.expected.expectedRiskLevel}, got ${riskReport.overallRiskLevel} (score=${riskReport.riskScore})`
          );
        }
      }

      // Verify Expected Trigger Types
      if (scenario.expected.expectedTriggerTypes && scenario.expected.expectedTriggerTypes.length > 0) {
        for (const expectedType of scenario.expected.expectedTriggerTypes) {
          const found = riskReport.mainTriggers.some((t) => t.type === expectedType);
          if (!found) {
            errors.push(
              `Expected trigger type '${expectedType}' not found in report triggers: [${riskReport.mainTriggers.map((t) => t.type).join(", ")}]`
            );
          }
        }
      }

      // Verify Highest Risk Course
      if (scenario.expected.highestRiskCourse) {
        if (riskReport.highestRiskCourse !== scenario.expected.highestRiskCourse) {
          errors.push(
            `Highest risk course mismatch: Expected ${scenario.expected.highestRiskCourse}, got ${riskReport.highestRiskCourse}`
          );
        }
      }

      // 2. Evaluate Smart Academic Plan (if planner tasks are provided)
      if (scenario.plannerTasks) {
        const plan = SmartPlanner.generateSmartPlan(scenario.plannerTasks, {
          referenceDate: scenario.referenceDate,
          ...scenario.plannerOptions,
        });

        if (scenario.expected.smartPlan) {
          const exp = scenario.expected.smartPlan;

          if (exp.minSessionsCount !== undefined) {
            if (plan.sessions.length < exp.minSessionsCount) {
              errors.push(
                `Expected at least ${exp.minSessionsCount} planned sessions, got ${plan.sessions.length}`
              );
            }
          }

          if (exp.expectedFirstFocusContains) {
            const firstTitle = plan.nextImmediateFocus?.taskTitle || "";
            if (!firstTitle.toLowerCase().includes(exp.expectedFirstFocusContains.toLowerCase())) {
              errors.push(
                `First focus taskTitle expected to contain '${exp.expectedFirstFocusContains}', got '${firstTitle}'`
              );
            }
          }

          if (exp.expectedMarksCoveredMin !== undefined) {
            if (plan.totalMarksCovered < exp.expectedMarksCoveredMin) {
              errors.push(
                `Expected at least ${exp.expectedMarksCoveredMin} marks covered, got ${plan.totalMarksCovered}`
              );
            }
          }

          if (exp.mustContainWhyNowReason) {
            const allWhyNow = plan.sessions.flatMap((s) => s.whyNow).join(" ");
            if (!allWhyNow.toLowerCase().includes(exp.mustContainWhyNowReason.toLowerCase())) {
              errors.push(
                `Expected 'Why now?' to mention '${exp.mustContainWhyNowReason}', got: '${allWhyNow}'`
              );
            }
          }
        }
      }

      const passed = errors.length === 0;
      if (passed) passedCount++;

      results.push({
        id: scenario.id,
        name: scenario.name,
        passed,
        details: `Risk: ${riskReport.overallRiskLevel} (Score: ${riskReport.riskScore}) | Triggers: ${riskReport.mainTriggers.length}`,
        errors,
      });

      console.log(
        `${passed ? "✓ PASS" : "✗ FAIL"} [${scenario.id}] ${scenario.name}`
      );
      if (!passed) {
        errors.forEach((err) => console.log(`       → ERROR: ${err}`));
      }
    } catch (err: any) {
      console.log(`✗ FAIL [${scenario.id}] ${scenario.name}`);
      console.log(`       → EXCEPTION: ${err.message}`);
      results.push({
        id: scenario.id,
        name: scenario.name,
        passed: false,
        details: "Exception thrown",
        errors: [err.message],
      });
    }
  }

  console.log("\n================================================================================");
  console.log(`  RESULTS: ${passedCount} / ${M8_RISK_PLANNING_SCENARIOS.length} scenarios passed (${Math.round((passedCount / M8_RISK_PLANNING_SCENARIOS.length) * 100)}%)`);
  console.log("================================================================================\n");

  if (passedCount < M8_RISK_PLANNING_SCENARIOS.length) {
    process.exit(1);
  }
}

runRiskPlanningEvaluation().catch((err) => {
  console.error("Evaluation script failed:", err);
  process.exit(1);
});
