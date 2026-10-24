import { prisma } from "@/lib/db/prisma";
import { ensureDefaultUserAndCourses } from "@/lib/services/user.service";
import { getFullAcademicState } from "./academic-state";
import { generateAdaptiveNotifications } from "./notification-engine";
import {
  AdaptiveNotification,
  DailyAcademicDigest,
  NotificationPreferenceSettings,
  NotificationStatus,
  NotificationType,
  NotificationUrgency,
} from "./types";

export interface NotificationGroupedResult {
  unreadCount: number;
  totalCount: number;
  digest: DailyAcademicDigest | null;
  groups: {
    actionRequired: AdaptiveNotification[];
    changed: AdaptiveNotification[];
    upcoming: AdaptiveNotification[];
    insights: AdaptiveNotification[];
  };
  all: AdaptiveNotification[];
}

/**
 * Transforms a Prisma notification row into an AdaptiveNotification domain object.
 */
function mapPrismaToAdaptive(row: any): AdaptiveNotification {
  let whyBullets: string[] = [];
  let actionUrl: string | null = "/tasks";
  let actionLabel: string | null = "View Details";
  let courseCode: string | null = null;
  let targetItemType: "TASK" | "EVENT" | "EXAM" | "WORKLOAD" | "DIGEST" = "TASK";

  if (row.metadata) {
    try {
      const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
      if (Array.isArray(meta.whyBullets)) whyBullets = meta.whyBullets;
      if (meta.actionUrl) actionUrl = meta.actionUrl;
      if (meta.actionLabel) actionLabel = meta.actionLabel;
      if (meta.courseCode) courseCode = meta.courseCode;
      if (meta.targetItemType) targetItemType = meta.targetItemType;
    } catch {
      // fallback if JSON parse fails
    }
  }

  if (whyBullets.length === 0 && row.reasoning) {
    whyBullets = [row.reasoning];
  }

  if (!targetItemType) {
    if (row.type === "EXAM_REMINDER") targetItemType = "EXAM";
    else if (row.type === "WORKLOAD_ALERT") targetItemType = "WORKLOAD";
    else if (row.type === "DAILY_DIGEST") targetItemType = "DIGEST";
    else if (row.eventId) targetItemType = "EVENT";
    else targetItemType = "TASK";
  }

  return {
    id: row.id,
    userId: row.userId,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    urgency: row.urgency as NotificationUrgency,
    targetItemType,
    targetItemId: row.taskId || row.eventId || row.examId || null,
    courseCode,
    scheduledFor: new Date(row.scheduledFor),
    status: row.status as NotificationStatus,
    stage: row.stage || null,
    dedupKey: row.dedupKey || "",
    whyBullets,
    actionUrl,
    actionLabel,
    createdAt: new Date(row.createdAt),
    readAt: row.readAt ? new Date(row.readAt) : null,
    dismissedAt: row.dismissedAt ? new Date(row.dismissedAt) : null,
  };
}

/**
 * Synchronizes the notification layer with the latest deterministic academic state.
 * Evaluates rules, invalidates stale reminders, and generates non-duplicate alerts.
 */
export async function syncAdaptiveNotifications(
  userId?: string,
  now: Date = new Date()
): Promise<{
  createdCount: number;
  invalidatedCount: number;
  notifications: AdaptiveNotification[];
  digest: DailyAcademicDigest | null;
}> {
  await ensureDefaultUserAndCourses();

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findFirst();

  if (!user) {
    return { createdCount: 0, invalidatedCount: 0, notifications: [], digest: null };
  }

  const targetUserId = user.id;

  // 1. Fetch academic state
  const state = await getFullAcademicState(targetUserId, now);

  // 2. Fetch existing active notifications from DB
  const dbNotifications = await prisma.notification.findMany({
    where: {
      userId: targetUserId,
      status: { in: ["SCHEDULED", "SENT", "READ"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const existingAdaptive = dbNotifications.map(mapPrismaToAdaptive);

  // 3. Fetch recent audit logs for change intelligence alerts
  const auditLogs = await prisma.academicAuditLog.findMany({
    where: {
      actionTaken: { in: ["UPDATED", "RESCHEDULED", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // 4. Fetch user preferences
  const pref = await prisma.studentPreference.findUnique({
    where: { userId: targetUserId },
  });

  const preferences: Partial<NotificationPreferenceSettings> = {
    notificationsEnabled: pref?.notificationsEnabled ?? true,
    quietHoursStart: pref?.quietHoursStart ?? "23:00",
    quietHoursEnd: pref?.quietHoursEnd ?? "07:00",
    digestEnabled: pref?.digestEnabled ?? true,
    urgentAlertsEnabled: pref?.urgentAlertsEnabled ?? true,
    workloadAlertsEnabled: pref?.workloadAlertsEnabled ?? true,
    notificationLeadDays: pref?.notificationLeadDays ?? 2,
  };

  // 5. Evaluate notification engine
  const evalResult = generateAdaptiveNotifications({
    userId: targetUserId,
    state,
    existingNotifications: existingAdaptive,
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      targetType: log.targetType,
      targetId: log.targetId,
      relationship: log.relationship,
      changedFields: log.changedFields,
      reasons: log.reasons,
      createdAt: log.createdAt,
    })),
    preferences,
    now,
  });

  // 6. Invalidate obsolete/cancelled notifications in DB
  let invalidatedCount = 0;
  if (evalResult.invalidatedNotificationIds.length > 0) {
    const res = await prisma.notification.updateMany({
      where: {
        id: { in: evalResult.invalidatedNotificationIds },
      },
      data: {
        status: "CANCELLED",
      },
    });
    invalidatedCount = res.count;
  }

  // 7. Persist newly generated notifications
  let createdCount = 0;
  for (const notif of evalResult.newNotifications) {
    try {
      await prisma.notification.create({
        data: {
          id: notif.id,
          userId: targetUserId,
          taskId: notif.targetItemType === "TASK" ? notif.targetItemId : null,
          eventId: notif.targetItemType === "EVENT" ? notif.targetItemId : null,
          examId: notif.targetItemType === "EXAM" ? notif.targetItemId : null,
          type: notif.type,
          status: notif.status,
          stage: notif.stage,
          dedupKey: notif.dedupKey,
          title: notif.title,
          message: notif.message,
          urgency: notif.urgency,
          channel: "IN_APP",
          scheduledFor: notif.scheduledFor,
          isRead: false,
          sentAt: notif.scheduledFor <= now ? now : null,
          reasoning: notif.whyBullets[0] || null,
          metadata: JSON.stringify({
            whyBullets: notif.whyBullets,
            actionUrl: notif.actionUrl,
            actionLabel: notif.actionLabel,
            courseCode: notif.courseCode,
            targetItemType: notif.targetItemType,
          }),
        },
      });
      createdCount++;
    } catch {
      // If primary key or unique constraint conflict, skip cleanly
    }
  }

  // 8. Return fresh list
  const currentList = await getStudentNotifications(targetUserId);

  return {
    createdCount,
    invalidatedCount,
    notifications: currentList.all,
    digest: evalResult.digest,
  };
}

/**
 * Retrieves all active student notifications grouped into intuitive academic categories.
 */
export async function getStudentNotifications(userId?: string): Promise<NotificationGroupedResult> {
  await ensureDefaultUserAndCourses();

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findFirst();

  if (!user) {
    return {
      unreadCount: 0,
      totalCount: 0,
      digest: null,
      groups: { actionRequired: [], changed: [], upcoming: [], insights: [] },
      all: [],
    };
  }

  const rows = await prisma.notification.findMany({
    where: {
      userId: user.id,
      status: { in: ["SCHEDULED", "SENT", "READ"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const adaptiveList = rows.map(mapPrismaToAdaptive);

  const actionRequired: AdaptiveNotification[] = [];
  const changed: AdaptiveNotification[] = [];
  const upcoming: AdaptiveNotification[] = [];
  const insights: AdaptiveNotification[] = [];

  let unreadCount = 0;
  let latestDigest: DailyAcademicDigest | null = null;

  for (const item of adaptiveList) {
    if (item.status !== "READ" && !item.readAt) {
      unreadCount++;
    }

    if (
      item.type === "OVERDUE_ALERT" ||
      item.type === "URGENT_DEADLINE" ||
      item.urgency === "CRITICAL"
    ) {
      actionRequired.push(item);
    } else if (
      item.type === "RESCHEDULED_EVENT" ||
      item.type === "CANCELLED_EVENT" ||
      item.type === "UPDATED_ACADEMIC_ITEM"
    ) {
      changed.push(item);
    } else if (item.type === "DAILY_DIGEST" || item.type === "WORKLOAD_ALERT") {
      insights.push(item);
      if (item.type === "DAILY_DIGEST" && !latestDigest) {
        latestDigest = {
          date: item.scheduledFor.toISOString().split("T")[0],
          headline: item.title,
          criticalCount: 0,
          dueTodayCount: 0,
          dueTomorrowCount: 0,
          rescheduledCount: 0,
          topFocusItem: null,
          workloadPressure: "MEDIUM",
          summaryText: item.message,
        };
      }
    } else {
      upcoming.push(item);
    }
  }

  return {
    unreadCount,
    totalCount: adaptiveList.length,
    digest: latestDigest,
    groups: {
      actionRequired,
      changed,
      upcoming,
      insights,
    },
    all: adaptiveList,
  };
}

/**
 * Marks a notification as READ.
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        status: "READ",
        readAt: new Date(),
      },
    });
    return !!updated;
  } catch {
    return false;
  }
}

/**
 * Dismisses a notification.
 */
export async function dismissNotification(id: string): Promise<boolean> {
  try {
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        status: "DISMISSED",
        dismissedAt: new Date(),
      },
    });
    return !!updated;
  } catch {
    return false;
  }
}

/**
 * Marks all notifications as READ for a student.
 */
export async function markAllNotificationsAsRead(userId?: string): Promise<number> {
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findFirst();

  if (!user) return 0;

  const res = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
      status: "READ",
      readAt: new Date(),
    },
  });

  return res.count;
}
