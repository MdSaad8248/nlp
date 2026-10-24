import { z } from "zod";
import { DocumentTypeSchema, TaskCategorySchema, PriorityLevelSchema } from "@/lib/nlp/schemas";

export const AIExtractedTaskSchema = z.object({
  title: z.string(),
  course: z.string().nullable().default(null),
  category: TaskCategorySchema.default("ASSIGNMENT"),
  deadline: z.string().nullable().default(null),
  normalizedDeadline: z.string().nullable().default(null),
  action: z.string().default("SUBMIT"),
  submissionPlatform: z.string().nullable().default(null),
  penaltyClause: z.string().nullable().default(null),
  urgency: PriorityLevelSchema.default("MEDIUM"),
  affectedStudents: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0.9),
  reasoning: z.string().default(""),
});
export type AIExtractedTask = z.infer<typeof AIExtractedTaskSchema>;

export const AIExtractedEventSchema = z.object({
  title: z.string(),
  course: z.string().nullable().default(null),
  eventType: z.enum(["LECTURE", "LAB", "REVIEW", "WORKSHOP", "EXAM", "SEMINAR", "DEADLINE"]).default("REVIEW"),
  venue: z.string().nullable().default(null),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
  isRescheduled: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.9),
});
export type AIExtractedEvent = z.infer<typeof AIExtractedEventSchema>;

export const AIExtractedChangeSchema = z.object({
  targetTitle: z.string(),
  field: z.enum(["deadline", "date", "time", "venue", "submissionPlatform", "status"]),
  oldValue: z.string(),
  newValue: z.string(),
  reason: z.string(),
});
export type AIExtractedChange = z.infer<typeof AIExtractedChangeSchema>;

export const AIExtractionOutputSchema = z.object({
  documentType: DocumentTypeSchema.default("GENERAL_ANNOUNCEMENT"),
  summary: z.string().default(""),
  courses: z.array(z.string()).default([]),
  tasks: z.array(AIExtractedTaskSchema).default([]),
  events: z.array(AIExtractedEventSchema).default([]),
  changes: z.array(AIExtractedChangeSchema).default([]),
  modelName: z.string().default("AI-LLM"),
  confidenceScore: z.number().min(0).max(1).default(0.88),
  explanation: z.string().default(""),
});
export type AIExtractionOutput = z.infer<typeof AIExtractionOutputSchema>;

export interface ReconciliationReport {
  agreementScore: number; // 0.0 to 1.0
  llmEngaged: boolean;
  modelUsed: string;
  sourceConfidence: number;
  agreedFields: string[];
  reconciledFields: Array<{
    field: string;
    ruleValue: any;
    aiValue: any;
    chosenValue: any;
    resolutionReason: string;
  }>;
}
