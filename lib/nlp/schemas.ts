import { z } from "zod";

// 1. Notice Classification Categories (Milestone 2 Required)
export const NoticeCategorySchema = z.enum([
  "ASSIGNMENT",
  "QUIZ",
  "EXAM",
  "PROJECT",
  "REVIEW",
  "CLASS_CHANGE",
  "CLASS_CANCELLATION",
  "ATTENDANCE_NOTICE",
  "EVENT",
  "CIRCULAR",
  "GENERAL_ANNOUNCEMENT",
]);
export type NoticeCategory = z.infer<typeof NoticeCategorySchema>;

// Alias for backwards compatibility with existing references
export const DocumentTypeSchema = NoticeCategorySchema;
export type DocumentType = NoticeCategory;

export const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type PriorityLevel = z.infer<typeof PriorityLevelSchema>;

export const TaskCategorySchema = z.enum([
  "ASSIGNMENT",
  "PROJECT",
  "REVIEW",
  "REPORT",
  "QUIZ",
  "EXAM",
  "HOMEWORK",
  "LAB",
]);
export type TaskCategory = z.infer<typeof TaskCategorySchema>;

// 2. Source Evidence Schema
export const FieldEvidenceSchema = z.object({
  field: z.string(), // e.g. "course", "deadline", "event", "venue", "marks", "condition", "urgency", "platform"
  value: z.any(),
  rawSnippet: z.string(), // exact verbatim excerpt from the source text
  startIndex: z.number().optional(),
  endIndex: z.number().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
});
export type FieldEvidence = z.infer<typeof FieldEvidenceSchema>;

// Entity Origin Distinction (Milestone 2 Requirement)
export const EntityOriginSchema = z.enum([
  "EXTRACTED_FROM_SOURCE",   // explicitly present in notice text
  "RESOLVED_FROM_REGISTRY",  // inferred/resolved via academic course catalog / DB
]);
export type EntityOrigin = z.infer<typeof EntityOriginSchema>;

export const CourseResolutionSchema = z.object({
  code: z.string().nullable(),
  name: z.string().nullable(),
  codeOrigin: EntityOriginSchema.default("EXTRACTED_FROM_SOURCE"),
  nameOrigin: EntityOriginSchema.default("EXTRACTED_FROM_SOURCE"),
  rawSnippet: z.string().optional(),
  resolutionNote: z.string().optional(),
});
export type CourseResolution = z.infer<typeof CourseResolutionSchema>;

// 3. Named Entities
export const EntityTypeSchema = z.enum([
  "COURSE_NAME",
  "COURSE_CODE",
  "TASK_TYPE",
  "DATE",
  "TIME",
  "DEADLINE",
  "VENUE",
  "PLATFORM",
  "MARKS_WEIGHTAGE",
  "URGENCY",
  "CONDITION",
  "ACTION",
  "KEYWORD",
  "PENALTY_CLAUSE",
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const ExtractedEntitySchema = z.object({
  type: EntityTypeSchema,
  text: z.string(),
  normalizedValue: z.string().optional(),
  origin: EntityOriginSchema.optional(),
  resolutionNote: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  rawSnippet: z.string().optional(),
  startIndex: z.number().optional(),
  endIndex: z.number().optional(),
});
export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;

// 4. Extracted Task
export const ExtractedTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  course: z.string().nullable().default(null),
  courseCode: z.string().nullable().default(null),
  courseCodeOrigin: EntityOriginSchema.optional(),
  category: TaskCategorySchema.default("ASSIGNMENT"),
  action: z.string().default("SUBMIT"),
  deadline: z.string().nullable().default(null), // ISO UTC string
  normalizedDeadline: z.string().nullable().default(null), // Asia/Kolkata formatted string
  rawDeadlineSnippet: z.string().nullable().default(null),
  previousDateTime: z.string().nullable().optional(),
  newDateTime: z.string().nullable().optional(),
  isRescheduled: z.boolean().optional(),
  submissionPlatform: z.string().nullable().default(null),
  marks: z.number().nullable().default(null),
  weightage: z.number().nullable().default(null),
  penaltyClause: z.string().nullable().default(null),
  urgency: PriorityLevelSchema.default("MEDIUM"),
  priority: PriorityLevelSchema.default("MEDIUM"),
  priorityScore: z.number().min(0).max(100).default(50),
  priorityReason: z.string().default("Standard academic task"),
  conditions: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.85),
  extractedSnippet: z.string().default(""),
  evidences: z.array(FieldEvidenceSchema).default([]),
});
export type ExtractedTask = z.infer<typeof ExtractedTaskSchema>;

// 5. Extracted Event
export const ExtractedEventSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  course: z.string().nullable().default(null),
  courseCode: z.string().nullable().default(null),
  courseCodeOrigin: EntityOriginSchema.optional(),
  eventType: z.enum([
    "LECTURE",
    "LAB",
    "REVIEW",
    "WORKSHOP",
    "EXAM",
    "SEMINAR",
    "CLASS_CHANGE",
    "CLASS_CANCELLATION",
    "ATTENDANCE",
    "GENERAL",
  ]).default("REVIEW"),
  venue: z.string().nullable().default(null),
  platform: z.string().nullable().default(null),
  startTime: z.string().nullable().default(null), // ISO UTC string
  endTime: z.string().nullable().default(null),   // ISO UTC string
  formattedTime: z.string().nullable().default(null),
  isRescheduled: z.boolean().optional(),
  previousDateTime: z.string().nullable().optional(),
  newDateTime: z.string().nullable().optional(),
  conditions: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.85),
  extractedSnippet: z.string().default(""),
  evidences: z.array(FieldEvidenceSchema).default([]),
});
export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;

// 6. Extracted Exam
export const ExtractedExamSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  course: z.string().nullable().default(null),
  courseCode: z.string().nullable().default(null),
  courseCodeOrigin: EntityOriginSchema.optional(),
  examDate: z.string().nullable().default(null), // ISO UTC string
  startTime: z.string().nullable().default(null), // e.g. "10:00 AM"
  endTime: z.string().nullable().default(null),   // e.g. "11:30 AM"
  venue: z.string().nullable().default(null),
  weightage: z.number().nullable().default(null),
  isRescheduled: z.boolean().optional(),
  previousDateTime: z.string().nullable().optional(),
  newDateTime: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.9),
  extractedSnippet: z.string().default(""),
  evidences: z.array(FieldEvidenceSchema).default([]),
});
export type ExtractedExam = z.infer<typeof ExtractedExamSchema>;

// 7. Temporal Span Record
export const TemporalSpanSchema = z.object({
  raw: z.string(),
  normalized: stringOrNull(),
  iso: stringOrNull(),
  type: z.enum(["date", "time", "deadline", "duration", "relative"]),
  timezone: z.string().default("Asia/Kolkata"),
});
export type TemporalSpan = z.infer<typeof TemporalSpanSchema>;

function stringOrNull() {
  return z.string().nullable().default(null);
}

// 8. Detected Change & Duplicate Result (Milestone 2 Legacy + Milestone 3 Foundations)
export const DetectedChangeSchema = z.object({
  targetType: z.enum(["TASK", "EVENT", "EXAM"]),
  targetId: z.string().optional(),
  targetTitle: z.string(),
  field: z.enum(["deadline", "date", "time", "venue", "submissionPlatform", "marks", "status"]),
  oldValue: z.string(),
  newValue: z.string(),
  reason: z.string(),
  evidenceSnippet: z.string(),
});
export type DetectedChange = z.infer<typeof DetectedChangeSchema>;

export const DuplicateDetectionResultSchema = z.object({
  isDuplicate: z.boolean(),
  matchedSourceId: z.string().optional(),
  matchedTitle: z.string().optional(),
  similarityScore: z.number().min(0).max(1),
  reason: z.string(),
});
export type DuplicateDetectionResult = z.infer<typeof DuplicateDetectionResultSchema>;

// 8B. Milestone 3: Academic Relationship & Change Intelligence Schemas
export const AcademicRelationshipSchema = z.enum([
  "NEW",
  "DUPLICATE",
  "UPDATED",
  "RESCHEDULED",
  "CANCELLED",
]);
export type AcademicRelationship = z.infer<typeof AcademicRelationshipSchema>;

export const ChangedFieldTypeSchema = z.enum([
  "date",
  "time",
  "venue",
  "platform",
  "marks",
  "deadline",
  "title",
  "course",
  "status",
]);
export type ChangedFieldType = z.infer<typeof ChangedFieldTypeSchema>;

export const ChangedFieldDiffSchema = z.object({
  field: ChangedFieldTypeSchema,
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  reason: z.string(),
  evidenceSnippet: z.string().optional(),
});
export type ChangedFieldDiff = z.infer<typeof ChangedFieldDiffSchema>;

export const MatchedRecordSchema = z.object({
  id: z.string(),
  itemType: z.enum(["TASK", "EVENT", "EXAM"]),
  title: z.string(),
  category: z.string().optional(),
  courseCode: z.string().nullable().optional(),
  courseTitle: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  marks: z.number().nullable().optional(),
  status: z.string().optional(),
  isRescheduled: z.boolean().optional(),
});
export type MatchedRecord = z.infer<typeof MatchedRecordSchema>;

export const ProposedActionSchema = z.enum([
  "CREATE_NEW",
  "UPDATE_EXISTING",
  "RESCHEDULE_EXISTING",
  "CANCEL_EXISTING",
  "MARK_DUPLICATE",
  "IGNORE",
  "VERIFICATION_REQUIRED",
]);
export type ProposedAction = z.infer<typeof ProposedActionSchema>;

export const ItemRelationshipSchema = z.object({
  candidateTitle: z.string(),
  candidateType: z.enum(["TASK", "EVENT", "EXAM"]),
  relationship: AcademicRelationshipSchema,
  matchedRecord: MatchedRecordSchema.nullable().optional(),
  matchingReasons: z.array(z.string()),
  changedFields: z.array(ChangedFieldDiffSchema),
  proposedAction: ProposedActionSchema,
  similarityScore: z.number().min(0).max(1),
  contradiction: z.any().optional(),
});
export type ItemRelationship = z.infer<typeof ItemRelationshipSchema>;

export const ChangeCheckResultSchema = z.object({
  relationship: AcademicRelationshipSchema,
  matchedRecord: MatchedRecordSchema.nullable().optional(),
  matchingReasons: z.array(z.string()),
  changedFields: z.array(ChangedFieldDiffSchema),
  proposedAction: ProposedActionSchema,
  similarityScore: z.number().min(0).max(1),
  itemRelationships: z.array(ItemRelationshipSchema),
  summary: z.string(),
  contradiction: z.any().optional(),
  contradictions: z.array(z.any()).optional(),
});
export type ChangeCheckResult = z.infer<typeof ChangeCheckResultSchema>;

// 9. Full Structured Ingest & Analysis Output
export const NLPAnalysisResultSchema = z.object({
  documentType: NoticeCategorySchema,
  category: NoticeCategorySchema,
  classificationScore: z.number().default(0), // Raw rule-based classification salience score (e.g. 3.5)
  classificationConfidence: z.number().min(0).max(1), // Backwards compatibility
  indicators: z.array(z.string()).default([]),
  summary: z.string(),
  rawText: z.string(),
  entities: z.array(ExtractedEntitySchema),
  keyEntities: z.object({
    courses: z.array(z.string()),
    courseCodes: z.array(z.string()).default([]),
    courseResolutions: z.array(CourseResolutionSchema).default([]),
    dates: z.array(z.string()),
    times: z.array(z.string()),
    venues: z.array(z.string()).default([]),
    platforms: z.array(z.string()),
    marks: z.array(z.string()).default([]),
    conditions: z.array(z.string()).default([]),
    actions: z.array(z.string()),
    keywords: z.array(z.string()),
  }),
  tasks: z.array(ExtractedTaskSchema),
  events: z.array(ExtractedEventSchema),
  exams: z.array(ExtractedExamSchema).default([]),
  conditions: z.array(z.string()).default([]),
  temporalSpans: z.array(TemporalSpanSchema).default([]),
  evidences: z.array(FieldEvidenceSchema).default([]),
  changes: z.array(DetectedChangeSchema).default([]),
  duplicate: DuplicateDetectionResultSchema.optional(),
  previousDateTime: z.string().nullable().optional(),
  newDateTime: z.string().nullable().optional(),
  reconciliation: z.any().optional(),
  modelClassification: z.object({
    modelUsed: z.string().default("Deterministic Rules"),
    prediction: z.string().default("GENERAL_ANNOUNCEMENT"),
    probability: z.number().default(1.0),
    confidenceStatus: z.enum(["HIGH", "LOW"]).default("HIGH"),
    requiresReview: z.boolean().default(false),
    threshold: z.number().default(0.70),
    explanation: z.string().optional(),
  }).optional(),
  processingTimeMs: z.number().default(0),
  engineUsed: z.string().default("Deterministic NLP Rules & Extractor"),
  architectureLayer: z.string().default("Deterministic parsing & pattern-based NLP"),
});
export type NLPAnalysisResult = z.infer<typeof NLPAnalysisResultSchema>;

