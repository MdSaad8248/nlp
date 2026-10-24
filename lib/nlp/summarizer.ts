import { ExtractedTask, ExtractedEvent } from "./schemas";
import { AcademicEntities } from "./ner";
import { TemporalExtractionResult } from "./temporal";

export function generateAcademicSummary(
  text: string,
  entities: AcademicEntities,
  temporal: TemporalExtractionResult,
  tasks: ExtractedTask[],
  events: ExtractedEvent[]
): string {
  const primaryTask = tasks[0];
  const primaryEvent = events[0];

  // If we have a deadline transition
  if (temporal.transition && primaryTask) {
    const courseStr = primaryTask.course ? `[${primaryTask.course}] ` : "";
    const platformStr = primaryTask.submissionPlatform ? ` via ${primaryTask.submissionPlatform}` : "";
    const penaltyStr = entities.penaltyClause ? ` Note: ${entities.penaltyClause}.` : "";
    return `${courseStr}${primaryTask.title} deadline extended from ${temporal.transition.fromRaw} to ${temporal.transition.toRaw}${platformStr}.${penaltyStr}`;
  }

  // If we have a regular task
  if (primaryTask) {
    const courseStr = primaryTask.course ? `[${primaryTask.course}] ` : "";
    const deadlineStr = primaryTask.normalizedDeadline ? ` due on ${primaryTask.normalizedDeadline}` : "";
    const platformStr = primaryTask.submissionPlatform ? ` via ${primaryTask.submissionPlatform}` : "";
    const penaltyStr = entities.penaltyClause ? ` (${entities.penaltyClause})` : "";
    return `${courseStr}${primaryTask.title}${deadlineStr}${platformStr}.${penaltyStr}`;
  }

  // If we have an academic event
  if (primaryEvent) {
    const courseStr = primaryEvent.course ? `[${primaryEvent.course}] ` : "";
    const venueStr = primaryEvent.venue ? ` at ${primaryEvent.venue}` : "";
    const timeStr = primaryEvent.startTime ? ` scheduled for ${primaryEvent.startTime}` : "";
    return `${courseStr}${primaryEvent.title}${venueStr}${timeStr}.`;
  }

  // Fallback: clean up first two sentences of natural text
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && !s.toLowerCase().startsWith("dear"));

  return sentences.slice(0, 2).join(" ") || text.slice(0, 160) + "...";
}
