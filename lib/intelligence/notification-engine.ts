import {
  FullAcademicState,
  AdaptiveNotification,
  NotificationPreferenceSettings,
  NotificationType,
  NotificationUrgency,
  DailyAcademicDigest,
  RankedAcademicItem,
} from "./types";
import {
  determineNotificationStage,
  evaluateDeadlineReminderRule,
  adjustForQuietHours,
} from "./notification-rules";
import { buildNotificationContent } from "./notification-explanations";

export interface NotificationGenerationInput {
  userId: string;
  state: FullAcademicState;
  existingNotifications: AdaptiveNotification[];
  auditLogs?: Array<{
    id: string;
    targetType: string;
    targetId: string;
    relationship: string;
    changedFields: string | null;
    reasons: string | null;
    createdAt: Date;
  }>;
  preferences?: Partial<NotificationPreferenceSettings>;
  now?: Date;
}

export interface NotificationGenerationResult {
  newNotifications: AdaptiveNotification[];
  invalidatedNotificationIds: string[];
  digest: DailyAcademicDigest | null;
}

/**
 * Milestone 5 Adaptive Notification Engine
 *
 * Deterministically evaluates academic state, change intelligence logs, and student preferences
 * to generate context-rich notifications while strictly enforcing deduplication and cancellation.
 */
export function generateAdaptiveNotifications(
  input: NotificationGenerationInput
): NotificationGenerationResult {
  const now = input.now ? new Date(input.now) : new Date();
  const todayDateStr = now.toISOString().split("T")[0];
  const { userId, state, existingNotifications, auditLogs = [] } = input;

  const preferences: NotificationPreferenceSettings = {
    notificationsEnabled: input.preferences?.notificationsEnabled ?? true,
    quietHoursStart: input.preferences?.quietHoursStart ?? "23:00",
    quietHoursEnd: input.preferences?.quietHoursEnd ?? "07:00",
    digestEnabled: input.preferences?.digestEnabled ?? true,
    urgentAlertsEnabled: input.preferences?.urgentAlertsEnabled ?? true,
    workloadAlertsEnabled: input.preferences?.workloadAlertsEnabled ?? true,
    notificationLeadDays: input.preferences?.notificationLeadDays ?? 2,
  };

  const newNotifications: AdaptiveNotification[] = [];
  const invalidatedNotificationIds: string[] = [];

  // If notifications globally disabled, return empty
  if (!preferences.notificationsEnabled) {
    return { newNotifications, invalidatedNotificationIds, digest: null };
  }

  // Helper: check if dedupKey already exists in active notification list
  const activeDedupKeys = new Set(
    existingNotifications
      .filter((n) => n.status === "SCHEDULED" || n.status === "SENT" || n.status === "READ")
      .map((n) => n.dedupKey)
  );

  const attentionItems: RankedAcademicItem[] =
    state.rankedAttentionItems || (state as any).rankedItems || [];

  // 1. INVARIANT CHECKS: Invalidate obsolete notifications for completed or cancelled items
  for (const existing of existingNotifications) {
    if (existing.status !== "SCHEDULED" && existing.status !== "SENT") continue;

    // Check if target task is completed or cancelled
    if (existing.targetItemId) {
      const matchingTask = attentionItems.find((it) => it.id === existing.targetItemId);
      if (!matchingTask) {
        // Task might be completed/cancelled and filtered out of active attention items
        invalidatedNotificationIds.push(existing.id);
      } else if (matchingTask.status === "COMPLETED" || matchingTask.status === "CANCELLED") {
        invalidatedNotificationIds.push(existing.id);
      }
    }
  }

  // 2. DEADLINE & EXAM NOTIFICATIONS
  for (const item of attentionItems) {
    const isCompleted = item.status === "COMPLETED";
    const isCancelled = item.status === "CANCELLED";

    if (isCompleted || isCancelled) {
      continue; // Strictly suppressed
    }

    const effectiveHoursRemaining =
      item.timeRemainingHours ?? (item as any).hoursRemaining ?? null;

    if (item.itemType === "EXAM") {
      // High-stakes exam reminder
      const stage = determineNotificationStage(effectiveHoursRemaining, item.isOverdue);
      if (stage && (stage === "7D" || stage === "48H" || stage === "24H" || stage === "12H")) {
        const dedupKey = `exam:${item.id}:${stage}:${item.deadline?.toISOString() || "date"}`;
        if (!activeDedupKeys.has(dedupKey)) {
          const urgency: NotificationUrgency =
            (item.marks && item.marks >= 30) || item.priorityLevel === "CRITICAL"
              ? "CRITICAL"
              : stage === "12H" || stage === "24H"
              ? "URGENT"
              : "NORMAL";
          const content = buildNotificationContent("EXAM_REMINDER", urgency, stage, item);

          const scheduledTime = adjustForQuietHours(now, urgency, preferences.quietHoursEnd);

          const notif: AdaptiveNotification = {
            id: `notif-exam-${item.id}-${stage}`,
            userId,
            type: "EXAM_REMINDER",
            title: content.title,
            message: content.message,
            urgency,
            targetItemType: "EXAM",
            targetItemId: item.id,
            courseCode: item.courseCode,
            scheduledFor: scheduledTime,
            status: "SCHEDULED",
            stage,
            dedupKey,
            whyBullets: content.whyBullets,
            actionUrl: "/calendar",
            actionLabel: "View Exam Schedule",
            createdAt: now,
            readAt: null,
            dismissedAt: null,
          };

          newNotifications.push(notif);
          activeDedupKeys.add(dedupKey);
        }
      }
      continue;
    }

    // Standard Academic Task
    const stage = determineNotificationStage(effectiveHoursRemaining, item.isOverdue);
    if (!stage) continue;

    const concentration =
      stage === "24H" || stage === "12H" || stage === "OVERDUE"
        ? state.workload.today.deadlineConcentration
        : state.workload.next7Days.deadlineConcentration;

    const ruleResult = evaluateDeadlineReminderRule(
      item,
      stage,
      state.workload.overallPressure,
      concentration,
      preferences
    );

    if (ruleResult.shouldNotify) {
      const dedupKey = `task:${item.id}:${stage}:${item.deadline?.toISOString() || "nodeadline"}`;

      if (!activeDedupKeys.has(dedupKey)) {
        const notifType: NotificationType =
          stage === "OVERDUE"
            ? "OVERDUE_ALERT"
            : stage === "12H" && ruleResult.urgency === "CRITICAL"
            ? "URGENT_DEADLINE"
            : "DEADLINE_REMINDER";

        const content = buildNotificationContent(notifType, ruleResult.urgency, stage, item, {
          workloadPressure: state.workload.overallPressure,
          clusteredCount: concentration,
        });

        const scheduledTime = adjustForQuietHours(now, ruleResult.urgency, preferences.quietHoursEnd);

        const notif: AdaptiveNotification = {
          id: `notif-task-${item.id}-${stage}`,
          userId,
          type: notifType,
          title: content.title,
          message: content.message,
          urgency: ruleResult.urgency,
          targetItemType: "TASK",
          targetItemId: item.id,
          courseCode: item.courseCode,
          scheduledFor: scheduledTime,
          status: "SCHEDULED",
          stage,
          dedupKey,
          whyBullets: content.whyBullets,
          actionUrl: "/tasks",
          actionLabel: "Open Deliverable",
          createdAt: now,
          readAt: null,
          dismissedAt: null,
        };

        newNotifications.push(notif);
        activeDedupKeys.add(dedupKey);
      }
    }
  }

  // 3. WORKLOAD CONCENTRATION ALERT
  if (preferences.workloadAlertsEnabled) {
    const total48h = state.workload.today.deadlineConcentration + state.workload.tomorrow.deadlineConcentration;
    if (total48h >= 3 || state.workload.today.highCriticalItems >= 2) {
      const dedupKey = `workload:${todayDateStr}:${state.workload.overallPressure}`;
      if (!activeDedupKeys.has(dedupKey)) {
        const topItem = state.recommendation.recommendedItem?.title || "Upcoming Assignment";
        const content = buildNotificationContent("WORKLOAD_ALERT", "URGENT", null, null, {
          workloadPressure: state.workload.overallPressure,
          clusteredCount: total48h,
          topFocusTitle: topItem,
        });

        const notif: AdaptiveNotification = {
          id: `notif-workload-${todayDateStr}`,
          userId,
          type: "WORKLOAD_ALERT",
          title: content.title,
          message: content.message,
          urgency: "URGENT",
          targetItemType: "WORKLOAD",
          targetItemId: null,
          courseCode: null,
          scheduledFor: now,
          status: "SCHEDULED",
          stage: null,
          dedupKey,
          whyBullets: content.whyBullets,
          actionUrl: "/analytics",
          actionLabel: "View Workload Matrix",
          createdAt: now,
          readAt: null,
          dismissedAt: null,
        };

        newNotifications.push(notif);
        activeDedupKeys.add(dedupKey);
      }
    }
  }

  // 4. CHANGE INTELLIGENCE NOTIFICATIONS (AUDIT LOGS)
  for (const log of auditLogs) {
    if (!log.relationship || log.relationship === "NEW" || log.relationship === "DUPLICATE") {
      continue; // Routine new items and duplicates don't trigger change alerts
    }

    if (log.relationship === "RESCHEDULED" || log.relationship === "CANCELLED") {
      for (const existing of existingNotifications) {
        if (existing.targetItemId === log.targetId) {
          invalidatedNotificationIds.push(existing.id);
        }
      }
    }

    const dedupKey = `change:${log.id}:${log.relationship}`;
    if (!activeDedupKeys.has(dedupKey)) {
      let notifType: NotificationType = "UPDATED_ACADEMIC_ITEM";
      let urgency: NotificationUrgency = "NORMAL";

      if (log.relationship === "RESCHEDULED") {
        notifType = "RESCHEDULED_EVENT";
        urgency = "URGENT";
      } else if (log.relationship === "CANCELLED") {
        notifType = "CANCELLED_EVENT";
        urgency = "URGENT";
      }

      // Parse diff details
      let details = "Academic schedule modified per official circular.";
      let oldVal: string | undefined;
      let newVal: string | undefined;

      try {
        if (log.reasons) {
          const parsedReasons = typeof log.reasons === "string" ? JSON.parse(log.reasons) : log.reasons;
          if (Array.isArray(parsedReasons) && parsedReasons.length > 0) {
            details = parsedReasons[0];
          }
        }
        if (log.changedFields) {
          const parsed = typeof log.changedFields === "string" ? JSON.parse(log.changedFields) : log.changedFields;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0];
            if (typeof first === "string") {
              details = log.reasons ? `${first} updated: ${details}` : `${first} updated per official circular`;
            } else if (first && typeof first === "object") {
              oldVal = first.oldValue;
              newVal = first.newValue;
              details = log.reasons ? `${first.field || "field"} updated: ${details}` : `${first.field} changed: ${first.oldValue || "None"} → ${first.newValue}`;
            }
          }
        }
      } catch (e) {
        // ignore JSON parse error
      }

      const content = buildNotificationContent(notifType, urgency, "CHANGE", null, {
        changeDetails: details,
        oldValue: oldVal,
        newValue: newVal,
      });

      const notif: AdaptiveNotification = {
        id: `notif-change-${log.id}`,
        userId,
        type: notifType,
        title: content.title,
        message: content.message,
        urgency,
        targetItemType: log.targetType === "TASK" ? "TASK" : "EVENT",
        targetItemId: log.targetId,
        courseCode: null,
        scheduledFor: now,
        status: "SCHEDULED",
        stage: "CHANGE",
        dedupKey,
        whyBullets: content.whyBullets,
        actionUrl: "/inbox",
        actionLabel: "View Circular",
        createdAt: now,
        readAt: null,
        dismissedAt: null,
      };

      newNotifications.push(notif);
      activeDedupKeys.add(dedupKey);
    }
  }

  // 5. DAILY ACADEMIC DIGEST
  let digest: DailyAcademicDigest | null = null;
  if (preferences.digestEnabled) {
    const dueToday = state.workload.today.incompleteTasks + state.workload.today.exams;
    const dueTomorrow = state.workload.tomorrow.incompleteTasks + state.workload.tomorrow.exams;
    const criticals = state.stats.highCriticalCount;
    const topFocus = state.recommendation.recommendedItem?.title || null;

    digest = {
      date: todayDateStr,
      headline: `Today's Academic Briefing (${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
      criticalCount: criticals,
      dueTodayCount: dueToday,
      dueTomorrowCount: dueTomorrow,
      rescheduledCount: state.stats.rescheduledCount,
      topFocusItem: topFocus,
      workloadPressure: state.workload.overallPressure,
      summaryText: `${criticals > 0 ? `${criticals} critical task(s). ` : ""}${dueToday} due today, ${dueTomorrow} due tomorrow. Overall pressure: ${state.workload.overallPressure}.`,
    };

    const digestDedupKey = `digest:${todayDateStr}`;
    if (!activeDedupKeys.has(digestDedupKey)) {
      const content = buildNotificationContent("DAILY_DIGEST", "INFO", "DIGEST", null, {
        workloadPressure: state.workload.overallPressure,
        changeDetails: digest.summaryText,
        topFocusTitle: topFocus || undefined,
      });

      const notif: AdaptiveNotification = {
        id: `notif-digest-${todayDateStr}`,
        userId,
        type: "DAILY_DIGEST",
        title: digest.headline,
        message: digest.summaryText,
        urgency: "INFO",
        targetItemType: "DIGEST",
        targetItemId: null,
        courseCode: null,
        scheduledFor: now,
        status: "SCHEDULED",
        stage: "DIGEST",
        dedupKey: digestDedupKey,
        whyBullets: content.whyBullets,
        actionUrl: "/dashboard",
        actionLabel: "Open Dashboard",
        createdAt: now,
        readAt: null,
        dismissedAt: null,
      };

      newNotifications.push(notif);
      activeDedupKeys.add(digestDedupKey);
    }
  }

  return {
    newNotifications,
    invalidatedNotificationIds,
    digest,
  };
}
