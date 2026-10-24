import { prisma } from "@/lib/db/prisma";
import { processAcademicNotice, NLPAnalysisResult } from "@/lib/nlp";
import { ensureDefaultUserAndCourses } from "./user.service";

export interface NoticeProcessingOutput {
  success: boolean;
  wasDuplicate: boolean;
  sourceId?: string;
  createdTaskIds: string[];
  updatedTaskIds: string[];
  createdEventIds: string[];
  analysis: NLPAnalysisResult;
  message: string;
}

export async function analyzeNotice(rawText: string): Promise<NLPAnalysisResult> {
  // Query existing database state to supply to NLP pipeline for duplicate and change detection
  const [existingTasks, existingEvents, existingSources] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: "COMPLETED" } },
      include: { course: true },
      take: 50,
    }),
    prisma.event.findMany({
      include: { course: true },
      take: 50,
    }),
    prisma.academicSource.findMany({
      select: { id: true, title: true, rawText: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return processAcademicNotice(rawText, {
    existingTasks,
    existingEvents,
    existingNotices: existingSources,
  });
}

export async function processAndPersistNotice(
  rawText: string,
  options: { force?: boolean } = {}
): Promise<NoticeProcessingOutput> {
  // 1. Run NLP pipeline with current state
  const analysis = await analyzeNotice(rawText);

  // 2. Check for duplicate detection
  if (analysis.duplicate?.isDuplicate && !options.force) {
    return {
      success: true,
      wasDuplicate: true,
      sourceId: analysis.duplicate.matchedSourceId,
      createdTaskIds: [],
      updatedTaskIds: [],
      createdEventIds: [],
      analysis,
      message: `Notice identified as duplicate (${Math.round((analysis.duplicate.similarityScore || 0) * 100)}% match). Task re-creation prevented.`,
    };
  }

  // 3. Ensure user and default courses exist
  const { userId, courses } = await ensureDefaultUserAndCourses();

  // Helper to match course ID
  const resolveCourseId = (courseIdentifier: string | null): string | null => {
    if (!courseIdentifier) return null;
    const key = courseIdentifier.toLowerCase();
    for (const [nameOrCode, id] of Object.entries(courses)) {
      if (nameOrCode.includes(key) || key.includes(nameOrCode)) {
        return id;
      }
    }
    return null;
  };

  // 4. Create AcademicSource record in SQLite
  const primaryTask = analysis.tasks[0];
  const inferredTitle = primaryTask
    ? `${primaryTask.title} Announcement`
    : (analysis.summary.slice(0, 50) || "Academic Announcement");

  const source = await prisma.academicSource.create({
    data: {
      title: inferredTitle,
      rawText,
      channel: "ANNOUNCEMENT",
      sourceMetadata: JSON.stringify({
        documentType: analysis.documentType,
        engine: analysis.engineUsed,
        processingTimeMs: analysis.processingTimeMs,
      }),
    },
  });

  const createdTaskIds: string[] = [];
  const updatedTaskIds: string[] = [];
  const createdEventIds: string[] = [];

  // 5. Handle Changes / Updates to Existing Tasks
  const taskChanges = analysis.changes.filter((c) => c.targetType === "TASK" && c.targetId);
  const updatedTaskIdSet = new Set<string>();

  for (const change of taskChanges) {
    if (!change.targetId) continue;

    const matchedTask = analysis.tasks.find((t) => t.deadline);
    const newDeadlineIso = matchedTask?.deadline ? new Date(matchedTask.deadline) : undefined;
    const newNormalizedDeadline = matchedTask?.normalizedDeadline || undefined;
    const newPriority = matchedTask?.priority;

    await prisma.task.update({
      where: { id: change.targetId },
      data: {
        deadline: newDeadlineIso,
        normalizedDeadline: newNormalizedDeadline,
        priority: newPriority,
        updatedAt: new Date(),
      },
    });

    // Record source evidence for the update
    await prisma.sourceEvidence.create({
      data: {
        sourceId: source.id,
        taskId: change.targetId,
        extractedSnippet: change.evidenceSnippet || rawText.slice(0, 150),
        confidence: 0.95,
      },
    });

    // Record change note in task progress
    await prisma.taskProgress.create({
      data: {
        taskId: change.targetId,
        percentage: 0,
        note: `Change Detected: ${change.reason} (Old: ${change.oldValue} -> New: ${change.newValue})`,
      },
    });

    updatedTaskIds.push(change.targetId);
    updatedTaskIdSet.add(change.targetId);
  }

  // 6. Create New Tasks (skip if this task was already updated as an existing task)
  for (const task of analysis.tasks) {
    // If a change was already applied for this task, don't create duplicate
    if (updatedTaskIds.length > 0 && taskChanges.some((c) => c.targetTitle.toLowerCase().includes(task.title.toLowerCase()) || task.title.toLowerCase().includes(c.targetTitle.toLowerCase()))) {
      continue;
    }

    const courseId = resolveCourseId(task.course);
    const deadlineDate = task.deadline ? new Date(task.deadline) : null;

    const createdTask = await prisma.task.create({
      data: {
        userId,
        courseId,
        title: task.title,
        description: task.penaltyClause
          ? `${task.penaltyClause}. Submission required via ${task.submissionPlatform || "specified portal"}.`
          : `Academic task extracted from announcement.`,
        category: task.category,
        deadline: deadlineDate,
        normalizedDeadline: task.normalizedDeadline,
        priority: task.priority,
        status: "PENDING",
        isAiGenerated: true,
        confidence: task.confidence,
      },
    });

    // Link source evidence
    await prisma.sourceEvidence.create({
      data: {
        sourceId: source.id,
        taskId: createdTask.id,
        extractedSnippet: task.extractedSnippet || rawText.slice(0, 150),
        confidence: task.confidence,
      },
    });

    createdTaskIds.push(createdTask.id);
  }

  // 7. Create New Events
  for (const event of analysis.events) {
    const courseId = resolveCourseId(event.course);
    const startDate = event.startTime ? new Date(event.startTime) : new Date();
    const endDate = event.endTime ? new Date(event.endTime) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const createdEvent = await prisma.event.create({
      data: {
        userId,
        courseId,
        title: event.title,
        eventType: event.eventType,
        venue: event.venue,
        startTime: startDate,
        endTime: endDate,
        isRescheduled: event.isRescheduled,
      },
    });

    await prisma.sourceEvidence.create({
      data: {
        sourceId: source.id,
        eventId: createdEvent.id,
        extractedSnippet: event.extractedSnippet || rawText.slice(0, 150),
        confidence: event.confidence,
      },
    });

    createdEventIds.push(createdEvent.id);
  }

  const message = updatedTaskIds.length > 0
    ? `Successfully processed notice: updated ${updatedTaskIds.length} existing task(s) with new schedule information.`
    : `Successfully processed notice: created ${createdTaskIds.length} task(s) and ${createdEventIds.length} event(s).`;

  return {
    success: true,
    wasDuplicate: false,
    sourceId: source.id,
    createdTaskIds,
    updatedTaskIds,
    createdEventIds,
    analysis,
    message,
  };
}
