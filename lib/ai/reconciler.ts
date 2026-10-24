import { DocumentType, ExtractedTask, ExtractedEvent } from "@/lib/nlp/schemas";
import { AIExtractionOutput, ReconciliationReport } from "./types";
import { TemporalExtractionResult } from "@/lib/nlp/temporal";
import { AcademicEntities } from "@/lib/nlp/ner";
import { evaluatePriority } from "@/lib/nlp/priority-engine";

export interface ReconciledOutput {
  documentType: DocumentType;
  classificationConfidence: number;
  summary: string;
  tasks: ExtractedTask[];
  events: ExtractedEvent[];
  reconciliation: ReconciliationReport;
  engineUsed: string;
}

export function reconcileNLPAndAI(
  rawText: string,
  ruleClassification: { documentType: DocumentType; confidence: number },
  ruleEntities: AcademicEntities,
  ruleTemporal: TemporalExtractionResult,
  ruleTasks: ExtractedTask[],
  ruleEvents: ExtractedEvent[],
  ruleSummary: string,
  aiOutput: AIExtractionOutput | null
): ReconciledOutput {
  // If AI was not engaged (e.g. no API key configured or API unreachable), return rule-based baseline cleanly
  if (!aiOutput) {
    return {
      documentType: ruleClassification.documentType,
      classificationConfidence: ruleClassification.confidence,
      summary: ruleSummary,
      tasks: ruleTasks,
      events: ruleEvents,
      reconciliation: {
        agreementScore: 1.0,
        llmEngaged: false,
        modelUsed: "Rule-Based Baseline (Deterministic NLP)",
        sourceConfidence: ruleClassification.confidence,
        agreedFields: ["documentType", "tasks", "events", "summary"],
        reconciledFields: [],
      },
      engineUsed: "AcademicAI Rule-Based Baseline Engine",
    };
  }

  const agreedFields: string[] = [];
  const reconciledFields: ReconciliationReport["reconciledFields"] = [];
  let matchingPoints = 0;
  let totalPoints = 0;

  // 1. Reconcile Document Type
  totalPoints++;
  let chosenDocumentType = ruleClassification.documentType;
  let chosenClassificationConfidence = ruleClassification.confidence;

  if (ruleClassification.documentType === aiOutput.documentType) {
    matchingPoints++;
    agreedFields.push("documentType");
    chosenClassificationConfidence = Math.min(0.99, ruleClassification.confidence + 0.1);
  } else if (ruleClassification.documentType === "GENERAL_ANNOUNCEMENT" && aiOutput.documentType !== "GENERAL_ANNOUNCEMENT") {
    // AI provided a more specific subtype (e.g. ASSIGNMENT or SCHEDULE_CHANGE)
    reconciledFields.push({
      field: "documentType",
      ruleValue: ruleClassification.documentType,
      aiValue: aiOutput.documentType,
      chosenValue: aiOutput.documentType,
      resolutionReason: "Adopted specific AI categorization over generic academic notice default.",
    });
    chosenDocumentType = aiOutput.documentType;
    chosenClassificationConfidence = aiOutput.confidenceScore || 0.92;
  } else {
    // If conflict, prefer rule-based if high confidence (0.95), otherwise AI
    if (ruleClassification.confidence >= 0.9) {
      chosenDocumentType = ruleClassification.documentType;
      chosenClassificationConfidence = ruleClassification.confidence;
    } else {
      chosenDocumentType = aiOutput.documentType;
      chosenClassificationConfidence = 0.9;
    }
  }

  // 2. Reconcile Course Information
  totalPoints++;
  const ruleCourseCode = ruleEntities.courseCode;
  const aiCourses = aiOutput.courses || [];
  let primaryCourse = ruleEntities.courses[0] || (aiCourses.length > 0 ? aiCourses[0] : null);

  if (ruleCourseCode && !primaryCourse?.includes(ruleCourseCode)) {
    primaryCourse = `${primaryCourse ? primaryCourse + " " : ""}(${ruleCourseCode})`;
  }

  // 3. Reconcile Tasks
  const reconciledTasks: ExtractedTask[] = [];
  const primaryAiTask = aiOutput.tasks[0];
  const primaryRuleTask = ruleTasks[0];

  if (primaryAiTask && primaryRuleTask) {
    totalPoints += 2;

    // Check Deadline Agreement
    const aiDeadlineDate = primaryAiTask.deadline ? new Date(primaryAiTask.deadline) : null;
    const ruleDeadlineDate = primaryRuleTask.deadline ? new Date(primaryRuleTask.deadline) : null;

    let finalDeadlineIso = primaryRuleTask.deadline;
    let finalNormalizedDeadline = primaryRuleTask.normalizedDeadline;

    if (aiDeadlineDate && ruleDeadlineDate) {
      const diffMs = Math.abs(aiDeadlineDate.getTime() - ruleDeadlineDate.getTime());
      if (diffMs < 60 * 1000) {
        matchingPoints += 2;
        agreedFields.push("deadline");
      } else {
        reconciledFields.push({
          field: "deadline",
          ruleValue: primaryRuleTask.normalizedDeadline,
          aiValue: primaryAiTask.normalizedDeadline,
          chosenValue: primaryRuleTask.normalizedDeadline,
          resolutionReason: "Preserved exact deterministic timestamp from temporal regex normalizer.",
        });
      }
    } else if (primaryAiTask.deadline && !primaryRuleTask.deadline) {
      finalDeadlineIso = primaryAiTask.deadline;
      finalNormalizedDeadline = primaryAiTask.normalizedDeadline || primaryAiTask.deadline;
      reconciledFields.push({
        field: "deadline",
        ruleValue: null,
        aiValue: primaryAiTask.normalizedDeadline,
        chosenValue: primaryAiTask.normalizedDeadline,
        resolutionReason: "Incorporated deadline discovered via AI natural language comprehension.",
      });
    }

    // Reconcile Penalty / Platform
    const finalPlatform = primaryAiTask.submissionPlatform || primaryRuleTask.submissionPlatform;
    const finalPenalty = primaryAiTask.penaltyClause || primaryRuleTask.penaltyClause;
    const finalAction = primaryAiTask.action || primaryRuleTask.action || "SUBMIT";

    // Recalculate transparent multi-factor priority with reconciled factors
    const targetDate = finalDeadlineIso ? new Date(finalDeadlineIso) : null;
    const priorityResult = evaluatePriority({
      deadline: targetDate,
      category: primaryAiTask.category || primaryRuleTask.category,
      hasPenaltyClause: !!finalPenalty,
      penaltyClauseText: finalPenalty,
      isExam: primaryAiTask.category === "EXAM" || primaryRuleTask.category === "EXAM",
      hasUrgentKeywords: ruleEntities.urgencyKeywords.length > 0 || primaryAiTask.urgency === "HIGH" || primaryAiTask.urgency === "CRITICAL",
    });

    reconciledTasks.push({
      title: primaryAiTask.title || primaryRuleTask.title,
      course: primaryCourse || primaryAiTask.course || primaryRuleTask.course,
      courseCode: primaryRuleTask.courseCode || ruleEntities.primaryCourseCode || null,
      courseCodeOrigin: primaryRuleTask.courseCodeOrigin || ruleEntities.primaryCourseCodeOrigin || "EXTRACTED_FROM_SOURCE",
      category: primaryAiTask.category || primaryRuleTask.category,
      action: finalAction,
      deadline: finalDeadlineIso,
      normalizedDeadline: finalNormalizedDeadline,
      rawDeadlineSnippet: null,
      submissionPlatform: finalPlatform,
      marks: null,
      weightage: null,
      penaltyClause: finalPenalty,
      previousDateTime: primaryRuleTask.previousDateTime || null,
      newDateTime: primaryRuleTask.newDateTime || null,
      isRescheduled: primaryRuleTask.isRescheduled || false,
      urgency: priorityResult.level,
      priority: priorityResult.level,
      priorityScore: priorityResult.score,
      priorityReason: primaryAiTask.reasoning
        ? `${priorityResult.explanation} (AI context: ${primaryAiTask.reasoning})`
        : priorityResult.explanation,
      conditions: [],
      evidences: [],
      confidence: Math.min(0.98, (primaryRuleTask.confidence + (primaryAiTask.confidence || 0.9)) / 2 + 0.05),
      extractedSnippet: primaryRuleTask.extractedSnippet || rawText.slice(0, 150),
    });
  } else if (primaryAiTask) {
    // Only AI produced a task
    const priorityResult = evaluatePriority({
      deadline: primaryAiTask.deadline ? new Date(primaryAiTask.deadline) : null,
      category: primaryAiTask.category,
      hasPenaltyClause: !!primaryAiTask.penaltyClause,
      penaltyClauseText: primaryAiTask.penaltyClause,
      isExam: primaryAiTask.category === "EXAM",
      hasUrgentKeywords: primaryAiTask.urgency === "HIGH" || primaryAiTask.urgency === "CRITICAL",
    });

    reconciledTasks.push({
      title: primaryAiTask.title,
      course: primaryAiTask.course || primaryCourse,
      courseCode: ruleEntities.primaryCourseCode || null,
      courseCodeOrigin: ruleEntities.primaryCourseCodeOrigin || "EXTRACTED_FROM_SOURCE",
      category: primaryAiTask.category,
      action: primaryAiTask.action || "SUBMIT",
      deadline: primaryAiTask.deadline,
      normalizedDeadline: primaryAiTask.normalizedDeadline,
      rawDeadlineSnippet: null,
      submissionPlatform: primaryAiTask.submissionPlatform,
      marks: null,
      weightage: null,
      penaltyClause: primaryAiTask.penaltyClause,
      urgency: primaryAiTask.urgency || priorityResult.level,
      priority: priorityResult.level,
      priorityScore: priorityResult.score,
      priorityReason: primaryAiTask.reasoning || priorityResult.explanation,
      conditions: [],
      evidences: [],
      confidence: primaryAiTask.confidence || 0.88,
      extractedSnippet: rawText.slice(0, 150),
    });
  } else if (primaryRuleTask) {
    // Only rule-based produced a task
    reconciledTasks.push(primaryRuleTask);
  }

  // 4. Reconcile Events
  const reconciledEvents: ExtractedEvent[] = ruleEvents.length > 0 ? ruleEvents : (aiOutput.events.map((e) => ({
    title: e.title,
    course: e.course || primaryCourse,
    courseCode: ruleEntities.primaryCourseCode || null,
    courseCodeOrigin: ruleEntities.primaryCourseCodeOrigin || "EXTRACTED_FROM_SOURCE",
    eventType: (e.eventType === "DEADLINE" ? "REVIEW" : e.eventType) as ExtractedEvent["eventType"],
    venue: e.venue,
    platform: null,
    startTime: e.startTime,
    endTime: e.endTime,
    formattedTime: null,
    isRescheduled: e.isRescheduled,
    previousDateTime: null,
    newDateTime: null,
    conditions: [],
    confidence: e.confidence || 0.88,
    extractedSnippet: rawText.slice(0, 150),
    evidences: [],
  })));

  // 5. Reconcile Actionable Summary
  const chosenSummary = aiOutput.summary && aiOutput.summary.length > 20
    ? aiOutput.summary
    : ruleSummary;

  const agreementScore = totalPoints > 0 ? Math.round((matchingPoints / totalPoints) * 100) / 100 : 1.0;

  return {
    documentType: chosenDocumentType,
    classificationConfidence: chosenClassificationConfidence,
    summary: chosenSummary,
    tasks: reconciledTasks,
    events: reconciledEvents,
    reconciliation: {
      agreementScore,
      llmEngaged: true,
      modelUsed: aiOutput.modelName,
      sourceConfidence: aiOutput.confidenceScore || 0.9,
      agreedFields,
      reconciledFields,
    },
    engineUsed: `AcademicAI Reconciled Hybrid (${aiOutput.modelName} + Rule Baseline)`,
  };
}
