import {
  M4_TEST_SCENARIOS,
  M4_TEST_ANCHOR_DATE,
  M4ScenarioItem,
} from "../lib/evaluation/m4-test-scenarios";
import { calculateAcademicPriority } from "../lib/intelligence/priority-engine";
import { computeWorkloadSummary, WorkloadItemInput } from "../lib/intelligence/workload-engine";
import { generateRecommendationReasons } from "../lib/intelligence/priority-explanations";
import { RankedAcademicItem, AIObservation } from "../lib/intelligence/types";

interface ScenarioResult {
  id: string;
  name: string;
  passed: boolean;
  failures: string[];
}

async function runMilestone4Evaluation() {
  console.log("================================================================================");
  console.log("             ACADEMIC AI - MILESTONE 4 BENCHMARK SUITE                         ");
  console.log("             Priority Scoring & Cognitive Workload Intelligence               ");
  console.log("================================================================================");
  console.log(`Anchor Test Date: ${M4_TEST_ANCHOR_DATE.toISOString()}`);
  console.log(`Total Scenarios:  ${M4_TEST_SCENARIOS.length}\n`);

  const startTime = Date.now();
  const results: ScenarioResult[] = [];
  let totalPriorityChecks = 0;
  let passedPriorityChecks = 0;
  let totalWorkloadChecks = 0;
  let passedWorkloadChecks = 0;
  let totalExclusionChecks = 0;
  let passedExclusionChecks = 0;
  let totalFactorSumChecks = 0;
  let passedFactorSumChecks = 0;

  for (const scenario of M4_TEST_SCENARIOS) {
    const failures: string[] = [];
    const now = M4_TEST_ANCHOR_DATE;
    const nowMs = now.getTime();

    // 1. Process items
    const rankedItems: RankedAcademicItem[] = [];
    const workloadInputs: WorkloadItemInput[] = [];

    for (const item of scenario.items) {
      const deadline =
        item.deadlineOffsetHours !== null
          ? new Date(nowMs + item.deadlineOffsetHours * 60 * 60 * 1000)
          : null;

      const evalResult = calculateAcademicPriority({
        title: item.title,
        deadline,
        status: item.status,
        category: item.category,
        marks: item.marks,
        weightage: item.marks,
        hasPenaltyClause: item.hasPenaltyClause,
        hasUrgentKeywords: item.hasUrgentKeywords,
        isClustered: item.isClustered,
        now,
      });

      // INVARIANT: Additive Factor Transparency
      totalFactorSumChecks++;
      const factorSum = evalResult.factors.reduce((sum, f) => sum + f.scoreContribution, 0);
      if (evalResult.score === factorSum) {
        passedFactorSumChecks++;
      } else {
        failures.push(
          `Factor sum mismatch for ${item.id}: score is ${evalResult.score} but sum(factors) is ${factorSum}`
        );
      }

      // Check level expectations if defined
      if (scenario.expected.expectedItemLevels && scenario.expected.expectedItemLevels[item.id]) {
        totalPriorityChecks++;
        const expectedLevel = scenario.expected.expectedItemLevels[item.id];
        if (evalResult.level === expectedLevel) {
          passedPriorityChecks++;
        } else {
          failures.push(
            `Priority level mismatch for ${item.id}: expected ${expectedLevel}, got ${evalResult.level} (Score: ${evalResult.score})`
          );
        }
      }

      // Check min/max score expectations
      if (scenario.expected.expectedMinScores && scenario.expected.expectedMinScores[item.id]) {
        totalPriorityChecks++;
        const minScore = scenario.expected.expectedMinScores[item.id];
        if (evalResult.score >= minScore) {
          passedPriorityChecks++;
        } else {
          failures.push(
            `Min score expectation failed for ${item.id}: expected >= ${minScore}, got ${evalResult.score}`
          );
        }
      }

      if (scenario.expected.expectedMaxScores && scenario.expected.expectedMaxScores[item.id]) {
        totalPriorityChecks++;
        const maxScore = scenario.expected.expectedMaxScores[item.id];
        if (evalResult.score <= maxScore) {
          passedPriorityChecks++;
        } else {
          failures.push(
            `Max score expectation failed for ${item.id}: expected <= ${maxScore}, got ${evalResult.score}`
          );
        }
      }

      const isOverdue =
        item.status !== "COMPLETED" &&
        item.status !== "CANCELLED" &&
        (item.status === "OVERDUE" || (deadline !== null && deadline.getTime() < nowMs));

      rankedItems.push({
        id: item.id,
        itemType: item.itemType,
        title: item.title,
        courseCode: item.courseCode,
        courseTitle: item.courseCode,
        category: item.category,
        deadline,
        normalizedDeadline: deadline ? deadline.toISOString() : null,
        status: isOverdue ? "OVERDUE" : item.status,
        marks: item.marks,
        weightage: item.marks,
        submissionPlatform: null,
        priorityScore: evalResult.score,
        priorityLevel: evalResult.level,
        factors: evalResult.factors,
        priorityReason: evalResult.explanation,
        isOverdue,
        timeRemainingHours: item.deadlineOffsetHours,
        timeRemainingLabel: item.deadlineOffsetHours !== null ? `${item.deadlineOffsetHours}h` : "No deadline",
        isRescheduled: item.isRescheduled,
      });

      // Pass active items to workload engine
      if (item.status !== "COMPLETED" && item.status !== "CANCELLED") {
        workloadInputs.push({
          id: item.id,
          itemType: item.itemType,
          title: item.title,
          courseCode: item.courseCode,
          courseTitle: item.courseCode,
          category: item.category,
          deadline,
          status: isOverdue ? "OVERDUE" : item.status,
          marks: item.marks,
          weightage: item.marks,
          priorityScore: evalResult.score,
          priorityLevel: evalResult.level,
          isOverdue,
          isRescheduled: item.isRescheduled,
        });
      }
    }

    // 2. Filter active attention items
    const activeAttention = rankedItems
      .filter((it) => it.status !== "COMPLETED" && it.status !== "CANCELLED")
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        if (a.deadline && b.deadline) return a.deadline.getTime() - b.deadline.getTime();
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return (b.marks || 0) - (a.marks || 0);
      });

    // Exclusion check
    totalExclusionChecks++;
    if (activeAttention.length === scenario.expected.activeAttentionCount) {
      passedExclusionChecks++;
    } else {
      failures.push(
        `Active attention count mismatch: expected ${scenario.expected.activeAttentionCount}, got ${activeAttention.length}`
      );
    }

    // Top priority item check
    if (scenario.expected.topPriorityItemId && activeAttention.length > 0) {
      totalPriorityChecks++;
      if (activeAttention[0].id === scenario.expected.topPriorityItemId) {
        passedPriorityChecks++;
      } else {
        failures.push(
          `Top priority item mismatch: expected ${scenario.expected.topPriorityItemId}, got ${activeAttention[0].id}`
        );
      }
    }

    // 3. Workload calculations
    const workload = computeWorkloadSummary(workloadInputs, now);

    if (scenario.expected.todayDeliverablesCount !== undefined) {
      totalWorkloadChecks++;
      if (workload.today.deadlineConcentration === scenario.expected.todayDeliverablesCount) {
        passedWorkloadChecks++;
      } else {
        failures.push(
          `Today deliverables count mismatch: expected ${scenario.expected.todayDeliverablesCount}, got ${workload.today.deadlineConcentration}`
        );
      }
    }

    if (scenario.expected.tomorrowDeliverablesCount !== undefined) {
      totalWorkloadChecks++;
      if (workload.tomorrow.deadlineConcentration === scenario.expected.tomorrowDeliverablesCount) {
        passedWorkloadChecks++;
      } else {
        failures.push(
          `Tomorrow deliverables count mismatch: expected ${scenario.expected.tomorrowDeliverablesCount}, got ${workload.tomorrow.deadlineConcentration}`
        );
      }
    }

    if (scenario.expected.next7DaysDeliverablesCount !== undefined) {
      totalWorkloadChecks++;
      if (workload.next7Days.deadlineConcentration === scenario.expected.next7DaysDeliverablesCount) {
        passedWorkloadChecks++;
      } else {
        failures.push(
          `Next 7 days deliverables count mismatch: expected ${scenario.expected.next7DaysDeliverablesCount}, got ${workload.next7Days.deadlineConcentration}`
        );
      }
    }

    // 4. Recommendation check
    const recommendedItem = activeAttention[0] || null;
    if (scenario.expected.recommendedItemId !== undefined) {
      totalPriorityChecks++;
      if (recommendedItem?.id === scenario.expected.recommendedItemId) {
        passedPriorityChecks++;
      } else {
        failures.push(
          `Recommended item mismatch: expected ${scenario.expected.recommendedItemId}, got ${recommendedItem?.id}`
        );
      }
    }

    // 5. Observations simulation
    const observations: AIObservation[] = [];
    const overdueCount = activeAttention.filter((it) => it.isOverdue).length;
    if (overdueCount > 0) {
      observations.push({
        id: "obs-overdue",
        type: "OVERDUE_ALERT",
        observationText: `${overdueCount} overdue item(s)`,
        actionAdvice: "Submit immediately",
        severity: "CRITICAL",
        courseCode: null,
      });
    }

    if (workload.today.deadlineConcentration >= 2 || workload.tomorrow.deadlineConcentration >= 2) {
      observations.push({
        id: "obs-cluster",
        type: "URGENT_CLUSTER",
        observationText: `Deadline cluster detected`,
        actionAdvice: "Break into focus blocks",
        severity: "CRITICAL",
        courseCode: null,
      });
    }

    const sameDayClash = workload.byDay.find((d) => d.examCount >= 1 && d.taskCount >= 1);
    if (sameDayClash) {
      observations.push({
        id: "obs-same-day",
        type: "SAME_DAY_ASSESSMENT",
        observationText: "Same day assessment clash",
        actionAdvice: "Prepare early",
        severity: "HIGH",
        courseCode: null,
      });
    }

    if (observations.length === 0) {
      observations.push({
        id: "obs-all-clear",
        type: "ALL_CLEAR",
        observationText: "All clear",
        actionAdvice: "Review syllabus",
        severity: "NORMAL",
        courseCode: null,
      });
    }

    if (scenario.expected.expectedObservationTypes) {
      for (const expectedType of scenario.expected.expectedObservationTypes) {
        totalWorkloadChecks++;
        const hasType = observations.some((o) => o.type === expectedType);
        if (hasType) {
          passedWorkloadChecks++;
        } else {
          failures.push(`Expected observation type "${expectedType}" was not generated`);
        }
      }
    }

    const passed = failures.length === 0;
    results.push({
      id: scenario.id,
      name: scenario.name,
      passed,
      failures,
    });
  }

  const durationMs = Date.now() - startTime;

  // Print results
  results.forEach((r, idx) => {
    const statusMark = r.passed ? "✔ PASS" : "✖ FAIL";
    console.log(`[${String(idx + 1).padStart(2, "0")}/${M4_TEST_SCENARIOS.length}] ${statusMark} | ${r.id}: ${r.name}`);
    if (!r.passed) {
      r.failures.forEach((f) => console.log(`      ↳ Failure: ${f}`));
    }
  });

  const passedScenarios = results.filter((r) => r.passed).length;
  const allPassed = passedScenarios === M4_TEST_SCENARIOS.length;

  const priorityAccuracy = totalPriorityChecks > 0 ? (passedPriorityChecks / totalPriorityChecks) * 100 : 100;
  const workloadAccuracy = totalWorkloadChecks > 0 ? (passedWorkloadChecks / totalWorkloadChecks) * 100 : 100;
  const exclusionAccuracy = totalExclusionChecks > 0 ? (passedExclusionChecks / totalExclusionChecks) * 100 : 100;
  const factorTransparency = totalFactorSumChecks > 0 ? (passedFactorSumChecks / totalFactorSumChecks) * 100 : 100;

  console.log("\n================================================================================");
  console.log("                         EVALUATION SUMMARY REPORT                             ");
  console.log("================================================================================");
  console.log(`Scenarios Tested:           ${M4_TEST_SCENARIOS.length}`);
  console.log(`Scenarios Passed:           ${passedScenarios} / ${M4_TEST_SCENARIOS.length} (${((passedScenarios / M4_TEST_SCENARIOS.length) * 100).toFixed(1)}%)`);
  console.log(`Priority Scoring Accuracy:  ${passedPriorityChecks} / ${totalPriorityChecks} (${priorityAccuracy.toFixed(1)}%)`);
  console.log(`Workload Accuracy:          ${passedWorkloadChecks} / ${totalWorkloadChecks} (${workloadAccuracy.toFixed(1)}%)`);
  console.log(`Exclusion Invariant Rate:   ${passedExclusionChecks} / ${totalExclusionChecks} (${exclusionAccuracy.toFixed(1)}%)`);
  console.log(`Additive Factor Sum Match:  ${passedFactorSumChecks} / ${totalFactorSumChecks} (${factorTransparency.toFixed(1)}%)`);
  console.log(`Execution Duration:         ${durationMs}ms`);
  console.log("================================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runMilestone4Evaluation().catch((err) => {
  console.error("Evaluation script encountered an unexpected error:", err);
  process.exit(1);
});
