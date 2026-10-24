import {
  AcademicRelationship,
  ChangedFieldDiff,
  MatchedRecord,
  ItemRelationship,
  ChangeCheckResult,
  ExtractedTask,
  ExtractedEvent,
  ExtractedExam,
  NLPAnalysisResult,
} from "./schemas";
import { parseTemporalExpressions, TemporalExtractionResult } from "./temporal";
import { ContradictionDetector } from "./contradiction-detector";

export interface CandidateExistingRecord {
  id: string;
  itemType: "TASK" | "EVENT" | "EXAM";
  title: string;
  category?: string;
  courseCode?: string | null;
  courseTitle?: string | null;
  deadline?: Date | string | null;
  normalizedDeadline?: string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  venue?: string | null;
  submissionPlatform?: string | null;
  marks?: number | null;
  weightage?: number | null;
  status?: string;
  isRescheduled?: boolean;
}

export interface ExistingKnowledgeState {
  tasks: CandidateExistingRecord[];
  events: CandidateExistingRecord[];
  exams?: CandidateExistingRecord[];
  notices?: Array<{ id: string; title?: string | null; rawText: string }>;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are",
  "was", "were", "be", "been", "has", "have", "had", "it", "this", "that", "these",
  "dear", "students", "student", "all", "please", "note", "reminder", "regards", "kindly"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function calculateJaccard(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

function getCharNgrams(text: string, n: number = 3): Map<string, number> {
  const clean = text.toLowerCase().replace(/\s+/g, " ");
  const ngrams = new Map<string, number>();
  for (let i = 0; i <= clean.length - n; i++) {
    const gram = clean.slice(i, i + n);
    ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
  }
  return ngrams;
}

function calculateCosineSimilarity(textA: string, textB: string): number {
  const mapA = getCharNgrams(textA);
  const mapB = getCharNgrams(textB);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (const count of mapA.values()) normA += count * count;
  for (const count of mapB.values()) normB += count * count;
  for (const [gram, countA] of mapA.entries()) {
    const countB = mapB.get(gram);
    if (countB) dotProduct += countA * countB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extract deliverable index number from title (e.g. "Assignment 2" -> 2, "Quiz 1" -> 1)
 */
function extractDeliverableNumber(title: string): number | null {
  const match = title.match(/\b(?:assignment|quiz|cat|review|project|lab|test|exam)\s*[-–#]?\s*(\d+)\b/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Clean course code helper (e.g. "CSE4001" -> "CSE4001")
 */
function normalizeCourseCode(code?: string | null): string {
  if (!code) return "";
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Check course compatibility between incoming item and existing record
 */
function compareCourses(
  candidateCourseCode?: string | null,
  candidateCourseName?: string | null,
  existingCourseCode?: string | null,
  existingCourseTitle?: string | null
): { matches: boolean; disqualified: boolean; reason?: string } {
  let cCode = normalizeCourseCode(candidateCourseCode);
  const eCode = normalizeCourseCode(existingCourseCode);

  // Filter out false-positive codes that are actually venue room numbers (e.g. SJT402, TT105)
  if (/^(?:SJT|TT|MB|CDMM|PRP|SMV)\d+/i.test(cCode)) {
    cCode = "";
  }

  // Cross-reference names or aliases FIRST
  const cName = (candidateCourseName || "").toLowerCase().trim();
  const eName = (existingCourseTitle || "").toLowerCase().trim();

  if (cName && eName) {
    if (cName === eName || cName.includes(eName) || eName.includes(cName)) {
      return { matches: true, disqualified: false, reason: `Matching course: ${candidateCourseName}` };
    }
  }

  // Both have valid academic course codes (e.g. CSE4001, MAT2001)
  if (cCode && eCode) {
    if (cCode === eCode) {
      return { matches: true, disqualified: false, reason: `Same course code: ${cCode}` };
    } else {
      // Explicitly different course codes: disqualify only if names don't match
      if (!cName || !eName || (!cName.includes(eName) && !eName.includes(cName))) {
        return { matches: false, disqualified: true, reason: `Different course: ${cCode} vs ${eCode}` };
      }
    }
  }

  if (cCode && eName) {
    if (eName.includes(cCode.toLowerCase())) {
      return { matches: true, disqualified: false, reason: `Course code matches title: ${cCode}` };
    }
  }

  if (eCode && cName) {
    if (cName.includes(eCode.toLowerCase())) {
      return { matches: true, disqualified: false, reason: `Course name references code: ${eCode}` };
    }
  }

  // No decisive course info
  return { matches: false, disqualified: false };
}

/**
 * Check if the raw notice text explicitly indicates cancellation
 */
export function isCancellationNotice(text: string): boolean {
  return /\b(?:cancelled|canceled|calling\s+off|called\s+off|stands?\s+cancelled|will\s+not\s+be\s+held|has\s+been\s+cancelled)\b/i.test(
    text
  );
}

/**
 * Check if the raw notice text explicitly indicates rescheduling/shifting
 */
export function isReschedulingNotice(text: string): boolean {
  return /\b(?:shifted|rescheduled|moved|postponed|preponed|deferred|reschedule)\b/i.test(text);
}

/**
 * Check if the raw notice text indicates a deadline extension
 */
export function isDeadlineExtensionNotice(text: string): boolean {
  return /\b(?:extended|extension|deadline\s+(?:extended|pushed|moved|changed))\b/i.test(text);
}

/**
 * Clean ISO date string to readable IST date string
 */
function formatReadableDate(dateVal?: Date | string | null): string {
  if (!dateVal) return "Unspecified date";
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Core Matching & Relationship Intelligence for a Single Candidate Deliverable
 */
export function analyzeItemRelationship(
  candidate: {
    itemType: "TASK" | "EVENT" | "EXAM";
    title: string;
    category?: string;
    courseCode?: string | null;
    courseName?: string | null;
    deadline?: string | null;
    normalizedDeadline?: string | null;
    startTime?: string | null;
    formattedTime?: string | null;
    venue?: string | null;
    submissionPlatform?: string | null;
    marks?: number | null;
    weightage?: number | null;
    previousDateTime?: string | null;
    newDateTime?: string | null;
    isRescheduled?: boolean;
    extractedSnippet?: string;
  },
  noticeRawText: string,
  temporal: TemporalExtractionResult,
  existingRecords: CandidateExistingRecord[]
): ItemRelationship {
  const isCancelled = isCancellationNotice(noticeRawText);
  const isShifted = isReschedulingNotice(noticeRawText) || Boolean(temporal.transition);
  const isExtended = isDeadlineExtensionNotice(noticeRawText);

  const candidateTokens = tokenize(candidate.title);
  const candidateNum = extractDeliverableNumber(candidate.title);

  let bestMatch: CandidateExistingRecord | null = null;
  let highestScore = 0;
  let matchReasons: string[] = [];

  for (const existing of existingRecords) {
    // Filter by compatible item category (TASKs match TASKs; EVENTs and EXAMs are both scheduled items)
    if (candidate.itemType === "TASK" && existing.itemType !== "TASK") continue;
    if (existing.itemType === "TASK" && candidate.itemType !== "TASK") continue;

    // Course comparison
    const courseCheck = compareCourses(
      candidate.courseCode,
      candidate.courseName,
      existing.courseCode,
      existing.courseTitle
    );

    if (courseCheck.disqualified) {
      // Strictly different courses -> skip
      continue;
    }

    // Deliverable number comparison
    const existingNum = extractDeliverableNumber(existing.title);
    if (candidateNum !== null && existingNum !== null && candidateNum !== existingNum) {
      // E.g. Assignment 2 vs Assignment 1 in same course -> distinct deliverables
      continue;
    }

    // Similarity score calculation
    let score = 0;
    const reasons: string[] = [];

    // Course points
    if (courseCheck.matches) {
      score += 0.35;
      reasons.push(`✓ ${courseCheck.reason}`);
    }

    // Direct match: notice text explicitly mentions existing deliverable title
    const existingTitleLower = existing.title.toLowerCase().trim();
    if (
      existingTitleLower.length >= 3 &&
      noticeRawText.toLowerCase().includes(existingTitleLower)
    ) {
      score += 0.35;
      reasons.push(`✓ Notice explicitly references deliverable title: "${existing.title}"`);
    }

    // Deliverable type keyword match (e.g. "project", "review", "assignment", "quiz", "lecture")
    const keywords = ["project", "review", "assignment", "quiz", "lecture", "cat", "fat", "lab"];
    for (const kw of keywords) {
      if (
        existingTitleLower.includes(kw) &&
        (candidate.title.toLowerCase().includes(kw) || noticeRawText.toLowerCase().includes(kw))
      ) {
        score += 0.12;
        reasons.push(`✓ Same deliverable type: ${kw.toUpperCase()}`);
        break;
      }
    }

    // Item number match
    if (candidateNum !== null && existingNum !== null && candidateNum === existingNum) {
      score += 0.30;
      reasons.push(`✓ Same deliverable number: #${candidateNum}`);
    }

    // Title token overlap
    const existingTokens = tokenize(existing.title);
    const jaccard = calculateJaccard(candidateTokens, existingTokens);
    const cosine = calculateCosineSimilarity(candidate.title, existing.title);
    const titleSim = 0.5 * jaccard + 0.5 * cosine;

    if (titleSim > 0.40) {
      score += titleSim * 0.30;
      reasons.push(`✓ High title similarity: "${existing.title}" (${Math.round(titleSim * 100)}%)`);
    }

    // Transition / previous date match
    // E.g. "shifted from Friday at 2 PM to Monday at 3 PM" -> matches existing event on Friday 2 PM!
    if (candidate.previousDateTime || temporal.previousDateTime) {
      const prevSnippet = candidate.previousDateTime || temporal.previousDateTime?.combinedFormatted || "";
      const existingDateStr = existing.deadline
        ? formatReadableDate(existing.deadline)
        : existing.startTime
        ? formatReadableDate(existing.startTime)
        : existing.normalizedDeadline || "";

      const lowerPrev = prevSnippet.toLowerCase();
      const lowerExisting = existingDateStr.toLowerCase();

      // Check date / weekday / time match
      const fromDay = temporal.transition?.fromRaw?.toLowerCase() || "";
      const dateOverlap =
        (lowerPrev && lowerExisting && (lowerExisting.includes(lowerPrev) || lowerPrev.includes(lowerExisting))) ||
        (fromDay && lowerExisting.includes(fromDay)) ||
        (temporal.previousDateTime?.rawSnippet && lowerExisting.includes(temporal.previousDateTime.rawSnippet.toLowerCase()));

      if (dateOverlap) {
        score += 0.40;
        reasons.push(`✓ Previous datetime explicitly matches existing record: ${prevSnippet}`);
      }
    }

    // Exact or near-exact date match (for duplicate / update detection)
    if (candidate.deadline && existing.deadline) {
      const cDate = new Date(candidate.deadline).getTime();
      const eDate = new Date(existing.deadline).getTime();
      if (Math.abs(cDate - eDate) <= 120 * 1000) {
        score += 0.25;
        reasons.push(`✓ Matching deadline date/time: ${formatReadableDate(existing.deadline)}`);
      }
    } else if (candidate.startTime && existing.startTime) {
      const cDate = new Date(candidate.startTime).getTime();
      const eDate = new Date(existing.startTime).getTime();
      if (Math.abs(cDate - eDate) <= 120 * 1000) {
        score += 0.25;
        reasons.push(`✓ Matching start date/time: ${formatReadableDate(existing.startTime)}`);
      }
    }

    // Platform match
    if (
      candidate.submissionPlatform &&
      existing.submissionPlatform &&
      candidate.submissionPlatform.toUpperCase() === existing.submissionPlatform.toUpperCase()
    ) {
      score += 0.10;
      reasons.push(`✓ Same platform: ${candidate.submissionPlatform}`);
    }

    // Venue match
    if (
      candidate.venue &&
      existing.venue &&
      candidate.venue.toUpperCase() === existing.venue.toUpperCase()
    ) {
      score += 0.10;
      reasons.push(`✓ Same venue: ${candidate.venue}`);
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = existing;
      matchReasons = reasons;
    }
  }

  // Cap score to 1.0
  highestScore = Math.min(1.0, Math.round(highestScore * 100) / 100);

  // If no good match found (threshold < 0.45), classify as NEW
  if (!bestMatch || highestScore < 0.45) {
    return {
      candidateTitle: candidate.title,
      candidateType: candidate.itemType,
      relationship: "NEW",
      matchedRecord: null,
      matchingReasons: [
        "No existing record matches this deliverable title, course, or timing.",
        "Candidate item will be created as a new academic record.",
      ],
      changedFields: [],
      proposedAction: "CREATE_NEW",
      similarityScore: highestScore,
    };
  }

  // Format matched record object
  const matchedRecord: MatchedRecord = {
    id: bestMatch.id,
    itemType: bestMatch.itemType,
    title: bestMatch.title,
    category: bestMatch.category,
    courseCode: bestMatch.courseCode,
    courseTitle: bestMatch.courseTitle,
    deadline: bestMatch.deadline ? new Date(bestMatch.deadline).toISOString() : null,
    startTime: bestMatch.startTime ? new Date(bestMatch.startTime).toISOString() : null,
    endTime: bestMatch.endTime ? new Date(bestMatch.endTime).toISOString() : null,
    venue: bestMatch.venue,
    platform: bestMatch.submissionPlatform,
    marks: bestMatch.marks || bestMatch.weightage,
    status: bestMatch.status,
    isRescheduled: bestMatch.isRescheduled,
  };

  const changedFields: ChangedFieldDiff[] = [];

  // CASE 1: CANCELLATION
  if (isCancelled) {
    changedFields.push({
      field: "status",
      oldValue: bestMatch.status || "ACTIVE",
      newValue: "CANCELLED",
      reason: "Notice explicitly states this item/session has been cancelled.",
      evidenceSnippet: noticeRawText.slice(0, 180),
    });
    matchReasons.push('✓ Notice explicitly states "cancelled"');

    return {
      candidateTitle: candidate.title,
      candidateType: candidate.itemType,
      relationship: "CANCELLED",
      matchedRecord,
      matchingReasons: matchReasons,
      changedFields,
      proposedAction: "CANCEL_EXISTING",
      similarityScore: highestScore,
    };
  }

  // Check changed fields:
  // A. Deadline / Date / Time change
  const candidateDeadline = candidate.deadline ? new Date(candidate.deadline) : null;
  const existingDeadline = bestMatch.deadline ? new Date(bestMatch.deadline) : null;
  const candidateStart = candidate.startTime ? new Date(candidate.startTime) : null;
  const existingStart = bestMatch.startTime ? new Date(bestMatch.startTime) : null;

  let hasTimeChange = false;
  if (candidateDeadline && existingDeadline) {
    if (Math.abs(candidateDeadline.getTime() - existingDeadline.getTime()) > 60 * 1000) {
      hasTimeChange = true;
      const oldVal = formatReadableDate(existingDeadline);
      const newVal = candidate.normalizedDeadline || formatReadableDate(candidateDeadline);
      changedFields.push({
        field: "deadline",
        oldValue: oldVal,
        newValue: newVal,
        reason: isShifted
          ? `Deadline rescheduled from ${temporal.previousDateTime?.combinedFormatted || oldVal} to ${newVal}`
          : isExtended
          ? `Deadline extended to ${newVal}`
          : `Deadline updated to ${newVal}`,
        evidenceSnippet: candidate.extractedSnippet || temporal.primaryDeadline?.rawSnippet || "",
      });
    }
  } else if (candidateStart && existingStart) {
    if (Math.abs(candidateStart.getTime() - existingStart.getTime()) > 60 * 1000) {
      hasTimeChange = true;
      const oldVal = formatReadableDate(existingStart);
      const newVal = candidate.formattedTime || formatReadableDate(candidateStart);
      changedFields.push({
        field: "time",
        oldValue: oldVal,
        newValue: newVal,
        reason: isShifted
          ? `Session shifted from ${temporal.previousDateTime?.combinedFormatted || oldVal} to ${newVal}`
          : `Session timing updated to ${newVal}`,
        evidenceSnippet: candidate.extractedSnippet || temporal.primaryDeadline?.rawSnippet || "",
      });
    }
  } else if (candidate.previousDateTime && candidate.newDateTime) {
    hasTimeChange = true;
    changedFields.push({
      field: candidate.itemType === "TASK" ? "deadline" : "time",
      oldValue: candidate.previousDateTime,
      newValue: candidate.newDateTime,
      reason: `Schedule shifted from ${candidate.previousDateTime} to ${candidate.newDateTime}`,
      evidenceSnippet: candidate.extractedSnippet || noticeRawText.slice(0, 160),
    });
  }

  // B. Marks / Weightage change
  const candidateMarks = candidate.marks || candidate.weightage;
  const existingMarks = bestMatch.marks || bestMatch.weightage;
  if (candidateMarks !== null && candidateMarks !== undefined) {
    if (existingMarks !== null && existingMarks !== undefined) {
      if (candidateMarks !== existingMarks) {
        changedFields.push({
          field: "marks",
          oldValue: `${existingMarks} marks`,
          newValue: `${candidateMarks} marks`,
          reason: `Weightage/marks updated from ${existingMarks} to ${candidateMarks}`,
          evidenceSnippet: candidate.extractedSnippet || `${candidateMarks} marks`,
        });
      }
    } else {
      // New marks specified for existing deliverable
      changedFields.push({
        field: "marks",
        oldValue: "Unassigned",
        newValue: `${candidateMarks} marks`,
        reason: `Marks assigned: ${candidateMarks}`,
        evidenceSnippet: candidate.extractedSnippet || `${candidateMarks} marks`,
      });
    }
  }

  // C. Submission Platform change
  const platformRegex =
    /\b(?:via|through|on|platform\s*[:=]?\s*|platform\s+(?:changed\s+to|is\s+now|is))\s*(moodle|vtop|canvas|google classroom|github|teams|codetantra)\b|\b(moodle|vtop|canvas|github|teams)\s*(?:\(changed from|instead of)\b/i;
  const platMatch = noticeRawText.match(platformRegex);
  const detectedNewPlat = platMatch ? (platMatch[1] || platMatch[2]) : null;
  const effectiveNewPlat = detectedNewPlat || candidate.submissionPlatform;

  if (effectiveNewPlat && bestMatch.submissionPlatform) {
    const cPlat = effectiveNewPlat.toUpperCase();
    const ePlat = bestMatch.submissionPlatform.toUpperCase();
    if (cPlat !== ePlat) {
      const displayNewPlat =
        effectiveNewPlat.length <= 4 && !/moodle|teams/i.test(effectiveNewPlat)
          ? effectiveNewPlat.toUpperCase()
          : effectiveNewPlat.charAt(0).toUpperCase() + effectiveNewPlat.slice(1).toLowerCase();
      changedFields.push({
        field: "platform",
        oldValue: bestMatch.submissionPlatform,
        newValue: displayNewPlat,
        reason: `Submission platform changed from ${bestMatch.submissionPlatform} to ${displayNewPlat}`,
        evidenceSnippet: platMatch ? platMatch[0] : (candidate.extractedSnippet || effectiveNewPlat),
      });
    }
  }

  // D. Venue change
  const venueRegex = /\b(?:moved to|relocated to|venue\s+changed\s+to|in|at)\s+([A-Z]{2,4}\s*[-:]?\s*\d{2,4}[A-Z]?)\b/i;
  const venueMatch = noticeRawText.match(venueRegex);
  const detectedVenue = venueMatch ? venueMatch[1].toUpperCase() : null;
  const effectiveVenue = candidate.venue || detectedVenue;

  if (effectiveVenue && bestMatch.venue) {
    const cVenue = effectiveVenue.toUpperCase();
    const eVenue = bestMatch.venue.toUpperCase();
    if (cVenue !== eVenue) {
      changedFields.push({
        field: "venue",
        oldValue: bestMatch.venue,
        newValue: effectiveVenue,
        reason: `Venue relocated from ${bestMatch.venue} to ${effectiveVenue}`,
        evidenceSnippet: candidate.extractedSnippet || effectiveVenue,
      });
    }
  }

  // CASE 2: RESCHEDULED
  const hasVenueChange = changedFields.some((f) => f.field === "venue");
  if (
    (isShifted && (hasTimeChange || hasVenueChange || candidate.isRescheduled || temporal.transition)) ||
    (hasTimeChange && (isShifted || candidate.isRescheduled || temporal.transition))
  ) {
    if (isShifted) matchReasons.push('✓ New notice explicitly states "shifted" / "rescheduled" / "moved"');
    return {
      candidateTitle: candidate.title,
      candidateType: candidate.itemType,
      relationship: "RESCHEDULED",
      matchedRecord,
      matchingReasons: matchReasons,
      changedFields,
      proposedAction: "RESCHEDULE_EXISTING",
      similarityScore: highestScore,
    };
  }

  // CASE 3: UPDATED or CONTRADICTION
  if (changedFields.length > 0) {
    const contradictionEval = ContradictionDetector.detectContradiction(
      candidate,
      bestMatch,
      {
        sourceTitle: candidate.title,
        rawText: noticeRawText,
        existingSourceTitle: bestMatch.title,
      }
    );

    const contradiction = contradictionEval.hasContradiction
      ? contradictionEval.contradictions[0]
      : undefined;

    if (contradiction) {
      matchReasons.push(`⚠️ ${contradictionEval.summary}`);
    }

    return {
      candidateTitle: candidate.title,
      candidateType: candidate.itemType,
      relationship: "UPDATED",
      matchedRecord,
      matchingReasons: matchReasons,
      changedFields,
      proposedAction: contradiction ? "VERIFICATION_REQUIRED" : "UPDATE_EXISTING",
      similarityScore: highestScore,
      contradiction,
    };
  }

  // CASE 4: DUPLICATE
  // No changed fields detected; details match existing record!
  matchReasons.push("✓ All dates, parameters, and details match existing record");
  matchReasons.push("✓ No schedule modifications, marks changes, or cancellation detected");

  return {
    candidateTitle: candidate.title,
    candidateType: candidate.itemType,
    relationship: "DUPLICATE",
    matchedRecord,
    matchingReasons: matchReasons,
    changedFields: [],
    proposedAction: "MARK_DUPLICATE",
    similarityScore: highestScore,
  };
}

/**
 * Perform Academic Change Intelligence on full NLP Analysis result
 */
export function checkAcademicChanges(
  analysis: NLPAnalysisResult,
  existingState: ExistingKnowledgeState
): ChangeCheckResult {
  const temporal = parseTemporalExpressions(analysis.rawText);

  // Combine all candidate existing records
  const allExisting: CandidateExistingRecord[] = [
    ...existingState.tasks,
    ...existingState.events,
    ...(existingState.exams || []),
  ];

  // Raw notice duplicate check (as high-level baseline)
  let rawDuplicateNotice: { id: string; title: string; score: number } | null = null;
  if (existingState.notices && existingState.notices.length > 0) {
    const inputClean = analysis.rawText.trim().toLowerCase();
    for (const n of existingState.notices) {
      if (n.rawText.trim().toLowerCase() === inputClean) {
        rawDuplicateNotice = { id: n.id, title: n.title || "Academic Announcement", score: 1.0 };
        break;
      }
      const sim = calculateCosineSimilarity(analysis.rawText, n.rawText);
      if (sim >= 0.88) {
        rawDuplicateNotice = { id: n.id, title: n.title || "Academic Announcement", score: sim };
        break;
      }
    }
  }

  const itemRelationships: ItemRelationship[] = [];

  // 1. Analyze Tasks
  for (const task of analysis.tasks) {
    const rel = analyzeItemRelationship(
      {
        itemType: "TASK",
        title: task.title,
        category: task.category,
        courseCode: task.courseCode,
        courseName: task.course,
        deadline: task.deadline,
        normalizedDeadline: task.normalizedDeadline,
        submissionPlatform: task.submissionPlatform,
        marks: task.marks,
        weightage: task.weightage,
        previousDateTime: task.previousDateTime,
        newDateTime: task.newDateTime,
        isRescheduled: task.isRescheduled,
        extractedSnippet: task.extractedSnippet,
      },
      analysis.rawText,
      temporal,
      allExisting
    );
    itemRelationships.push(rel);
  }

  // 2. Analyze Events and Exams
  for (const event of analysis.events) {
    const isExam = event.eventType === "EXAM";
    const rel = analyzeItemRelationship(
      {
        itemType: isExam ? "EXAM" : "EVENT",
        title: event.title,
        category: event.eventType,
        courseCode: event.courseCode,
        courseName: event.course,
        startTime: event.startTime,
        formattedTime: event.formattedTime,
        venue: event.venue,
        submissionPlatform: event.platform,
        previousDateTime: event.previousDateTime,
        newDateTime: event.newDateTime,
        isRescheduled: event.isRescheduled,
        extractedSnippet: event.extractedSnippet,
      },
      analysis.rawText,
      temporal,
      allExisting
    );
    itemRelationships.push(rel);
  }

  // 3. Analyze Exams
  for (const exam of analysis.exams || []) {
    const rel = analyzeItemRelationship(
      {
        itemType: "EXAM",
        title: exam.title,
        courseCode: exam.courseCode,
        courseName: exam.course,
        startTime: exam.examDate,
        formattedTime: exam.startTime,
        venue: exam.venue,
        marks: exam.weightage,
        weightage: exam.weightage,
        previousDateTime: exam.previousDateTime,
        newDateTime: exam.newDateTime,
        isRescheduled: exam.isRescheduled,
        extractedSnippet: exam.extractedSnippet,
      },
      analysis.rawText,
      temporal,
      allExisting
    );
    itemRelationships.push(rel);
  }

  // If no specific tasks/events were extracted, check if this is an explicit notice duplicate
  if (itemRelationships.length === 0) {
    if (rawDuplicateNotice) {
      return {
        relationship: "DUPLICATE",
        matchedRecord: null,
        matchingReasons: [
          `Substantially identical text (${Math.round(rawDuplicateNotice.score * 100)}% match) to previous notice: "${rawDuplicateNotice.title}"`,
        ],
        changedFields: [],
        proposedAction: "MARK_DUPLICATE",
        similarityScore: rawDuplicateNotice.score,
        itemRelationships: [],
        summary: `Identified as duplicate notice re-broadcast of "${rawDuplicateNotice.title}".`,
      };
    }

    return {
      relationship: "NEW",
      matchedRecord: null,
      matchingReasons: ["General academic announcement with no matching deliverables found."],
      changedFields: [],
      proposedAction: "CREATE_NEW",
      similarityScore: 0,
      itemRelationships: [],
      summary: "New academic circular or general announcement.",
    };
  }

  // Pick primary relationship (prioritize actionable updates/reschedules/cancellations over duplicates/new)
  const priorityOrder: Record<AcademicRelationship, number> = {
    CANCELLED: 5,
    RESCHEDULED: 4,
    UPDATED: 3,
    DUPLICATE: 2,
    NEW: 1,
  };

  const primaryItem = [...itemRelationships].sort(
    (a, b) => priorityOrder[b.relationship] - priorityOrder[a.relationship]
  )[0];

  let summary = "";
  if (primaryItem.relationship === "CANCELLED") {
    summary = `Cancellation detected for "${primaryItem.matchedRecord?.title || primaryItem.candidateTitle}".`;
  } else if (primaryItem.relationship === "RESCHEDULED") {
    const diff = primaryItem.changedFields.find((f) => f.field === "deadline" || f.field === "time");
    summary = diff
      ? `Schedule shifted for "${primaryItem.matchedRecord?.title}": ${diff.oldValue} → ${diff.newValue}.`
      : `Schedule shifted for "${primaryItem.matchedRecord?.title}".`;
  } else if (primaryItem.relationship === "UPDATED") {
    const fieldNames = primaryItem.changedFields.map((f) => f.field).join(", ");
    summary = `Updated details (${fieldNames}) for existing record "${primaryItem.matchedRecord?.title}".`;
  } else if (primaryItem.relationship === "DUPLICATE") {
    summary = `Notice identified as duplicate of existing record "${primaryItem.matchedRecord?.title}".`;
  } else {
    summary = `New academic deliverable: "${primaryItem.candidateTitle}".`;
  }

  const allContradictions = itemRelationships
    .map((r) => (r as any).contradiction)
    .filter(Boolean);

  if (allContradictions.length > 0) {
    summary += ` (⚠️ ${allContradictions.length} potential conflict(s) require verification)`;
  }

  return {
    relationship: primaryItem.relationship,
    matchedRecord: primaryItem.matchedRecord,
    matchingReasons: primaryItem.matchingReasons,
    changedFields: primaryItem.changedFields,
    proposedAction: primaryItem.proposedAction,
    similarityScore: primaryItem.similarityScore,
    itemRelationships,
    summary,
    contradiction: allContradictions[0] || undefined,
    contradictions: allContradictions,
  };
}
