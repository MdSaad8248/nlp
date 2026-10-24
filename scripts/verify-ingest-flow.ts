import { DEMO_NOTICES } from "../lib/nlp/demo-notices";
import { prisma } from "../lib/db/prisma";

async function verifyIngestFlow() {
  console.log("=================================================");
  console.log("🌐 END-TO-END INGEST FLOW VERIFICATION (5 NOTICES)");
  console.log("=================================================\n");

  const testIndices = [0, 2, 3, 6, 10]; // Assignment, Exam, Review, Rescheduling, Conditional
  const createdSourceIds: string[] = [];

  try {
    for (let i = 0; i < testIndices.length; i++) {
      const demo = DEMO_NOTICES[testIndices[i]];
      console.log(`\n--- Test Flow ${i + 1}/5: "${demo.label}" (${demo.expectedCategory}) ---`);

      // STEP 1: Count DB sources before ingest
      const sourcesBefore = await prisma.academicSource.count();

      // STEP 2: Call POST /api/ingest (NLP analysis only)
      const ingestRes = await fetch("http://localhost:3000/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: demo.text }),
      });

      const ingestData = await ingestRes.json();
      if (!ingestRes.ok || !ingestData.success) {
        throw new Error(`POST /api/ingest failed: ${ingestData.error}`);
      }

      const sourcesAfterIngest = await prisma.academicSource.count();
      if (sourcesBefore !== sourcesAfterIngest) {
        throw new Error("VIOLATION: /api/ingest wrote to database before user confirmation!");
      }
      console.log("  ✅ /api/ingest analyzed successfully WITHOUT saving to DB.");
      console.log(`     Category: ${ingestData.analysis.category}, Confidence: ${ingestData.analysis.classificationConfidence}`);
      console.log(`     Tasks extracted: ${ingestData.analysis.tasks.length}, Events: ${ingestData.analysis.events.length}, Exams: ${ingestData.analysis.exams.length}`);
      console.log(`     Evidences tracked: ${ingestData.analysis.evidences.length}`);

      // STEP 3: Call POST /api/ingest/confirm (User confirms)
      const confirmRes = await fetch("http://localhost:3000/api/ingest/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: ingestData.analysis.rawText,
          title: demo.label,
          category: ingestData.analysis.category,
          tasks: ingestData.analysis.tasks,
          events: ingestData.analysis.events,
          exams: ingestData.analysis.exams,
          evidences: ingestData.analysis.evidences,
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.success) {
        throw new Error(`POST /api/ingest/confirm failed: ${confirmData.error}`);
      }

      const sourcesAfterConfirm = await prisma.academicSource.count();
      if (sourcesAfterConfirm !== sourcesBefore + 1) {
        throw new Error("POST /api/ingest/confirm did not increment AcademicSource count!");
      }

      const sourceId = confirmData.data.sourceId;
      createdSourceIds.push(sourceId);

      console.log("  ✅ /api/ingest/confirm saved confirmed deliverables to DB.");
      console.log(`     Saved Source ID: ${sourceId}`);
      console.log(`     Tasks: ${confirmData.data.taskCount}, Events: ${confirmData.data.eventCount}, Exams: ${confirmData.data.examCount}`);

      // STEP 4: Verify task appears on Tasks page feed (/api/tasks)
      if (confirmData.data.taskCount > 0) {
        const tasksRes = await fetch("http://localhost:3000/api/tasks");
        const tasksData = await tasksRes.json();
        const matchedTask = tasksData.tasks?.find((t: any) =>
          ingestData.analysis.tasks.some((cand: any) => cand.title === t.title)
        );
        if (!matchedTask) {
          throw new Error("Created task not found in /api/tasks feed for Tasks page!");
        }
        console.log(`  ✅ Confirmed task "${matchedTask.title}" appears on Tasks page.`);
      }

      // STEP 5: Verify event appears on Calendar page feed (/api/events)
      if (confirmData.data.eventCount > 0) {
        const eventsRes = await fetch("http://localhost:3000/api/events");
        const eventsData = await eventsRes.json();
        const matchedEvent = eventsData.events?.find((e: any) =>
          ingestData.analysis.events.some((cand: any) => cand.title === e.title)
        );
        if (!matchedEvent) {
          throw new Error("Created event not found in /api/events feed for Calendar page!");
        }
        console.log(`  ✅ Confirmed event "${matchedEvent.title}" appears on Calendar page.`);
      }
    }

    console.log("\n=================================================");
    console.log("🎉 ALL 5 NOTICES TESTED THROUGH FULL INGEST & CONFIRM FLOW");
    console.log("=================================================\n");
  } finally {
    // TASK 4: Clean up all inserted test records to prevent test contamination of dev.db
    console.log("🧹 Cleaning up verified test ingest records...");
    for (const sourceId of createdSourceIds) {
      // Find evidences linked to this source
      const evidences = await prisma.sourceEvidence.findMany({ where: { sourceId } });
      for (const ev of evidences) {
        if (ev.taskId) {
          await prisma.taskProgress.deleteMany({ where: { taskId: ev.taskId } });
          await prisma.task.deleteMany({ where: { id: ev.taskId } });
        }
        if (ev.eventId) {
          await prisma.event.deleteMany({ where: { id: ev.eventId } });
        }
        if (ev.examId) {
          await prisma.exam.deleteMany({ where: { id: ev.examId } });
        }
      }
      await prisma.sourceEvidence.deleteMany({ where: { sourceId } });
      await prisma.academicAuditLog.deleteMany({ where: { sourceId } });
      await prisma.academicSource.deleteMany({ where: { id: sourceId } });
    }
    console.log(`  ✅ Cleaned up ${createdSourceIds.length} test sources and their associated entities.`);
  }
}

verifyIngestFlow()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Verification failed:", err);
    prisma.$disconnect();
    process.exit(1);
  });
