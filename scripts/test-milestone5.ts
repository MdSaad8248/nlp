import {
  M5_TEST_SCENARIOS,
  M5_TEST_ANCHOR_DATE,
  M5TestScenario,
} from "../lib/evaluation/m5-test-scenarios";
import { generateAdaptiveNotifications } from "../lib/intelligence/notification-engine";
import { calculateAcademicPriority } from "../lib/intelligence/priority-engine";
import { computeWorkloadSummary, WorkloadItemInput } from "../lib/intelligence/workload-engine";
import {
  FullAcademicState,
  RankedAcademicItem,
  AdaptiveNotification,
  NotificationPreferenceSettings,
} from "../lib/intelligence/types";

interface ScenarioResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  failures: string[];
}

export async function runMilestone5Evaluation() {
  console.log("================================================================================");
  console.log("             ACADEMIC AI - MILESTONE 5 BENCHMARK SUITE                         ");
  console.log("             Adaptive Notification Intelligence & Explanations                 ");
  console.log("================================================================================");
  console.log(`Anchor Test Date: ${M5_TEST_ANCHOR_DATE.toISOString()}`);
  console.log(`Total Scenarios:  ${M5_TEST_SCENARIOS.length}\n`);

  const startTime = Date.now();
  const results: ScenarioResult[] = [];

  let totalNotificationChecks = 0;
  let passedNotificationChecks = 0;
  let totalSuppressionChecks = 0;
  let passedSuppressionChecks = 0;
  let totalStageChecks = 0;
  let passedStageChecks = 0;
  let totalUrgencyChecks = 0;
  let passedUrgencyChecks = 0;
  let totalDedupChecks = 0;
  let passedDedupChecks = 0;
  let totalExplanationChecks = 0;
  let passedExplanationChecks = 0;

  for (const scenario of M5_TEST_SCENARIOS) {
    const failures: string[] = [];
    const now = M5_TEST_ANCHOR_DATE;
    const nowMs = now.getTime();

    // 1. Convert scenario items into RankedAcademicItems and WorkloadItemInputs
    const rankedItems: RankedAcademicItem[] = [];
    const workloadInputs: WorkloadItemInput[] = [];

    for (const item of scenario.items) {
      const deadline =
        item.deadlineOffsetHours !== null
          ? new Date(nowMs + item.deadlineOffsetHours * 60 * 60 * 1000)
          : null;

      const priorityRes = calculateAcademicPriority({
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

      let timeRemainingHours: number | null = null;
      let timeRemainingLabel = "No deadline";

      if (deadline !== null) {
        const diffHours = (deadline.getTime() - nowMs) / (1000 * 60 * 60);
        timeRemainingHours = Math.round(diffHours * 10) / 10;

        if (diffHours < 0) {
          timeRemainingLabel = `Overdue by ${Math.abs(Math.round(diffHours))}h`;
        } else if (diffHours < 24) {
          timeRemainingLabel = `${Math.max(1, Math.round(diffHours))}h`;
        } else {
          const days = Math.ceil(diffHours / 24);
          timeRemainingLabel = `${days} days`;
        }
      }

      rankedItems.push({
        id: item.id,
        itemType: item.category === "EXAM" ? "EXAM" : "TASK",
        title: item.title,
        courseCode: item.courseCode,
        courseTitle: item.courseCode,
        category: item.category,
        deadline,
        normalizedDeadline: deadline?.toISOString() || null,
        timeRemainingHours,
        status: item.status,
        priorityLevel: priorityRes.level,
        priorityScore: priorityRes.score,
        marks: item.marks,
        weightage: item.marks,
        submissionPlatform: "LMS",
        venue: "SJT 402",
        isRescheduled: item.isRescheduled ?? false,
        isOverdue: deadline !== null && deadline.getTime() < nowMs,
        isClustered: item.isClustered ?? false,
        hasPenaltyClause: item.hasPenaltyClause ?? false,
        factors: priorityRes.factors,
        priorityReason: priorityRes.explanation,
        timeRemainingLabel,
      });

      workloadInputs.push({
        id: item.id,
        itemType: item.category === "EXAM" ? "EXAM" : "TASK",
        title: item.title,
        courseCode: item.courseCode,
        courseTitle: item.courseCode,
        category: item.category,
        deadline,
        status: item.status,
        marks: item.marks,
        weightage: item.marks,
        priorityScore: priorityRes.score,
        priorityLevel: priorityRes.level,
        isOverdue: deadline !== null && deadline.getTime() < nowMs,
      });
    }

    // 2. Compute workload
    const workloadSummary = computeWorkloadSummary(workloadInputs, now);

    // 3. Construct synthetic FullAcademicState
    const state: FullAcademicState = {
      timestamp: now.toISOString(),
      stats: {
        totalActiveTasks: rankedItems.filter((i) => i.status !== "COMPLETED" && i.status !== "CANCELLED").length,
        totalEvents: 0,
        totalExams: rankedItems.filter((i) => i.category === "EXAM").length,
        highCriticalCount: rankedItems.filter((i) => i.priorityLevel === "HIGH" || i.priorityLevel === "CRITICAL").length,
        overdueCount: rankedItems.filter((i) => i.isOverdue).length,
        completedCount: rankedItems.filter((i) => i.status === "COMPLETED").length,
        cancelledCount: rankedItems.filter((i) => i.status === "CANCELLED").length,
        rescheduledCount: rankedItems.filter((i) => i.isRescheduled).length,
      },
      rankedAttentionItems: rankedItems,
      workload: workloadSummary,
      recommendation: {
        headline: "Top Recommended Focus",
        recommendedItem: rankedItems[0] || null,
        actionAdvice: "Begin early preparation",
        reasons: ["High urgency item"],
        estimatedTimeBlockMinutes: 90,
      },
      observations: [],
      pulseEvents: [],
    };

    // 4. Map existing notifications
    const existingNotifications: AdaptiveNotification[] = (scenario.existingNotifications || []).map((n) => ({
      id: n.id || "existing-notif",
      userId: "test-user-m5",
      type: n.type || "DEADLINE_REMINDER",
      title: n.title || "Existing Notification",
      message: n.message || "Message",
      urgency: n.urgency || "NORMAL",
      targetItemType: "TASK",
      targetItemId: n.targetItemId || null,
      courseCode: null,
      scheduledFor: n.scheduledFor ? new Date(n.scheduledFor) : now,
      status: n.status || "SENT",
      stage: n.stage || null,
      dedupKey: n.dedupKey || "",
      whyBullets: [],
      actionUrl: null,
      actionLabel: null,
      createdAt: now,
      readAt: null,
      dismissedAt: null,
    }));

    // 5. Evaluate notification intelligence engine
    const evalResult = generateAdaptiveNotifications({
      userId: "test-user-m5",
      state,
      existingNotifications,
      auditLogs: scenario.auditLogs || [],
      preferences: {
        notificationsEnabled: scenario.preferences?.notificationsEnabled ?? true,
        urgentAlertsEnabled: scenario.preferences?.urgentAlertsEnabled ?? true,
        workloadAlertsEnabled: scenario.preferences?.workloadAlertsEnabled ?? true,
        digestEnabled: scenario.preferences?.digestEnabled ?? true,
        quietHoursStart: scenario.preferences?.quietHoursStart ?? "23:00",
        quietHoursEnd: scenario.preferences?.quietHoursEnd ?? "07:00",
      },
      now,
    });

    // 6. Assertions
    const expected = scenario.expected;

    // A. Suppression checks
    if (expected.shouldBeSuppressed || expected.expectedMaxNotificationCount === 0) {
      totalSuppressionChecks++;
      // Exclude daily digest for item-specific reminder suppression check
      const nonDigestNotifs = evalResult.newNotifications.filter((n) => n.type !== "DAILY_DIGEST");
      if (nonDigestNotifs.length === 0) {
        passedSuppressionChecks++;
      } else {
        failures.push(
          `Expected suppression (0 notifications), but generated ${nonDigestNotifs.length}: ${nonDigestNotifs.map((n) => n.title).join(", ")}`
        );
      }
    }

    // B. Minimum count check
    if (expected.expectedMinNotificationCount !== undefined) {
      totalNotificationChecks++;
      if (evalResult.newNotifications.length >= expected.expectedMinNotificationCount) {
        passedNotificationChecks++;
      } else {
        failures.push(
          `Expected at least ${expected.expectedMinNotificationCount} notifications, got ${evalResult.newNotifications.length}`
        );
      }
    }

    // C. Expected notification types
    if (expected.expectedGeneratedTypes) {
      totalNotificationChecks++;
      const generatedTypes = evalResult.newNotifications.map((n) => n.type);
      const allExpectedFound = expected.expectedGeneratedTypes.every((et) => generatedTypes.includes(et));
      if (allExpectedFound) {
        passedNotificationChecks++;
      } else {
        failures.push(
          `Expected notification types [${expected.expectedGeneratedTypes.join(", ")}], but got [${generatedTypes.join(", ")}]`
        );
      }
    }

    // D. Expected Stages
    if (expected.expectedStages) {
      for (const [itemId, expectedStage] of Object.entries(expected.expectedStages)) {
        totalStageChecks++;
        const matchingNotif = evalResult.newNotifications.find((n) => n.targetItemId === itemId);
        if (matchingNotif && matchingNotif.stage === expectedStage) {
          passedStageChecks++;
        } else {
          failures.push(
            `Stage mismatch for item ${itemId}: expected '${expectedStage}', got '${matchingNotif?.stage}'`
          );
        }
      }
    }

    // E. Expected Urgencies
    if (expected.expectedUrgencies) {
      for (const [itemId, expectedUrgency] of Object.entries(expected.expectedUrgencies)) {
        totalUrgencyChecks++;
        const matchingNotif = evalResult.newNotifications.find((n) => n.targetItemId === itemId);
        if (matchingNotif && matchingNotif.urgency === expectedUrgency) {
          passedUrgencyChecks++;
        } else {
          failures.push(
            `Urgency mismatch for item ${itemId}: expected '${expectedUrgency}', got '${matchingNotif?.urgency}'`
          );
        }
      }
    }

    // F. Invalidation of obsolete/rescheduled reminders
    if (expected.shouldInvalidateIds) {
      totalDedupChecks++;
      const allInvalidated = expected.shouldInvalidateIds.every((id) =>
        evalResult.invalidatedNotificationIds.includes(id)
      );
      if (allInvalidated) {
        passedDedupChecks++;
      } else {
        failures.push(
          `Expected invalidations [${expected.shouldInvalidateIds.join(", ")}], but got [${evalResult.invalidatedNotificationIds.join(", ")}]`
        );
      }
    }

    // G. Deduplication idempotence (Zero duplicate notifications)
    totalDedupChecks++;
    const dedupKeys = evalResult.newNotifications.map((n) => n.dedupKey);
    const uniqueKeys = new Set(dedupKeys);
    if (uniqueKeys.size === dedupKeys.length) {
      passedDedupChecks++;
    } else {
      failures.push(`Duplicate notifications produced in single evaluation pass! Keys: ${dedupKeys.join(", ")}`);
    }

    // H. Grounded "Why this notification?" bullets
    if (expected.whyBulletsContain && evalResult.newNotifications.length > 0) {
      totalExplanationChecks++;
      const allBullets = evalResult.newNotifications.flatMap((n) => n.whyBullets).join(" ").toLowerCase();
      const allKeywordsFound = expected.whyBulletsContain.every((kw) => allBullets.includes(kw.toLowerCase()));
      if (allKeywordsFound) {
        passedExplanationChecks++;
      } else {
        failures.push(
          `Why bullets missing expected keywords [${expected.whyBulletsContain.join(", ")}]. Found bullets: ${allBullets}`
        );
      }
    }

    // I. Digest check
    if (expected.expectDigest) {
      totalNotificationChecks++;
      if (evalResult.digest !== null && evalResult.newNotifications.some((n) => n.type === "DAILY_DIGEST")) {
        passedNotificationChecks++;
      } else {
        failures.push("Expected Daily Academic Digest was not generated");
      }
    }

    const passed = failures.length === 0;
    results.push({
      id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      passed,
      failures,
    });

    const statusIcon = passed ? "✅" : "❌";
    console.log(`  ${statusIcon} [${scenario.id}] ${scenario.name}`);
    if (!passed) {
      for (const f of failures) {
        console.log(`     └─ ⚠️  ${f}`);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const passedScenarios = results.filter((r) => r.passed).length;
  const totalScenarios = results.length;

  console.log("\n================================================================================");
  console.log("                      MILESTONE 5 EVALUATION SUMMARY                           ");
  console.log("================================================================================");
  console.log(`Overall Scenarios:          ${passedScenarios} / ${totalScenarios} passed (${((passedScenarios / totalScenarios) * 100).toFixed(1)}%)`);
  console.log(`Notification Generation:    ${passedNotificationChecks} / ${totalNotificationChecks} checks passed`);
  console.log(`Suppression & Invalidation: ${passedSuppressionChecks} / ${totalSuppressionChecks} checks passed`);
  console.log(`Stage Timing (7D/48H/12H):  ${passedStageChecks} / ${totalStageChecks} checks passed`);
  console.log(`Urgency Reasoning:         ${passedUrgencyChecks} / ${totalUrgencyChecks} checks passed`);
  console.log(`Deduplication & Idempotence:${passedDedupChecks} / ${totalDedupChecks} checks passed`);
  console.log(`Explainability & Grounding: ${passedExplanationChecks} / ${totalExplanationChecks} checks passed`);
  console.log(`Execution Time:             ${durationMs}ms`);
  console.log("================================================================================\n");

  if (passedScenarios === totalScenarios) {
    console.log("🏆 MILESTONE 5 BENCHMARK SUITE: ALL 20 SCENARIOS PASSED (100% SUCCESS)\n");
    return true;
  } else {
    console.error(`💥 MILESTONE 5 BENCHMARK SUITE: ${totalScenarios - passedScenarios} SCENARIOS FAILED!\n`);
    return false;
  }
}

if (require.main === module) {
  runMilestone5Evaluation().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
