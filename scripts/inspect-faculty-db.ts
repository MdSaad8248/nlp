import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("=== USERS ===");
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, rollNumber: true },
  });
  console.table(users);

  console.log("\n=== COURSES ===");
  const courses = await prisma.course.findMany({
    select: { id: true, code: true, title: true, faculty: true },
  });
  console.table(courses);

  console.log("\n=== COURSE FACULTY MAPPINGS ===");
  const cf = await prisma.courseFaculty.findMany({
    include: { user: true, course: true },
  });
  console.table(
    cf.map((x) => ({
      facultyName: x.user.name,
      facultyEmail: x.user.email,
      courseCode: x.course.code,
      courseTitle: x.course.title,
      role: x.role,
    }))
  );

  console.log("\n=== COURSE ENROLLMENTS ===");
  const enrollments = await prisma.courseEnrollment.findMany({
    include: { user: true, course: true },
  });
  console.log(`Total Enrollments: ${enrollments.length}`);
  console.table(
    enrollments.slice(0, 15).map((x) => ({
      studentName: x.user.name,
      courseCode: x.course.code,
      progress: x.progress,
      status: x.enrollmentStatus,
    }))
  );

  console.log("\n=== TASKS / DELIVERABLES PER COURSE ===");
  const tasks = await prisma.task.findMany({
    include: { user: true, course: true, progress: true },
  });
  console.log(`Total Tasks: ${tasks.length}`);
  console.table(
    tasks.map((t) => ({
      id: t.id,
      student: t.user.name,
      course: t.course?.code || "NONE",
      title: t.title,
      category: t.category,
      status: t.status,
      deadline: t.deadline?.toISOString(),
      progressNote: t.progress[0]?.note || "none",
      progressPct: t.progress[0]?.percentage ?? 0,
    }))
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
