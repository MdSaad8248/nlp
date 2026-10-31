/**
 * seed-faculty-data.ts
 * Idempotent seed script that creates a coherent academic dataset for faculty workflows.
 * - Faculty users with proper CourseFaculty assignments
 * - Student enrollments per course
 * - Rich assessment/task data with realistic statuses covering every use-case
 * - Proper TaskProgress records so the review queue populates
 *
 * Run with: npx tsx scripts/seed-faculty-data.ts
 * Safe to re-run — uses upserts and skipDuplicates everywhere.
 */

import { prisma } from "../lib/db/prisma";
import { hashPassword } from "../lib/auth/password";

const now = new Date();
const daysAgo  = (d: number) => new Date(now.getTime() - d * 86400_000);
const daysLater = (d: number) => new Date(now.getTime() + d * 86400_000);

async function main() {
  console.log("\n=== AcademicAI Faculty Data Seed ===\n");

  // ── 1. Hash standard demo passwords ─────────────────────────────────────────
  const teacherPw = await hashPassword("teacher123");
  const studentPw = await hashPassword("student123");

  // ── 2. Ensure courses exist ──────────────────────────────────────────────────
  const courses: Record<string, string> = {}; // code → id

  const courseSpecs = [
    { code: "CSE4001", title: "Natural Language Processing",    color: "#6366f1", credits: 4, slot: "A1+TA1", faculty: "Dr. P. Raman" },
    { code: "CSE3002", title: "Machine Learning",               color: "#10b981", credits: 4, slot: "B1+TB1", faculty: "Dr. S. Kulkarni" },
    { code: "CSE2004", title: "Operating Systems",              color: "#f59e0b", credits: 4, slot: "F1+TF1", faculty: "Dr. K. Swaminathan" },
    { code: "CSE2001", title: "Computer Networks",              color: "#06b6d4", credits: 3, slot: "C1+TC1", faculty: "Prof. M. Verma" },
    { code: "CSE3001", title: "Database Systems",               color: "#f59e0b", credits: 4, slot: "E1+TE1", faculty: "Dr. K. Senthil" },
    { code: "MAT2001", title: "Applied Statistics",             color: "#10b981", credits: 3, slot: "D1+TD1", faculty: "Dr. A. Sharma" },
    { code: "CSE2010", title: "Web Technologies",               color: "#06b6d4", credits: 3, slot: "G1+TG1", faculty: "Prof. S. Das" },
    { code: "CSE2002", title: "Data Structures and Algorithms", color: "#8b5cf6", credits: 4, slot: "H1+TH1", faculty: "Dr. R. Krishnan" },
    { code: "CSE2021", title: "Database Management Systems",    color: "#ef4444", credits: 4, slot: "E1+TE1", faculty: "Prof. R. Nair" },
  ];

  for (const spec of courseSpecs) {
    const c = await prisma.course.upsert({
      where: { code: spec.code },
      update: { faculty: spec.faculty },
      create: { ...spec },
    });
    courses[spec.code] = c.id;
    console.log(`  ✔ Course ${spec.code} → ${c.id}`);
  }

  // ── 3. Faculty users with CourseFaculty mappings ────────────────────────────
  const facultySpecs = [
    {
      id: "faculty-academic-demo-01",
      name: "Dr. P. Raman",
      email: "faculty.raman@academic.ai",
      rollNumber: "FAC-NLP-01",
      department: "Department of AI and Data Science",
      program: "Faculty of Computer Engineering",
      courses: ["CSE4001"],
    },
    {
      id: "faculty-academic-demo-02",
      name: "Dr. S. Kulkarni",
      email: "faculty.kulkarni@academic.ai",
      rollNumber: "FAC-ML-02",
      department: "Department of Computer Science",
      program: "Faculty of Computing",
      courses: ["CSE3002"],
    },
    {
      id: "faculty-academic-demo-03",
      name: "Dr. K. Swaminathan",
      email: "faculty.swaminathan@academic.ai",
      rollNumber: "FAC-OS-03",
      department: "Department of Software Systems",
      program: "Faculty of Systems Engineering",
      courses: ["CSE2004"],
    },
  ];

  for (const f of facultySpecs) {
    await prisma.user.upsert({
      where: { id: f.id },
      update: { name: f.name, email: f.email, rollNumber: f.rollNumber, role: "TEACHER", passwordHash: teacherPw, department: f.department, program: f.program },
      create: { id: f.id, name: f.name, email: f.email, rollNumber: f.rollNumber, role: "TEACHER", passwordHash: teacherPw, department: f.department, program: f.program },
    });
    console.log(`  ✔ Faculty ${f.name}`);

    for (const code of f.courses) {
      const cId = courses[code];
      if (!cId) continue;
      await prisma.courseFaculty.upsert({
        where: { userId_courseId: { userId: f.id, courseId: cId } },
        update: {},
        create: { userId: f.id, courseId: cId, role: "PRIMARY_INSTRUCTOR" },
      });
      console.log(`      → Assigned to ${code}`);
    }
  }

  // ── 4. Student users ─────────────────────────────────────────────────────────
  const studentSpecs = [
    { id: "student-academic-demo-01", name: "Saad (Student A)",        email: "saad@academic.ai",   rollNumber: "21BDS0142", program: "B.Tech Data Science (Year 4)",         semester: 8 },
    { id: "student-academic-demo-02", name: "Priya Sharma (Student B)", email: "priya@academic.ai",  rollNumber: "22BCS0218", program: "B.Tech Computer Science (Year 3)",      semester: 6 },
    { id: "student-academic-demo-03", name: "Arjun Verma (Student C)",  email: "arjun@academic.ai",  rollNumber: "23BIT0094", program: "B.Tech Information Technology (Year 2)", semester: 4 },
    { id: "student-roster-s001",       name: "Aarav Sharma",             email: "aarav.sharma@academic.ai",   rollNumber: "S001", program: "B.Tech CSE", semester: 8 },
    { id: "student-roster-s002",       name: "Priya Nair",               email: "priya.nair@academic.ai",     rollNumber: "S002", program: "B.Tech CSE", semester: 8 },
    { id: "student-roster-s003",       name: "Karthik R",                email: "karthik.r@academic.ai",      rollNumber: "S003", program: "B.Tech CSE", semester: 8 },
    { id: "student-roster-s004",       name: "Sneha Patel",              email: "sneha.patel@academic.ai",    rollNumber: "S004", program: "B.Tech CSE", semester: 8 },
    { id: "student-roster-s005",       name: "Rohit Kumar",              email: "rohit.kumar@academic.ai",    rollNumber: "S005", program: "B.Tech CSE", semester: 8 },
  ];

  for (const s of studentSpecs) {
    try {
      // Try upserting by ID first (stable IDs for demo users)
      await prisma.user.upsert({
        where: { id: s.id },
        update: { name: s.name, email: s.email, rollNumber: s.rollNumber, role: "STUDENT", passwordHash: studentPw, program: s.program, semester: s.semester },
        create: { id: s.id, name: s.name, email: s.email, rollNumber: s.rollNumber, role: "STUDENT", passwordHash: studentPw, program: s.program, semester: s.semester },
      });
    } catch {
      // Roster students may exist with a different UUID but same rollNumber — upsert by rollNumber
      await prisma.user.upsert({
        where: { rollNumber: s.rollNumber },
        update: { name: s.name, email: s.email, role: "STUDENT", passwordHash: studentPw, program: s.program, semester: s.semester },
        create: { id: s.id, name: s.name, email: s.email, rollNumber: s.rollNumber, role: "STUDENT", passwordHash: studentPw, program: s.program, semester: s.semester },
      });
    }
    console.log(`  ✔ Student ${s.name}`);
  }

  // ── 5. Enroll students into courses ─────────────────────────────────────────
  // Student A (Saad) → NLP, ML, OS, Networks, Stats, Web, DBMS (heavy workload)
  // Student B (Priya) → NLP, ML, OS, DB Systems
  // Student C (Arjun) → NLP, ML, OS, Networks
  // Roster students → all in NLP (CSE4001)
  const enrollmentSpecs: Array<{ userId: string; courseCode: string; progress: number; section: string }> = [
    // Student A
    { userId: "student-academic-demo-01", courseCode: "CSE4001", progress: 80, section: "A" },
    { userId: "student-academic-demo-01", courseCode: "CSE3002", progress: 65, section: "A" },
    { userId: "student-academic-demo-01", courseCode: "CSE2004", progress: 50, section: "A" },
    { userId: "student-academic-demo-01", courseCode: "CSE2001", progress: 65, section: "A" },
    { userId: "student-academic-demo-01", courseCode: "MAT2001", progress: 65, section: "A" },
    { userId: "student-academic-demo-01", courseCode: "CSE2010", progress: 60, section: "A" },
    { userId: "student-academic-demo-01", courseCode: "CSE2021", progress: 70, section: "A" },
    // Student B
    { userId: "student-academic-demo-02", courseCode: "CSE4001", progress: 72, section: "B" },
    { userId: "student-academic-demo-02", courseCode: "CSE3002", progress: 68, section: "B" },
    { userId: "student-academic-demo-02", courseCode: "CSE2004", progress: 45, section: "B" },
    { userId: "student-academic-demo-02", courseCode: "CSE3001", progress: 58, section: "B" },
    // Student C
    { userId: "student-academic-demo-03", courseCode: "CSE4001", progress: 40, section: "C" },
    { userId: "student-academic-demo-03", courseCode: "CSE3002", progress: 55, section: "C" },
    { userId: "student-academic-demo-03", courseCode: "CSE2004", progress: 60, section: "C" },
    { userId: "student-academic-demo-03", courseCode: "CSE2001", progress: 70, section: "C" },
    // Roster students (all in CSE4001)
    { userId: "student-roster-s001", courseCode: "CSE4001", progress: 78, section: "A" },
    { userId: "student-roster-s002", courseCode: "CSE3002", progress: 64, section: "A" },
    { userId: "student-roster-s003", courseCode: "CSE2004", progress: 85, section: "B" },
    { userId: "student-roster-s004", courseCode: "CSE4001", progress: 72, section: "A" },
    { userId: "student-roster-s005", courseCode: "CSE4001", progress: 58, section: "C" },
  ];

  // Resolve actual user IDs from DB (roster students may have DB-generated IDs)
  const allStudents = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, rollNumber: true },
  });
  const rosterIdByRollNumber: Record<string, string> = {};
  for (const u of allStudents) {
    if (u.rollNumber) rosterIdByRollNumber[u.rollNumber] = u.id;
  }

  // Helper to resolve a userId spec to an actual DB user ID
  function resolveUserId(specId: string, rollNumber?: string): string {
    // Try direct ID lookup
    const direct = allStudents.find((u) => u.id === specId);
    if (direct) return direct.id;
    // Fall back to rollNumber lookup (roster students)
    if (rollNumber && rosterIdByRollNumber[rollNumber]) return rosterIdByRollNumber[rollNumber];
    return specId;
  }

  // Map spec userId to real DB userId for roster students
  const resolvedEnrollments = enrollmentSpecs.map((e) => ({
    ...e,
    userId: e.userId.startsWith("student-roster-")
      ? rosterIdByRollNumber[e.userId.replace("student-roster-s", "S")] || e.userId
      : e.userId,
  }));

  for (const e of resolvedEnrollments) {
    const cId = courses[e.courseCode];
    if (!cId) continue;
    try {
      await prisma.courseEnrollment.upsert({
        where: { userId_courseId: { userId: e.userId, courseId: cId } },
        update: { progress: e.progress },
        create: {
          userId: e.userId,
          courseId: cId,
          progress: e.progress,
          section: e.section,
          academicYear: "2025-2026",
          semester: 8,
          enrollmentStatus: "ACTIVE",
        },
      });
    } catch (err: any) {
      console.warn(`  ⚠ Enrollment skip ${e.userId} → ${e.courseCode}: ${err.message}`);
    }
  }
  console.log(`  ✔ Processed ${resolvedEnrollments.length} student-course enrollments`);

  // ── 6. Tasks (assessments) with realistic statuses for faculty dashboard ──────
  // These tasks belong to STUDENTS (userId = student) in COURSES managed by FACULTY.
  // The faculty-dashboard service queries tasks by courseId for courses the faculty manages.
  // We need a variety: COMPLETED, IN_PROGRESS (needs review), OVERDUE, PENDING

  const taskSpecs: Array<{
    id: string;
    userId: string;
    courseCode: string;
    title: string;
    category: string;
    status: string;
    priority: string;
    deadline: Date;
    weightage: number;
    progressNote?: string;
    progressPct?: number;
  }> = [
    // ── CSE4001 (NLP) — Dr. P. Raman's course ──────────────────────────────────
    {
      id: "task-nlp-saad-assign1",
      userId: "student-academic-demo-01",
      courseCode: "CSE4001",
      title: "[CSE4001] Assignment 1: Tokenization & POS Tagging",
      category: "ASSIGNMENT",
      status: "COMPLETED",
      priority: "HIGH",
      deadline: daysAgo(10),
      weightage: 20,
      progressPct: 100,
      progressNote: "Submitted and graded — 18/20",
    },
    {
      id: "task-nlp-saad-assign2",
      userId: "student-academic-demo-01",
      courseCode: "CSE4001",
      title: "[CSE4001] Assignment 2: Named Entity Recognition",
      category: "ASSIGNMENT",
      status: "IN_PROGRESS",
      priority: "HIGH",
      deadline: daysLater(2),
      weightage: 20,
      progressPct: 80,
      progressNote: "Submitted via VTOP; awaiting faculty grading and rubric evaluation",
    },
    {
      id: "task-nlp-saad-assign3",
      userId: "student-academic-demo-01",
      courseCode: "CSE4001",
      title: "[CSE4001] Assignment 3: Dependency Parsing",
      category: "ASSIGNMENT",
      status: "PENDING",
      priority: "MEDIUM",
      deadline: daysLater(7),
      weightage: 20,
    },
    {
      id: "task-nlp-saad-capstone",
      userId: "student-academic-demo-01",
      courseCode: "CSE4001",
      title: "[CSE4001] Capstone Project — Phase 1 Literature Survey",
      category: "PROJECT_REVIEW",
      status: "PENDING",
      priority: "HIGH",
      deadline: daysLater(14),
      weightage: 40,
    },
    {
      id: "task-nlp-priya-assign1",
      userId: "student-academic-demo-02",
      courseCode: "CSE4001",
      title: "[CSE4001] Assignment 1: Tokenization & POS Tagging",
      category: "ASSIGNMENT",
      status: "IN_PROGRESS",
      priority: "HIGH",
      deadline: daysLater(1),
      weightage: 20,
      progressPct: 80,
      progressNote: "Submitted via VTOP; awaiting faculty grading and rubric evaluation",
    },
    {
      id: "task-nlp-priya-capstone",
      userId: "student-academic-demo-02",
      courseCode: "CSE4001",
      title: "[CSE4001] Capstone Project Review 1",
      category: "PROJECT_REVIEW",
      status: "OVERDUE",
      priority: "CRITICAL",
      deadline: daysAgo(1),
      weightage: 40,
      progressNote: "Deadline passed; missing literature survey upload",
    },
    {
      id: "task-nlp-arjun-assign1",
      userId: "student-academic-demo-03",
      courseCode: "CSE4001",
      title: "[CSE4001] Assignment 1: Tokenization & POS Tagging",
      category: "ASSIGNMENT",
      status: "PENDING",
      priority: "HIGH",
      deadline: daysLater(1),
      weightage: 20,
    },
    {
      id: "task-nlp-arjun-capstone",
      userId: "student-academic-demo-03",
      courseCode: "CSE4001",
      title: "[CSE4001] Capstone Project Review 1",
      category: "PROJECT_REVIEW",
      status: "PENDING",
      priority: "HIGH",
      deadline: daysLater(10),
      weightage: 40,
      progressPct: 25,
      progressNote: "Topic proposal submitted; drafting survey",
    },
    // Roster students in CSE4001
    {
      id: "task-nlp-s001-assign1",
      userId: "student-roster-s001",
      courseCode: "CSE4001",
      title: "[CSE4001] Assignment 1: Tokenization & POS Tagging",
      category: "ASSIGNMENT",
      status: "COMPLETED",
      priority: "HIGH",
      deadline: daysAgo(10),
      weightage: 20,
      progressPct: 100,
      progressNote: "Submitted and graded — 19/20",
    },
    {
      id: "task-nlp-s004-assign1",
      userId: "student-roster-s004",
      courseCode: "CSE4001",
      title: "[CSE4001] Assignment 1: Tokenization & POS Tagging",
      category: "ASSIGNMENT",
      status: "IN_PROGRESS",
      priority: "HIGH",
      deadline: daysLater(1),
      weightage: 20,
      progressPct: 70,
      progressNote: "Submitted; needs grading",
    },
    {
      id: "task-nlp-s005-assign1",
      userId: "student-roster-s005",
      courseCode: "CSE4001",
      title: "[CSE4001] Assignment 1: Tokenization & POS Tagging",
      category: "ASSIGNMENT",
      status: "OVERDUE",
      priority: "CRITICAL",
      deadline: daysAgo(2),
      weightage: 20,
    },

    // ── CSE3002 (ML) — Dr. S. Kulkarni's course ────────────────────────────────
    {
      id: "task-ml-saad-term",
      userId: "student-academic-demo-01",
      courseCode: "CSE3002",
      title: "Machine Learning Term Paper on Transformers",
      category: "REPORT",
      status: "IN_PROGRESS",
      priority: "HIGH",
      deadline: daysLater(2),
      weightage: 15,
      progressPct: 85,
      progressNote: "Draft uploaded; awaiting faculty feedback",
    },
    {
      id: "task-ml-priya-svm",
      userId: "student-academic-demo-02",
      courseCode: "CSE3002",
      title: "[CSE3002] ML Exercise 3: Support Vector Machines",
      category: "ASSIGNMENT",
      status: "PENDING",
      priority: "MEDIUM",
      deadline: daysLater(5),
      weightage: 10,
    },
    {
      id: "task-ml-arjun-svm",
      userId: "student-academic-demo-03",
      courseCode: "CSE3002",
      title: "[CSE3002] ML Exercise 3: Support Vector Machines",
      category: "ASSIGNMENT",
      status: "OVERDUE",
      priority: "HIGH",
      deadline: daysAgo(1),
      weightage: 10,
      progressNote: "Deadline passed; unsubmitted kernel lab",
    },
    {
      id: "task-ml-arjun-term",
      userId: "student-academic-demo-03",
      courseCode: "CSE3002",
      title: "Machine Learning Term Paper on Transformers",
      category: "REPORT",
      status: "PENDING",
      priority: "MEDIUM",
      deadline: daysLater(2),
      weightage: 15,
      progressPct: 15,
    },
    {
      id: "task-ml-s002-report",
      userId: "student-roster-s002",
      courseCode: "CSE3002",
      title: "Machine Learning Term Paper on Transformers",
      category: "REPORT",
      status: "COMPLETED",
      priority: "HIGH",
      deadline: daysAgo(5),
      weightage: 15,
      progressPct: 100,
      progressNote: "Graded — 14/15",
    },

    // ── CSE2004 (OS) — Dr. K. Swaminathan's course ─────────────────────────────
    {
      id: "task-os-saad-sync",
      userId: "student-academic-demo-01",
      courseCode: "CSE2004",
      title: "Operating Systems Thread Synchronization Lab",
      category: "ASSIGNMENT",
      status: "PENDING",
      priority: "MEDIUM",
      deadline: daysLater(7),
      weightage: 10,
    },
    {
      id: "task-os-priya-sync",
      userId: "student-academic-demo-02",
      courseCode: "CSE2004",
      title: "Operating Systems Thread Synchronization Lab",
      category: "ASSIGNMENT",
      status: "COMPLETED",
      priority: "MEDIUM",
      deadline: daysAgo(5),
      weightage: 10,
      progressPct: 100,
      progressNote: "Graded — 9/10",
    },
    {
      id: "task-os-arjun-sync",
      userId: "student-academic-demo-03",
      courseCode: "CSE2004",
      title: "Operating Systems Thread Synchronization Lab",
      category: "ASSIGNMENT",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      deadline: daysLater(3),
      weightage: 10,
      progressPct: 70,
      progressNote: "Semaphore implementation uploaded; needs TA/faculty review",
    },
    {
      id: "task-os-s003-lab",
      userId: "student-roster-s003",
      courseCode: "CSE2004",
      title: "Operating Systems Thread Synchronization Lab",
      category: "ASSIGNMENT",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      deadline: daysLater(3),
      weightage: 10,
      progressPct: 60,
      progressNote: "Submitted early draft; awaiting review",
    },
  ];

  let created = 0;
  let skipped = 0;

  // Resolve roster student IDs for tasks
  const resolvedTaskSpecs = taskSpecs.map((t) => ({
    ...t,
    userId: t.userId.startsWith("student-roster-")
      ? rosterIdByRollNumber[t.userId.replace("student-roster-s", "S")] || t.userId
      : t.userId,
  }));

  for (const t of resolvedTaskSpecs) {
    const cId = courses[t.courseCode];
    if (!cId) {
      console.warn(`  ⚠ Skipping task ${t.id} — course ${t.courseCode} not found`);
      continue;
    }

    try {
      await prisma.task.upsert({
        where: { id: t.id },
        update: {
          status: t.status,
          priority: t.priority,
          deadline: t.deadline,
          weightage: t.weightage,
        },
        create: {
          id: t.id,
          userId: t.userId,
          courseId: cId,
          title: t.title,
          category: t.category,
          status: t.status,
          priority: t.priority,
          deadline: t.deadline,
          weightage: t.weightage,
          isAiGenerated: false,
          confidence: 0.98,
          submissionPlatform: "VTOP",
        },
      });

      // Create progress note if relevant
      if (t.progressNote || t.progressPct) {
        const existing = await prisma.taskProgress.findFirst({ where: { taskId: t.id } });
        if (!existing) {
          await prisma.taskProgress.create({
            data: {
              taskId: t.id,
              percentage: t.progressPct ?? 0,
              note: t.progressNote ?? null,
            },
          });
        } else {
          await prisma.taskProgress.update({
            where: { id: existing.id },
            data: {
              percentage: t.progressPct ?? existing.percentage,
              note: t.progressNote ?? existing.note,
            },
          });
        }
      }

      created++;
    } catch (err: any) {
      console.warn(`  ⚠ Skipped task ${t.id}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n  ✔ Tasks: ${created} created/updated, ${skipped} skipped`);

  // ── 7. Final verification summary ───────────────────────────────────────────
  const counts = await Promise.all([
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.courseFaculty.count(),
    prisma.courseEnrollment.count(),
    prisma.task.count(),
    prisma.taskProgress.count(),
  ]);

  console.log("\n── Summary ──────────────────────────────────────────────────");
  console.log(`  Faculty users:         ${counts[0]}`);
  console.log(`  Student users:         ${counts[1]}`);
  console.log(`  Faculty assignments:   ${counts[2]}`);
  console.log(`  Course enrollments:    ${counts[3]}`);
  console.log(`  Tasks/Assessments:     ${counts[4]}`);
  console.log(`  Progress records:      ${counts[5]}`);
  console.log("─────────────────────────────────────────────────────────────\n");
  console.log("Done! Faculty dashboard, submissions, and review queue should now show live data.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
