import {
  calculateAcademicPriority,
} from "../lib/intelligence/priority-engine";
import {
  computeWorkloadSummary,
} from "../lib/intelligence/workload-engine";
import {
  generateAdaptiveNotifications,
} from "../lib/intelligence/notification-engine";
import {
  FullAcademicState,
  RankedAcademicItem,
  AdaptiveNotification,
} from "../lib/intelligence/types";

async function runManualVerificationCases() {
  console.log("================================================================================");
  console.log("          ACADEMIC AI - MILESTONE 5 MANUAL CASES VERIFICATION                   ");
  console.log("================================================================================");

  const now = new Date("2026-09-18T10:00:00+05:30");
  const nowMs = now.getTime();
  let passedCount = 0;
  const totalCount = 5;

  // -------------------------------------------------------------------------
  // CASE 1: NLP Project due tomorrow with 30 marks & high workload -> urgent notification
  // -------------------------------------------------------------------------
  console.log("\n[Case 1] NLP Project due tomorrow with 30 marks & high workload");
  const case1Deadline = new Date(nowMs + 20 * 60 * 60 * 1000); // 20 hours
  const case1Priority = calculateAcademicPriority({
    title: "NLP Capstone Project",
    deadline: case1Deadline,
    status: "PENDING",
    category: "PROJECT",
    marks: 30,
    hasPenaltyClause: true,
    isClustered: true,
    now,
  });

  const case1Item: RankedAcademicItem = {
    id: "nlp-proj-1",
    itemType: "TASK",
    title: "NLP Capstone Project",
    courseCode: "CSE4001",
    courseTitle: "Natural Language Processing",
    category: "PROJECT",
    deadline: case1Deadline,
    normalizedDeadline: case1Deadline.toISOString(),
    timeRemainingHours: 20,
    status: "PENDING",
    priorityLevel: case1Priority.level,
    priorityScore: case1Priority.score,
    marks: 30,
    weightage: 30,
    submissionPlatform: "GitHub Classroom",
    venue: null,
    isRescheduled: false,
    isOverdue: false,
    isClustered: true,
    hasPenaltyClause: true,
    factors: case1Priority.factors,
    priorityReason: case1Priority.explanation,
    timeRemainingLabel: "20h",
  };

  const case1State: FullAcademicState = {
    timestamp: now.toISOString(),
    stats: {
      totalActiveTasks: 1,
      totalEvents: 0,
      totalExams: 0,
      highCriticalCount: 1,
      overdueCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      rescheduledCount: 0,
    },
    rankedAttentionItems: [case1Item],
    workload: computeWorkloadSummary(
      [{
        id: "nlp-proj-1",
        itemType: "TASK",
        title: "NLP Capstone Project",
        courseCode: "CSE4001",
        courseTitle: "NLP",
        category: "PROJECT",
        deadline: case1Deadline,
        status: "PENDING",
        marks: 30,
        weightage: 30,
        priorityScore: case1Priority.score,
        priorityLevel: case1Priority.level,
        isOverdue: false,
      }],
      now
    ),
    recommendation: {
      headline: "NLP Capstone Project Focus",
      recommendedItem: case1Item,
      actionAdvice: "Strict late penalty active",
      reasons: ["Critical deliverable"],
      estimatedTimeBlockMinutes: 120,
    },
    observations: [],
    pulseEvents: [],
  };

  const case1Res = generateAdaptiveNotifications({
    userId: "manual-test-user",
    state: case1State,
    existingNotifications: [],
    now,
  });

  const urgentNotif = case1Res.newNotifications.find((n) => n.targetItemId === "nlp-proj-1");
  const case1Passed =
    urgentNotif !== undefined &&
    (urgentNotif.urgency === "URGENT" || urgentNotif.urgency === "CRITICAL") &&
    urgentNotif.stage === "24H" &&
    urgentNotif.whyBullets.length > 0;

  if (case1Passed) {
    passedCount++;
    console.log(`  ✅ PASS: Generated notification with stage '${urgentNotif?.stage}' and urgency '${urgentNotif?.urgency}'`);
    console.log(`     Why bullets: ${urgentNotif?.whyBullets.join(" | ")}`);
  } else {
    console.error(`  ❌ FAIL: Failed to generate expected urgent notification for NLP Project`);
  }

  // -------------------------------------------------------------------------
  // CASE 2: Mark task completed -> future reminders suppressed
  // -------------------------------------------------------------------------
  console.log("\n[Case 2] Completed task suppresses future reminders");
  const case2Item: RankedAcademicItem = {
    ...case1Item,
    status: "COMPLETED",
  };
  const case2State: FullAcademicState = {
    ...case1State,
    rankedAttentionItems: [case2Item],
  };

  const case2Res = generateAdaptiveNotifications({
    userId: "manual-test-user",
    state: case2State,
    existingNotifications: [],
    now,
  });

  const case2Notifs = case2Res.newNotifications.filter((n) => n.targetItemId === "nlp-proj-1");
  const case2Passed = case2Notifs.length === 0;

  if (case2Passed) {
    passedCount++;
    console.log(`  ✅ PASS: Completed task produced 0 reminders (strictly suppressed)`);
  } else {
    console.error(`  ❌ FAIL: Expected 0 reminders for completed task, got ${case2Notifs.length}`);
  }

  // -------------------------------------------------------------------------
  // CASE 3: Reschedule event -> old reminder invalidated, new reminder scheduled
  // -------------------------------------------------------------------------
  console.log("\n[Case 3] Reschedule event -> invalidates old reminder and triggers reschedule notification");
  const oldNotif: AdaptiveNotification = {
    id: "old-reminder-uuid",
    userId: "manual-test-user",
    type: "DEADLINE_REMINDER",
    title: "Project Review Reminder",
    message: "Project review scheduled for Sep 19",
    urgency: "NORMAL",
    targetItemType: "TASK",
    targetItemId: "review-task-1",
    courseCode: "CSE4001",
    scheduledFor: new Date(nowMs + 24 * 60 * 60 * 1000),
    status: "SCHEDULED",
    stage: "24H",
    dedupKey: "task:review-task-1:24H:old",
    whyBullets: [],
    actionUrl: null,
    actionLabel: null,
    createdAt: now,
    readAt: null,
    dismissedAt: null,
  };

  const case3Item: RankedAcademicItem = {
    ...case1Item,
    id: "review-task-1",
    title: "Capstone Review 1",
    isRescheduled: true,
    deadline: new Date(nowMs + 72 * 60 * 60 * 1000), // postponed to 72h
  };

  const case3State: FullAcademicState = {
    ...case1State,
    rankedAttentionItems: [case3Item],
  };

  const case3Res = generateAdaptiveNotifications({
    userId: "manual-test-user",
    state: case3State,
    existingNotifications: [oldNotif],
    auditLogs: [
      {
        id: "audit-resched-manual",
        targetType: "TASK",
        targetId: "review-task-1",
        relationship: "RESCHEDULED",
        changedFields: JSON.stringify(["deadline"]),
        reasons: JSON.stringify(["Review postponed from Sep 19 to Sep 21"]),
        createdAt: now,
      },
    ],
    now,
  });

  const case3Passed =
    case3Res.invalidatedNotificationIds.includes("old-reminder-uuid") &&
    case3Res.newNotifications.some((n) => n.type === "RESCHEDULED_EVENT");

  if (case3Passed) {
    passedCount++;
    console.log(`  ✅ PASS: Successfully invalidated old reminder '${oldNotif.id}' and generated RESCHEDULED_EVENT`);
  } else {
    console.error(`  ❌ FAIL: Failed to invalidate or create rescheduled alert. Invalidated: [${case3Res.invalidatedNotificationIds.join(", ")}]`);
  }

  // -------------------------------------------------------------------------
  // CASE 4: Cancel event -> future reminders suppressed
  // -------------------------------------------------------------------------
  console.log("\n[Case 4] Cancelled event -> future reminders suppressed");
  const case4Item: RankedAcademicItem = {
    ...case1Item,
    id: "cancelled-event-1",
    title: "Cancelled Guest Lecture",
    status: "CANCELLED",
  };
  const case4State: FullAcademicState = {
    ...case1State,
    rankedAttentionItems: [case4Item],
  };

  const case4Res = generateAdaptiveNotifications({
    userId: "manual-test-user",
    state: case4State,
    existingNotifications: [],
    now,
  });

  const case4Notifs = case4Res.newNotifications.filter((n) => n.targetItemId === "cancelled-event-1");
  const case4Passed = case4Notifs.length === 0;

  if (case4Passed) {
    passedCount++;
    console.log(`  ✅ PASS: Cancelled event produced 0 reminders (strictly suppressed)`);
  } else {
    console.error(`  ❌ FAIL: Expected 0 reminders for cancelled event, got ${case4Notifs.length}`);
  }

  // -------------------------------------------------------------------------
  // CASE 5: Deduplication idempotence across multi-cycle evaluation
  // -------------------------------------------------------------------------
  console.log("\n[Case 5] Deduplication Idempotence across multi-cycle evaluation");
  // Cycle 1: Generate initial notifications
  const cycle1 = generateAdaptiveNotifications({
    userId: "manual-test-user",
    state: case1State,
    existingNotifications: [],
    now,
  });

  // Cycle 2: Pass cycle 1 notifications as existingNotifications
  const cycle2 = generateAdaptiveNotifications({
    userId: "manual-test-user",
    state: case1State,
    existingNotifications: cycle1.newNotifications,
    now,
  });

  // Cycle 2 should generate 0 duplicates!
  const duplicateCount = cycle2.newNotifications.filter((n) => n.type !== "DAILY_DIGEST").length;
  const case5Passed = duplicateCount === 0;

  if (case5Passed) {
    passedCount++;
    console.log(`  ✅ PASS: Second evaluation cycle generated 0 duplicate notifications (Idempotence verified)`);
  } else {
    console.error(`  ❌ FAIL: Second evaluation cycle generated ${duplicateCount} duplicate notifications!`);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`MANUAL VERIFICATION RESULTS: ${passedCount} / ${totalCount} PASSED (${((passedCount / totalCount) * 100).toFixed(1)}%)`);
  console.log("================================================================================\n");

  return passedCount === totalCount;
}

runManualVerificationCases().then((success) => {
  process.exit(success ? 0 : 1);
});
