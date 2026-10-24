import { PriorityLevel } from "./schemas";

export interface PriorityEvaluation {
  score: number;
  level: PriorityLevel;
  reasons: string[];
  explanation: string;
}

export interface PriorityFactors {
  deadline: Date | null;
  category: string;
  hasPenaltyClause: boolean;
  penaltyClauseText?: string | null;
  isExam: boolean;
  hasUrgentKeywords: boolean;
  estimatedHours?: number;
  now?: Date;
}

export function evaluatePriority(factors: PriorityFactors): PriorityEvaluation {
  let score = 30; // baseline score
  const reasons: string[] = [];
  const now = factors.now || new Date();

  // 1. Deadline Proximity
  if (factors.deadline) {
    const diffMs = factors.deadline.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 0) {
      score += 45;
      reasons.push("Task is overdue or deadline is immediate");
    } else if (diffHours <= 24) {
      score += 40;
      reasons.push("Deadline is within 24 hours");
    } else if (diffDays <= 3) {
      score += 30;
      reasons.push(`Deadline is within ${Math.ceil(diffDays)} days`);
    } else if (diffDays <= 7) {
      score += 15;
      reasons.push("Deadline is within 1 week");
    } else {
      score += 5;
      reasons.push("Deadline is more than 1 week away");
    }
  } else {
    reasons.push("No specific deadline specified");
  }

  // 2. Penalty / Strictness Clause
  if (factors.hasPenaltyClause) {
    score += 25;
    if (factors.penaltyClauseText) {
      reasons.push(`Strict policy enforced: "${factors.penaltyClauseText}"`);
    } else {
      reasons.push("Notice explicitly states late submissions will not be accepted or will be penalized");
    }
  }

  // 3. Academic Weight / Category
  if (factors.isExam || factors.category === "EXAM") {
    score += 20;
    reasons.push("High-stake academic exam/assessment");
  } else if (factors.category === "PROJECT") {
    score += 15;
    reasons.push("Significant academic project deliverable");
  } else if (factors.category === "REVIEW") {
    score += 12;
    reasons.push("Faculty evaluation review session");
  } else if (factors.category === "QUIZ" || factors.category === "LAB") {
    score += 8;
    reasons.push("Continuous assessment component");
  }

  // 4. Urgency keywords
  if (factors.hasUrgentKeywords && !factors.hasPenaltyClause) {
    score += 10;
    reasons.push("Notice contains urgent or mandatory instructions");
  }

  // Clamp score between 10 and 100
  score = Math.min(Math.max(score, 10), 100);

  // Determine Level
  let level: PriorityLevel = "MEDIUM";
  if (score >= 80) {
    level = "HIGH";
  } else if (score >= 90) {
    level = "CRITICAL";
  } else if (score >= 50) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }

  // Re-check for CRITICAL threshold
  if (score >= 88) {
    level = "CRITICAL";
  }

  // Formulate concise, transparent natural language explanation
  const explanation = reasons.join(" and ") + ".";

  return {
    score,
    level,
    reasons,
    explanation,
  };
}
