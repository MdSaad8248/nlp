import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { extractAcademicNotice, extractAcademicNoticeWithModel } from "@/lib/nlp/extractor";
import { checkAcademicChanges, CandidateExistingRecord, ExistingKnowledgeState } from "@/lib/nlp/change-intelligence";
import { calculateAcademicPriority } from "@/lib/intelligence/priority-engine";
import { AcademicRiskRadar } from "@/lib/intelligence/academic-risk-radar";
import { SmartPlanner } from "@/lib/intelligence/smart-planner";
import { RubricStore } from "@/lib/intelligence/rubric-store";

/**
 * POST /api/intelligence/studio-analyze
 *
 * Technical heart of the Academic Intelligence Studio.
 * Executes the complete real multi-stage pipeline:
 * 1. Raw Input
 * 2. Document Processing (OCR/Text parsing)
 * 3. Classification
 * 4. Entity Extraction (NER + Resolution)
 * 5. Temporal Reasoning (Old/New Transitions)
 * 6. Task / Event Extraction
 * 7. Change Intelligence (M3)
 * 8. Academic State Integration
 * 9. Priority Intelligence (M4 Additive Scoring)
 * 10. Academic Risk Radar (M8-D)
 * 11. Smart Planning (M8-D)
 * 12. Actions Taken / Trace
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = body.text;

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { success: false, error: "Academic text is required for Studio analysis." },
        { status: 400 }
      );
    }

    const trimmed = rawText.trim();
    const startTime = Date.now();

    // 1. Run Core NLP Extraction backed by trained classifier
    const analysis = await extractAcademicNoticeWithModel(trimmed);

    // 2. Fetch existing academic records for M3 Change Intelligence
    const [dbTasks, dbEvents, dbExams, dbSources] = await Promise.all([
      prisma.task.findMany({
        where: { status: { not: "COMPLETED" } },
        include: { course: true },
        take: 50,
      }),
      prisma.event.findMany({
        include: { course: true },
        take: 50,
      }),
      prisma.exam.findMany({
        include: { course: true },
        take: 30,
      }),
      prisma.academicSource.findMany({
        select: { id: true, title: true, rawText: true },
        take: 30,
      }),
    ]);

    const candidateTasks: CandidateExistingRecord[] = dbTasks.map((t) => ({
      id: t.id,
      itemType: "TASK",
      title: t.title,
      category: t.category,
      courseCode: t.course?.code || null,
      courseTitle: t.course?.title || null,
      deadline: t.deadline,
      normalizedDeadline: t.normalizedDeadline,
      submissionPlatform: t.submissionPlatform,
      marks: t.weightage,
      weightage: t.weightage,
      status: t.status,
      isRescheduled: t.isRescheduled,
    }));

    const candidateEvents: CandidateExistingRecord[] = dbEvents.map((e) => ({
      id: e.id,
      itemType: "EVENT",
      title: e.title,
      category: e.eventType,
      courseCode: e.course?.code || null,
      courseTitle: e.course?.title || null,
      startTime: e.startTime,
      endTime: e.endTime,
      venue: e.venue,
      isRescheduled: e.isRescheduled,
    }));

    const candidateExams: CandidateExistingRecord[] = dbExams.map((ex) => ({
      id: ex.id,
      itemType: "EXAM",
      title: ex.title,
      courseCode: ex.course?.code || null,
      courseTitle: ex.course?.title || null,
      startTime: ex.examDate,
      venue: ex.venue,
      marks: ex.weightage,
      weightage: ex.weightage,
    }));

    const existingState: ExistingKnowledgeState = {
      tasks: candidateTasks,
      events: candidateEvents,
      exams: candidateExams,
      notices: dbSources,
    };

    // 3. Run Change Intelligence (Milestone 3)
    const changeIntelligence = checkAcademicChanges(analysis, existingState);

    // 4. Downstream Academic Reasoning: Priority Engine (M4)
    const primaryTask = analysis.tasks[0];
    const priorityResult = calculateAcademicPriority({
      title: primaryTask?.title || analysis.category,
      deadline: primaryTask?.deadline || analysis.newDateTime || analysis.temporalSpans.find((s) => s.type === "date")?.iso || null,
      category: primaryTask?.category || analysis.category,
      marks: primaryTask?.marks || (analysis.keyEntities.marks[0] ? parseInt(analysis.keyEntities.marks[0], 10) : 20),
      hasPenaltyClause: !!analysis.rawText.match(/late\s+submission|penalty|deduct|strict/i),
      penaltyClauseText: "Strict evaluation & deadline policy detected in announcement",
      hasUrgentKeywords: analysis.keyEntities.keywords.length > 0 || /rescheduled|shifted|urgent/i.test(trimmed),
    });

    // 5. Downstream Academic Reasoning: Risk Radar (M8-D)
    const riskReport = AcademicRiskRadar.evaluateRisk({
      tasks: candidateTasks.map((t) => ({
        id: t.id,
        title: t.title,
        courseCode: t.courseCode || null,
        category: t.category || "ASSIGNMENT",
        deadline: t.deadline,
        status: t.status || "PENDING",
        marks: t.marks || null,
        priority: "HIGH",
      })),
      events: candidateEvents.map((e) => ({
        id: e.id,
        title: e.title,
        eventType: e.category || "LECTURE",
        startTime: e.startTime ? new Date(e.startTime) : new Date(),
      })),
      exams: candidateExams.map((ex) => ({
        id: ex.id,
        title: ex.title,
        courseCode: ex.courseCode || "GEN",
        examDate: ex.startTime ? new Date(ex.startTime) : new Date(),
        weightage: ex.marks || null,
      })),
      rubrics: RubricStore.getAllRubrics(),
    });

    // 6. Downstream Academic Reasoning: Smart Planner (M8-D)
    const smartPlan = SmartPlanner.generateSmartPlan(
      [
        ...(primaryTask
          ? [
              {
                id: "candidate-task-studio",
                title: primaryTask.title,
                courseCode: primaryTask.courseCode || "CSE4001",
                category: primaryTask.category,
                deadline: primaryTask.deadline,
                status: "PENDING",
                marks: primaryTask.marks || 20,
                priority: priorityResult.level,
                estimatedHours: 4,
              },
            ]
          : []),
        ...candidateTasks.map((t) => ({
          id: t.id,
          title: t.title,
          courseCode: t.courseCode || null,
          category: t.category || "ASSIGNMENT",
          deadline: t.deadline,
          status: t.status || "PENDING",
          marks: t.marks || null,
          priority: "HIGH",
          estimatedHours: 4,
        })),
      ],
      { rubrics: RubricStore.getAllRubrics() }
    );

    const totalDurationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      analysis,
      changeIntelligence,
      priorityResult,
      riskReport,
      smartPlan,
      executionStats: {
        totalDurationMs,
        nlpExtractionMs: analysis.processingTimeMs,
        pipelineStagesCount: 11,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/intelligence/studio-analyze] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to analyze academic notice." },
      { status: 500 }
    );
  }
}
