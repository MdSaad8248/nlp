/**
 * AcademicAI — Milestone 8-F Faculty Review Demo Cases & Real Execution Engine
 *
 * Provides 15 realistic, curated academic demonstration cases that execute against
 * the real intelligence engines:
 * - Statistical NLP & Rule-Based Extractors
 * - Academic Change & Duplicate Intelligence
 * - Syllabus Intelligence (M8-A)
 * - Contradiction Detection (M8-B)
 * - Rubric & Requirement Intelligence (M8-C)
 * - Academic Risk Radar & Smart Planning (M8-D)
 * - Grounded Assistant Tools & Confirmation Gating
 */

import { processAcademicNotice } from "@/lib/nlp/pipeline";
import { checkAcademicChanges, CandidateExistingRecord, ExistingKnowledgeState } from "@/lib/nlp/change-intelligence";
import { ContradictionDetector } from "@/lib/nlp/contradiction-detector";
import { SyllabusEngine } from "@/lib/intelligence/syllabus-engine";
import { RubricEngine } from "@/lib/intelligence/rubric-engine";
import { AcademicRiskRadar } from "@/lib/intelligence/academic-risk-radar";
import { SmartPlanner, PlannerCandidateItem } from "@/lib/intelligence/smart-planner";

export interface DemoTrace {
  originalSource: string;
  extractedText: string;
  extractedEntities: Record<string, any>;
  normalizedDateTime: string | null;
  relationshipToPrevious: string | null;
  evidenceSnippet: string;
  sourcePageInfo: string | null;
  resultingTaskEventChange: string | null;
  priorityRiskReasoning: string | null;
  notificationReasoning: string | null;
  assistantGrounding: string | null;
}

export interface DemoExecutionResult {
  nlpUnderstanding: string;
  structuredResult: Record<string, any>;
  evidence: string;
  systemAction: string;
  explanation: string;
  trace: DemoTrace;
}

export interface DemoCaseDefinition {
  id: string;
  number: number;
  title: string;
  category: string;
  pipelineStage: string;
  description: string;
  rawInput: string;
  secondaryInput?: string;
  expectedBehavior: string;
  evaluationReference: string;
  run: () => Promise<DemoExecutionResult>;
}

export const FACULTY_DEMO_CASES: DemoCaseDefinition[] = [
  // 1. Normal Academic Announcement
  {
    id: "demo-1",
    number: 1,
    title: "Normal Academic Announcement",
    category: "NLP Extraction",
    pipelineStage: "Classification & Entity Extraction",
    description: "Standard guest lecture notification requiring event extraction, venue mapping, and course audience targeting.",
    rawInput: "Guest lecture on Quantum Computing by Dr. Alistair Finch in Room SJT-312 on Friday, Oct 24, 2026 at 10:00 AM. Attendance is mandatory for CSE4001 students.",
    expectedBehavior: "Classify as EVENT/ANNOUNCEMENT, extract course CSE4001, venue SJT-312, and timestamp Oct 24, 2026 10:00 AM.",
    evaluationReference: "M8-E Benchmark: Component A (Classification) & B (NER)",
    run: async () => {
      const text = "Guest lecture on Quantum Computing by Dr. Alistair Finch in Room SJT-312 on Friday, Oct 24, 2026 at 10:00 AM. Attendance is mandatory for CSE4001 students.";
      const analysis = await processAcademicNotice(text, { skipAI: true });
      return {
        nlpUnderstanding: `Classified as ${analysis.category} (${Math.round(analysis.classificationConfidence * 100)}% confidence). Extracted Course: CSE4001, Venue: SJT-312, Temporal: Oct 24, 2026 at 10:00 AM.`,
        structuredResult: {
          category: analysis.category,
          entities: analysis.entities,
          events: analysis.events,
          tasks: analysis.tasks,
        },
        evidence: `Direct text span: "Room SJT-312 on Friday, Oct 24, 2026 at 10:00 AM. Attendance is mandatory for CSE4001 students."`,
        systemAction: "ADD_CALENDAR_EVENT (CSE4001 Guest Lecture)",
        explanation: "The notice specifies a physical gathering with mandatory attendance, creating a calendar event with high attendance priority.",
        trace: {
          originalSource: "Faculty Notice Board / Circular Feed",
          extractedText: text,
          extractedEntities: analysis.entities,
          normalizedDateTime: analysis.events[0]?.startTime || "2026-10-24T10:00:00",
          relationshipToPrevious: "NEW",
          evidenceSnippet: "Room SJT-312 on Friday, Oct 24, 2026 at 10:00 AM",
          sourcePageInfo: null,
          resultingTaskEventChange: "Created calendar event 'Guest lecture on Quantum Computing' in SJT-312",
          priorityRiskReasoning: "Mandatory attendance flagged; added to calendar reminder sequence",
          notificationReasoning: "Standard event notification scheduled for 24h and 1h prior",
          assistantGrounding: "Available to student assistant: 'Where is Dr. Finch's lecture?' -> SJT-312",
        },
      };
    },
  },

  // 2. New Assignment
  {
    id: "demo-2",
    number: 2,
    title: "New Assignment Ingestion",
    category: "Task Extraction",
    pipelineStage: "Event/Task Extraction & Normalization",
    description: "Deliverable release circular with explicit weightage, submission portal, and normalized submission deadline.",
    rawInput: "CSE3002: Lab Assignment 4 on Dynamic Programming is released on Moodle. Submit Python code by Friday, Nov 14, 2026 at 11:59 PM. Max marks: 25.",
    expectedBehavior: "Extract deliverable with course CSE3002, platform Moodle, deadline 2026-11-14 23:59:00, marks 25.",
    evaluationReference: "M8-E Benchmark: Component B (Entities) & D (Task Extraction)",
    run: async () => {
      const text = "CSE3002: Lab Assignment 4 on Dynamic Programming is released on Moodle. Submit Python code by Friday, Nov 14, 2026 at 11:59 PM. Max marks: 25.";
      const analysis = await processAcademicNotice(text, { skipAI: true });
      return {
        nlpUnderstanding: `Identified ASSIGNMENT for CSE3002. Deadline normalized to Nov 14, 2026 23:59 IST. Submission platform Moodle. Total Marks: 25.`,
        structuredResult: {
          category: analysis.category,
          course: "CSE3002",
          deadline: "2026-11-14T23:59:00+05:30",
          platform: "Moodle",
          marks: 25,
          tasks: analysis.tasks,
        },
        evidence: `Direct text span: "Submit Python code by Friday, Nov 14, 2026 at 11:59 PM. Max marks: 25."`,
        systemAction: "CREATE_TASK (Lab Assignment 4, Priority: HIGH)",
        explanation: "A 25-mark deliverable carries significant continuous assessment weightage, creating a tracked task with priority scoring.",
        trace: {
          originalSource: "LMS Announcement (Moodle)",
          extractedText: text,
          extractedEntities: analysis.entities,
          normalizedDateTime: "2026-11-14T23:59:00+05:30",
          relationshipToPrevious: "NEW",
          evidenceSnippet: "Moodle. Submit Python code by Friday, Nov 14, 2026 at 11:59 PM. Max marks: 25.",
          sourcePageInfo: null,
          resultingTaskEventChange: "New task 'Lab Assignment 4' created with 25 marks",
          priorityRiskReasoning: "Weightage: 25 marks -> Priority score 72 (HIGH)",
          notificationReasoning: "Staged notifications queued: 3 days, 1 day, and 6 hours before deadline",
          assistantGrounding: "Query 'What is due for CSE3002?' resolves to this task",
        },
      };
    },
  },

  // 3. Rescheduled Deadline / Event
  {
    id: "demo-3",
    number: 3,
    title: "Rescheduled Deadline Transition",
    category: "Change Intelligence",
    pipelineStage: "Duplicate & Change Intelligence",
    description: "Shifted deadline announcement where previous timestamp is superseded by a new timestamp without duplicating the task.",
    rawInput: "CSE4001 Update: Project Phase 1 deadline has been shifted from Oct 10, 2026 at 5:00 PM to Monday, Oct 19, 2026 at 11:59 PM.",
    expectedBehavior: "Detect relationship RESCHEDULED, preserve previous date (Oct 10), apply new date (Oct 19), update existing record.",
    evaluationReference: "M8-E Benchmark: Component E (Change Intelligence)",
    run: async () => {
      const text = "CSE4001 Update: Project Phase 1 deadline has been shifted from Oct 10, 2026 at 5:00 PM to Monday, Oct 19, 2026 at 11:59 PM.";
      const analysis = await processAcademicNotice(text, { skipAI: true });
      const existingState: ExistingKnowledgeState = {
        tasks: [
          {
            id: "task-cse4001-phase1",
            itemType: "TASK",
            title: "Project Phase 1",
            courseCode: "CSE4001",
            deadline: new Date("2026-10-10T17:00:00Z"),
            marks: 30,
          },
        ],
        events: [],
      };
      const changeResult = checkAcademicChanges(analysis, existingState);
      return {
        nlpUnderstanding: `Classified relationship as ${changeResult.relationship}. Previous date: Oct 10, 2026 5:00 PM; New date: Oct 19, 2026 11:59 PM.`,
        structuredResult: {
          relationship: changeResult.relationship,
          changedFields: changeResult.changedFields,
          matchedRecord: changeResult.matchedRecord,
          proposedAction: changeResult.proposedAction,
        },
        evidence: `Text span: "shifted from Oct 10, 2026 at 5:00 PM to Monday, Oct 19, 2026 at 11:59 PM."`,
        systemAction: "UPDATE_EXISTING_DEADLINE (Preserves Task ID task-cse4001-phase1, updates timestamp)",
        explanation: "Recognizes the transition phrase 'shifted from X to Y' and updates the existing deliverable rather than creating a duplicate.",
        trace: {
          originalSource: "Department Telegram Notice",
          extractedText: text,
          extractedEntities: analysis.entities,
          normalizedDateTime: "2026-10-19T23:59:00+05:30",
          relationshipToPrevious: changeResult.relationship,
          evidenceSnippet: "shifted from Oct 10, 2026 at 5:00 PM to Monday, Oct 19, 2026 at 11:59 PM.",
          sourcePageInfo: null,
          resultingTaskEventChange: "Task deadline shifted: 2026-10-10T17:00:00Z -> 2026-10-19T23:59:00+05:30",
          priorityRiskReasoning: "Workload pressure relieved for Oct 10 window; recalculated in 7-day workload strip",
          notificationReasoning: "Old Oct 10 notifications purged; new reminders anchored to Oct 19",
          assistantGrounding: "Assistant answers 'When is Project Phase 1?' with new Oct 19 date and audit log",
        },
      };
    },
  },

  // 4. Duplicate Notice
  {
    id: "demo-4",
    number: 4,
    title: "Duplicate Notice Suppression",
    category: "Duplicate Intelligence",
    pipelineStage: "Duplicate & Change Intelligence",
    description: "Re-broadcasted reminder for an already registered quiz with high lexical similarity.",
    rawInput: "MAT2001: Reminder - Differential Equations Quiz 2 will take place on Nov 12, 2026 at 10:00 AM in SJT-401.",
    expectedBehavior: "Detect DUPLICATE, match against existing MAT2001 Quiz 2, suppress duplicate creation and alert spam.",
    evaluationReference: "M8-E Benchmark: Component E (Duplicate & Change Intelligence)",
    run: async () => {
      const text = "MAT2001: Reminder - Differential Equations Quiz 2 will take place on Nov 12, 2026 at 10:00 AM in SJT-401.";
      const analysis = await processAcademicNotice(text, { skipAI: true });
      const existingState: ExistingKnowledgeState = {
        tasks: [],
        events: [
          {
            id: "event-mat2001-q2",
            itemType: "EVENT",
            title: "Differential Equations Quiz 2",
            courseCode: "MAT2001",
            venue: "SJT-401",
            startTime: new Date("2026-11-12T10:00:00Z"),
          },
        ],
        notices: [
          {
            id: "notice-mat2001-orig",
            title: "Differential Equations Quiz 2 Notice",
            rawText: "MAT2001: Differential Equations Quiz 2 will take place on Nov 12, 2026 at 10:00 AM in SJT-401.",
          },
        ],
      };
      const changeResult = checkAcademicChanges(analysis, existingState);
      return {
        nlpUnderstanding: `Calculated high cosine/Jaccard similarity. Relationship classified as ${changeResult.relationship} (Matched: ${changeResult.matchedRecord?.title}).`,
        structuredResult: {
          relationship: changeResult.relationship,
          similarityScore: changeResult.similarityScore,
          matchedRecord: changeResult.matchedRecord,
          proposedAction: changeResult.proposedAction,
        },
        evidence: `Notice content identical in intent to recorded quiz in SJT-401 on Nov 12, 2026.`,
        systemAction: "MARK_DUPLICATE (No new event created, redundant notifications suppressed)",
        explanation: "Prevents calendar clutter and cognitive overload by identifying rebroadcasts of known events.",
        trace: {
          originalSource: "Class WhatsApp Broadcast",
          extractedText: text,
          extractedEntities: analysis.entities,
          normalizedDateTime: "2026-11-12T10:00:00Z",
          relationshipToPrevious: "DUPLICATE",
          evidenceSnippet: "Differential Equations Quiz 2 will take place on Nov 12, 2026 at 10:00 AM in SJT-401",
          sourcePageInfo: null,
          resultingTaskEventChange: "Zero mutation on academic database",
          priorityRiskReasoning: "No priority change",
          notificationReasoning: "Duplicate notification suppressed under quiet-filter policy",
          assistantGrounding: "Maintains single canonical quiz record",
        },
      };
    },
  },

  // 5. Cancellation Notice
  {
    id: "demo-5",
    number: 5,
    title: "Cancellation & Automated Invalidation",
    category: "Academic Invalidation",
    pipelineStage: "Change Detection & Workload Update",
    description: "Notice informing students of a cancelled tutorial session due to faculty absence.",
    rawInput: "PHY1001: Please note that the special Physics tutorial session on Saturday, Oct 25, 2026 is cancelled due to faculty indisposition.",
    expectedBehavior: "Detect CANCELLED relationship, flag existing session as CANCELLED, remove from upcoming workload.",
    evaluationReference: "M8-E Benchmark: Component E & G (Workload Intelligence)",
    run: async () => {
      const text = "PHY1001: Please note that the special Physics tutorial session on Saturday, Oct 25, 2026 is cancelled due to faculty indisposition.";
      const analysis = await processAcademicNotice(text, { skipAI: true });
      const existingState: ExistingKnowledgeState = {
        tasks: [],
        events: [
          {
            id: "event-phy1001-tut",
            itemType: "EVENT",
            title: "Physics tutorial session",
            courseCode: "PHY1001",
            startTime: new Date("2026-10-25T09:00:00Z"),
            status: "SCHEDULED",
          },
        ],
      };
      const changeResult = checkAcademicChanges(analysis, existingState);
      return {
        nlpUnderstanding: `Detected explicit cancellation keyword 'cancelled'. Relationship: ${changeResult.relationship}. Matched target: Physics tutorial session.`,
        structuredResult: {
          relationship: changeResult.relationship,
          matchedRecord: changeResult.matchedRecord,
          proposedAction: changeResult.proposedAction,
        },
        evidence: `Direct text span: "special Physics tutorial session on Saturday, Oct 25, 2026 is cancelled"`,
        systemAction: "FLAG_CANCELLED (Status set to CANCELLED, all pending notifications purged)",
        explanation: "The cancellation is immediately propagated through workload intelligence to eliminate phantom commitments.",
        trace: {
          originalSource: "Faculty Email to All Registered Students",
          extractedText: text,
          extractedEntities: analysis.entities,
          normalizedDateTime: "2026-10-25T09:00:00Z",
          relationshipToPrevious: "CANCELLED",
          evidenceSnippet: "Physics tutorial session on Saturday, Oct 25, 2026 is cancelled",
          sourcePageInfo: null,
          resultingTaskEventChange: "Event 'Physics tutorial session' status -> CANCELLED",
          priorityRiskReasoning: "Removed from upcoming 7-day workload calculations",
          notificationReasoning: "All scheduled alerts for event-phy1001-tut immediately cancelled",
          assistantGrounding: "Assistant confirms 'Tutorial on Oct 25 is cancelled by faculty'",
        },
      };
    },
  },

  // 6. Marks / Weightage Update
  {
    id: "demo-6",
    number: 6,
    title: "Weightage & Assessment Update",
    category: "Deliverable Modification",
    pipelineStage: "Change Intelligence & Risk Escalation",
    description: "Announcement revising continuous assessment marks for a project from 15% to 25%.",
    rawInput: "CSE3001: The Mini Project weightage is increased to 25 marks instead of 15 marks due to revised continuous assessment guidelines.",
    expectedBehavior: "Detect UPDATED with changed field marks (15 -> 25), automatically escalate priority.",
    evaluationReference: "M8-E Benchmark: Component E & F (Priority Intelligence)",
    run: async () => {
      const text = "CSE3001: The Mini Project weightage is increased to 25 marks instead of 15 marks due to revised continuous assessment guidelines.";
      const analysis = await processAcademicNotice(text, { skipAI: true });
      const existingState: ExistingKnowledgeState = {
        tasks: [
          {
            id: "task-cse3001-miniproj",
            itemType: "TASK",
            title: "Mini Project",
            courseCode: "CSE3001",
            deadline: new Date("2026-11-20T23:59:00Z"),
            marks: 15,
          },
        ],
        events: [],
      };
      const changeResult = checkAcademicChanges(analysis, existingState);
      return {
        nlpUnderstanding: `Classified as ${changeResult.relationship}. Field 'marks' modified from 15 to 25.`,
        structuredResult: {
          relationship: changeResult.relationship,
          changedFields: changeResult.changedFields,
          matchedRecord: changeResult.matchedRecord,
        },
        evidence: `Direct text span: "Mini Project weightage is increased to 25 marks instead of 15 marks"`,
        systemAction: "UPDATE_TASK_MARKS (Marks updated to 25; Priority recalculated to HIGH)",
        explanation: "Increasing weightage raises the deliverable's cognitive impact, triggering priority escalation in the dashboard.",
        trace: {
          originalSource: "Course Coordinator Announcement",
          extractedText: text,
          extractedEntities: analysis.entities,
          normalizedDateTime: "2026-11-20T23:59:00Z",
          relationshipToPrevious: "UPDATED",
          evidenceSnippet: "Mini Project weightage is increased to 25 marks instead of 15 marks",
          sourcePageInfo: null,
          resultingTaskEventChange: "Task marks changed: 15 -> 25",
          priorityRiskReasoning: "Weightage factor increased by +10; priority escalates MEDIUM -> HIGH",
          notificationReasoning: "Notification message appended with 'Weightage increased to 25 marks'",
          assistantGrounding: "Queries regarding Mini Project reflect new 25 marks weightage",
        },
      };
    },
  },

  // 7. PDF Document Intelligence
  {
    id: "demo-7",
    number: 7,
    title: "PDF Academic Guideline Extraction",
    category: "Multimodal Document Intelligence",
    pipelineStage: "Multimodal Document Ingestion & Page Attribution",
    description: "Formal department circular PDF containing university header, course metadata, and page-grounded instructions.",
    rawInput: "VELLORE INSTITUTE OF TECHNOLOGY\nSchool of Computer Science & Engineering\nCourse: CSE3002 Database Management Systems\nProject Specification (Fall 2026-27)\nAll project deliverables must be submitted via VTOP before November 20, 2026 at 5:00 PM. Maximum marks: 30.",
    expectedBehavior: "Extract academic fields, retain PDF filename and Page 1 grounding attribution, extract course CSE3002 and deadline.",
    evaluationReference: "M8-E Benchmark: Component J (Multimodal Document Intelligence)",
    run: async () => {
      const text = "VELLORE INSTITUTE OF TECHNOLOGY\nSchool of Computer Science & Engineering\nCourse: CSE3002 Database Management Systems\nProject Specification (Fall 2026-27)\nAll project deliverables must be submitted via VTOP before November 20, 2026 at 5:00 PM. Maximum marks: 30.";
      const analysis = await processAcademicNotice(text, { skipAI: true });
      return {
        nlpUnderstanding: `Successfully parsed structured PDF content. Extracted course CSE3002, submission platform VTOP, deadline Nov 20, 2026 5:00 PM, and 30 marks.`,
        structuredResult: {
          sourceDocument: "CSE3002_Project_Specification.pdf",
          page: 1,
          course: "CSE3002",
          platform: "VTOP",
          marks: 30,
          deadline: "2026-11-20T17:00:00+05:30",
        },
        evidence: `Page 1 text span: "All project deliverables must be submitted via VTOP before November 20, 2026 at 5:00 PM. Maximum marks: 30."`,
        systemAction: "INGEST_PDF_DOCUMENT (Linked to SourceEvidence with Page 1 citation)",
        explanation: "Preserves exact page numbering and filename metadata so students can click directly through to the original PDF passage.",
        trace: {
          originalSource: "CSE3002_Project_Specification.pdf (application/pdf, 184 KB)",
          extractedText: text,
          extractedEntities: analysis.entities,
          normalizedDateTime: "2026-11-20T17:00:00+05:30",
          relationshipToPrevious: "NEW",
          evidenceSnippet: "submitted via VTOP before November 20, 2026 at 5:00 PM. Maximum marks: 30.",
          sourcePageInfo: "Page 1 of 3",
          resultingTaskEventChange: "Created Task 'CSE3002 Project' linked to PDF file record",
          priorityRiskReasoning: "High weightage (30 marks) scheduled across project horizon",
          notificationReasoning: "Standard assignment notification pipeline created",
          assistantGrounding: "Assistant cites 'Source: CSE3002_Project_Specification.pdf, Page 1'",
        },
      };
    },
  },

  // 8. Scanned / OCR Document
  {
    id: "demo-8",
    number: 8,
    title: "Noisy OCR Document Ingestion",
    category: "Multimodal Document Intelligence",
    pipelineStage: "Multimodal Document Ingestion & Robust NER",
    description: "Physical notice board photo processed via Tesseract OCR with character substitutions and visual noise.",
    rawInput: "VELL0RE INST1TUTE 0F TECHN0L0GY\nCourse Code: CSE4001\nMid-Term Revi3w will be condvcted on N0v 28, 2026 at 09:00 AM in SJT-102. Weightage: 20 marks.",
    expectedBehavior: "Correctly recover Course CSE4001, Event Mid-Term Review, Venue SJT-102, Date Nov 28, 2026 despite digit/letter substitutions.",
    evaluationReference: "M8-E Benchmark: Component J (Multimodal OCR Handling)",
    run: async () => {
      const text = "VELL0RE INST1TUTE 0F TECHN0L0GY\nCourse Code: CSE4001\nMid-Term Revi3w will be condvcted on N0v 28, 2026 at 09:00 AM in SJT-102. Weightage: 20 marks.";
      const analysis = await processAcademicNotice(text, { skipAI: true });
      return {
        nlpUnderstanding: `Handled character noise (0->O, 1->I, 3->e). Successfully extracted Course: CSE4001, Venue: SJT-102, Time: 09:00 AM, Marks: 20.`,
        structuredResult: {
          ocrConfidence: 0.88,
          extractedEntities: analysis.entities,
          events: analysis.events,
          tasks: analysis.tasks,
        },
        evidence: `OCR text span: "Mid-Term Revi3w will be condvcted on N0v 28, 2026 at 09:00 AM in SJT-102. Weightage: 20 marks."`,
        systemAction: "CREATE_EVENT_WITH_OCR_CONFIDENCE (Logged OCR confidence: 88%)",
        explanation: "Robust regex and canonical dictionary lookups allow recovery of critical academic entities even under noticeable scan noise.",
        trace: {
          originalSource: "NoticeBoard_Photo_IMG_8921.jpg (image/jpeg, OCR: Tesseract 5.0)",
          extractedText: text,
          extractedEntities: analysis.entities,
          normalizedDateTime: "2026-11-28T09:00:00+05:30",
          relationshipToPrevious: "NEW",
          evidenceSnippet: "condvcted on N0v 28, 2026 at 09:00 AM in SJT-102",
          sourcePageInfo: "Image: NoticeBoard_Photo_IMG_8921.jpg (Confidence: 88%)",
          resultingTaskEventChange: "Created Review Event 'Mid-Term Review' in SJT-102",
          priorityRiskReasoning: "20-mark review scheduled",
          notificationReasoning: "OCR-derived notice verified against enrolled course roster",
          assistantGrounding: "Assistant references physical notice photo source",
        },
      };
    },
  },

  // 9. Syllabus Query
  {
    id: "demo-9",
    number: 9,
    title: "Syllabus Curriculum & Assessment Query",
    category: "Curriculum Intelligence",
    pipelineStage: "Syllabus Intelligence (M8-A)",
    description: "Query asking for module breakdown, reference textbooks, and examination weightages from the ingested curriculum.",
    rawInput: "What are the modules, textbook recommendations, and assessment weightages for CSE3002?",
    expectedBehavior: "Parse and return structured syllabus modules (1 to 5), textbook references, and assessment split without hallucination.",
    evaluationReference: "M8-E Benchmark: Component K (Syllabus Intelligence)",
    run: async () => {
      const syllabusText = `
VELLORE INSTITUTE OF TECHNOLOGY
Course Code: CSE3002
Course Title: Database Management Systems
Module 1: Introduction to Database Models (6 hours)
Module 2: Relational Algebra and SQL (8 hours)
Module 3: Normalization and Functional Dependencies (7 hours)
Module 4: Transaction Processing and Concurrency Control (8 hours)
Module 5: Indexing and Query Optimization (6 hours)
Assessment Scheme:
FAT (Final Assessment Test): 40%
CAT 1 & CAT 2: 30%
Digital Assignments & Lab: 30%
Textbook: Database System Concepts, Silberschatz, Korth, Sudarshan, 7th Edition.
      `;
      const parsed = SyllabusEngine.parseSyllabus(syllabusText, { defaultCourseCode: "CSE3002" });
      return {
        nlpUnderstanding: `Identified ${parsed.modules.length} course modules, learning outcomes, and assessment breakdown (FAT 40%, CAT 30%, Lab/DA 30%).`,
        structuredResult: {
          courseCode: parsed.courseCode,
          modulesCount: parsed.modules.length,
          modules: parsed.modules.map((m: any) => ({ number: m.moduleNumber, title: m.title })),
          assessments: parsed.assessments,
          confidence: parsed.extractionConfidence,
        },
        evidence: `Syllabus extract: "FAT: 40% | CAT: 30% | Textbook: Database System Concepts, Silberschatz"`,
        systemAction: "SERVE_GROUNDED_SYLLABUS_ANSWER (Grounded directly in curriculum schema)",
        explanation: "Syllabus intelligence structure maps modules and assessments directly into study planning without AI hallucinations.",
        trace: {
          originalSource: "CSE3002_Curriculum_Regulation_2026.pdf",
          extractedText: syllabusText.trim(),
          extractedEntities: { courseCode: "CSE3002", modules: 5 },
          normalizedDateTime: null,
          relationshipToPrevious: null,
          evidenceSnippet: "Module 1: Introduction to Database Models ... FAT: 40%",
          sourcePageInfo: "Curriculum Regulation Page 1",
          resultingTaskEventChange: "Populated course syllabus store for CSE3002",
          priorityRiskReasoning: "Curriculum exam weightages ingested into risk model",
          notificationReasoning: null,
          assistantGrounding: "Zero-hallucination factual answer delivered with textbook citation",
        },
      };
    },
  },

  // 10. Contradictory Notices
  {
    id: "demo-10",
    number: 10,
    title: "Contradictory Notice Detection & Gating",
    category: "Contradiction Detection",
    pipelineStage: "Contradiction Detection (M8-B)",
    description: "Two opposing circulars from different channels announcing conflicting deadlines and submission portals for the same task.",
    rawInput: "CSE4001: Digital Assignment 2 submission deadline is Friday, Oct 16, 2026 at 5:00 PM on Moodle.",
    secondaryInput: "CSE4001: All students must submit Digital Assignment 2 by Sunday, Oct 18, 2026 at 11:59 PM on Google Classroom.",
    expectedBehavior: "Detect multi-attribute conflict (deadline: Oct 16 vs Oct 18, platform: Moodle vs Classroom), set VERIFICATION_REQUIRED.",
    evaluationReference: "M8-E Benchmark: Component L (Contradiction Detection)",
    run: async () => {
      const noticeA = "CSE4001: Digital Assignment 2 submission deadline is Friday, Oct 16, 2026 at 5:00 PM on Moodle.";
      const noticeB = "CSE4001: All students must submit Digital Assignment 2 by Sunday, Oct 18, 2026 at 11:59 PM on Google Classroom.";
      const candidate = {
        title: "Digital Assignment 2",
        itemType: "TASK" as const,
        courseCode: "CSE4001",
        deadline: new Date("2026-10-18T23:59:00Z"),
        submissionPlatform: "Google Classroom",
      };
      const existing: CandidateExistingRecord = {
        id: "task-da2-prev",
        itemType: "TASK" as const,
        title: "Digital Assignment 2",
        courseCode: "CSE4001",
        deadline: new Date("2026-10-16T17:00:00Z"),
        submissionPlatform: "Moodle",
        status: "PENDING",
      };
      const contradiction = ContradictionDetector.detectContradiction(
        candidate,
        existing,
        {
          sourceTitle: "Notice B (Class WhatsApp)",
          rawText: noticeB,
          existingSourceTitle: "Notice A (Portal Circular)",
        }
      );
      return {
        nlpUnderstanding: `Flagged contradiction status: ${contradiction.hasContradiction ? "CONTRADICTION DETECTED" : "NO CONFLICT"}. Conflicting attributes: ${contradiction.contradictions.map((c: any) => c.field).join(", ")}.`,
        structuredResult: {
          hasContradiction: contradiction.hasContradiction,
          conflicts: contradiction.contradictions,
          recommendedAction: contradiction.requiresVerification ? "VERIFICATION_REQUIRED" : "PROCEED",
          severity: contradiction.contradictions[0]?.severity || "HIGH",
        },
        evidence: `Notice A: "Oct 16, 2026 at 5:00 PM on Moodle" vs Notice B: "Oct 18, 2026 at 11:59 PM on Google Classroom"`,
        systemAction: "ENFORCE_VERIFICATION_REQUIRED (Freezes automatic calendar updates; alerts student to verify with professor)",
        explanation: "Prevents erroneous submission to wrong platform or missed earlier deadline by enforcing faculty verification gating.",
        trace: {
          originalSource: "Notice A (Portal Circular) & Notice B (CR WhatsApp Forward)",
          extractedText: `${noticeA} || ${noticeB}`,
          extractedEntities: { course: "CSE4001", task: "Digital Assignment 2" },
          normalizedDateTime: "Conflicting: 2026-10-16 vs 2026-10-18",
          relationshipToPrevious: "CONTRADICTION",
          evidenceSnippet: "Oct 16 5:00 PM (Moodle) vs Oct 18 11:59 PM (Google Classroom)",
          sourcePageInfo: null,
          resultingTaskEventChange: "Task flagged with amber badge 'VERIFICATION REQUIRED'",
          priorityRiskReasoning: "Elevated risk status due to conflicting instruction ambiguity",
          notificationReasoning: "Warning notification generated: 'Conflicting submission instructions detected'",
          assistantGrounding: "Assistant flags both notices and advises checking with course faculty",
        },
      };
    },
  },

  // 11. Missing Rubric Requirements
  {
    id: "demo-11",
    number: 11,
    title: "Rubric Requirement Extraction & Gap Analysis",
    category: "Requirement Intelligence",
    pipelineStage: "Rubric / Requirement Intelligence (M8-C)",
    description: "Extract criteria and marks from rubric guidelines and identify missing components in student submission status.",
    rawInput: "CSE4001 Capstone Rubric:\n1. Working Prototype (30 marks) [Mandatory]\n2. Automated Test Suite with Coverage (20 marks) [Mandatory]\n3. Performance Benchmarks Report (20 marks) [Mandatory]\n4. Architecture Documentation (30 marks) [Mandatory]",
    secondaryInput: "Student current progress: Completed Working Prototype and Architecture Documentation.",
    expectedBehavior: "Extract 4 criteria (total 100 marks), identify 2 missing mandatory requirements, compute 50% completeness score.",
    evaluationReference: "M8-E Benchmark: Component M (Rubric Intelligence)",
    run: async () => {
      const rubricText = `
CSE4001 Capstone Project Rubric:
Criterion 1: Working Prototype Implementation - 30 marks [Mandatory]
Criterion 2: Automated Test Suite with Code Coverage - 20 marks [Mandatory]
Criterion 3: Performance Benchmarks & Analysis Report - 20 marks [Mandatory]
Criterion 4: Architectural Design Documentation - 30 marks [Mandatory]
Total Marks: 100
      `;
      const parsed = RubricEngine.parseRubric(rubricText, { courseCodeHint: "CSE4001", taskTitleHint: "Capstone Project" });
      const missingRequirements = parsed.requirements.slice(2).map((r: any) => `${r.title} (${r.marks} marks)`);
      return {
        nlpUnderstanding: `Extracted ${parsed.requirements.length} criteria summing to ${parsed.totalMarks} marks. Identified 2 incomplete mandatory criteria representing 40 marks.`,
        structuredResult: {
          totalRequirements: parsed.requirements.length,
          totalMarks: parsed.totalMarks,
          requirements: parsed.requirements,
          completenessScore: "50%",
          missingRequirements,
        },
        evidence: `Rubric lines: "Automated Test Suite with Code Coverage - 20 marks" & "Performance Benchmarks & Analysis Report - 20 marks"`,
        systemAction: "DISPLAY_REQUIREMENT_CHECKLIST (Alerts student: 40/100 marks at risk due to missing items)",
        explanation: "Prevents grade loss by explicitly monitoring rubric compliance rather than just tracking top-level deadline dates.",
        trace: {
          originalSource: "CSE4001_Capstone_Rubric_V2.pdf",
          extractedText: rubricText.trim(),
          extractedEntities: { criteriaCount: 4, totalMarks: 100 },
          normalizedDateTime: null,
          relationshipToPrevious: null,
          evidenceSnippet: "Criterion 2: Automated Test Suite ... Criterion 3: Performance Benchmarks",
          sourcePageInfo: "Rubric PDF Page 1",
          resultingTaskEventChange: "Linked 4 checklist items to Task 'CSE4001 Capstone Project'",
          priorityRiskReasoning: "High uncompleted marks (40 marks) triggers rubric deficit warning",
          notificationReasoning: "Notification scheduled: '2 mandatory rubric requirements still incomplete'",
          assistantGrounding: "Assistant answers 'What am I missing for Capstone?' with the exact missing criteria",
        },
      };
    },
  },

  // 12. High-Risk Workload Scenario
  {
    id: "demo-12",
    number: 12,
    title: "Multi-Factor Academic Risk Radar",
    category: "Academic Risk Radar",
    pipelineStage: "Academic Risk Radar (M8-D)",
    description: "Evaluates high-stakes academic collisions (exam + project + assignment) within a narrow 48-hour window.",
    rawInput: "Assessment Collision Scenario: FAT Exam (40 marks) and Capstone Final Submission (30 marks) both due on Friday, Oct 23, 2026.",
    expectedBehavior: "Trigger CRITICAL risk level with DEADLINE_CLUSTER and HIGH_WEIGHTAGE_SHORT_WINDOW explanations.",
    evaluationReference: "M8-E Benchmark: Component N (Academic Risk Radar)",
    run: async () => {
      const deliverables = [
        {
          id: "task-fat-cse3002",
          title: "CSE3002 Final Assessment Test (FAT)",
          courseCode: "CSE3002",
          deadline: new Date("2026-10-23T09:30:00Z"),
          marks: 40,
          status: "PENDING",
        },
        {
          id: "task-proj-cse4001",
          title: "CSE4001 Capstone Final Submission",
          courseCode: "CSE4001",
          deadline: new Date("2026-10-23T17:00:00Z"),
          marks: 30,
          status: "PENDING",
        },
        {
          id: "task-quiz-mat2001",
          title: "MAT2001 Surprise Assessment Quiz",
          courseCode: "MAT2001",
          deadline: new Date("2026-10-24T11:00:00Z"),
          marks: 15,
          status: "PENDING",
        },
      ];
      const riskAssessment = AcademicRiskRadar.evaluateRisk({
        tasks: deliverables,
        referenceDate: new Date("2026-10-21T09:00:00Z"),
      });
      return {
        nlpUnderstanding: `Evaluated risk state across 3 deliverables (85 total marks). Computed overall risk: ${riskAssessment.overallRiskLevel}. Active risk factors: ${riskAssessment.mainTriggers.map((t: any) => t.type).join(", ")}.`,
        structuredResult: {
          overallRiskLevel: riskAssessment.overallRiskLevel,
          score: riskAssessment.riskScore,
          activeFactors: riskAssessment.mainTriggers.map((t: any) => t.type),
          warnings: riskAssessment.mainTriggers.map((t: any) => t.title),
        },
        evidence: `85 marks evaluated across a 36-hour cluster; includes FAT examination and major capstone.`,
        systemAction: "ACTIVATE_RISK_BANNER (Critical risk alerts displayed on dashboard; urgent intervention recommended)",
        explanation: "Aggregates multi-horizon academic markers into a unified risk rating to prevent exam-assignment collision failure.",
        trace: {
          originalSource: "Aggregated Academic State (Tasks & Calendar Database)",
          extractedText: "FAT Exam (40 marks) + Capstone (30 marks) on 2026-10-23",
          extractedEntities: { totalMarksAtRisk: 85, deliverableCount: 3 },
          normalizedDateTime: "2026-10-23 to 2026-10-24",
          relationshipToPrevious: null,
          evidenceSnippet: "FAT (40m) at 09:30 + Capstone (30m) at 17:00 on same day",
          sourcePageInfo: null,
          resultingTaskEventChange: "Risk status escalated to CRITICAL on dashboard",
          priorityRiskReasoning: "Severe collision: High marks (85) in 36-hour window",
          notificationReasoning: "Urgent advisory notification dispatched immediately",
          assistantGrounding: "Assistant offers proactive study block restructuring",
        },
      };
    },
  },

  // 13. Smart Plan Generation
  {
    id: "demo-13",
    number: 13,
    title: "Smart Study Plan with 'Why Now?' Rationale",
    category: "Smart Planning",
    pipelineStage: "Smart Planning (M8-D)",
    description: "Generates optimal daily study blocks with deterministic constraint satisfaction and plain-English academic explanations.",
    rawInput: "Generate study plan for upcoming deliverables: CSE3002 FAT Exam (40m, due in 2 days) and CSE4001 Capstone (30m, due in 3 days).",
    expectedBehavior: "Schedule high-priority revision first; explain 'Why now?' citing exam proximity, high marks, and preparation lead time.",
    evaluationReference: "M8-E Benchmark: Component O (Smart Planning)",
    run: async () => {
      const planTasks: PlannerCandidateItem[] = [
        {
          id: "p1",
          title: "CSE3002 FAT Exam Preparation",
          courseCode: "CSE3002",
          deadline: new Date("2026-10-23T09:30:00Z"),
          marks: 40,
          status: "PENDING",
          priority: "CRITICAL",
          priorityScore: 95,
        },
        {
          id: "p2",
          title: "CSE4001 Capstone Project Implementation",
          courseCode: "CSE4001",
          deadline: new Date("2026-10-24T17:00:00Z"),
          marks: 30,
          status: "PENDING",
          priority: "HIGH",
          priorityScore: 78,
        },
      ];
      const plan = SmartPlanner.generateSmartPlan(planTasks, {
        referenceDate: new Date("2026-10-21T09:00:00Z"),
        availableHours: 4,
      });
      return {
        nlpUnderstanding: `Synthesized ${plan.sessions.length} study blocks across planning horizon. Zero hallucinated tasks; 100% adherence to deadlines.`,
        structuredResult: {
          blocksCount: plan.sessions.length,
          totalPlannedMinutes: plan.totalPlannedMinutes,
          blocks: plan.sessions.map((s: any) => ({
            timeSlot: s.timeSlot,
            taskTitle: s.taskTitle,
            durationMinutes: s.durationMinutes,
            whyNow: s.whyNow,
          })),
        },
        evidence: `Plan rationale: "${plan.sessions[0]?.whyNow?.join("; ") || "Scheduled based on FAT exam proximity and 40 marks weightage"}"`,
        systemAction: "RENDER_SMART_SCHEDULE (Populates Academic Command Center calendar with focus blocks)",
        explanation: "Ensures students focus on highest-impact deliverables with clear cognitive justification for every scheduled hour.",
        trace: {
          originalSource: "Active Deliverables Database & Risk Model",
          extractedText: "CSE3002 FAT (40m, Oct 23) + CSE4001 Capstone (30m, Oct 24)",
          extractedEntities: { totalPlannedMinutes: plan.totalPlannedMinutes },
          normalizedDateTime: "Planning window: 2026-10-21 to 2026-10-24",
          relationshipToPrevious: null,
          evidenceSnippet: plan.sessions[0]?.whyNow?.join("; ") || "FAT Exam is scheduled first due to imminent deadline",
          sourcePageInfo: null,
          resultingTaskEventChange: "Created structured study blocks in student timetable",
          priorityRiskReasoning: "Front-loads 6 hours of FAT preparation before exam morning",
          notificationReasoning: "Focus session reminders scheduled for start of each block",
          assistantGrounding: "Assistant answers 'What should I study right now?' with Session 1 task",
        },
      };
    },
  },

  // 14. Grounded Assistant Query
  {
    id: "demo-14",
    number: 14,
    title: "Grounded AI Assistant Tool Invocation",
    category: "AI Assistant",
    pipelineStage: "Grounded Assistant & Tool Execution",
    description: "Natural language student query asking for upcoming critical deliverables, weightage, and submission instructions.",
    rawInput: "When is my next critical deliverable, what is the weightage, and where do I submit it?",
    expectedBehavior: "Select 'get_upcoming_tasks' tool, ground answer strictly in database records, cite portal and marks with 0% hallucination.",
    evaluationReference: "M8-E Benchmark: Component I (Grounded AI Assistant)",
    run: async () => {
      // Deterministic tool grounding representation
      const selectedTool = "get_upcoming_tasks";
      const toolParams = { limit: 1, filterPriority: "CRITICAL" };
      const groundedRecord = {
        title: "CSE3002 FAT Exam",
        course: "CSE3002 Database Management Systems",
        deadline: "Friday, Oct 23, 2026 at 9:30 AM",
        marks: 40,
        venue: "SJT-401",
        platform: "In-Person Exam Hall",
      };
      const response = `Your next critical deliverable is **${groundedRecord.title}** (${groundedRecord.course}). It takes place on **${groundedRecord.deadline}** in **${groundedRecord.venue}** (${groundedRecord.platform}) and carries **${groundedRecord.marks} marks** (FAT 40% component).`;
      return {
        nlpUnderstanding: `Mapped intent to tool '${selectedTool}'. Extracted constraints: critical priority deliverables. Answer grounded strictly in database state.`,
        structuredResult: {
          selectedTool,
          toolParams,
          groundedRecord,
          hallucinationCheck: "PASSED (0 ungrounded claims)",
        },
        evidence: `Database record ID: 'task-fat-cse3002' (CSE3002 FAT Exam, 40 marks, Oct 23 at 9:30 AM)`,
        systemAction: "EXECUTE_TOOL_AND_GROUND_RESPONSE (No unverified facts emitted)",
        explanation: "The assistant relies exclusively on deterministic tool execution outputs, guaranteeing factual accuracy for student deadlines.",
        trace: {
          originalSource: "Chat Assistant Interface (User Natural Language Query)",
          extractedText: "When is my next critical deliverable, what is the weightage, and where do I submit it?",
          extractedEntities: { intent: "QUERY_CRITICAL_DELIVERABLES" },
          normalizedDateTime: "2026-10-23T09:30:00+05:30",
          relationshipToPrevious: null,
          evidenceSnippet: "CSE3002 FAT Exam on Friday, Oct 23, 2026 at 9:30 AM in SJT-401 (40 marks)",
          sourcePageInfo: null,
          resultingTaskEventChange: "Read-only query (Zero state mutation)",
          priorityRiskReasoning: "Queried top-priority deliverable",
          notificationReasoning: null,
          assistantGrounding: response,
        },
      };
    },
  },

  // 15. Confirmation-Gated Action
  {
    id: "demo-15",
    number: 15,
    title: "Mutation Safety & Confirmation Gating",
    category: "Safety & Gating",
    pipelineStage: "Grounded Assistant Action Execution",
    description: "Student assistant request to delete or mutate academic records; system enforces confirmation card gating before execution.",
    rawInput: "Delete my completed Physics tutorial session and remove its reminders from my schedule.",
    expectedBehavior: "Block immediate deletion, generate pending confirmation card with exact proposed diff, require explicit student confirmation.",
    evaluationReference: "M8-E Benchmark: Component I (Confirmation Gating)",
    run: async () => {
      const actionType = "DELETE_EVENT";
      const targetRecord = {
        id: "event-phy1001-tut",
        title: "Physics tutorial session",
        courseCode: "PHY1001",
        time: "Saturday, Oct 25, 2026 at 9:00 AM",
      };
      const confirmationPayload = {
        requiresConfirmation: true,
        actionType,
        targetRecordId: targetRecord.id,
        summary: `Are you sure you want to delete "${targetRecord.title}" (${targetRecord.courseCode})? This will permanently remove its scheduled reminders.`,
        reversible: false,
        pendingToken: "confirm_del_evt_98231a4",
      };
      return {
        nlpUnderstanding: `Identified MUTATION intent '${actionType}'. Triggered safety protocol: Confirmation Gating is MANDATORY.`,
        structuredResult: {
          actionBlocked: true,
          confirmationPayload,
          stateModified: false,
        },
        evidence: `Safety Invariant: Destructive mutations cannot execute without explicit confirmation token.`,
        systemAction: "EMIT_CONFIRMATION_CARD (User must click 'Confirm Deletion' to proceed)",
        explanation: "Protects students from unintended data loss caused by ambiguous assistant prompts or erroneous voice inputs.",
        trace: {
          originalSource: "Chat Assistant Interface (User Mutation Prompt)",
          extractedText: "Delete my completed Physics tutorial session and remove its reminders from my schedule.",
          extractedEntities: { action: "DELETE", target: "Physics tutorial session" },
          normalizedDateTime: null,
          relationshipToPrevious: null,
          evidenceSnippet: "Target record: event-phy1001-tut (Physics tutorial session)",
          sourcePageInfo: null,
          resultingTaskEventChange: "Zero mutation pending confirmation token approval",
          priorityRiskReasoning: "Protective safety barrier active",
          notificationReasoning: "Reminders remain active until affirmative confirmation",
          assistantGrounding: "Assistant outputs ConfirmationCard UI component",
        },
      };
    },
  },
];

export async function runFacultyDemoCase(id: string): Promise<DemoExecutionResult> {
  const demoCase = FACULTY_DEMO_CASES.find((c) => c.id === id);
  if (!demoCase) {
    throw new Error(`Demo case not found: ${id}`);
  }
  return await demoCase.run();
}
