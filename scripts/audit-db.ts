import { prisma } from "../lib/db/prisma";

async function auditDatabase() {
  console.log("================================================================================");
  console.log("               ACADEMICAI — DATABASE VERIFICATION AUDIT                        ");
  console.log("================================================================================\n");

  // 1. User Role Counts
  const totalUsers = await prisma.user.count();
  const studentCount = await prisma.user.count({ where: { role: "STUDENT" } });
  const facultyCount = await prisma.user.count({ where: { role: "TEACHER" } });
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  const synthStudents = await prisma.user.count({ where: { id: { startsWith: "student-synth-" } } });
  const legacyStudents = await prisma.user.count({ where: { role: "STUDENT", NOT: { id: { startsWith: "student-synth-" } } } });

  console.log(">>> [1] User Records:");
  console.log(`    Total Users in DB:       ${totalUsers}`);
  console.log(`    Students:                ${studentCount} (${synthStudents} synthetic + ${legacyStudents} legacy/demo)`);
  console.log(`    Faculty (Teachers):      ${facultyCount}`);
  console.log(`    Admins:                  ${adminCount}`);

  // List all faculty
  const facultyList = await prisma.user.findMany({
    where: { role: "TEACHER" },
    include: { managedCourses: { include: { course: true } } },
    orderBy: { email: "asc" },
  });
  console.log("\n>>> [2] Faculty Accounts & Course Assignments:");
  for (const f of facultyList) {
    const courses = f.managedCourses.map((mc) => `${mc.course.code} (${mc.course.title})`).join(", ");
    console.log(`    • ${f.name.padEnd(20)} [${f.email}] -> Courses: ${courses || "NONE"}`);
  }

  // 2. Courses
  const courseCount = await prisma.course.count();
  const courses = await prisma.course.findMany({
    include: {
      enrollments: true,
      facultyMembers: { include: { user: true } },
      syllabi: true,
      rubrics: true,
      tasks: true,
    },
    orderBy: { code: "asc" },
  });

  console.log(`\n>>> [3] Courses in Database (${courseCount} courses):`);
  for (const c of courses) {
    const instructors = c.facultyMembers.map((fm) => fm.user.name).join(", ");
    console.log(
      `    • ${c.code.padEnd(8)} "${c.title}" | Instructor: ${instructors || "Unassigned"} | Enrollments: ${c.enrollments.length} | Syllabi: ${c.syllabi.length} | Rubrics: ${c.rubrics.length} | Tasks: ${c.tasks.length}`
    );
  }

  // 3. Enrollments
  const enrollmentCount = await prisma.courseEnrollment.count();
  console.log(`\n>>> [4] Course Enrollments Total: ${enrollmentCount}`);

  // 4. Tasks & Progress
  const taskCount = await prisma.task.count();
  const taskStatusCounts = await prisma.task.groupBy({
    by: ["status"],
    _count: true,
  });
  const progressCount = await prisma.taskProgress.count();
  console.log(`\n>>> [5] Tasks & Progress (${taskCount} tasks, ${progressCount} progress records):`);
  for (const s of taskStatusCounts) {
    console.log(`    • Status '${s.status}': ${s._count} tasks`);
  }

  // 5. Syllabi & Rubrics
  const syllabusCount = await prisma.syllabus.count();
  const rubricCount = await prisma.rubric.count();
  console.log(`\n>>> [6] Curricula & Rubrics:`);
  console.log(`    • Syllabi Records:       ${syllabusCount}`);
  console.log(`    • Rubric Records:        ${rubricCount}`);

  // 6. Referential Integrity Verification
  console.log(`\n>>> [7] Referential Integrity Checks:`);
  // Check orphaned enrollments
  const allEnrollments = await prisma.courseEnrollment.findMany({ select: { courseId: true, userId: true } });
  const allCourseIds = new Set((await prisma.course.findMany({ select: { id: true } })).map(c => c.id));
  const allUserIds = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));
  const orphanEnrollments = allEnrollments.filter(e => !allCourseIds.has(e.courseId) || !allUserIds.has(e.userId));
  console.log(`    • Orphaned Enrollments:  ${orphanEnrollments.length}`);

  // Check students with teacher permissions
  const studentsWithManagedCourses = await prisma.courseFaculty.findMany({
    where: { user: { role: "STUDENT" } },
  });
  console.log(`    • Students Managing Courses: ${studentsWithManagedCourses.length} (must be 0)`);

  // Check faculty-course isolation (assessments overlap)
  const cse4001Tasks = await prisma.task.findMany({ where: { course: { code: "CSE4001" } }, select: { id: true } });
  const cse3002Tasks = await prisma.task.findMany({ where: { course: { code: "CSE3002" } }, select: { id: true } });
  const setA = new Set(cse4001Tasks.map((t) => t.id));
  const overlap = cse3002Tasks.filter((t) => setA.has(t.id));
  console.log(`    • CSE4001 vs CSE3002 Task Overlap: ${overlap.length} (must be 0)`);

  console.log("\n================================================================================\n");
}

auditDatabase()
  .catch((e) => {
    console.error("Audit failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
