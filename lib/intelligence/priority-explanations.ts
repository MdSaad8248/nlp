import { PriorityEvaluationResult, PriorityFactor, PriorityLevel } from "./types";

/**
 * Builds user-friendly transparent explanation strings and bullet points for priority decisions.
 */
export function formatFactorBreakdown(factors: PriorityFactor[]): string[] {
  return factors
    .filter((f) => f.scoreContribution > 0)
    .sort((a, b) => b.scoreContribution - a.scoreContribution)
    .map((f) => `${f.name}: +${f.scoreContribution} (${f.detail})`);
}

export function generatePriorityHeadline(
  level: PriorityLevel,
  score: number,
  title: string,
  topFactor?: PriorityFactor
): string {
  if (level === "CRITICAL") {
    return topFactor ? `Immediate action: ${topFactor.detail}` : "Immediate action required";
  }
  if (level === "HIGH") {
    return topFactor ? `High priority: ${topFactor.detail}` : "High priority task";
  }
  if (level === "MEDIUM") {
    return "Scheduled academic deliverable";
  }
  return "Standard pace deliverable";
}

export function generateRecommendationReasons(
  title: string,
  category: string,
  urgencyLabel: string,
  marks: number | null,
  factors: PriorityFactor[],
  isOverdue: boolean
): string[] {
  const reasons: string[] = [];

  if (isOverdue) {
    reasons.push("Overdue deliverable requiring immediate submission or recovery");
  } else if (urgencyLabel) {
    reasons.push(`Timeline urgency: ${urgencyLabel}`);
  }

  if (marks && marks >= 20) {
    reasons.push(`Significant grading impact: accounts for ${marks} marks`);
  } else if (marks && marks > 0) {
    reasons.push(`Course evaluation weight: ${marks} marks`);
  }

  const penaltyFactor = factors.find((f) => f.name === "Strict deadline");
  if (penaltyFactor) {
    reasons.push("Strict late submission policy / penalty clause active");
  }

  const typeFactor = factors.find((f) => f.name === "Assessment type");
  if (typeFactor) {
    reasons.push(typeFactor.detail);
  }

  const clusterFactor = factors.find((f) => f.name === "Deadline concentration");
  if (clusterFactor) {
    reasons.push("High deadline concentration in current 48-hour assessment window");
  }

  if (reasons.length === 0) {
    reasons.push("Earliest upcoming pending academic task");
  }

  return reasons;
}
