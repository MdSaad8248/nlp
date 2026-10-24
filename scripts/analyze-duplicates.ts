import { prisma } from "../lib/db/prisma";

async function analyzeDuplicates() {
  const tasks = await prisma.task.findMany({
    include: { course: true, evidences: true, progress: true },
    orderBy: { createdAt: "asc" },
  });

  const events = await prisma.event.findMany({
    include: { course: true, evidences: true },
    orderBy: { createdAt: "asc" },
  });

  const exams = await prisma.exam.findMany({
    include: { course: true, evidences: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("=== TASK GROUPS BY (COURSE + TITLE) ===");
  const taskGroups = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const key = `[${t.course?.code || "N/A"}] ${t.title}`;
    if (!taskGroups.has(key)) taskGroups.set(key, []);
    taskGroups.get(key)!.push(t);
  }

  for (const [key, list] of taskGroups) {
    console.log(`\nGroup: "${key}" -> Count: ${list.length}`);
    list.forEach((t, i) => {
      console.log(`  (${i + 1}) ID: ${t.id} | Deadline: ${t.deadline?.toISOString()} | Status: ${t.status} | Evidences: ${t.evidences.length} | Created: ${t.createdAt.toISOString()}`);
    });
  }

  console.log("\n=== EVENT GROUPS BY (COURSE + TITLE) ===");
  const eventGroups = new Map<string, typeof events>();
  for (const e of events) {
    const key = `[${e.course?.code || "N/A"}] ${e.title}`;
    if (!eventGroups.has(key)) eventGroups.set(key, []);
    eventGroups.get(key)!.push(e);
  }

  for (const [key, list] of eventGroups) {
    console.log(`\nGroup: "${key}" -> Count: ${list.length}`);
    list.forEach((e, i) => {
      console.log(`  (${i + 1}) ID: ${e.id} | Start: ${e.startTime.toISOString()} | Venue: ${e.venue} | Evidences: ${e.evidences.length} | Created: ${e.createdAt.toISOString()}`);
    });
  }

  console.log("\n=== EXAM GROUPS BY (COURSE + TITLE) ===");
  const examGroups = new Map<string, typeof exams>();
  for (const ex of exams) {
    const key = `[${ex.course?.code || "N/A"}] ${ex.title}`;
    if (!examGroups.has(key)) examGroups.set(key, []);
    examGroups.get(key)!.push(ex);
  }

  for (const [key, list] of examGroups) {
    console.log(`\nGroup: "${key}" -> Count: ${list.length}`);
    list.forEach((ex, i) => {
      console.log(`  (${i + 1}) ID: ${ex.id} | Date: ${ex.examDate.toISOString()} | Evidences: ${ex.evidences.length} | Created: ${ex.createdAt.toISOString()}`);
    });
  }
}

analyzeDuplicates().catch(console.error);
