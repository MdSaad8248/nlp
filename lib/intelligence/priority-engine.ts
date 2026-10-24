import { PriorityEvaluationResult, PriorityFactor, PriorityLevel } from "./types";

export interface PriorityEvaluationInput {
  title?: string;
  deadline?: Date | string | null;
  status?: string; // "PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"
  category?: string; // "ASSIGNMENT", "PROJECT", "REVIEW", "EXAM", "QUIZ", "LAB", "HOMEWORK"
  marks?: number | null;
  weightage?: number | null;
  hasPenaltyClause?: boolean;
  penaltyClauseText?: string | null;
  hasUrgentKeywords?: boolean;
  isClustered?: boolean;
  now?: Date;
}

/**
 * Milestone 4 Priority Engine
 *
 * Implements a transparent, deterministic additive scoring formula:
 * Priority Score = Incomplete (15) + Deadline Pressure (5-45) + Weightage (0-20)
 *                + Assessment Type (5-15) + Strict Deadline (0-10)
 *                + Explicit Urgency (0-5) + Deadline Concentration (0-5)
 *
 * Thresholds:
 * - CRITICAL: Score >= 80
 * - HIGH    : Score >= 60 && Score < 80
 * - MEDIUM  : Score >= 40 && Score < 60
 * - LOW     : Score < 40
 */
export function calculateAcademicPriority(input: PriorityEvaluationInput): PriorityEvaluationResult {
  const factors: PriorityFactor[] = [];
  const now = input.now ? new Date(input.now) : new Date();
  const status = (input.status || "PENDING").toUpperCase();

  // 1. Completion & Cancellation Filter
  if (status === "COMPLETED") {
    return {
      score: 0,
      level: "LOW",
      factors: [
        {
          name: "Completion status",
          scoreContribution: 0,
          detail: "Deliverable marked completed; inactive",
        },
      ],
      explanation: "Task is completed. No active deadline pressure.",
      urgencyLabel: "Completed",
    };
  }

  if (status === "CANCELLED") {
    return {
      score: 0,
      level: "LOW",
      factors: [
        {
          name: "Completion status",
          scoreContribution: 0,
          detail: "Academic item cancelled; inactive",
        },
      ],
      explanation: "Item has been officially cancelled per academic notice.",
      urgencyLabel: "Cancelled",
    };
  }

  // 2. Incomplete Baseline Factor
  factors.push({
    name: "Incomplete",
    scoreContribution: 15,
    detail: "Task is active and incomplete",
  });

  // 3. Deadline Proximity & Overdue Status
  let deadlineDate: Date | null = null;
  if (input.deadline) {
    deadlineDate = typeof input.deadline === "string" ? new Date(input.deadline) : input.deadline;
  }

  let urgencyLabel = "Approaching";

  if (deadlineDate && !isNaN(deadlineDate.getTime())) {
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0 || status === "OVERDUE") {
      factors.push({
        name: "Deadline pressure",
        scoreContribution: 45,
        detail: `Task is overdue by ${Math.abs(Math.round(diffHours))}h`,
      });
      urgencyLabel = "Overdue";
    } else if (diffHours <= 12) {
      factors.push({
        name: "Deadline pressure",
        scoreContribution: 40,
        detail: `Due in ${Math.max(1, Math.round(diffHours))}h today`,
      });
      urgencyLabel = `Due in ${Math.max(1, Math.round(diffHours))}h`;
    } else if (diffHours <= 24) {
      factors.push({
        name: "Deadline pressure",
        scoreContribution: 35,
        detail: "Due within 24 hours",
      });
      urgencyLabel = "Due tomorrow";
    } else if (diffHours <= 48) {
      factors.push({
        name: "Deadline pressure",
        scoreContribution: 25,
        detail: "Due within 48 hours",
      });
      urgencyLabel = `Due in ${Math.ceil(diffHours / 24)} days`;
    } else if (diffHours <= 168) {
      // 7 days
      factors.push({
        name: "Deadline pressure",
        scoreContribution: 15,
        detail: `Due in ${Math.ceil(diffHours / 24)} days`,
      });
      urgencyLabel = `Due in ${Math.ceil(diffHours / 24)} days`;
    } else {
      factors.push({
        name: "Deadline pressure",
        scoreContribution: 5,
        detail: `Due in ${Math.ceil(diffHours / 24)} days (sufficient buffer)`,
      });
      urgencyLabel = `Due in ${Math.ceil(diffHours / 24)} days`;
    }
  } else {
    factors.push({
      name: "Deadline pressure",
      scoreContribution: 5,
      detail: "No explicit deadline set",
    });
    urgencyLabel = "Ongoing";
  }

  // 4. Weightage / Marks Factor
  const marks = input.marks ?? input.weightage;
  if (marks !== null && marks !== undefined && marks > 0) {
    if (marks >= 30) {
      factors.push({
        name: "Weightage",
        scoreContribution: 20,
        detail: `High academic weight (${marks} marks)`,
      });
    } else if (marks >= 20) {
      factors.push({
        name: "Weightage",
        scoreContribution: 15,
        detail: `Significant weight (${marks} marks)`,
      });
    } else if (marks >= 10) {
      factors.push({
        name: "Weightage",
        scoreContribution: 10,
        detail: `Moderate weight (${marks} marks)`,
      });
    } else {
      factors.push({
        name: "Weightage",
        scoreContribution: 5,
        detail: `Base weight (${marks} marks)`,
      });
    }
  }

  // 5. Assessment Significance / Type Factor
  const cat = (input.category || "ASSIGNMENT").toUpperCase();
  if (cat === "EXAM" || /\b(?:exam|cat|fat|midterm)\b/i.test(input.title || "")) {
    factors.push({
      name: "Assessment type",
      scoreContribution: 15,
      detail: "High-stake examination / CAT / FAT",
    });
  } else if (cat === "PROJECT" || cat === "REVIEW" || /\b(?:project|review|viva)\b/i.test(input.title || "")) {
    factors.push({
      name: "Assessment type",
      scoreContribution: 12,
      detail: "Major project deliverable or evaluation review",
    });
  } else if (cat === "QUIZ" || cat === "LAB" || /\b(?:quiz|lab)\b/i.test(input.title || "")) {
    factors.push({
      name: "Assessment type",
      scoreContribution: 8,
      detail: "Continuous assessment quiz / lab component",
    });
  } else {
    factors.push({
      name: "Assessment type",
      scoreContribution: 5,
      detail: "Standard academic assignment / homework",
    });
  }

  // 6. Strict Deadline Language / Penalty Clause
  if (input.hasPenaltyClause || (input.penaltyClauseText && input.penaltyClauseText.trim().length > 0)) {
    factors.push({
      name: "Strict deadline",
      scoreContribution: 10,
      detail: input.penaltyClauseText || "Strict late submission policy enforced",
    });
  }

  // 7. Explicit Urgency Keywords
  if (input.hasUrgentKeywords) {
    factors.push({
      name: "Explicit urgency",
      scoreContribution: 5,
      detail: "Notice explicitly indicates urgent priority",
    });
  }

  // 8. Clustered Assessment Concentration
  if (input.isClustered) {
    factors.push({
      name: "Deadline concentration",
      scoreContribution: 5,
      detail: "Multiple major assessments fall in the same 48-hour window",
    });
  }

  // Sum exact factor contributions
  const score = factors.reduce((sum, f) => sum + f.scoreContribution, 0);

  // Determine Level from exact documented thresholds
  let level: PriorityLevel = "LOW";
  if (score >= 80) {
    level = "CRITICAL";
  } else if (score >= 60) {
    level = "HIGH";
  } else if (score >= 40) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }

  // Formulate explanation from top contributing factors
  const factorDetails = factors
    .filter((f) => f.scoreContribution > 0)
    .sort((a, b) => b.scoreContribution - a.scoreContribution)
    .map((f) => `${f.name}: +${f.scoreContribution}`);

  const explanation = `${level} Priority (Score: ${score}). Factors: ${factorDetails.join(", ")}.`;

  return {
    score,
    level,
    factors,
    explanation,
    urgencyLabel,
  };
}
