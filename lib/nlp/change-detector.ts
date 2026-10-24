import { DetectedChange, ExtractedTask, ExtractedEvent } from "./schemas";
import { TemporalExtractionResult } from "./temporal";

export interface ExistingTaskRecord {
  id: string;
  title: string;
  category: string;
  deadline: Date | null;
  normalizedDeadline?: string | null;
  submissionPlatform?: string | null;
  status: string;
  course?: {
    code: string;
    title: string;
  } | null;
}

export interface ExistingEventRecord {
  id: string;
  title: string;
  eventType: string;
  venue?: string | null;
  startTime: Date;
  endTime: Date;
  course?: {
    code: string;
    title: string;
  } | null;
}

export function detectNoticeChanges(
  extractedTasks: ExtractedTask[],
  extractedEvents: ExtractedEvent[],
  temporal: TemporalExtractionResult,
  existingTasks: ExistingTaskRecord[],
  existingEvents: ExistingEventRecord[] = []
): DetectedChange[] {
  const changes: DetectedChange[] = [];

  for (const task of extractedTasks) {
    // 1. Find potential matching existing task
    let matchedTask: ExistingTaskRecord | null = null;

    // A. Match by transition date: if notice states "extended from <Date1> to <Date2>"
    if (temporal.transition) {
      for (const existing of existingTasks) {
        if (existing.deadline) {
          const existingDateStr = existing.deadline.toISOString().slice(0, 10);
          const fromDateStr = temporal.transition.fromDate.toISOString().slice(0, 10);
          if (existingDateStr === fromDateStr) {
            matchedTask = existing;
            break;
          }
        }
      }
    }

    // B. Match by Course and Title/Category similarity
    if (!matchedTask && task.course) {
      const taskCourseLower = task.course.toLowerCase();
      for (const existing of existingTasks) {
        const existingCourseCode = existing.course?.code?.toLowerCase() || "";
        const existingCourseTitle = existing.course?.title?.toLowerCase() || "";

        const courseMatches =
          existingCourseCode.includes(taskCourseLower) ||
          taskCourseLower.includes(existingCourseCode) ||
          existingCourseTitle.includes(taskCourseLower) ||
          taskCourseLower.includes(existingCourseTitle);

        if (courseMatches) {
          // Check category or keyword match
          const existingTitleLower = existing.title.toLowerCase();
          const newTitleLower = task.title.toLowerCase();

          const categoryMatches = existing.category === task.category;
          const titleOverlap =
            (newTitleLower.includes("project") && existingTitleLower.includes("project")) ||
            (newTitleLower.includes("assignment") && existingTitleLower.includes("assignment")) ||
            (newTitleLower.includes("review") && existingTitleLower.includes("review")) ||
            (newTitleLower.includes("quiz") && existingTitleLower.includes("quiz"));

          if (categoryMatches || titleOverlap) {
            matchedTask = existing;
            break;
          }
        }
      }
    }

    // C. Fallback: Title text similarity
    if (!matchedTask) {
      for (const existing of existingTasks) {
        if (existing.title.toLowerCase().trim() === task.title.toLowerCase().trim()) {
          matchedTask = existing;
          break;
        }
      }
    }

    // 2. If an existing task is matched, evaluate changes
    if (matchedTask) {
      // Check deadline change
      if (task.deadline) {
        const newDeadlineDate = new Date(task.deadline);
        const oldDeadlineDate = matchedTask.deadline ? new Date(matchedTask.deadline) : null;

        // Check if deadline is different by more than 1 minute
        const isDifferentDeadline =
          !oldDeadlineDate ||
          Math.abs(newDeadlineDate.getTime() - oldDeadlineDate.getTime()) > 60 * 1000;

        if (isDifferentDeadline) {
          const oldFormatted = matchedTask.normalizedDeadline ||
            (oldDeadlineDate ? oldDeadlineDate.toLocaleDateString() : "No previous deadline");
          const newFormatted = task.normalizedDeadline || newDeadlineDate.toLocaleDateString();

          changes.push({
            targetType: "TASK",
            targetId: matchedTask.id,
            targetTitle: matchedTask.title,
            field: "deadline",
            oldValue: oldFormatted,
            newValue: newFormatted,
            reason: temporal.transition
              ? `Deadline officially extended from ${temporal.transition.fromRaw} to ${temporal.transition.toRaw}`
              : `Deadline updated to ${newFormatted}`,
            evidenceSnippet: task.extractedSnippet || temporal.primaryDeadline?.rawSnippet || "",
          });
        }
      }

      // Check submission platform change
      if (
        task.submissionPlatform &&
        matchedTask.submissionPlatform &&
        task.submissionPlatform.toUpperCase() !== matchedTask.submissionPlatform.toUpperCase()
      ) {
        changes.push({
          targetType: "TASK",
          targetId: matchedTask.id,
          targetTitle: matchedTask.title,
          field: "submissionPlatform",
          oldValue: matchedTask.submissionPlatform,
          newValue: task.submissionPlatform,
          reason: `Submission platform changed from ${matchedTask.submissionPlatform} to ${task.submissionPlatform}`,
          evidenceSnippet: task.extractedSnippet,
        });
      }
    }
  }

  // 3. Evaluate Events changes (venue / timing)
  for (const event of extractedEvents) {
    if (event.course && event.venue) {
      for (const existing of existingEvents) {
        if (
          existing.course?.title.toLowerCase().includes(event.course.toLowerCase()) &&
          existing.venue &&
          existing.venue.toUpperCase() !== event.venue.toUpperCase()
        ) {
          changes.push({
            targetType: "EVENT",
            targetId: existing.id,
            targetTitle: existing.title,
            field: "venue",
            oldValue: existing.venue,
            newValue: event.venue,
            reason: `Class/Event venue relocated to ${event.venue}`,
            evidenceSnippet: event.extractedSnippet,
          });
        }
      }
    }
  }

  return changes;
}
