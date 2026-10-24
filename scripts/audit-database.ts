import { prisma } from "../lib/db/prisma";

async function auditDatabase() {
  console.log("================================================================================");
  console.log("                        DATABASE AUDIT REPORT                                  ");
  console.log("================================================================================");

  const tasks = await prisma.task.findMany({
    include: {
      course: true,
      evidences: {
        include: { source: true },
      },
      progress: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const events = await prisma.event.findMany({
    include: {
      course: true,
      evidences: { include: { source: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const exams = await prisma.exam.findMany({
    include: {
      course: true,
      evidences: { include: { source: true } },
    },
    orderBy: { examDate: "asc" },
  });

  const sources = await prisma.academicSource.findMany({
    include: {
      evidences: true,
      auditLogs: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const auditLogs = await prisma.academicAuditLog.findMany({
    include: {
      source: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total Tasks:           ${tasks.length}`);
  console.log(`Total Events:          ${events.length}`);
  console.log(`Total Exams:           ${exams.length}`);
  console.log(`Total AcademicSources: ${sources.length}`);
  console.log(`Total Audit Logs:      ${auditLogs.length}\n`);

  console.log("--- TASKS LIST ---");
  tasks.forEach((t, i) => {
    console.log(
      `[${i + 1}] ID: ${t.id} | Title: "${t.title}" | Course: ${t.course?.code || "NONE"} | Status: ${t.status} | Priority: ${t.priority} | Marks: ${t.weightage} | Deadline: ${t.deadline?.toISOString() || "NULL"} | Rescheduled: ${t.isRescheduled}`
    );
    console.log(`    Evidences: ${t.evidences.length} | Progress Logs: ${t.progress.length} | CreatedAt: ${t.createdAt.toISOString()}`);
    if (t.evidences.length > 0) {
      t.evidences.forEach((e) => {
        console.log(`    ↳ Evidence Source ID: ${e.sourceId} | Snippet: "${e.extractedSnippet}"`);
      });
    }
  });

  console.log("\n--- EVENTS LIST ---");
  events.forEach((e, i) => {
    console.log(
      `[${i + 1}] ID: ${e.id} | Title: "${e.title}" | Course: ${e.course?.code || "NONE"} | Type: ${e.eventType} | Venue: ${e.venue} | Start: ${e.startTime.toISOString()} | End: ${e.endTime.toISOString()} | Rescheduled: ${e.isRescheduled}`
    );
    console.log(`    Evidences: ${e.evidences.length}`);
  });

  console.log("\n--- EXAMS LIST ---");
  exams.forEach((ex, i) => {
    console.log(
      `[${i + 1}] ID: ${ex.id} | Title: "${ex.title}" | Course: ${ex.course?.code || "NONE"} | Date: ${ex.examDate.toISOString()} | Marks: ${ex.weightage}`
    );
  });

  console.log("\n--- ACADEMIC SOURCES LIST ---");
  sources.forEach((s, i) => {
    console.log(
      `[${i + 1}] ID: ${s.id} | Title: "${s.title}" | Channel: ${s.channel} | Evidences: ${s.evidences.length} | AuditLogs: ${s.auditLogs.length} | CreatedAt: ${s.createdAt.toISOString()}`
    );
    console.log(`    RawText: "${s.rawText.substring(0, 80).replace(/\n/g, " ")}..."`);
  });

  console.log("\n--- AUDIT LOGS LIST ---");
  auditLogs.forEach((l, i) => {
    console.log(
      `[${i + 1}] ID: ${l.id} | Target: ${l.targetType}:${l.targetId} | Relationship: ${l.relationship} | Action: ${l.actionTaken} | Source: ${l.sourceId}`
    );
    if (l.reasons) console.log(`    Reasons: ${l.reasons}`);
    if (l.changedFields) console.log(`    Changes: ${l.changedFields}`);
  });
}

auditDatabase().catch(console.error);
