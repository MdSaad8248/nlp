import { prisma } from "../lib/db/prisma";

async function inspectTasks() {
  const tasks = await prisma.task.findMany({
    include: {
      course: true,
      evidences: {
        include: { source: true },
      },
      progress: true,
    },
    orderBy: [{ title: "asc" }, { createdAt: "asc" }],
  });

  console.log(`TOTAL TASKS IN DATABASE: ${tasks.length}\n`);

  for (const t of tasks) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`TASK ID:    ${t.id}`);
    console.log(`TITLE:      "${t.title}"`);
    console.log(`COURSE:     ${t.course?.code} (${t.course?.title})`);
    console.log(`STATUS:     ${t.status}`);
    console.log(`DEADLINE:   ${t.deadline?.toISOString()} | Normalized: "${t.normalizedDeadline}"`);
    console.log(`MARKS:      ${t.weightage}`);
    console.log(`CREATED AT: ${t.createdAt.toISOString()}`);
    console.log(`PROGRESS:   ${t.progress.length} logs`);
    console.log(`EVIDENCES (${t.evidences.length}):`);
    for (const ev of t.evidences) {
      console.log(`  - Evidence ID: ${ev.id}`);
      console.log(`    Source ID:   ${ev.sourceId} (Source Title: "${ev.source.title}")`);
      console.log(`    Field:       ${ev.fieldName}`);
      console.log(`    Snippet:     "${ev.extractedSnippet}"`);
    }
  }
}

inspectTasks().catch(console.error);
