import {
  NotificationType,
  NotificationUrgency,
  NotificationStage,
  RankedAcademicItem,
  DeadlinePressureLevel,
} from "./types";

export interface FormattedNotificationContent {
  title: string;
  message: string;
  whyBullets: string[];
}

/**
 * Builds factual, personalized academic notification titles, messages, and explanation bullets.
 */
export function buildNotificationContent(
  type: NotificationType,
  urgency: NotificationUrgency,
  stage: NotificationStage | null,
  item?: RankedAcademicItem | null,
  context?: {
    workloadPressure?: DeadlinePressureLevel;
    changeDetails?: string;
    oldValue?: string;
    newValue?: string;
    clusteredCount?: number;
    topFocusTitle?: string;
  }
): FormattedNotificationContent {
  const whyBullets: string[] = [];

  if (type === "OVERDUE_ALERT" && item) {
    whyBullets.push("Task is active and incomplete");
    whyBullets.push("Deadline has passed without verified submission");
    whyBullets.push(`Priority level: ${item.priorityLevel} (Score ${item.priorityScore})`);
    if (item.factors.some((f) => f.name === "Strict deadline")) {
      whyBullets.push("Strict late submission penalty active");
    }

    return {
      title: `Overdue Alert: ${item.title}`,
      message: `${item.title} passed its deadline on ${item.normalizedDeadline || "schedule"}. It carries ${item.marks || 0} marks and remains unsubmitted.`,
      whyBullets,
    };
  }

  if (type === "URGENT_DEADLINE" && item) {
    whyBullets.push("Task is active and incomplete");
    whyBullets.push(`Due within ${item.timeRemainingLabel}`);
    whyBullets.push(`Priority level: ${item.priorityLevel} (Score ${item.priorityScore})`);
    if (item.marks && item.marks >= 20) {
      whyBullets.push(`High grading weight: ${item.marks} marks`);
    }
    if (item.hasPenaltyClause || item.factors.some((f) => f.name === "Strict deadline")) {
      whyBullets.push("Strict late submission policy active");
    }

    return {
      title: `Urgent Deadline: ${item.title}`,
      message: `${item.title} is due in ${item.timeRemainingLabel}. It carries ${item.marks || 0} marks. Recommended focus block: 90 minutes today.`,
      whyBullets,
    };
  }

  if (type === "DEADLINE_REMINDER" && item) {
    whyBullets.push("Task is incomplete");
    whyBullets.push(`Due in ${item.timeRemainingLabel}`);
    whyBullets.push(`Priority score: ${item.priorityScore} (${item.priorityLevel})`);
    if (item.priorityLevel === "HIGH" || item.priorityLevel === "CRITICAL") {
      whyBullets.push("High priority deliverable");
    }
    if (item.marks) {
      if (item.marks >= 25) {
        whyBullets.push(`High weightage deliverable: ${item.marks} marks`);
      } else {
        whyBullets.push(`Accounts for ${item.marks} marks`);
      }
    }
    if (item.hasPenaltyClause || item.factors.some((f) => f.name === "Strict deadline")) {
      whyBullets.push("Strict late submission penalty active");
    }
    if (context?.clusteredCount && context.clusteredCount >= 2) {
      whyBullets.push(`${context.clusteredCount} deliverables scheduled in workload window`);
    }

    const title = stage === "24H" ? `Due Tomorrow: ${item.title}` : `Upcoming Deadline: ${item.title}`;
    const message = `${item.title} is due on ${item.normalizedDeadline || "schedule"}${item.submissionPlatform ? ` through ${item.submissionPlatform}` : ""}. Weightage: ${item.marks || 0} marks.`;

    return {
      title,
      message,
      whyBullets,
    };
  }

  if (type === "EXAM_REMINDER" && item) {
    whyBullets.push("Scheduled academic examination");
    whyBullets.push("High-stakes assessment schedule");
    whyBullets.push(`Examination date: ${item.normalizedDeadline || "upcoming"}`);
    if (item.marks) whyBullets.push(`Grade weightage: ${item.marks} marks`);
    if (item.submissionPlatform) whyBullets.push(`Venue: ${item.submissionPlatform}`);

    return {
      title: `Exam Schedule: ${item.title}`,
      message: `${item.title} is scheduled for ${item.normalizedDeadline || "soon"}${item.submissionPlatform ? ` at ${item.submissionPlatform}` : ""}. Weight: ${item.marks || 0} marks.`,
      whyBullets,
    };
  }

  if (type === "RESCHEDULED_EVENT") {
    whyBullets.push("Academic notice verified by change intelligence");
    whyBullets.push("Schedule changed officially via verified circular");
    if (context?.oldValue) whyBullets.push(`Original timing: ${context.oldValue}`);
    if (context?.newValue) whyBullets.push(`Updated timing: ${context.newValue}`);
    whyBullets.push("Previous reminder schedule invalidated and updated");

    return {
      title: `Schedule Changed: ${item?.title || "Academic Event"}`,
      message: context?.changeDetails || `${item?.title || "Event"} has been rescheduled to ${context?.newValue || "a new date"}.`,
      whyBullets,
    };
  }

  if (type === "CANCELLED_EVENT") {
    whyBullets.push("Official cancellation circular processed");
    whyBullets.push("Status transitioned to CANCELLED");
    whyBullets.push("All future reminder alerts for this item suppressed");

    return {
      title: `Cancelled: ${item?.title || "Academic Commitment"}`,
      message: context?.changeDetails || `The scheduled session for ${item?.title || "academic event"} has been officially cancelled.`,
      whyBullets,
    };
  }

  if (type === "UPDATED_ACADEMIC_ITEM") {
    whyBullets.push("Notice diff detected parameter modification");
    whyBullets.push("Academic circular verified by change detector");
    if (context?.changeDetails) whyBullets.push(context.changeDetails);
    whyBullets.push("Verified source evidence attached");

    return {
      title: `Detail Updated: ${item?.title || "Academic Deliverable"}`,
      message: context?.changeDetails || `Details for ${item?.title} have been updated per latest course announcement.`,
      whyBullets,
    };
  }

  if (type === "WORKLOAD_ALERT") {
    whyBullets.push("Deadline concentration in 48h window");
    whyBullets.push(`Cognitive workload pressure: ${context?.workloadPressure || "HIGH"}`);
    whyBullets.push(`${context?.clusteredCount || 3} academic deliverables fall within the next 48 hours`);
    if (context?.topFocusTitle) {
      whyBullets.push(`Top priority focus: ${context.topFocusTitle}`);
    }

    return {
      title: `Workload Alert: High Deadline Concentration`,
      message: `You have ${context?.clusteredCount || 3} deliverables due in the next 48 hours. Primary recommended focus: ${context?.topFocusTitle || "Highest-priority task"}.`,
      whyBullets,
    };
  }

  if (type === "DAILY_DIGEST") {
    whyBullets.push("Daily Academic Briefing derived from syllabus database");
    whyBullets.push(`Overall academic pressure: ${context?.workloadPressure || "NORMAL"}`);
    if (context?.topFocusTitle) {
      whyBullets.push(`Recommended primary focus: ${context.topFocusTitle}`);
    }

    return {
      title: "Today's Academic Briefing",
      message: context?.changeDetails || "Your academic deliverables, upcoming sessions, and workload pace for today.",
      whyBullets,
    };
  }

  // Fallback
  return {
    title: item?.title || "Academic Notification",
    message: context?.changeDetails || "Academic update recorded in your syllabus tracker.",
    whyBullets: ["Academic status update"],
  };
}
