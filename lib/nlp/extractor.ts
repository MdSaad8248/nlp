import {
  NLPAnalysisResult,
  ExtractedTask,
  ExtractedEvent,
  ExtractedExam,
  FieldEvidence,
  NoticeCategory,
} from "./schemas";
import { classifyAcademicDocument } from "./classifier";
import { classifyWithTrainedModel } from "./model-classifier";
import { extractAcademicEntities, AcademicEntities } from "./ner";
import { parseTemporalExpressions, TemporalExtractionResult } from "./temporal";
import { evaluatePriority } from "./priority-engine";

export interface ExtractorOptions {
  referenceDate?: Date;
  modelClassification?: {
    category: NoticeCategory;
    modelUsed: string;
    confidence: number;
    requiresReview: boolean;
    confidenceStatus: "HIGH" | "LOW";
    threshold: number;
    explanation?: string;
  };
}

/**
 * Backward-compatible helper for pipeline and reconciliation
 */
export function extractAcademicObjects(
  rawText: string,
  entities: AcademicEntities,
  temporal: TemporalExtractionResult
): { tasks: ExtractedTask[]; events: ExtractedEvent[] } {
  const result = extractAcademicNotice(rawText);
  return {
    tasks: result.tasks,
    events: result.events,
  };
}

/**
 * Milestone 2 Core NLP Extractor.
 *
 * Architecture Note:
 * This layer uses deterministic parsing, syntactic pattern matching, and rule-based
 * normalization. It extracts entities, temporal expressions (Asia/Kolkata),
 * notices, and maps them to academic deliverables (Task, Event, Exam) with
 * verbatim source evidence tracking.
 */
export function extractAcademicNotice(
  rawText: string,
  options: ExtractorOptions = {}
): NLPAnalysisResult {
  const startTime = Date.now();
  const text = rawText.trim();

  // 1. Notice Classification (Rule-based safeguard augmented by trained model if provided)
  const ruleClassification = classifyAcademicDocument(text);
  const classification = {
    ...ruleClassification,
    category: options.modelClassification?.category || ruleClassification.category,
    documentType: options.modelClassification?.category || ruleClassification.documentType,
    confidence: options.modelClassification?.confidence ?? ruleClassification.confidence,
  };

  // 2. Named Entity Recognition
  const entities: AcademicEntities = extractAcademicEntities(text);

  // 3. Temporal Extraction & Normalization (Asia/Kolkata)
  const temporal: TemporalExtractionResult = parseTemporalExpressions(text, options.referenceDate);

  // 4. Synthesize Academic Deliverables (Tasks, Events, Exams)
  const tasks: ExtractedTask[] = [];
  const events: ExtractedEvent[] = [];
  const exams: ExtractedExam[] = [];
  const allEvidences: FieldEvidence[] = [...entities.evidences];

  const primaryCourse = entities.primaryCourseName || (entities.courses.length > 0 ? entities.courses[0] : null);
  const primaryCode = entities.primaryCourseCode || (entities.courseCodes.length > 0 ? entities.courseCodes[0] : null);
  const primaryPlatform = entities.platforms.length > 0 ? entities.platforms[0] : null;
  const primaryVenue = entities.venues.length > 0 ? entities.venues[0] : null;

  // Add temporal evidence if found
  if (temporal.primaryDeadline) {
    allEvidences.push({
      field: "deadline",
      value: temporal.primaryDeadline.formatted,
      rawSnippet: temporal.primaryDeadline.rawSnippet,
      confidence: 0.95,
    });
  }
  if (temporal.previousDateTime) {
    allEvidences.push({
      field: "previousDateTime",
      value: temporal.previousDateTime.combinedFormatted,
      rawSnippet: temporal.previousDateTime.rawSnippet,
      confidence: 0.95,
    });
  }
  if (temporal.newDateTime) {
    allEvidences.push({
      field: "newDateTime",
      value: temporal.newDateTime.combinedFormatted,
      rawSnippet: temporal.newDateTime.rawSnippet,
      confidence: 0.95,
    });
  }

  // A. EXAM EXTRACTION
  if (
    classification.category === "EXAM" ||
    entities.taskCategory === "EXAM" ||
    /\b(?:cat|fat|midterm|exam|examination)\b/i.test(text)
  ) {
    const examTitle = entities.taskType
      ? `${primaryCode ? `[${primaryCode}] ` : ""}${entities.taskType}`
      : `${primaryCode || primaryCourse || "Academic"} Examination`;

    const examEvidences: FieldEvidence[] = allEvidences.filter((e) =>
      ["courseCode", "courseName", "taskType", "deadline", "venue", "marks", "weightage"].includes(e.field)
    );

    const primaryDate = temporal.dates.length > 0 ? temporal.dates[0] : null;
    const primaryTime = temporal.times.length > 0 ? temporal.times[0] : null;

    exams.push({
      id: `exam-${Date.now()}`,
      title: examTitle,
      course: primaryCourse,
      courseCode: primaryCode,
      courseCodeOrigin: entities.primaryCourseCodeOrigin,
      examDate: primaryDate ? primaryDate.iso : null,
      startTime: primaryTime ? primaryTime.formatted : null,
      endTime: temporal.times.length > 1 ? temporal.times[1].formatted : null,
      venue: primaryVenue,
      weightage: entities.weightage || entities.marks,
      confidence: 0.92,
      extractedSnippet: text.slice(0, 200),
      evidences: examEvidences,
    });
  }

  // B. EVENT EXTRACTION (Review, Class Change, Class Cancellation, Event, Attendance)
  const isEventLike = [
    "REVIEW",
    "CLASS_CHANGE",
    "CLASS_CANCELLATION",
    "EVENT",
    "ATTENDANCE_NOTICE",
  ].includes(classification.category) || /\b(?:review|presentation|viva|shifted\s+to|rescheduled|relocated|hall|auditorium|guest\s+lecture|workshop)\b/i.test(text);

  if (isEventLike) {
    let eventType: ExtractedEvent["eventType"] = "REVIEW";
    let eventTitle = "";

    if (classification.category === "CLASS_CANCELLATION") {
      eventType = "CLASS_CANCELLATION";
      eventTitle = `${primaryCode || primaryCourse || "Class"} Lecture Cancelled`;
    } else if (classification.category === "CLASS_CHANGE") {
      eventType = "CLASS_CHANGE";
      eventTitle = `${primaryCode || primaryCourse || "Class"} Class Rescheduled`;
    } else if (classification.category === "ATTENDANCE_NOTICE") {
      eventType = "ATTENDANCE";
      eventTitle = `${primaryCode || primaryCourse || "Academic"} Attendance Review`;
    } else if (classification.category === "EVENT") {
      eventType = "WORKSHOP";
      eventTitle = entities.taskType || `${primaryCourse || "Department"} Academic Event`;
    } else {
      eventType = "REVIEW";
      eventTitle = entities.taskType
        ? `${primaryCode ? `[${primaryCode}] ` : ""}${entities.taskType}`
        : `${primaryCode || primaryCourse || "Project"} Review Session`;
    }

    let startTimeIso: string | null = null;
    let endTimeIso: string | null = null;

    if (temporal.primaryDeadline) {
      startTimeIso = temporal.primaryDeadline.iso;
      // Default duration: 1 hour
      const end = new Date(temporal.primaryDeadline.date.getTime() + 60 * 60 * 1000);
      endTimeIso = end.toISOString();
    }

    const eventEvidences: FieldEvidence[] = allEvidences.filter((e) =>
      ["courseCode", "courseName", "venue", "deadline", "platform", "condition", "previousDateTime", "newDateTime"].includes(e.field)
    );

    events.push({
      id: `event-${Date.now()}`,
      title: eventTitle,
      course: primaryCourse,
      courseCode: primaryCode,
      courseCodeOrigin: entities.primaryCourseCodeOrigin,
      eventType,
      venue: primaryVenue,
      platform: primaryPlatform,
      startTime: startTimeIso,
      endTime: endTimeIso,
      formattedTime: temporal.primaryDeadline ? temporal.primaryDeadline.formatted : null,
      isRescheduled: !!temporal.transition || classification.category === "CLASS_CHANGE",
      previousDateTime: temporal.previousDateTime ? temporal.previousDateTime.combinedFormatted : null,
      newDateTime: temporal.newDateTime ? temporal.newDateTime.combinedFormatted : null,
      conditions: entities.conditions,
      confidence: 0.9,
      extractedSnippet: text.slice(0, 180),
      evidences: eventEvidences,
    });
  }

  // C. TASK EXTRACTION (Assignment, Project, Quiz, Homework, Deliverables)
  const isTaskLike = [
    "ASSIGNMENT",
    "PROJECT",
    "QUIZ",
    "GENERAL_ANNOUNCEMENT",
    "CIRCULAR",
  ].includes(classification.category) ||
    /\b(?:submit|submission|deadline|due|upload|hand\s+in|turn\s+in|quiz|assignment|project)\b/i.test(text);

  if (isTaskLike) {
    let taskTitle = "";
    if (primaryCode && entities.taskType) {
      taskTitle = `[${primaryCode}] ${entities.taskType}`;
    } else if (primaryCourse && entities.taskType) {
      taskTitle = `${primaryCourse}: ${entities.taskType}`;
    } else if (entities.taskType) {
      taskTitle = entities.taskType;
    } else if (primaryCourse) {
      taskTitle = classification.category === "PROJECT"
        ? `${primaryCourse} Project Submission`
        : `${primaryCourse} Assignment Submission`;
    } else {
      taskTitle = `${classification.category.replace(/_/g, " ")} Deliverable`;
    }

    // Evaluate priority using deterministic engine
    const priorityResult = evaluatePriority({
      deadline: temporal.primaryDeadline ? temporal.primaryDeadline.date : null,
      category: entities.taskCategory,
      hasPenaltyClause: !!entities.penaltyClause,
      penaltyClauseText: entities.penaltyClause,
      isExam: entities.taskCategory === "EXAM",
      hasUrgentKeywords: entities.urgencyKeywords.length > 0,
    });

    const taskEvidences: FieldEvidence[] = allEvidences.filter((e) =>
      ["courseCode", "courseName", "taskType", "deadline", "platform", "marks", "weightage", "penaltyClause", "condition", "previousDateTime", "newDateTime"].includes(e.field)
    );

    tasks.push({
      id: `task-${Date.now()}`,
      title: taskTitle,
      course: primaryCourse,
      courseCode: primaryCode,
      courseCodeOrigin: entities.primaryCourseCodeOrigin,
      category: entities.taskCategory,
      action: entities.actions[0] || "SUBMIT",
      deadline: temporal.primaryDeadline ? temporal.primaryDeadline.iso : null,
      normalizedDeadline: temporal.primaryDeadline ? temporal.primaryDeadline.formatted : null,
      rawDeadlineSnippet: temporal.primaryDeadline ? temporal.primaryDeadline.rawSnippet : null,
      previousDateTime: temporal.previousDateTime ? temporal.previousDateTime.combinedFormatted : null,
      newDateTime: temporal.newDateTime ? temporal.newDateTime.combinedFormatted : null,
      isRescheduled: !!temporal.transition,
      submissionPlatform: primaryPlatform,
      marks: entities.marks,
      weightage: entities.weightage,
      penaltyClause: entities.penaltyClause,
      urgency: entities.urgencyLevel,
      priority: priorityResult.level,
      priorityScore: priorityResult.score,
      priorityReason: priorityResult.explanation,
      conditions: entities.conditions,
      confidence: 0.92,
      extractedSnippet: text.slice(0, 200),
      evidences: taskEvidences,
    });
  }

  // 5. Generate AI interpretation summary
  const summaryParts: string[] = [];
  summaryParts.push(`Notice classified as ${classification.category.replace(/_/g, " ")} (Classification Score: ${classification.classificationScore}).`);
  if (primaryCourse || primaryCode) {
    const originNote = entities.primaryCourseCodeOrigin === "RESOLVED_FROM_REGISTRY"
      ? ` (Code ${primaryCode} resolved from academic course registry)`
      : "";
    summaryParts.push(`Associated with ${primaryCode || ""} ${primaryCourse || ""}${originNote}`.trim() + ".");
  }
  if (temporal.primaryDeadline) {
    summaryParts.push(`Normalized schedule/deadline: ${temporal.primaryDeadline.formatted}.`);
  }
  if (primaryPlatform || primaryVenue) {
    summaryParts.push(`Delivery channel/location: ${[primaryPlatform, primaryVenue].filter(Boolean).join(", ")}.`);
  }
  if (entities.marks || entities.weightage) {
    summaryParts.push(`Evaluation impact: ${entities.marks ? `${entities.marks} marks` : ""}${entities.weightage ? ` (${entities.weightage}% weightage)` : ""}.`);
  }
  if (entities.conditions.length > 0) {
    summaryParts.push(`Applies conditionally: "${entities.conditions.join(", ")}".`);
  }
  if (entities.penaltyClause) {
    summaryParts.push(`Penalty clause detected: "${entities.penaltyClause}".`);
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    documentType: classification.category,
    category: classification.category,
    classificationScore: classification.classificationScore,
    classificationConfidence: classification.confidence,
    indicators: classification.indicators,
    summary: summaryParts.join(" "),
    rawText: text,
    entities: entities.allEntities,
    keyEntities: {
      courses: entities.courses,
      courseCodes: entities.courseCodes,
      courseResolutions: entities.courseResolutions,
      dates: temporal.dates.map((d) => d.formatted),
      times: temporal.times.map((t) => t.formatted),
      venues: entities.venues,
      platforms: entities.platforms,
      marks: entities.marks ? [`${entities.marks} marks`] : [],
      conditions: entities.conditions,
      actions: entities.actions,
      keywords: entities.urgencyKeywords,
    },
    tasks,
    events,
    exams,
    conditions: entities.conditions,
    temporalSpans: temporal.temporalSpans,
    evidences: allEvidences,
    changes: [],
    previousDateTime: temporal.previousDateTime ? temporal.previousDateTime.combinedFormatted : null,
    newDateTime: temporal.newDateTime ? temporal.newDateTime.combinedFormatted : null,
    modelClassification: options.modelClassification
      ? {
          modelUsed: options.modelClassification.modelUsed,
          prediction: options.modelClassification.category,
          probability: options.modelClassification.confidence,
          confidenceStatus: options.modelClassification.confidenceStatus,
          requiresReview: options.modelClassification.requiresReview,
          threshold: options.modelClassification.threshold,
          explanation: options.modelClassification.explanation,
        }
      : {
          modelUsed: "Deterministic Rules",
          prediction: ruleClassification.category,
          probability: ruleClassification.confidence,
          confidenceStatus: ruleClassification.confidence >= 0.70 ? "HIGH" : "LOW",
          requiresReview: ruleClassification.confidence < 0.70,
          threshold: 0.70,
          explanation: ruleClassification.ruleExplanation,
        },
    processingTimeMs,
    engineUsed: options.modelClassification?.modelUsed
      ? `AcademicAI Hybrid Engine (${options.modelClassification.modelUsed})`
      : "AcademicAI Rule-Based NLP Pipeline v2.0",
    architectureLayer: "Deterministic parsing & pattern-based NLP",
  };
}

/**
 * Full Async Academic Extractor backed by the trained NLP classifier
 */
export async function extractAcademicNoticeWithModel(
  rawText: string,
  options: {
    referenceDate?: Date;
    modelType?: "transformer" | "baseline";
    threshold?: number;
  } = {}
): Promise<NLPAnalysisResult> {
  const modelPred = await classifyWithTrainedModel(rawText, {
    modelType: options.modelType,
    threshold: options.threshold,
  });

  return extractAcademicNotice(rawText, {
    referenceDate: options.referenceDate,
    modelClassification: {
      category: modelPred.category,
      modelUsed: modelPred.modelUsed,
      confidence: modelPred.confidence,
      requiresReview: modelPred.requiresReview,
      confidenceStatus: modelPred.confidenceStatus,
      threshold: modelPred.threshold,
      explanation: modelPred.explanation,
    },
  });
}

