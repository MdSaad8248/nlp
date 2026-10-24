/**
 * lib/nlp/contradiction-detector.ts
 *
 * Milestone 8-B — Academic Contradiction Detection
 * Detects conflicting academic information between notices, circulars,
 * and existing academic records.
 *
 * Key Principles:
 * - Detects conflicts in: deadline, venue, platform, exam date/time, marks, class schedule.
 * - Does NOT automatically guess authoritativeness unless explicit recency/authority exists.
 * - Prefers "Conflict requires verification" over blind overwriting.
 * - Distinguishes between explicit legitimate reschedules ("shifted from X to Y")
 *   and unverified contradictory notices ("Notice A says X, Notice B says Y").
 * - Integrates with M3 change intelligence without replacing it.
 */

import { CandidateExistingRecord } from "./change-intelligence";
import { FieldEvidence } from "./schemas";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export type ContradictionField =
  | "deadline"
  | "startTime"
  | "endTime"
  | "venue"
  | "submissionPlatform"
  | "marks"
  | "examDate"
  | "classSchedule";

export type ContradictionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ContradictionStatus =
  | "REQUIRES_VERIFICATION"
  | "RESOLVED_BY_RECENCY"
  | "RESOLVED_BY_AUTHORITY"
  | "EXPLICIT_RESCHEDULE";

export interface ContradictionSource {
  sourceId?: string;
  sourceTitle: string;
  channel?: string;
  timestamp?: string;
  value: string | number;
  evidenceSnippet: string;
}

export interface AcademicContradiction {
  id: string;
  conflictType:
    | "SCHEDULE_CONFLICT"
    | "DEADLINE_CONFLICT"
    | "VENUE_CONFLICT"
    | "PLATFORM_CONFLICT"
    | "MARKS_CONFLICT"
    | "EXAM_SCHEDULE_CONFLICT"
    | "TIMETABLE_SLOT_CONFLICT";
  severity: ContradictionSeverity;
  field: ContradictionField;
  itemTitle: string;
  courseCode: string | null;
  sourceA: ContradictionSource;
  sourceB: ContradictionSource;
  explanation: string;
  resolutionStatus: ContradictionStatus;
  recommendedAction: string;
  detectedAt: string;
}

export interface ContradictionDetectionResult {
  hasContradiction: boolean;
  contradictions: AcademicContradiction[];
  summary: string;
  requiresVerification: boolean;
}

// ─── Contradiction Detection Engine ──────────────────────────────────────────

export class ContradictionDetector {
  /**
   * Evaluates whether a newly extracted candidate deliverable/event contradicts
   * an existing matched record in the academic state.
   */
  public static detectContradiction(
    candidate: {
      title: string;
      itemType: "TASK" | "EVENT" | "EXAM";
      courseCode?: string | null;
      deadline?: Date | string | null;
      startTime?: Date | string | null;
      endTime?: Date | string | null;
      venue?: string | null;
      submissionPlatform?: string | null;
      marks?: number | null;
    },
    existing: CandidateExistingRecord,
    noticeContext: {
      sourceTitle: string;
      rawText: string;
      channel?: string;
      createdAt?: string;
      existingSourceTitle?: string;
      existingCreatedAt?: string;
    }
  ): ContradictionDetectionResult {
    const contradictions: AcademicContradiction[] = [];
    const textLower = noticeContext.rawText.toLowerCase();

    // Check if the notice contains explicit transition/reschedule keywords
    // e.g. "shifted from", "rescheduled from", "extended from ... to ...", "postponed to", "changed to", "updated to", "instead of"
    const hasExplicitReschedulePhrase =
      /shifted\s+from|rescheduled\s+from|postponed\s+from|preponed\s+from|extended\s+from|moved\s+from|changed\s+from/i.test(
        noticeContext.rawText
      ) ||
      /(?:is|has\s+been)\s+(?:rescheduled|postponed|preponed|extended|updated|changed|relocated)\s+to/i.test(
        noticeContext.rawText
      ) ||
      /instead\s+of|rather\s+than|in\s+place\s+of/i.test(
        noticeContext.rawText
      );

    // 1. Check Date / Time / Schedule Contradiction
    if (candidate.itemType === "EVENT" || candidate.itemType === "EXAM") {
      if (candidate.startTime && existing.startTime) {
        const candTime = new Date(candidate.startTime).getTime();
        const existTime = new Date(existing.startTime).getTime();

        // If time differs by more than 10 minutes
        if (Math.abs(candTime - existTime) > 10 * 60 * 1000) {
          const formattedPrev = this.formatTimeReadable(existing.startTime);
          const formattedNew = this.formatTimeReadable(candidate.startTime);

          if (!hasExplicitReschedulePhrase) {
            contradictions.push({
              id: `conflict-time-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              conflictType: candidate.itemType === "EXAM" ? "EXAM_SCHEDULE_CONFLICT" : "SCHEDULE_CONFLICT",
              severity: candidate.itemType === "EXAM" ? "CRITICAL" : "HIGH",
              field: "startTime",
              itemTitle: candidate.title,
              courseCode: candidate.courseCode || existing.courseCode || null,
              sourceA: {
                sourceTitle: noticeContext.existingSourceTitle || "Existing Academic Schedule",
                timestamp: noticeContext.existingCreatedAt || "Previous Notice",
                value: formattedPrev,
                evidenceSnippet: `Scheduled for: ${formattedPrev}`,
                channel: "CALENDAR",
              },
              sourceB: {
                sourceTitle: noticeContext.sourceTitle,
                timestamp: noticeContext.createdAt || new Date().toISOString(),
                value: formattedNew,
                evidenceSnippet: this.findRelevantSnippet(noticeContext.rawText, formattedNew) || noticeContext.rawText.slice(0, 160),
                channel: noticeContext.channel || "ANNOUNCEMENT",
              },
              explanation: `Potentially conflicting schedule information for "${candidate.title}". Previous: ${formattedPrev} vs New: ${formattedNew}. Neither source explicitly acknowledges or supersedes the other.`,
              resolutionStatus: "REQUIRES_VERIFICATION",
              recommendedAction: "Conflict requires verification with course faculty before attending.",
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // 2. Check Deadline Contradiction
    if (candidate.itemType === "TASK" || candidate.deadline) {
      if (candidate.deadline && existing.deadline) {
        const candDl = new Date(candidate.deadline).getTime();
        const existDl = new Date(existing.deadline).getTime();

        // If deadline differs by more than 1 hour
        if (Math.abs(candDl - existDl) > 60 * 60 * 1000) {
          const formattedPrev = this.formatDateReadable(existing.deadline);
          const formattedNew = this.formatDateReadable(candidate.deadline);

          if (!hasExplicitReschedulePhrase) {
            contradictions.push({
              id: `conflict-deadline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              conflictType: "DEADLINE_CONFLICT",
              severity: "HIGH",
              field: "deadline",
              itemTitle: candidate.title,
              courseCode: candidate.courseCode || existing.courseCode || null,
              sourceA: {
                sourceTitle: noticeContext.existingSourceTitle || "Existing Task Record",
                timestamp: noticeContext.existingCreatedAt || "Previous Notice",
                value: formattedPrev,
                evidenceSnippet: `Submission deadline: ${formattedPrev}`,
              },
              sourceB: {
                sourceTitle: noticeContext.sourceTitle,
                timestamp: noticeContext.createdAt || new Date().toISOString(),
                value: formattedNew,
                evidenceSnippet: this.findRelevantSnippet(noticeContext.rawText, formattedNew) || noticeContext.rawText.slice(0, 160),
                channel: noticeContext.channel || "ANNOUNCEMENT",
              },
              explanation: `Conflicting submission deadlines detected for "${candidate.title}": ${formattedPrev} vs ${formattedNew}. Notice does not explicitly indicate an official extension.`,
              resolutionStatus: "REQUIRES_VERIFICATION",
              recommendedAction: "Conflict requires verification: confirm authoritative deadline on LMS portal.",
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // 3. Check Venue Contradiction
    if (candidate.venue && existing.venue) {
      const vCand = candidate.venue.trim().toUpperCase();
      const vExist = existing.venue.trim().toUpperCase();

      if (vCand !== vExist && !hasExplicitReschedulePhrase) {
        contradictions.push({
          id: `conflict-venue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          conflictType: "VENUE_CONFLICT",
          severity: "HIGH",
          field: "venue",
          itemTitle: candidate.title,
          courseCode: candidate.courseCode || existing.courseCode || null,
          sourceA: {
            sourceTitle: noticeContext.existingSourceTitle || "Previous Timetable/Notice",
            value: existing.venue,
            evidenceSnippet: `Venue: ${existing.venue}`,
          },
          sourceB: {
            sourceTitle: noticeContext.sourceTitle,
            value: candidate.venue,
            evidenceSnippet: this.findRelevantSnippet(noticeContext.rawText, candidate.venue) || noticeContext.rawText.slice(0, 160),
            channel: noticeContext.channel || "ANNOUNCEMENT",
          },
          explanation: `Conflicting venue information: ${existing.venue} vs ${candidate.venue} for "${candidate.title}".`,
          resolutionStatus: "REQUIRES_VERIFICATION",
          recommendedAction: "Conflict requires verification: check room allocation before session.",
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // 4. Check Submission Platform Contradiction
    if (candidate.submissionPlatform && existing.submissionPlatform) {
      const pCand = candidate.submissionPlatform.trim().toUpperCase();
      const pExist = existing.submissionPlatform.trim().toUpperCase();

      if (pCand !== pExist && !hasExplicitReschedulePhrase) {
        contradictions.push({
          id: `conflict-platform-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          conflictType: "PLATFORM_CONFLICT",
          severity: "MEDIUM",
          field: "submissionPlatform",
          itemTitle: candidate.title,
          courseCode: candidate.courseCode || existing.courseCode || null,
          sourceA: {
            sourceTitle: noticeContext.existingSourceTitle || "Previous Guidelines",
            value: existing.submissionPlatform,
            evidenceSnippet: `Platform: ${existing.submissionPlatform}`,
          },
          sourceB: {
            sourceTitle: noticeContext.sourceTitle,
            value: candidate.submissionPlatform,
            evidenceSnippet: this.findRelevantSnippet(noticeContext.rawText, candidate.submissionPlatform) || noticeContext.rawText.slice(0, 160),
            channel: noticeContext.channel || "ANNOUNCEMENT",
          },
          explanation: `Conflicting submission platform: ${existing.submissionPlatform} vs ${candidate.submissionPlatform}.`,
          resolutionStatus: "REQUIRES_VERIFICATION",
          recommendedAction: "Conflict requires verification: ensure submission on the designated platform.",
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // 5. Check Marks / Weightage Contradiction
    if (
      candidate.marks !== null &&
      candidate.marks !== undefined &&
      existing.marks !== null &&
      existing.marks !== undefined &&
      candidate.marks !== existing.marks &&
      !hasExplicitReschedulePhrase
    ) {
      contradictions.push({
        id: `conflict-marks-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        conflictType: "MARKS_CONFLICT",
        severity: "MEDIUM",
        field: "marks",
        itemTitle: candidate.title,
        courseCode: candidate.courseCode || existing.courseCode || null,
        sourceA: {
          sourceTitle: noticeContext.existingSourceTitle || "Rubric / Syllabus",
          value: `${existing.marks} marks`,
          evidenceSnippet: `Weightage/Marks: ${existing.marks}`,
        },
        sourceB: {
          sourceTitle: noticeContext.sourceTitle,
          value: `${candidate.marks} marks`,
          evidenceSnippet: this.findRelevantSnippet(noticeContext.rawText, `${candidate.marks}`) || noticeContext.rawText.slice(0, 160),
          channel: noticeContext.channel || "ANNOUNCEMENT",
        },
        explanation: `Conflicting marks allocation: ${existing.marks} marks vs ${candidate.marks} marks.`,
        resolutionStatus: "REQUIRES_VERIFICATION",
        recommendedAction: "Conflict requires verification with course faculty.",
        detectedAt: new Date().toISOString(),
      });
    }

    const hasContradiction = contradictions.length > 0;
    const summary = hasContradiction
      ? `ACADEMIC CONFLICT DETECTED: Found ${contradictions.length} conflicting attribute(s) across notices.`
      : "No academic contradictions detected.";

    return {
      hasContradiction,
      contradictions,
      summary,
      requiresVerification: hasContradiction,
    };
  }

  /**
   * Compares two notices directly to detect contradictions in their statements.
   */
  public static compareNotices(
    noticeA: { id?: string; title: string; rawText: string; createdAt?: string; channel?: string },
    noticeB: { id?: string; title: string; rawText: string; createdAt?: string; channel?: string }
  ): ContradictionDetectionResult {
    // Import and reuse M2 NLP extractor
    const { extractAcademicEntities } = require("./ner");
    const { parseTemporalExpressions } = require("./temporal");

    const entitiesA = extractAcademicEntities(noticeA.rawText);
    const entitiesB = extractAcademicEntities(noticeB.rawText);

    const temporalA = parseTemporalExpressions(noticeA.rawText);
    const temporalB = parseTemporalExpressions(noticeB.rawText);

    const courseCode = entitiesA.courseCode || entitiesB.courseCode || null;
    const titleA = entitiesA.taskType || noticeA.title;
    const titleB = entitiesB.taskType || noticeB.title;

    // Construct mock existing from noticeA and mock candidate from noticeB
    const existing: CandidateExistingRecord = {
      id: noticeA.id || "notice-a",
      itemType: (temporalA.events.length > 0 ? "EVENT" : "TASK") as any,
      title: titleA,
      courseCode,
      deadline: temporalA.deadlines[0]?.date ? new Date(temporalA.deadlines[0].date) : null,
      startTime: temporalA.events[0]?.startTime ? new Date(temporalA.events[0].startTime) : null,
      venue: entitiesA.venues[0] || null,
      submissionPlatform: entitiesA.platforms[0] || null,
      marks: entitiesA.marks || entitiesA.weightage || null,
    };

    const candidate = {
      title: titleB,
      itemType: existing.itemType,
      courseCode,
      deadline: temporalB.deadlines[0]?.date ? new Date(temporalB.deadlines[0].date) : null,
      startTime: temporalB.events[0]?.startTime ? new Date(temporalB.events[0].startTime) : null,
      venue: entitiesB.venues[0] || null,
      submissionPlatform: entitiesB.platforms[0] || null,
      marks: entitiesB.marks || entitiesB.weightage || null,
    };

    return this.detectContradiction(candidate, existing, {
      sourceTitle: noticeB.title,
      rawText: noticeB.rawText,
      channel: noticeB.channel,
      createdAt: noticeB.createdAt,
      existingSourceTitle: noticeA.title,
      existingCreatedAt: noticeA.createdAt,
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private static formatTimeReadable(date: Date | string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  private static formatDateReadable(date: Date | string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  private static findRelevantSnippet(text: string, keyword: string): string | null {
    if (!text || !keyword) return null;
    const cleanKw = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`([^\\n.!?]*${cleanKw}[^\\n.!?]*)`, "i");
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : null;
  }
}
