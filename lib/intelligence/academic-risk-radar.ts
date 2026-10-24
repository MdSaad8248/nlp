/**
 * lib/intelligence/academic-risk-radar.ts
 *
 * Milestone 8-D — Academic Risk Radar
 * Higher-level academic risk intelligence engine extending Milestone 4
 * priority & workload intelligence.
 *
 * Measurable academic indicators:
 * - Deadline clusters (multiple high-weight deliverables due within 48-72h)
 * - Exam + assignment concentrations in tight temporal windows
 * - Overdue major assessments
 * - High-value incomplete projects near deadlines
 * - Multiple assessments on the same calendar day
 * - Unresolved rubric requirements for impending projects
 * - Course-specific workload overload
 * - Unresolved academic contradictions/conflicts
 *
 * Strict Rule: Absolutely NO medical, psychological, or personal-health diagnoses.
 * Only measurable academic state is evaluated.
 */

import { PriorityLevel } from "./types";
import { WorkloadSummary } from "./types";
import { StructuredRubric } from "./rubric-engine";
import { AcademicContradiction } from "@/lib/nlp/contradiction-detector";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AcademicRiskTrigger {
  id: string;
  type:
    | "DEADLINE_CLUSTER"
    | "EXAM_CONCENTRATION"
    | "EXAM_ASSIGNMENT_COLLISION"
    | "OVERDUE_ASSESSMENT"
    | "HIGH_VALUE_INCOMPLETE"
    | "HIGH_MARKS_SHORT_DEADLINE"
    | "SAME_DAY_ASSESSMENTS"
    | "UNRESOLVED_REQUIREMENTS"
    | "UNRESOLVED_RUBRIC_REQUIREMENTS"
    | "COURSE_OVERLOAD"
    | "UNRESOLVED_CONTRADICTION"
    | "ACADEMIC_CONTRADICTION"
    | "MODERATE_WORKLOAD_CLUSTER"
    | "SCHEDULE_INSTABILITY";
  severity: RiskLevel;
  title: string;
  description: string;
  contributingItems: string[];
  evidence: string[];
}

export interface CourseRiskBreakdown {
  courseCode: string;
  courseTitle?: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0 to 100
  activeDeliverablesCount: number;
  totalMarksAtStake: number;
  imminentDeadlinesCount: number; // due in < 72h
  triggers: string[];
}

export interface AcademicRiskRadarReport {
  overallRiskLevel: RiskLevel;
  riskScore: number; // 0 to 100
  headline: string;
  summary: string;
  mainTriggers: AcademicRiskTrigger[];
  courseRisks: CourseRiskBreakdown[];
  contributingFactorsCount: number;
  highestRiskCourse: string | null;
  recommendedAction: string;
  evaluatedAt: string;
}

export interface RiskEvaluationInput {
  tasks: Array<{
    id: string;
    title: string;
    courseCode?: string | null;
    category?: string;
    deadline?: Date | string | null;
    status: string; // PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
    marks?: number | null;
    weightage?: number | null;
    priority?: PriorityLevel | string;
    priorityScore?: number;
    isRescheduled?: boolean;
  }>;
  events?: Array<{
    id: string;
    title: string;
    courseCode?: string | null;
    eventType?: string;
    startTime?: Date | string | null;
    isRescheduled?: boolean;
  }>;
  exams?: Array<{
    id: string;
    title: string;
    courseCode?: string | null;
    examDate?: Date | string | null;
    startTime?: Date | string | null;
    weightage?: number | null;
  }>;
  rubrics?: StructuredRubric[];
  contradictions?: AcademicContradiction[];
  referenceDate?: Date;
}

export class AcademicRiskRadar {
  /**
   * Main entry point: Evaluates academic state and produces an explainable
   * AcademicRiskRadarReport.
   */
  public static evaluateRisk(input: RiskEvaluationInput): AcademicRiskRadarReport {
    const now = input.referenceDate || new Date();
    const triggers: AcademicRiskTrigger[] = [];

    // Filter out completed, cancelled, and inactive items, and deduplicate identical notices/tasks
    const rawActive = input.tasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
    );

    const seenTaskKeys = new Set<string>();
    const activeTasks = rawActive.filter((t) => {
      // Normalize title by removing extraneous duplicate tags e.g. "(duplicate copy)"
      const normTitle = t.title.toLowerCase().replace(/\(.*duplicate.*\)/gi, "").trim();
      const key = `${(t.courseCode || "").toLowerCase()}_${normTitle}`;
      if (seenTaskKeys.has(key)) return false;
      seenTaskKeys.add(key);
      return true;
    });

    // 1. Check for OVERDUE assessments
    const overdueTasks = activeTasks.filter(
      (t) =>
        t.status === "OVERDUE" ||
        (t.deadline && new Date(t.deadline).getTime() < now.getTime())
    );

    if (overdueTasks.length > 0) {
      const isCritical = overdueTasks.length >= 2 || overdueTasks.some((t) => (t.marks || 0) >= 30);

      triggers.push({
        id: `trigger-overdue-${Date.now()}`,
        type: "OVERDUE_ASSESSMENT",
        severity: isCritical ? "CRITICAL" : "HIGH",
        title: "Overdue Academic Deliverable",
        description: `${overdueTasks.length} deliverable(s) are past their submission deadline.`,
        contributingItems: overdueTasks.map((t) => t.title),
        evidence: overdueTasks.map(
          (t) => `${t.title} (${t.courseCode || "GEN"}) — Due: ${this.formatShortDate(t.deadline)} [${t.marks || 0} marks]`
        ),
      });
    }

    // 2. Check for Imminent Deadlines (< 48 hours, < 72 hours, < 120 hours / 5 days)
    const hours48 = 48 * 60 * 60 * 1000;
    const hours72 = 72 * 60 * 60 * 1000;
    const hours120 = 120 * 60 * 60 * 1000;

    const dueWithin48h = activeTasks.filter((t) => {
      if (!t.deadline) return false;
      const diff = new Date(t.deadline).getTime() - now.getTime();
      return diff > 0 && diff <= hours48;
    });

    const dueWithin72h = activeTasks.filter((t) => {
      if (!t.deadline) return false;
      const diff = new Date(t.deadline).getTime() - now.getTime();
      return diff > 0 && diff <= hours72;
    });

    const dueWithin120h = activeTasks.filter((t) => {
      if (!t.deadline) return false;
      const diff = new Date(t.deadline).getTime() - now.getTime();
      return diff > 0 && diff <= hours120;
    });

    // 3. Check for Exam + Assignment Concentration
    const upcomingExams48h = [
      ...(input.exams || []),
      ...(input.events?.filter((e) => e.eventType === "EXAM") || []),
    ].filter((ex) => {
      const exTime = (ex as any).examDate || (ex as any).startTime;
      if (!exTime) return false;
      const diff = new Date(exTime).getTime() - now.getTime();
      return diff > 0 && diff <= hours48;
    });

    if (upcomingExams48h.length > 0 && dueWithin48h.length > 0) {
      triggers.push({
        id: `trigger-exam-concentration-${Date.now()}`,
        type: "EXAM_ASSIGNMENT_COLLISION",
        severity: "CRITICAL",
        title: "Exam & Assignment Temporal Concentration",
        description: `Impending exam within 48h coinciding with active assignment submission deadlines.`,
        contributingItems: [
          ...upcomingExams48h.map((e) => e.title),
          ...dueWithin48h.map((t) => t.title),
        ],
        evidence: [
          ...upcomingExams48h.map((e) => `Exam: ${e.title} (${e.courseCode || "GEN"})`),
          ...dueWithin48h.map((t) => `Deliverable: ${t.title} [${t.marks || 0} marks]`),
        ],
      });
    }

    // 4. Check for Deadline Cluster (>= 2 within 48h or >= 3 within 72h)
    if (dueWithin48h.length >= 2 || dueWithin72h.length >= 3) {
      const severity: RiskLevel = dueWithin48h.length >= 5 ? "CRITICAL" : "HIGH";

      triggers.push({
        id: `trigger-deadline-cluster-${Date.now()}`,
        type: "DEADLINE_CLUSTER",
        severity,
        title: "High Deadline Concentration",
        description: `${dueWithin72h.length} incomplete assessments due within 72 hours.`,
        contributingItems: dueWithin72h.map((t) => t.title),
        evidence: dueWithin72h.map(
          (t) => `${t.title}: ${t.marks ? `${t.marks} marks` : "Standard"} — Due in ${this.formatHoursRemaining(t.deadline, now)}`
        ),
      });
    } else if (dueWithin120h.length >= 2 && dueWithin48h.length === 0 && dueWithin72h.length < 2) {
      triggers.push({
        id: `trigger-upcoming-workload-${Date.now()}`,
        type: "MODERATE_WORKLOAD_CLUSTER",
        severity: "MEDIUM",
        title: "Approaching Academic Deliverables",
        description: `${dueWithin120h.length} assessments due within 4-5 days.`,
        contributingItems: dueWithin120h.map((t) => t.title),
        evidence: dueWithin120h.map((t) => `${t.title} (${t.marks || 0} marks)`),
      });
    }

    // 5. Check for High-Value Incomplete Project near deadline (>= 25 marks, < 48 hours)
    const highValueImminent = dueWithin48h.filter(
      (t) => (t.marks || 0) >= 25 || (t.category || "").toUpperCase() === "PROJECT"
    );

    if (highValueImminent.length > 0) {
      triggers.push({
        id: `trigger-high-value-${Date.now()}`,
        type: "HIGH_MARKS_SHORT_DEADLINE",
        severity: "HIGH",
        title: "High-Weightage Deliverable Approaching",
        description: `Major assessment carrying significant marks is due shortly.`,
        contributingItems: highValueImminent.map((t) => t.title),
        evidence: highValueImminent.map(
          (t) => `${t.title} carries ${t.marks || 30} marks (Due: ${this.formatShortDate(t.deadline)})`
        ),
      });
    }

    // 6. Check for Same-Day Multi-Assessments
    const datesMap = new Map<string, string[]>();
    for (const t of activeTasks) {
      if (t.deadline) {
        const dStr = new Date(t.deadline).toISOString().slice(0, 10);
        const list = datesMap.get(dStr) || [];
        list.push(t.title);
        datesMap.set(dStr, list);
      }
    }
    for (const ex of input.exams || []) {
      const exTime = ex.examDate || ex.startTime;
      if (exTime) {
        const dStr = new Date(exTime).toISOString().slice(0, 10);
        const list = datesMap.get(dStr) || [];
        list.push(`Exam: ${ex.title}`);
        datesMap.set(dStr, list);
      }
    }

    for (const [dateStr, items] of datesMap.entries()) {
      if (items.length >= 2) {
        const hasExam = items.some((it) => it.startsWith("Exam:"));
        const hasTask = items.some((it) => !it.startsWith("Exam:"));
        const isExamCollision = hasExam && hasTask;

        triggers.push({
          id: `trigger-sameday-${dateStr}`,
          type: isExamCollision ? "EXAM_ASSIGNMENT_COLLISION" : "SAME_DAY_ASSESSMENTS",
          severity: isExamCollision ? "HIGH" : items.length >= 3 ? "HIGH" : "MEDIUM",
          title: isExamCollision
            ? `Exam and Assignment Scheduled Same Day (${dateStr})`
            : `Multiple Assessments on Single Day (${dateStr})`,
          description: isExamCollision
            ? `Exam and assignment submission fall on the same day (${dateStr}).`
            : `${items.length} assessments or exams are scheduled on the same calendar day.`,
          contributingItems: items,
          evidence: items.map((it) => `${it} scheduled on ${dateStr}`),
        });
        break; // Report the earliest same-day clash
      }
    }

    // 7. Check for Many Unresolved Rubric Requirements
    if (input.rubrics && input.rubrics.length > 0) {
      for (const rub of input.rubrics) {
        const incompleteReqs = rub.requirements.filter(
          (r) => r.status === "NOT_STARTED" || r.status === "IN_PROGRESS"
        );
        if (incompleteReqs.length >= 4) {
          triggers.push({
            id: `trigger-unresolved-reqs-${rub.id}`,
            type: "UNRESOLVED_RUBRIC_REQUIREMENTS",
            severity: "HIGH",
            title: `Extensive Pending Rubric Criteria for ${rub.title}`,
            description: `${incompleteReqs.length} rubric requirements remain uncompleted for this project.`,
            contributingItems: incompleteReqs.slice(0, 4).map((r) => r.title),
            evidence: incompleteReqs.slice(0, 4).map((r) => `${r.title} (${r.marks || 0} marks pending)`),
          });
        }
      }
    }

    // 8. Check for Unresolved Academic Contradictions
    if (input.contradictions && input.contradictions.length > 0) {
      const unresolved = input.contradictions.filter(
        (c) => !c.resolutionStatus || c.resolutionStatus === "REQUIRES_VERIFICATION"
      );
      if (unresolved.length > 0) {
        triggers.push({
          id: `trigger-contradiction-${Date.now()}`,
          type: "ACADEMIC_CONTRADICTION",
          severity: "MEDIUM",
          title: "Unresolved Academic Contradictions",
          description: `${unresolved.length} schedule or venue conflict(s) require verification with faculty.`,
          contributingItems: unresolved.map(
            (c) => (c as any).affectedItemTitle || (c as any).itemTitle || "Academic Item"
          ),
          evidence: unresolved.map(
            (c) => (c as any).evidence || (c as any).explanation || "Conflicting notices"
          ),
        });
      }
    }

    // 9. Course-Specific Workload Breakdown
    const courseMap = new Map<string, typeof activeTasks>();
    for (const t of activeTasks) {
      const code = t.courseCode || "GEN";
      const list = courseMap.get(code) || [];
      list.push(t);
      courseMap.set(code, list);
    }

    const courseRisks: CourseRiskBreakdown[] = [];
    let highestRiskCourse: string | null = null;
    let maxCourseScore = -1;

    for (const [code, items] of courseMap.entries()) {
      let totalMarks = 0;
      let imminent = 0;

      for (const it of items) {
        totalMarks += it.marks || 0;
        if (it.deadline) {
          const diff = new Date(it.deadline).getTime() - now.getTime();
          if (diff > 0 && diff <= hours72) imminent++;
        }
      }

      let cScore = items.length * 15 + imminent * 25 + (totalMarks > 40 ? 25 : totalMarks > 20 ? 15 : 0);
      cScore = Math.min(100, cScore);

      const cLevel: RiskLevel =
        cScore >= 75 ? "CRITICAL" : cScore >= 50 ? "HIGH" : cScore >= 25 ? "MEDIUM" : "LOW";

      const cTriggers: string[] = [];
      if (items.length >= 3) {
        cTriggers.push(`${items.length} active deliverables`);
        if (cLevel === "HIGH" || cLevel === "CRITICAL") {
          triggers.push({
            id: `trigger-course-overload-${code}`,
            type: "COURSE_OVERLOAD",
            severity: "HIGH",
            title: `Course Workload Concentration in ${code}`,
            description: `${items.length} deliverables concentrated in ${code} representing ${totalMarks} marks.`,
            contributingItems: items.map((i) => i.title),
            evidence: items.map((i) => `${i.title} (${i.marks || 0} marks)`),
          });
        }
      }
      if (imminent > 0) cTriggers.push(`${imminent} due in < 72h`);
      if (totalMarks >= 30) cTriggers.push(`${totalMarks} marks at stake`);

      if (cScore > maxCourseScore) {
        maxCourseScore = cScore;
        highestRiskCourse = code !== "GEN" ? code : null;
      }

      courseRisks.push({
        courseCode: code,
        riskLevel: cLevel,
        riskScore: cScore,
        activeDeliverablesCount: items.length,
        totalMarksAtStake: totalMarks,
        imminentDeadlinesCount: imminent,
        triggers: cTriggers,
      });
    }

    // 10. Calculate Overall Risk Score and Level
    let baseScore = 0;
    if (activeTasks.length > 0 || (input.exams && input.exams.length > 0)) {
      baseScore = 10;
    }

    for (const trig of triggers) {
      if (trig.severity === "CRITICAL") baseScore += 35;
      else if (trig.severity === "HIGH") baseScore += 25;
      else if (trig.severity === "MEDIUM") baseScore += 15;
      else baseScore += 5;
    }

    const overallScore = Math.min(100, baseScore);
    const overallRiskLevel: RiskLevel =
      triggers.some((t) => t.severity === "CRITICAL")
        ? "CRITICAL"
        : triggers.some((t) => t.severity === "HIGH") || overallScore >= 45
        ? "HIGH"
        : triggers.some((t) => t.severity === "MEDIUM") || overallScore >= 20
        ? "MEDIUM"
        : "LOW";

    // Build transparent explainable headline and summary
    const headline = this.buildHeadline(overallRiskLevel, triggers, dueWithin48h.length);
    const summary = this.buildSummary(overallRiskLevel, triggers, activeTasks.length, dueWithin48h.length);
    const recommendedAction = this.buildRecommendation(overallRiskLevel, triggers);

    return {
      overallRiskLevel,
      riskScore: overallScore,
      headline,
      summary,
      mainTriggers: triggers,
      courseRisks,
      contributingFactorsCount: triggers.length,
      highestRiskCourse,
      recommendedAction,
      evaluatedAt: now.toISOString(),
    };
  }

  // ─── Explainability Builders ────────────────────────────────────────────────

  private static buildHeadline(
    level: RiskLevel,
    triggers: AcademicRiskTrigger[],
    imminentCount: number
  ): string {
    if (level === "CRITICAL") {
      const hasExam = triggers.some((t) => t.type === "EXAM_CONCENTRATION");
      const hasOverdue = triggers.some((t) => t.type === "OVERDUE_ASSESSMENT");
      if (hasExam) return "CRITICAL RISK: Impending Exam & Assignment Collision";
      if (hasOverdue) return "CRITICAL RISK: Overdue Major Academic Deliverables";
      return "CRITICAL RISK: Severe Deadline Concentration Within 48 Hours";
    }
    if (level === "HIGH") {
      if (imminentCount >= 2) return `HIGH RISK: ${imminentCount} Incomplete Assessments Due Shortly`;
      return "HIGH RISK: Elevated Academic Workload Concentration";
    }
    if (level === "MEDIUM") {
      return "MODERATE RISK: Active Deliverables Approaching";
    }
    return "LOW RISK: Academic Workload is Balanced";
  }

  private static buildSummary(
    level: RiskLevel,
    triggers: AcademicRiskTrigger[],
    totalActive: number,
    due48h: number
  ): string {
    if (totalActive === 0) {
      return "Zero academic risk detected. No pending deliverables or scheduled examinations in your active academic calendar.";
    }

    const triggerSummaries = triggers.map((t) => `✓ ${t.title}: ${t.description}`).join("\n");
    return `Academic Risk Level: ${level}.\n${due48h} deliverable(s) due within 48 hours across ${totalActive} total active academic item(s).\n\nContributing Factors:\n${triggerSummaries || "✓ Standard pacing across enrolled courses"}`;
  }

  private static buildRecommendation(level: RiskLevel, triggers: AcademicRiskTrigger[]): string {
    if (level === "CRITICAL") {
      return "Immediate action required: Prioritize imminent exam preparation and high-weight assessments first. Postpone low-priority extracurricular activities.";
    }
    if (level === "HIGH") {
      return "Focus today on the nearest deadline and incomplete rubric requirements with highest mark contributions.";
    }
    if (level === "MEDIUM") {
      return "Maintain regular pace; complete upcoming coursework 24 hours prior to deadline to prevent clustering.";
    }
    return "Workload is manageable; proceed according to scheduled syllabus timeline.";
  }

  private static formatShortDate(d: Date | string | null | undefined): string {
    if (!d) return "TBA";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  private static formatHoursRemaining(d: Date | string | null | undefined, now: Date): string {
    if (!d) return "TBA";
    const diff = new Date(d).getTime() - now.getTime();
    const hours = Math.round(diff / (1000 * 60 * 60));
    if (hours < 0) return `${Math.abs(hours)}h overdue`;
    if (hours === 0) return "< 1h remaining";
    return `${hours} hours`;
  }
}
