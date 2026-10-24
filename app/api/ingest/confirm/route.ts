import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureDefaultUserAndCourses } from "@/lib/services/user.service";
import { getAuthenticatedUser } from "@/lib/auth/session-service";

/**
 * POST /api/ingest/confirm
 *
 * Saves confirmed and user-edited academic information into the database.
 * Supports Milestone 3 Relationship Actions:
 * - "CREATE_NEW" (default): Creates new deliverable records in Task/Event/Exam.
 * - "UPDATE_EXISTING": Updates specified fields on existing record, preserves source history.
 * - "RESCHEDULE_EXISTING": Reschedules existing event/task, preserves original evidence.
 * - "CANCEL_EXISTING": Marks existing task/event as cancelled, links source evidence.
 * - "MARK_DUPLICATE": Preserves notice source & audit log without creating duplicate records.
 * - "IGNORE": No-op without database modifications.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      rawText,
      title,
      channel = "MANUAL_PASTE",
      category,
      tasks = [],
      events = [],
      exams = [],
      evidences = [],
      action = "CREATE_NEW",
      relationship = "NEW",
      targetId,
      targetType = "TASK",
      changedFields = [],
      matchingReasons = [],
      // M7-E: Document source context (populated when source is a PDF/image upload)
      // Contains: filename, mimeType, documentFileType, pages, primaryExtractionMethod,
      // averageOcrConfidence (if OCR), uploadedAt
      documentSource = null,
    } = body;

    // Handle IGNORE action immediately
    if (action === "IGNORE") {
      return NextResponse.json({
        success: true,
        message: "Notice ignored as requested. No academic records created or modified.",
        data: { actionTaken: "IGNORED" },
      });
    }

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Cannot confirm notice without raw source text." },
        { status: 400 }
      );
    }

    // 1. Ensure user and core courses exist
    const defaultData = await ensureDefaultUserAndCourses();
    const authUser = await getAuthenticatedUser(req);
    const userId = authUser ? authUser.id : defaultData.userId;
    const courses = defaultData.courses;

    // Helper to resolve or dynamically create a course
    const resolveCourseId = async (courseCode?: string | null, courseName?: string | null): Promise<string | null> => {
      if (courseCode) {
        const lowerCode = courseCode.toLowerCase().trim();
        if (courses[lowerCode]) return courses[lowerCode];

        const existing = await prisma.course.findUnique({ where: { code: courseCode.toUpperCase().trim() } });
        if (existing) {
          courses[lowerCode] = existing.id;
          return existing.id;
        }

        // Auto-create newly referenced course
        const newCourse = await prisma.course.create({
          data: {
            code: courseCode.toUpperCase().trim(),
            title: courseName || `${courseCode.toUpperCase()} Course`,
            credits: 3,
            color: "#6366f1",
          },
        });
        await prisma.courseEnrollment.upsert({
          where: { userId_courseId: { userId, courseId: newCourse.id } },
          update: {},
          create: { userId, courseId: newCourse.id },
        });
        courses[lowerCode] = newCourse.id;
        return newCourse.id;
      }

      if (courseName) {
        const lowerName = courseName.toLowerCase().trim();
        if (courses[lowerName]) return courses[lowerName];
      }

      return null;
    };

    // ACTION A: MARK_DUPLICATE
    if (action === "MARK_DUPLICATE") {
      const defaultTitle = title || "Academic Announcement (Duplicate Reminder)";
      const source = await prisma.academicSource.create({
        data: {
          title: defaultTitle,
          rawText: rawText.trim(),
          channel: channel || "MANUAL_PASTE",
          sourceMetadata: JSON.stringify({
            category: category || "GENERAL_ANNOUNCEMENT",
            confirmedAt: new Date().toISOString(),
            isDuplicate: true,
            targetId: targetId || null,
          }),
        },
      });

      if (targetId) {
        // Link evidence snippet to existing record
        await prisma.sourceEvidence.create({
          data: {
            sourceId: source.id,
            taskId: targetType === "TASK" ? targetId : null,
            eventId: targetType === "EVENT" ? targetId : null,
            fieldName: "duplicate_reminder",
            extractedSnippet: rawText.slice(0, 200),
            confidence: 1.0,
          },
        });

        // Record Audit Trail
        await prisma.academicAuditLog.create({
          data: {
            targetType,
            targetId,
            sourceId: source.id,
            relationship: "DUPLICATE",
            changedFields: JSON.stringify(changedFields),
            reasons: JSON.stringify(matchingReasons),
            actionTaken: "DUPLICATE_IGNORED",
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Notice verified as duplicate. Re-creation prevented and source history recorded.",
        data: {
          sourceId: source.id,
          actionTaken: "DUPLICATE_IGNORED",
          duplicatePrevented: true,
        },
      });
    }

    // ACTION B: CANCEL_EXISTING
    if (action === "CANCEL_EXISTING" && targetId) {
      const defaultTitle = title || "Academic Cancellation Announcement";
      const source = await prisma.academicSource.create({
        data: {
          title: defaultTitle,
          rawText: rawText.trim(),
          channel: channel || "MANUAL_PASTE",
          sourceMetadata: JSON.stringify({
            category: "CLASS_CANCELLATION",
            confirmedAt: new Date().toISOString(),
            cancelledTargetId: targetId,
          }),
        },
      });

      if (targetType === "TASK") {
        await prisma.task.update({
          where: { id: targetId },
          data: {
            status: "CANCELLED",
            updatedAt: new Date(),
          },
        });
        await prisma.sourceEvidence.create({
          data: {
            sourceId: source.id,
            taskId: targetId,
            fieldName: "status",
            extractedSnippet: rawText.slice(0, 200),
            confidence: 1.0,
          },
        });
        await prisma.taskProgress.create({
          data: {
            taskId: targetId,
            percentage: 0,
            note: `Status Updated: CANCELLED (per notice: "${source.title}")`,
          },
        });
      } else if (targetType === "EVENT") {
        const existingEvent = await prisma.event.findUnique({ where: { id: targetId } });
        const updatedTitle = existingEvent?.title.startsWith("[CANCELLED]")
          ? existingEvent.title
          : `[CANCELLED] ${existingEvent?.title || "Event"}`;

        await prisma.event.update({
          where: { id: targetId },
          data: {
            title: updatedTitle,
            updatedAt: new Date(),
          },
        });
        await prisma.sourceEvidence.create({
          data: {
            sourceId: source.id,
            eventId: targetId,
            fieldName: "status",
            extractedSnippet: rawText.slice(0, 200),
            confidence: 1.0,
          },
        });
      }

      // Record Audit Trail
      await prisma.academicAuditLog.create({
        data: {
          targetType,
          targetId,
          sourceId: source.id,
          relationship: "CANCELLED",
          changedFields: JSON.stringify(changedFields),
          reasons: JSON.stringify(matchingReasons),
          actionTaken: "CANCELLED",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Successfully applied cancellation to existing academic item.",
        data: {
          sourceId: source.id,
          targetId,
          actionTaken: "CANCELLED",
        },
      });
    }

    // ACTION C: UPDATE_EXISTING or RESCHEDULE_EXISTING
    if ((action === "UPDATE_EXISTING" || action === "RESCHEDULE_EXISTING") && targetId) {
      const defaultTitle = title || `${category ? category.replace(/_/g, " ") : "Academic"} Change Announcement`;
      const source = await prisma.academicSource.create({
        data: {
          title: defaultTitle,
          rawText: rawText.trim(),
          channel: channel || "MANUAL_PASTE",
          sourceMetadata: JSON.stringify({
            category: category || "GENERAL_ANNOUNCEMENT",
            confirmedAt: new Date().toISOString(),
            updatedTargetId: targetId,
            action,
          }),
        },
      });

      if (targetType === "TASK") {
        const incomingTask = tasks[0] || {};
        const updateData: any = { updatedAt: new Date() };

        if (incomingTask.deadline) {
          updateData.deadline = new Date(incomingTask.deadline);
          updateData.normalizedDeadline = incomingTask.normalizedDeadline || null;
        }
        if (incomingTask.submissionPlatform) {
          updateData.submissionPlatform = incomingTask.submissionPlatform;
        }
        if (incomingTask.marks !== undefined && incomingTask.marks !== null) {
          updateData.weightage = incomingTask.marks;
        } else if (incomingTask.weightage !== undefined && incomingTask.weightage !== null) {
          updateData.weightage = incomingTask.weightage;
        }
        if (action === "RESCHEDULE_EXISTING" || incomingTask.isRescheduled) {
          updateData.isRescheduled = true;
        }

        await prisma.task.update({
          where: { id: targetId },
          data: updateData,
        });

        // Link Evidence
        await prisma.sourceEvidence.create({
          data: {
            sourceId: source.id,
            taskId: targetId,
            fieldName: action === "RESCHEDULE_EXISTING" ? "reschedule" : "update",
            extractedSnippet: incomingTask.extractedSnippet || rawText.slice(0, 200),
            confidence: 0.95,
          },
        });

        // Add task progress record
        const diffSummary = Array.isArray(changedFields) && changedFields.length > 0
          ? changedFields.map((f: any) => `${f.field}: ${f.oldValue} → ${f.newValue}`).join(", ")
          : `${action} applied`;

        await prisma.taskProgress.create({
          data: {
            taskId: targetId,
            percentage: 0,
            note: `Academic Change Intelligence: ${diffSummary}`,
          },
        });
      } else if (targetType === "EVENT") {
        const incomingEvent = events[0] || {};
        const updateData: any = { updatedAt: new Date() };

        if (incomingEvent.startTime) {
          updateData.startTime = new Date(incomingEvent.startTime);
          updateData.endTime = incomingEvent.endTime
            ? new Date(incomingEvent.endTime)
            : new Date(new Date(incomingEvent.startTime).getTime() + 3600000);
        }
        if (incomingEvent.venue) {
          updateData.venue = incomingEvent.venue;
        }
        if (action === "RESCHEDULE_EXISTING" || incomingEvent.isRescheduled) {
          updateData.isRescheduled = true;
        }

        await prisma.event.update({
          where: { id: targetId },
          data: updateData,
        });

        await prisma.sourceEvidence.create({
          data: {
            sourceId: source.id,
            eventId: targetId,
            fieldName: action === "RESCHEDULE_EXISTING" ? "reschedule" : "venue",
            extractedSnippet: incomingEvent.extractedSnippet || rawText.slice(0, 200),
            confidence: 0.95,
          },
        });
      }

      // Record Audit Trail
      await prisma.academicAuditLog.create({
        data: {
          targetType,
          targetId,
          sourceId: source.id,
          relationship: relationship || (action === "RESCHEDULE_EXISTING" ? "RESCHEDULED" : "UPDATED"),
          changedFields: JSON.stringify(changedFields),
          reasons: JSON.stringify(matchingReasons),
          actionTaken: action === "RESCHEDULE_EXISTING" ? "RESCHEDULED" : "UPDATED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully applied ${action === "RESCHEDULE_EXISTING" ? "reschedule" : "update"} to existing academic record.`,
        data: {
          sourceId: source.id,
          targetId,
          actionTaken: action,
        },
      });
    }

    // ACTION D: CREATE_NEW (or Default Fallback)
    // Pre-resolve all courses for all items before beginning the database transaction
    for (const t of tasks) {
      t._resolvedCourseId = await resolveCourseId(t.courseCode, t.course);
    }
    for (const e of events) {
      e._resolvedCourseId = await resolveCourseId(e.courseCode, e.course);
    }
    for (const ex of exams) {
      ex._resolvedCourseId = await resolveCourseId(ex.courseCode, ex.course);
    }

    // Perform persistence inside a database transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // Build AcademicSource metadata — merge NLP metadata with document provenance (M7-E)
        const sourceMetadataObj: Record<string, unknown> = {
          category: category || "GENERAL_ANNOUNCEMENT",
          confirmedAt: new Date().toISOString(),
          itemCounts: { tasks: tasks.length, events: events.length, exams: exams.length },
        };

        // Attach document provenance if this came from a file upload (M7-E)
        if (documentSource && typeof documentSource === "object") {
          sourceMetadataObj.documentSource = documentSource;
        }

        const defaultTitle = title || `${category ? category.replace(/_/g, " ") : "Academic"} Announcement`;

        // sourceFileUrl stores the safe display filename when the source is a file upload
        const sourceFileUrl =
          documentSource && typeof documentSource === "object" && (documentSource as any).filename
            ? `uploaded:${(documentSource as any).filename}`
            : null;

        const source = await tx.academicSource.create({
          data: {
            title: defaultTitle,
            rawText: rawText.trim(),
            channel: channel || "MANUAL_PASTE",
            sourceFileUrl,
            sourceMetadata: JSON.stringify(sourceMetadataObj),
          },
        });

        const createdTaskIds: string[] = [];
        const createdEventIds: string[] = [];
        const createdExamIds: string[] = [];

        // 1. Create Tasks
        for (const t of tasks) {
          const courseId = t._resolvedCourseId || null;
          const deadlineDate = t.deadline ? new Date(t.deadline) : null;

          const task = await tx.task.create({
            data: {
              userId,
              courseId,
              title: t.title,
              description: t.conditions?.length
                ? `Conditions: ${t.conditions.join("; ")}${t.submissionPlatform ? ` | Platform: ${t.submissionPlatform}` : ""}`
                : t.submissionPlatform
                ? `Platform: ${t.submissionPlatform}`
                : null,
              category: t.category || "ASSIGNMENT",
              deadline: deadlineDate,
              normalizedDeadline: t.normalizedDeadline || null,
              submissionPlatform: t.submissionPlatform || null,
              priority: t.priority || "MEDIUM",
              weightage: t.weightage || t.marks || null,
              isRescheduled: !!t.isRescheduled,
              isAiGenerated: true,
              confidence: t.confidence || 0.95,
            },
          });
          createdTaskIds.push(task.id);

          // Link Task Evidences
          if (t.evidences && Array.isArray(t.evidences) && t.evidences.length > 0) {
            for (const ev of t.evidences) {
              await tx.sourceEvidence.create({
                data: {
                  sourceId: source.id,
                  taskId: task.id,
                  fieldName: ev.field || "task",
                  extractedSnippet: ev.rawSnippet || t.title,
                  confidence: ev.confidence || 0.95,
                },
              });
            }
          } else if (t.extractedSnippet) {
            await tx.sourceEvidence.create({
              data: {
                sourceId: source.id,
                taskId: task.id,
                fieldName: "task",
                extractedSnippet: t.extractedSnippet,
                confidence: 0.95,
              },
            });
          }

          // Record Audit Trail
          await tx.academicAuditLog.create({
            data: {
              targetType: "TASK",
              targetId: task.id,
              sourceId: source.id,
              relationship: "NEW",
              changedFields: JSON.stringify(changedFields),
              reasons: JSON.stringify(matchingReasons.length > 0 ? matchingReasons : ["New academic task created"]),
              actionTaken: "CREATED",
            },
          });
        }

        // 2. Create Events
        for (const e of events) {
          const courseId = e._resolvedCourseId || null;
          const startTime = e.startTime ? new Date(e.startTime) : new Date();
          const endTime = e.endTime ? new Date(e.endTime) : new Date(startTime.getTime() + 3600000);

          const event = await tx.event.create({
            data: {
              userId,
              courseId,
              title: e.title,
              description: e.conditions?.length ? `Conditions: ${e.conditions.join("; ")}` : null,
              eventType: e.eventType || "REVIEW",
              venue: e.venue || e.platform || null,
              startTime,
              endTime,
              isRescheduled: !!e.isRescheduled,
            },
          });
          createdEventIds.push(event.id);

          // Link Event Evidences
          if (e.evidences && Array.isArray(e.evidences) && e.evidences.length > 0) {
            for (const ev of e.evidences) {
              await tx.sourceEvidence.create({
                data: {
                  sourceId: source.id,
                  eventId: event.id,
                  fieldName: ev.field || "event",
                  extractedSnippet: ev.rawSnippet || e.title,
                  confidence: ev.confidence || 0.95,
                },
              });
            }
          } else if (e.extractedSnippet) {
            await tx.sourceEvidence.create({
              data: {
                sourceId: source.id,
                eventId: event.id,
                fieldName: "event",
                extractedSnippet: e.extractedSnippet,
                confidence: 0.95,
              },
            });
          }

          // Record Audit Trail
          await tx.academicAuditLog.create({
            data: {
              targetType: "EVENT",
              targetId: event.id,
              sourceId: source.id,
              relationship: "NEW",
              changedFields: JSON.stringify(changedFields),
              reasons: JSON.stringify(matchingReasons.length > 0 ? matchingReasons : ["New academic event created"]),
              actionTaken: "CREATED",
            },
          });
        }

        // 3. Create Exams
        for (const ex of exams) {
          let courseId = ex._resolvedCourseId || null;
          if (!courseId) {
            const firstCourse = await tx.course.findFirst();
            if (firstCourse) courseId = firstCourse.id;
          }

          if (courseId) {
            const examDate = ex.examDate ? new Date(ex.examDate) : new Date();
            const exam = await tx.exam.create({
              data: {
                courseId,
                title: ex.title,
                examDate,
                startTime: ex.startTime || null,
                endTime: ex.endTime || null,
                venue: ex.venue || null,
                weightage: ex.weightage || null,
              },
            });
            createdExamIds.push(exam.id);

            // Link Exam Evidences
            if (ex.evidences && Array.isArray(ex.evidences) && ex.evidences.length > 0) {
              for (const ev of ex.evidences) {
                await tx.sourceEvidence.create({
                  data: {
                    sourceId: source.id,
                    examId: exam.id,
                    fieldName: ev.field || "exam",
                    extractedSnippet: ev.rawSnippet || ex.title,
                    confidence: ev.confidence || 0.95,
                  },
                });
              }
            }

            // Record Audit Trail
            await tx.academicAuditLog.create({
              data: {
                targetType: "EXAM",
                targetId: exam.id,
                sourceId: source.id,
                relationship: "NEW",
                changedFields: JSON.stringify(changedFields),
                reasons: JSON.stringify(matchingReasons.length > 0 ? matchingReasons : ["New examination created"]),
                actionTaken: "CREATED",
              },
            });
          }
        }

        // 4. Global notice-level evidences
        if (Array.isArray(evidences)) {
          for (const ev of evidences) {
            if (!ev.taskId && !ev.eventId && !ev.examId) {
              await tx.sourceEvidence.create({
                data: {
                  sourceId: source.id,
                  fieldName: ev.field || "general",
                  extractedSnippet: ev.rawSnippet || String(ev.value || ""),
                  confidence: ev.confidence || 0.9,
                },
              });
            }
          }
        }

        return {
          sourceId: source.id,
          sourceTitle: source.title,
          taskCount: createdTaskIds.length,
          eventCount: createdEventIds.length,
          examCount: createdExamIds.length,
          actionTaken: "CREATED",
        };
      },
      { timeout: 15000 }
    );

    return NextResponse.json({
      success: true,
      message: `Confirmed and synchronized: ${result.taskCount} task(s), ${result.eventCount} event(s), ${result.examCount} exam(s).`,
      data: result,
    });
  } catch (error: any) {
    console.error("[POST /api/ingest/confirm] Error confirming notice:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred while saving confirmed items.",
      },
      { status: 500 }
    );
  }
}
