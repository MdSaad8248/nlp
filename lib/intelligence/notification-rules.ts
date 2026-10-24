import {
  NotificationStage,
  NotificationUrgency,
  RankedAcademicItem,
  DeadlinePressureLevel,
  NotificationPreferenceSettings,
} from "./types";

/**
 * Determines which deadline reminder stage an item falls into based on time remaining in hours.
 */
export function determineNotificationStage(
  hoursRemaining: number | null,
  isOverdue: boolean
): NotificationStage | null {
  if (isOverdue || (hoursRemaining !== null && hoursRemaining < 0)) {
    return "OVERDUE";
  }
  if (hoursRemaining === null) {
    return null;
  }
  if (hoursRemaining <= 12) {
    return "12H";
  }
  if (hoursRemaining <= 24) {
    return "24H";
  }
  if (hoursRemaining <= 48) {
    return "48H";
  }
  if (hoursRemaining <= 168) {
    // 7 days
    return "7D";
  }
  return null;
}

export interface RuleEvaluationResult {
  shouldNotify: boolean;
  urgency: NotificationUrgency;
  primaryReason: string;
  contributingReasons: string[];
}

/**
 * Deterministic Adaptive Notification Rules
 *
 * Rules:
 * 1. COMPLETED: Strictly suppress all reminders.
 * 2. CANCELLED: Strictly suppress all reminders.
 * 3. OVERDUE: Urgent/Critical alert for active overdue deliverables.
 * 4. 12H Stage: CRITICAL for items with priority CRITICAL, HIGH weight (>=20), or strict penalty; URGENT otherwise.
 * 5. 24H Stage: URGENT for HIGH/CRITICAL items or concentrated workload; NORMAL otherwise.
 * 6. 48H Stage: Escalate to URGENT if deadline concentration >= 2 or priority CRITICAL; NORMAL otherwise.
 * 7. 7D Stage: Send NORMAL reminder for HIGH/CRITICAL items or exams; SUPPRESS if priority LOW and workload LOW.
 */
export function evaluateDeadlineReminderRule(
  item: RankedAcademicItem,
  stage: NotificationStage,
  workloadPressure: DeadlinePressureLevel,
  deadlineConcentration: number,
  preferences?: Partial<NotificationPreferenceSettings>
): RuleEvaluationResult {
  const status = (item.status || "PENDING").toUpperCase();

  // 1. Completion & Cancellation Invariant
  if (status === "COMPLETED") {
    return {
      shouldNotify: false,
      urgency: "INFO",
      primaryReason: "Deliverable is marked completed; notification suppressed.",
      contributingReasons: ["Task status is COMPLETED"],
    };
  }

  if (status === "CANCELLED") {
    return {
      shouldNotify: false,
      urgency: "INFO",
      primaryReason: "Academic item was cancelled; reminders suppressed.",
      contributingReasons: ["Item status is CANCELLED"],
    };
  }

  // Check preference: notificationsEnabled
  if (preferences?.notificationsEnabled === false) {
    return {
      shouldNotify: false,
      urgency: "INFO",
      primaryReason: "Notifications disabled in student preferences.",
      contributingReasons: ["Student preferences: notificationsEnabled = false"],
    };
  }

  const reasons: string[] = [];
  let urgency: NotificationUrgency = "NORMAL";
  let shouldNotify = true;

  const marks = item.marks ?? item.weightage ?? 0;
  const isHighStakes = marks >= 20 || item.category === "EXAM" || item.category === "PROJECT";
  const hasPenalty = item.factors.some((f) => f.name === "Strict deadline");

  if (status === "OVERDUE" || stage === "OVERDUE") {
    urgency = "CRITICAL";
    reasons.push("Deliverable has passed scheduled deadline without submission");
    reasons.push(`Priority score: ${item.priorityScore} (${item.priorityLevel})`);
    if (hasPenalty) reasons.push("Strict late submission penalty is active");
    return {
      shouldNotify: true,
      urgency,
      primaryReason: `Overdue Alert: ${item.title} requires immediate remediation.`,
      contributingReasons: reasons,
    };
  }

  if (stage === "12H") {
    reasons.push(`Due in ${item.timeRemainingLabel} today`);
    if (item.priorityLevel === "CRITICAL" || isHighStakes || hasPenalty) {
      urgency = "CRITICAL";
      reasons.push("Critical priority deliverable due within 12 hours");
    } else {
      urgency = "URGENT";
      reasons.push("Imminent deadline requiring today's focus block");
    }
    if (marks > 0) reasons.push(`Grade impact: ${marks} marks`);
    if (hasPenalty) reasons.push("Strict late penalty clause enforced");
    return {
      shouldNotify: true,
      urgency,
      primaryReason: `Final Hours: ${item.title} is due tonight.`,
      contributingReasons: reasons,
    };
  }

  if (stage === "24H") {
    reasons.push(`Due tomorrow (${item.timeRemainingLabel})`);
    if (item.priorityLevel === "CRITICAL" || marks >= 30) {
      urgency = "CRITICAL";
      reasons.push(`Critical weight deliverable: ${marks} marks (Priority ${item.priorityLevel})`);
    } else if (item.priorityLevel === "HIGH" || hasPenalty || marks >= 20 || deadlineConcentration >= 2) {
      urgency = "URGENT";
      reasons.push(`Elevated priority: ${item.priorityLevel} (Score ${item.priorityScore})`);
    } else {
      urgency = "NORMAL";
      reasons.push("24-hour advance deliverable notification");
    }
    if (deadlineConcentration >= 2) {
      reasons.push(`Clustered with ${deadlineConcentration} other upcoming deliverables in workload window`);
    }
    if (marks > 0) reasons.push(`Evaluation weight: ${marks} marks`);
    if (hasPenalty) reasons.push("Strict late submission penalty active");
    return {
      shouldNotify: true,
      urgency,
      primaryReason: `Due Tomorrow: ${item.title}`,
      contributingReasons: reasons,
    };
  }

  if (stage === "48H") {
    reasons.push(`Due in 2 days (${item.timeRemainingLabel})`);
    // Escalate if deadline concentration or high workload
    if (deadlineConcentration >= 2 || workloadPressure === "CRITICAL" || workloadPressure === "HIGH") {
      urgency = "URGENT";
      reasons.push("Workload escalation: Multiple deliverables in 48-hour workload window");
    } else if (item.priorityLevel === "CRITICAL" || isHighStakes || hasPenalty) {
      urgency = "URGENT";
      reasons.push(`High academic stakes: ${marks} marks`);
      if (hasPenalty) reasons.push("Strict late submission penalty active");
    } else {
      urgency = "NORMAL";
      reasons.push("Standard 48-hour advance reminder");
    }
    return {
      shouldNotify: true,
      urgency,
      primaryReason: `Approaching in 48h: ${item.title}`,
      contributingReasons: reasons,
    };
  }

  if (stage === "7D") {
    // Suppress if low priority or routine medium priority with light workload
    if (
      item.priorityLevel === "LOW" ||
      (item.priorityLevel === "MEDIUM" && !isHighStakes && !hasPenalty && deadlineConcentration <= 1)
    ) {
      return {
        shouldNotify: false,
        urgency: "INFO",
        primaryReason: "Low priority task with light workload; 7-day notification suppressed to minimize noise.",
        contributingReasons: ["Priority is not HIGH/CRITICAL", "Due in > 4 days"],
      };
    }

    urgency = "NORMAL";
    reasons.push(`Due in ${item.timeRemainingLabel}`);
    if (item.category === "EXAM") {
      reasons.push("Advance notice for upcoming examination revision");
    } else {
      reasons.push(`Advance planning notice for ${item.priorityLevel} priority item`);
    }
    if (marks > 0) reasons.push(`Weight: ${marks} marks`);

    return {
      shouldNotify: true,
      urgency,
      primaryReason: `Advance Notice (7 Days): ${item.title}`,
      contributingReasons: reasons,
    };
  }

  return {
    shouldNotify: false,
    urgency: "INFO",
    primaryReason: "Outside active notification window.",
    contributingReasons: [],
  };
}

/**
 * Checks if current time is within student's configured quiet hours.
 * If in quiet hours, notifications that are not CRITICAL are deferred.
 */
export function isInQuietHours(
  now: Date,
  quietStart: string | null = "23:00",
  quietEnd: string | null = "07:00"
): boolean {
  if (!quietStart || !quietEnd) return false;

  const [startH, startM] = quietStart.split(":").map(Number);
  const [endH, endM] = quietEnd.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  if (startMinutes > endMinutes) {
    // Overnight (e.g. 23:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Adjusts scheduled notification delivery timestamp if it lands in quiet hours.
 */
export function adjustForQuietHours(
  scheduledTime: Date,
  urgency: NotificationUrgency,
  quietEnd: string | null = "07:00"
): Date {
  if (urgency === "CRITICAL") {
    // Critical alerts bypass quiet hours
    return scheduledTime;
  }

  if (isInQuietHours(scheduledTime)) {
    const adjusted = new Date(scheduledTime);
    const [endH, endM] = (quietEnd || "07:00").split(":").map(Number);
    if (adjusted.getHours() >= 23) {
      adjusted.setDate(adjusted.getDate() + 1);
    }
    adjusted.setHours(endH, endM || 0, 0, 0);
    return adjusted;
  }

  return scheduledTime;
}
