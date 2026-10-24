import { prisma } from "../lib/db/prisma";
import { ensureDefaultUserAndCourses } from "../lib/services/user.service";

async function cleanupAndSeedDemo() {
  console.log("================================================================================");
  console.log("        ACADEMIC AI - DATABASE CLEANUP & DEMO DATASET INITIALIZATION            ");
  console.log("================================================================================");

  // 1. Ensure core user and courses exist
  const { userId, courses } = await ensureDefaultUserAndCourses();

  // Ensure CSE3001 (Database Systems) exists
  const dbmsCourse = await prisma.course.upsert({
    where: { code: "CSE3001" },
    update: { title: "Database Systems", color: "#f59e0b" },
    create: {
      code: "CSE3001",
      title: "Database Systems",
      faculty: "Dr. K. Senthil",
      credits: 4,
      slot: "E1+TE1",
      color: "#f59e0b",
    },
  });

  await prisma.courseEnrollment.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId: dbmsCourse.id,
      },
    },
    update: {},
    create: {
      userId,
      courseId: dbmsCourse.id,
    },
  });

  const nlpCourse = await prisma.course.findUnique({ where: { code: "CSE4001" } });
  const mlCourse = await prisma.course.findUnique({ where: { code: "CSE3002" } });
  const netCourse = await prisma.course.findUnique({ where: { code: "CSE2001" } });

  console.log("\n--- STEP 1: AUDIT & CONSOLIDATE REPEATED TEST CONTAMINATION ---");

  // A. [CSE4001] Assignment 2
  const nlpA2Tasks = await prisma.task.findMany({
    where: {
      title: { contains: "Assignment 2" },
      course: { code: "CSE4001" },
    },
    include: { evidences: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${nlpA2Tasks.length} copies of [CSE4001] Assignment 2`);
  if (nlpA2Tasks.length > 1) {
    const canonical = nlpA2Tasks[0];
    const duplicates = nlpA2Tasks.slice(1);

    for (const dup of duplicates) {
      // Re-link evidences to canonical record
      await prisma.sourceEvidence.updateMany({
        where: { taskId: dup.id },
        data: { taskId: canonical.id },
      });
      // Delete progress logs if any
      await prisma.taskProgress.deleteMany({ where: { taskId: dup.id } });
      // Delete redundant task
      await prisma.task.delete({ where: { id: dup.id } });
      console.log(`  ↳ Consolidated duplicate task ${dup.id} into canonical ${canonical.id}`);
    }

    // Ensure canonical has clean title and properties
    await prisma.task.update({
      where: { id: canonical.id },
      data: {
        title: "[CSE4001] Assignment 2",
        category: "ASSIGNMENT",
        status: "PENDING",
        priority: "HIGH",
        weightage: 20,
        submissionPlatform: "VTOP",
        deadline: new Date("2026-09-24T18:29:00.000Z"),
        normalizedDeadline: "September 24, 2026 at 11:59 PM (IST)",
        description: "Assignment 2 on Syntactic Parsing and POS Tagging. Late submissions will not be accepted.",
      },
    });
  }

  // B. [CSE4001] Project Review 1 (Tasks)
  const nlpReviewTasks = await prisma.task.findMany({
    where: {
      title: { contains: "Project Review 1" },
      course: { code: "CSE4001" },
    },
    include: { evidences: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${nlpReviewTasks.length} copies of [CSE4001] Project Review 1 (Tasks)`);
  if (nlpReviewTasks.length > 1) {
    const canonical = nlpReviewTasks[0];
    const duplicates = nlpReviewTasks.slice(1);

    for (const dup of duplicates) {
      await prisma.sourceEvidence.updateMany({
        where: { taskId: dup.id },
        data: { taskId: canonical.id },
      });
      await prisma.taskProgress.deleteMany({ where: { taskId: dup.id } });
      await prisma.task.delete({ where: { id: dup.id } });
      console.log(`  ↳ Consolidated duplicate review task ${dup.id} into canonical ${canonical.id}`);
    }

    await prisma.task.update({
      where: { id: canonical.id },
      data: {
        title: "[CSE4001] Capstone Project Review 1",
        category: "PROJECT",
        status: "PENDING",
        priority: "CRITICAL",
        weightage: 30,
        isRescheduled: true,
        deadline: new Date("2026-09-21T09:30:00.000Z"), // Monday 3 PM IST
        normalizedDeadline: "September 21, 2026 at 3:00 PM (IST)",
        description: "Shifted from Friday 2 PM to Monday 3 PM in SJT 402. System design evaluation and literature review.",
      },
    });
  }

  // C. [CSE4001] Project Review 1 (Events)
  const nlpReviewEvents = await prisma.event.findMany({
    where: {
      title: { contains: "Project Review 1" },
      course: { code: "CSE4001" },
    },
    include: { evidences: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${nlpReviewEvents.length} copies of [CSE4001] Project Review 1 (Events)`);
  if (nlpReviewEvents.length > 1) {
    const canonical = nlpReviewEvents[0];
    const duplicates = nlpReviewEvents.slice(1);

    for (const dup of duplicates) {
      await prisma.sourceEvidence.updateMany({
        where: { eventId: dup.id },
        data: { eventId: canonical.id },
      });
      await prisma.event.delete({ where: { id: dup.id } });
      console.log(`  ↳ Consolidated duplicate review event ${dup.id} into canonical ${canonical.id}`);
    }

    await prisma.event.update({
      where: { id: canonical.id },
      data: {
        title: "[CSE4001] Capstone Project Review 1",
        eventType: "REVIEW",
        venue: "SJT 402",
        isRescheduled: true,
        startTime: new Date("2026-09-21T09:30:00.000Z"),
        endTime: new Date("2026-09-21T10:30:00.000Z"),
      },
    });
  }

  // D. [CSE2001] CAT-1 (Exams & Events)
  const netExams = await prisma.exam.findMany({
    where: {
      title: { contains: "CAT-1" },
      course: { code: "CSE2001" },
    },
    include: { evidences: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${netExams.length} copies of [CSE2001] CAT-1 Exams`);
  if (netExams.length > 1) {
    const canonical = netExams[0];
    const duplicates = netExams.slice(1);

    for (const dup of duplicates) {
      await prisma.sourceEvidence.updateMany({
        where: { examId: dup.id },
        data: { examId: canonical.id },
      });
      await prisma.exam.delete({ where: { id: dup.id } });
      console.log(`  ↳ Consolidated duplicate exam ${dup.id} into canonical ${canonical.id}`);
    }

    await prisma.exam.update({
      where: { id: canonical.id },
      data: {
        title: "[CSE2001] Computer Networks CAT-1 Exam",
        examDate: new Date("2026-10-05T04:30:00.000Z"), // Oct 05, 2026 10:00 AM
        startTime: "10:00 AM",
        endTime: "11:30 AM",
        venue: "SJT 101",
        weightage: 50,
      },
    });
  }

  const netEvents = await prisma.event.findMany({
    where: {
      title: { contains: "CAT-1" },
      course: { code: "CSE2001" },
    },
    include: { evidences: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${netEvents.length} copies of [CSE2001] CAT-1 Events`);
  if (netEvents.length > 1) {
    const canonical = netEvents[0];
    const duplicates = netEvents.slice(1);

    for (const dup of duplicates) {
      await prisma.sourceEvidence.updateMany({
        where: { eventId: dup.id },
        data: { eventId: canonical.id },
      });
      await prisma.event.delete({ where: { id: dup.id } });
      console.log(`  ↳ Consolidated duplicate CAT-1 event ${dup.id} into canonical ${canonical.id}`);
    }
  }

  // E. [CSE2004] Class Rescheduled Events
  const osEvents = await prisma.event.findMany({
    where: {
      course: { code: "CSE2004" },
    },
    include: { evidences: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${osEvents.length} copies of CSE2004 Events`);
  if (osEvents.length > 1) {
    const canonical = osEvents[0];
    const duplicates = osEvents.slice(1);

    for (const dup of duplicates) {
      await prisma.sourceEvidence.updateMany({
        where: { eventId: dup.id },
        data: { eventId: canonical.id },
      });
      await prisma.event.delete({ where: { id: dup.id } });
      console.log(`  ↳ Consolidated duplicate OS event ${dup.id} into canonical ${canonical.id}`);
    }
  }

  // F. [CSE2002] Assignment 1 Tasks
  const dsaTasks = await prisma.task.findMany({
    where: {
      course: { code: "CSE2002" },
    },
    include: { evidences: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${dsaTasks.length} copies of CSE2002 Tasks`);
  if (dsaTasks.length > 1) {
    const canonical = dsaTasks[0];
    const duplicates = dsaTasks.slice(1);

    for (const dup of duplicates) {
      await prisma.sourceEvidence.updateMany({
        where: { taskId: dup.id },
        data: { taskId: canonical.id },
      });
      await prisma.taskProgress.deleteMany({ where: { taskId: dup.id } });
      await prisma.task.delete({ where: { id: dup.id } });
      console.log(`  ↳ Consolidated duplicate DSA task ${dup.id} into canonical ${canonical.id}`);
    }
  }

  // G. Older NLP Mini Project tasks from Milestone 1 test
  const oldMiniProjects = await prisma.task.findMany({
    where: {
      title: "Natural Language Processing Mini Project",
      course: { code: "CSE4001" },
    },
    orderBy: { createdAt: "asc" },
  });

  if (oldMiniProjects.length > 1) {
    // Keep the completed one (first one) and remove the redundant unverified duplicate
    const keep = oldMiniProjects[0];
    const drop = oldMiniProjects[1];
    await prisma.taskProgress.deleteMany({ where: { taskId: drop.id } });
    await prisma.task.delete({ where: { id: drop.id } });
    console.log(`  ↳ Cleaned up redundant NLP mini project record ${drop.id}`);
  }

  console.log("\n--- STEP 2: SEED CONTROLLED, REALISTIC FACULTY-DEMO DATASET ---");

  // 1. NLP Assignment 1 (Completed deliverable)
  const nlpA1 = await prisma.task.upsert({
    where: { id: "demo-task-nlp-a1" },
    update: {
      status: "COMPLETED",
      weightage: 15,
      deadline: new Date("2026-09-14T18:29:00.000Z"),
      normalizedDeadline: "September 14, 2026 at 11:59 PM (IST)",
    },
    create: {
      id: "demo-task-nlp-a1",
      userId,
      courseId: nlpCourse?.id,
      title: "[CSE4001] Assignment 1: Language Modeling & Tokenization",
      category: "ASSIGNMENT",
      status: "COMPLETED",
      priority: "MEDIUM",
      weightage: 15,
      submissionPlatform: "VTOP",
      deadline: new Date("2026-09-14T18:29:00.000Z"),
      normalizedDeadline: "September 14, 2026 at 11:59 PM (IST)",
      description: "N-gram language models, perplexity evaluation, and BPE tokenization.",
    },
  });

  // 2. ML Assignment 3 (Pending deliverable in 5 days)
  const mlA3 = await prisma.task.upsert({
    where: { id: "demo-task-ml-a3" },
    update: {
      status: "PENDING",
      priority: "MEDIUM",
      weightage: 10,
      deadline: new Date("2026-09-23T18:29:00.000Z"),
      normalizedDeadline: "September 23, 2026 at 11:59 PM (IST)",
    },
    create: {
      id: "demo-task-ml-a3",
      userId,
      courseId: mlCourse?.id,
      title: "[CSE3002] ML Exercise 3: Support Vector Machines",
      category: "ASSIGNMENT",
      status: "PENDING",
      priority: "MEDIUM",
      weightage: 10,
      submissionPlatform: "Canvas",
      deadline: new Date("2026-09-23T18:29:00.000Z"),
      normalizedDeadline: "September 23, 2026 at 11:59 PM (IST)",
      description: "Kernel SVM implementation with dual formulation and cross-validation.",
    },
  });

  // 3. DBMS Project (High/Critical Priority Deliverable due tomorrow)
  const dbmsProject = await prisma.task.upsert({
    where: { id: "demo-task-dbms-proj" },
    update: {
      status: "PENDING",
      priority: "CRITICAL",
      weightage: 30,
      deadline: new Date("2026-09-20T18:29:00.000Z"),
      normalizedDeadline: "September 20, 2026 at 11:59 PM (IST)",
    },
    create: {
      id: "demo-task-dbms-proj",
      userId,
      courseId: dbmsCourse.id,
      title: "[CSE3001] Distributed Database Architecture Project",
      category: "PROJECT",
      status: "PENDING",
      priority: "CRITICAL",
      weightage: 30,
      submissionPlatform: "GitHub Classroom",
      deadline: new Date("2026-09-20T18:29:00.000Z"),
      normalizedDeadline: "September 20, 2026 at 11:59 PM (IST)",
      description: "Sharding and 2PC transaction coordinator implementation. Late submissions will receive zero credit.",
    },
  });

  // 4. Academic Events
  await prisma.event.upsert({
    where: { id: "demo-event-nlp-lecture" },
    update: {},
    create: {
      id: "demo-event-nlp-lecture",
      userId,
      courseId: nlpCourse?.id,
      title: "[CSE4001] NLP Guest Lecture: Transformer Scalability",
      eventType: "LECTURE",
      venue: "TT 105",
      startTime: new Date("2026-09-22T04:30:00.000Z"), // 10:00 AM IST
      endTime: new Date("2026-09-22T06:00:00.000Z"),   // 11:30 AM IST
    },
  });

  await prisma.event.upsert({
    where: { id: "demo-event-ml-lab" },
    update: {},
    create: {
      id: "demo-event-ml-lab",
      userId,
      courseId: mlCourse?.id,
      title: "[CSE3002] ML Lab Evaluation Session",
      eventType: "LAB",
      venue: "SJT 218",
      startTime: new Date("2026-09-21T08:30:00.000Z"), // 2:00 PM IST
      endTime: new Date("2026-09-21T10:30:00.000Z"),   // 4:00 PM IST
    },
  });

  await prisma.event.upsert({
    where: { id: "demo-event-net-review" },
    update: {},
    create: {
      id: "demo-event-net-review",
      userId,
      courseId: netCourse?.id,
      title: "[CSE2001] Computer Networks Review Session",
      eventType: "REVIEW",
      venue: "SJT 402",
      startTime: new Date("2026-09-25T10:30:00.000Z"), // 4:00 PM IST
      endTime: new Date("2026-09-25T12:00:00.000Z"),   // 5:30 PM IST
    },
  });

  // 5. Clean up temporary test student account
  const testStudent = await prisma.user.findUnique({ where: { email: "test.student@academicai.edu" } });
  if (testStudent) {
    await prisma.user.delete({ where: { id: testStudent.id } });
    console.log("  ↳ Cleaned up test student user account");
  }

  console.log("\n--- STEP 3: FINAL DATABASE INVENTORY ---");
  const finalTasks = await prisma.task.findMany({ include: { course: true }, orderBy: { deadline: "asc" } });
  const finalEvents = await prisma.event.findMany({ include: { course: true }, orderBy: { startTime: "asc" } });
  const finalExams = await prisma.exam.findMany({ include: { course: true } });

  console.log(`Active Tasks (${finalTasks.filter(t => t.status !== "COMPLETED").length}):`);
  finalTasks.forEach((t, i) => {
    console.log(`  [${i + 1}] ${t.title} | ${t.course?.code} | ${t.status} | Deadline: ${t.deadline?.toISOString()} | ${t.weightage} marks`);
  });

  console.log(`\nUpcoming Events (${finalEvents.length}):`);
  finalEvents.forEach((e, i) => {
    console.log(`  [${i + 1}] ${e.title} | ${e.eventType} | ${e.venue} | ${e.startTime.toISOString()}`);
  });

  console.log(`\nScheduled Exams (${finalExams.length}):`);
  finalExams.forEach((ex, i) => {
    console.log(`  [${i + 1}] ${ex.title} | ${ex.course?.code} | ${ex.examDate.toISOString()} | ${ex.weightage} marks`);
  });

  console.log("\n================================================================================");
  console.log("🎉 DATABASE CLEANUP & CONTROLLED DEMO DATASET COMPLETED SUCCESSFULLY!");
  console.log("================================================================================");
}

cleanupAndSeedDemo()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Cleanup failed:", err);
    prisma.$disconnect();
    process.exit(1);
  });
