/**
 * lib/intelligence/smart-planner.ts
 *
 * Milestone 8-D — Smart Academic Planning Engine
 * Generates deterministic, explainable study schedules and time-blocked focus sessions
 * derived from:
 * - Deadlines & M4 priority rankings
 * - Academic workload pressure
 * - M8-A syllabus topics & module context
 * - M8-C rubric requirements & missing criteria
 * - Estimated cognitive effort
 *
 * Strict Rule: Never invent fake deadlines or hallucinate non-existent tasks.
 * Every recommended study block maps directly to real academic state.
 */

import { PriorityLevel } from "./types";
import { StructuredSyllabus, SyllabusStore } from "./syllabus-store";
import { StructuredRubric, RubricStore, RubricRequirement } from "./rubric-store";

export interface PlanSessionBlock {
  id: string;
  timeSlot: string; // e.g. "7:00–8:00 PM"
  durationMinutes: number; // e.g. 60
  taskTitle: string;
  courseCode: string | null;
  moduleOrRequirementTitle: string;
  type: "RUBRIC_REQUIREMENT" | "SYLLABUS_TOPIC" | "EXAM_PREPARATION" | "COURSEWORK_DELIVERABLE";
  marksAtStake: number | null;
  priorityLevel: PriorityLevel;
  whyNow: string[]; // Explainable bullets: "Why now?"
  evidenceSnippet: string;
}

export interface SmartAcademicPlan {
  planDate: string; // e.g. "Today, Sep 19"
  targetWindow: "TODAY" | "TOMORROW" | "WEEKEND";
  totalPlannedMinutes: number;
  totalMarksCovered: number;
  focusHeadline: string;
  summary: string;
  sessions: PlanSessionBlock[];
  missingRequirementsAddressed: string[];
  nextImmediateFocus: PlanSessionBlock | null;
  generatedAt: string;
}

export interface PlannerCandidateItem {
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
  estimatedHours?: number;
  isRescheduled?: boolean;
}

export class SmartPlanner {
  /**
   * Generates a deterministic time-blocked study plan for today based on real
   * academic state, syllabus topics, and missing rubric requirements.
   */
  public static generateSmartPlan(
    tasks: PlannerCandidateItem[],
    options: {
      referenceDate?: Date;
      availableHours?: number;
      startTimeHour?: number; // e.g. 19 for 7:00 PM
      rubrics?: StructuredRubric[];
      syllabi?: StructuredSyllabus[];
    } = {}
  ): SmartAcademicPlan {
    const now = options.referenceDate || new Date();
    const availableMinutes = (options.availableHours || 3.0) * 60;
    const startHour = options.startTimeHour !== undefined ? options.startTimeHour : 19; // 7:00 PM

    // 1. Filter active tasks (exclude completed and cancelled)
    const activeTasks = tasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
    );

    if (activeTasks.length === 0) {
      return {
        planDate: this.formatPlanDate(now),
        targetWindow: "TODAY",
        totalPlannedMinutes: 0,
        totalMarksCovered: 0,
        focusHeadline: "No Immediate Academic Tasks Scheduled",
        summary: "All current deliverables are completed or inactive. You have zero impending deadlines for this session window.",
        sessions: [],
        missingRequirementsAddressed: [],
        nextImmediateFocus: null,
        generatedAt: now.toISOString(),
      };
    }

    // 2. Rank candidate tasks by urgency, priorityScore, and marks
    const rankedTasks = [...activeTasks].sort((a, b) => {
      // Overdue first
      const aOverdue = a.deadline && new Date(a.deadline).getTime() < now.getTime();
      const bOverdue = b.deadline && new Date(b.deadline).getTime() < now.getTime();
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      // Nearest deadline
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      if (Math.abs(aTime - bTime) > 12 * 60 * 60 * 1000) {
        return aTime - bTime;
      }

      // Priority score
      const aScore = a.priorityScore || (a.priority === "CRITICAL" ? 90 : a.priority === "HIGH" ? 75 : 50);
      const bScore = b.priorityScore || (b.priority === "CRITICAL" ? 90 : b.priority === "HIGH" ? 75 : 50);
      if (aScore !== bScore) return bScore - aScore;

      // Marks
      return (b.marks || 0) - (a.marks || 0);
    });

    // 3. Assemble Plan Sessions incorporating rubric criteria & syllabus context
    const sessions: PlanSessionBlock[] = [];
    const addressedRequirements: string[] = [];
    let currentMinuteOffset = 0;
    let totalMarksCovered = 0;

    for (const task of rankedTasks) {
      if (currentMinuteOffset >= availableMinutes) break;

      const courseCode = task.courseCode || null;

      // Check if task has an associated rubric in store or options
      let rubric = options.rubrics?.find(
        (r) =>
          (courseCode && r.courseCode === courseCode) ||
          r.title.toLowerCase().includes(task.title.toLowerCase())
      );
      if (!rubric) {
        rubric = RubricStore.findRubric(courseCode || task.title) || undefined;
      }

      // Check if task has syllabus context
      let syllabus = options.syllabi?.find(
        (s) => courseCode && s.courseCode === courseCode
      );
      if (!syllabus && courseCode) {
        syllabus = SyllabusStore.getSyllabus(courseCode) || undefined;
      }

      // If rubric has missing requirements, schedule them explicitly!
      if (rubric && rubric.requirements.length > 0) {
        const missingReqs = rubric.requirements.filter(
          (r: RubricRequirement) => r.status === "NOT_STARTED" || r.status === "IN_PROGRESS"
        );

        // Sort missing requirements: highest marks first, mandatory first
        const sortedMissing = [...missingReqs].sort((a, b) => {
          if (a.isMandatory !== b.isMandatory) return a.isMandatory ? -1 : 1;
          return (b.marks || 0) - (a.marks || 0);
        });

        for (const req of sortedMissing) {
          if (currentMinuteOffset >= availableMinutes) break;

          const duration = req.marks && req.marks >= 20 ? 60 : 45;
          const slot = this.computeTimeSlot(startHour, currentMinuteOffset, duration);
          currentMinuteOffset += duration + 15; // 15 min break between blocks
          totalMarksCovered += req.marks || 10;
          addressedRequirements.push(`${task.title} — ${req.title}`);

          const whyNow = this.buildWhyNow(task, req, now);

          sessions.push({
            id: `session-${sessions.length + 1}`,
            timeSlot: slot,
            durationMinutes: duration,
            taskTitle: task.title,
            courseCode,
            moduleOrRequirementTitle: req.title,
            type: "RUBRIC_REQUIREMENT",
            marksAtStake: req.marks || task.marks || null,
            priorityLevel: (task.priority as PriorityLevel) || "HIGH",
            whyNow,
            evidenceSnippet: req.sourceEvidence?.snippet || req.rawTextSpan || task.title,
          });
        }
      } else {
        // Schedule standard task deliverable or syllabus topic block
        const duration = Math.min(
          60,
          Math.max(30, Math.round((task.estimatedHours || 1.5) * 45))
        );
        const slot = this.computeTimeSlot(startHour, currentMinuteOffset, duration);
        currentMinuteOffset += duration + 15;
        totalMarksCovered += task.marks || 0;

        // Try to identify syllabus module
        let topicLabel = task.title;
        if (syllabus) {
          const modMatch = SyllabusStore.findModuleForDeliverable(task.title, courseCode || undefined);
          if (modMatch) {
            topicLabel = `${modMatch.match.moduleTitle}: ${modMatch.match.matchedTopics[0] || modMatch.match.moduleTitle}`;
          }
        }

        const whyNow = this.buildWhyNow(task, null, now);

        sessions.push({
          id: `session-${sessions.length + 1}`,
          timeSlot: slot,
          durationMinutes: duration,
          taskTitle: task.title,
          courseCode,
          moduleOrRequirementTitle: topicLabel,
          type: (task.category || "").toUpperCase() === "EXAM" ? "EXAM_PREPARATION" : "COURSEWORK_DELIVERABLE",
          marksAtStake: task.marks || null,
          priorityLevel: (task.priority as PriorityLevel) || "MEDIUM",
          whyNow,
          evidenceSnippet: `Deliverable: ${task.title} [Due: ${this.formatPlanDate(task.deadline)}]`,
        });
      }
    }

    const nextImmediateFocus = sessions.length > 0 ? sessions[0] : null;
    const focusHeadline = nextImmediateFocus
      ? `Next Focus: ${nextImmediateFocus.taskTitle} — ${nextImmediateFocus.moduleOrRequirementTitle}`
      : "Academic Plan Ready";

    const summary = this.buildPlanSummary(sessions, totalMarksCovered);

    return {
      planDate: this.formatPlanDate(now),
      targetWindow: "TODAY",
      totalPlannedMinutes: sessions.reduce((acc, s) => acc + s.durationMinutes, 0),
      totalMarksCovered,
      focusHeadline,
      summary,
      sessions,
      missingRequirementsAddressed: addressedRequirements,
      nextImmediateFocus,
      generatedAt: now.toISOString(),
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private static buildWhyNow(
    task: PlannerCandidateItem,
    requirement: RubricRequirement | null,
    now: Date
  ): string[] {
    const bullets: string[] = [];

    // 1. Deadline proximity
    if (task.deadline) {
      const diffHours = Math.round(
        (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      if (diffHours < 0) {
        bullets.push(`⚠️ Overdue by ${Math.abs(diffHours)} hours — requires immediate submission`);
      } else if (diffHours <= 24) {
        bullets.push(`✓ Critical deadline within 24 hours (${diffHours}h remaining)`);
      } else if (diffHours <= 48) {
        bullets.push(`✓ Approaching deadline within 48 hours`);
      } else {
        bullets.push(`✓ Due on ${new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
      }
    }

    // 2. Marks weightage
    const marks = requirement?.marks || task.marks;
    if (marks && marks >= 20) {
      bullets.push(`✓ High grade contribution: ${marks} marks at stake`);
    } else if (marks) {
      bullets.push(`✓ Carries ${marks} marks`);
    }

    // 3. Requirement status
    if (requirement) {
      if (requirement.isMandatory) {
        bullets.push(`✓ Mandatory rubric requirement: "${requirement.title}"`);
      } else {
        bullets.push(`✓ Rubric requirement currently incomplete`);
      }
    }

    // 4. Priority level
    if (task.priority === "CRITICAL" || task.priority === "HIGH") {
      bullets.push(`✓ ${task.priority} academic priority classification`);
    }

    return bullets;
  }

  private static computeTimeSlot(
    startHour: number,
    minuteOffset: number,
    durationMinutes: number
  ): string {
    const startTotal = startHour * 60 + minuteOffset;
    const endTotal = startTotal + durationMinutes;

    const startH = Math.floor(startTotal / 60);
    const startM = startTotal % 60;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;

    return `${this.formatHourMin(startH, startM)}–${this.formatHourMin(endH, endM)}`;
  }

  private static formatHourMin(h: number, m: number): string {
    const period = h >= 12 && h < 24 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${h12}:${mStr} ${period}`;
  }

  private static formatPlanDate(d: Date | string | null | undefined): string {
    if (!d) return "Today";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  private static buildPlanSummary(sessions: PlanSessionBlock[], totalMarks: number): string {
    if (sessions.length === 0) return "No study sessions planned for this window.";

    const sessionLines = sessions
      .map(
        (s) =>
          `• **${s.timeSlot}**: ${s.taskTitle} — *${s.moduleOrRequirementTitle}* (${s.durationMinutes} min)`
      )
      .join("\n");

    return `### DETERMINISTIC STUDY PLAN (Total: ${sessions.length} sessions · ${totalMarks} marks addressed)\n\n${sessionLines}\n\n*Rationale:* Blocks are prioritized by impending submission deadlines, incomplete rubric requirements, and high mark weightages.`;
  }
}
