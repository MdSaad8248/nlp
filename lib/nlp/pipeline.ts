import { NLPAnalysisResult } from "./schemas";
import { classifyAcademicDocument } from "./classifier";
import { classifyWithTrainedModel } from "./model-classifier";
import { extractAcademicEntities } from "./ner";
import { parseTemporalExpressions } from "./temporal";
import { extractAcademicObjects } from "./extractor";
import { generateAcademicSummary } from "./summarizer";
import { detectDuplicateNotice, CandidateNotice } from "./duplicate-detector";
import { detectNoticeChanges, ExistingTaskRecord, ExistingEventRecord } from "./change-detector";
import { getAIProvider, reconcileNLPAndAI } from "@/lib/ai";

export interface PipelineOptions {
  existingTasks?: ExistingTaskRecord[];
  existingEvents?: ExistingEventRecord[];
  existingNotices?: CandidateNotice[];
  skipAI?: boolean;
}

export async function processAcademicNotice(
  rawText: string,
  options: PipelineOptions = {}
): Promise<NLPAnalysisResult> {
  const startTime = Date.now();

  // 1. Trained NLP Classifier + Deterministic Rule-based Safeguard
  const modelPred = await classifyWithTrainedModel(rawText);
  const ruleClassification = classifyAcademicDocument(rawText);

  // If high confidence, model prediction drives category signal; else rule fallback safeguarded
  const effectiveClassification = {
    ...ruleClassification,
    category: modelPred.category,
    documentType: modelPred.category,
    confidence: modelPred.confidence,
    indicators: [
      `Model: ${modelPred.modelUsed} (${Math.round(modelPred.confidence * 100)}% prob)`,
      ...ruleClassification.indicators,
    ],
  };
  const ruleEntities = extractAcademicEntities(rawText);
  const ruleTemporal = parseTemporalExpressions(rawText);
  const { tasks: ruleTasks, events: ruleEvents } = extractAcademicObjects(
    rawText,
    ruleEntities,
    ruleTemporal
  );
  const ruleSummary = generateAcademicSummary(
    rawText,
    ruleEntities,
    ruleTemporal,
    ruleTasks,
    ruleEvents
  );

  // 2. AI / LLM Extraction Layer (if configured and not skipped)
  let aiOutput = null;
  if (!options.skipAI) {
    const aiProvider = getAIProvider();
    if (aiProvider.isConfigured()) {
      aiOutput = await aiProvider.extract(rawText);
    }
  }

  // 3. Reconciliation Layer: Compare & Fuse Trained NLP Baseline with AI Output
  const reconciled = reconcileNLPAndAI(
    rawText,
    effectiveClassification,
    ruleEntities,
    ruleTemporal,
    ruleTasks,
    ruleEvents,
    ruleSummary,
    aiOutput
  );

  // 4. Duplicate Detection (Semantic and Token Similarity against stored notices)
  const duplicate = detectDuplicateNotice(rawText, options.existingNotices || []);

  // 5. Change Detection against existing tasks/events
  const changes = detectNoticeChanges(
    reconciled.tasks,
    reconciled.events,
    ruleTemporal,
    options.existingTasks || [],
    options.existingEvents || []
  );

  const processingTimeMs = Date.now() - startTime;

  // Key entities collection
  const keyEntities = {
    courses: Array.from(
      new Set([
        ...ruleEntities.courses,
        ...(aiOutput?.courses || []),
      ])
    ),
    courseCodes: ruleEntities.courseCodes || [],
    courseResolutions: ruleEntities.courseResolutions || [],
    dates: ruleTemporal.dates.map((d) => d.formatted),
    times: ruleTemporal.times.map((t) => t.formatted),
    venues: ruleEntities.venues || [],
    platforms: Array.from(
      new Set([
        ...ruleEntities.platforms,
        ...(reconciled.tasks.map((t) => t.submissionPlatform).filter(Boolean) as string[]),
      ])
    ),
    marks: ruleEntities.marks ? [`${ruleEntities.marks} marks`] : [],
    conditions: ruleEntities.conditions || [],
    actions: Array.from(
      new Set([
        ...ruleEntities.actions,
        ...(reconciled.tasks.map((t) => t.action).filter(Boolean) as string[]),
      ])
    ),
    keywords: ruleEntities.urgencyKeywords,
  };

  return {
    documentType: reconciled.documentType,
    category: reconciled.documentType,
    classificationScore: ruleClassification.classificationScore,
    classificationConfidence: reconciled.classificationConfidence,
    indicators: ruleClassification.indicators,
    summary: reconciled.summary,
    rawText,
    entities: ruleEntities.allEntities,
    keyEntities,
    tasks: reconciled.tasks,
    events: reconciled.events,
    exams: [],
    conditions: ruleEntities.conditions || [],
    temporalSpans: ruleTemporal.temporalSpans || [],
    evidences: ruleEntities.evidences || [],
    changes,
    duplicate,
    previousDateTime: ruleTemporal.previousDateTime ? ruleTemporal.previousDateTime.combinedFormatted : null,
    newDateTime: ruleTemporal.newDateTime ? ruleTemporal.newDateTime.combinedFormatted : null,
    reconciliation: reconciled.reconciliation,
    modelClassification: {
      modelUsed: modelPred.modelUsed,
      prediction: modelPred.category,
      probability: modelPred.confidence,
      confidenceStatus: modelPred.confidenceStatus,
      requiresReview: modelPred.requiresReview,
      threshold: modelPred.threshold,
      explanation: modelPred.explanation,
    },
    processingTimeMs,
    engineUsed: `AcademicAI Trained NLP Pipeline (${modelPred.modelUsed})`,
    architectureLayer: "Trained Transformer NLP & Domain Reasoning",
  };
}
