import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { extractAcademicNotice } from "@/lib/nlp/extractor";
import { checkAcademicChanges, CandidateExistingRecord, ExistingKnowledgeState } from "@/lib/nlp/change-intelligence";
import { NLPAnalysisResult } from "@/lib/nlp/schemas";

/**
 * POST /api/ingest/change-check
 *
 * Input:
 * - analysis?: NLPAnalysisResult (pre-extracted from /api/ingest)
 * - text?: string (raw notice text to extract if analysis not provided)
 *
 * Output:
 * - relationship: "NEW" | "DUPLICATE" | "UPDATED" | "RESCHEDULED" | "CANCELLED"
 * - matchedRecord: Existing Task / Event / Exam details
 * - matchingReasons: string[] (Explainable checkmarks)
 * - changedFields: ChangedFieldDiff[] (Previous → New with source snippets)
 * - proposedAction: "CREATE_NEW" | "UPDATE_EXISTING" | "RESCHEDULE_EXISTING" | "CANCEL_EXISTING" | "MARK_DUPLICATE" | "IGNORE"
 * - similarityScore: number
 * - itemRelationships: ItemRelationship[]
 * - summary: string
 *
 * CRITICAL RULE:
 * This endpoint executes change intelligence analysis ONLY.
 * It DOES NOT modify any database records.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let analysis: NLPAnalysisResult = body?.analysis;

    if (!analysis) {
      const text = body?.text;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Either pre-extracted 'analysis' or notice 'text' is required for change check.",
          },
          { status: 400 }
        );
      }
      analysis = extractAcademicNotice(text.trim());
    }

    // 1. Fetch current active records from database
    const [dbTasks, dbEvents, dbExams, dbSources] = await Promise.all([
      prisma.task.findMany({
        where: { status: { not: "COMPLETED" } },
        include: { course: true },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
      prisma.event.findMany({
        include: { course: true },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
      prisma.exam.findMany({
        include: { course: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
      prisma.academicSource.findMany({
        select: { id: true, title: true, rawText: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // 2. Map database records to CandidateExistingRecord format
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

    // 3. Execute Milestone 3 Academic Change Intelligence
    const changeResult = checkAcademicChanges(analysis, existingState);

    return NextResponse.json({
      success: true,
      ...changeResult,
      analyzedDeliverableCounts: {
        tasks: analysis.tasks.length,
        events: analysis.events.length,
        exams: (analysis.exams || []).length,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/ingest/change-check] Error executing change intelligence:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred during change intelligence check.",
      },
      { status: 500 }
    );
  }
}
