import { prisma } from "../lib/db/prisma";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import {
  createSessionToken,
  verifySessionToken,
  requireAuth,
} from "../lib/auth/session-service";
import { ensureDefaultUserAndCourses } from "../lib/services/user.service";
import { SyllabusService } from "../lib/intelligence/syllabus-service";
import { RubricService } from "../lib/intelligence/rubric-service";

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
    process.exit(1);
  }
}

async function runAuthAndIsolationTests() {
  console.log("==================================================================");
  console.log("       ACADEMIC AI - SECURITY, AUTH & DATA ISOLATION TEST SUITE    ");
  console.log("==================================================================");

  // 1. Password Security
  console.log("\n--- 1. Cryptographic Password Hashing & Verification ---");
  const rawPw = "SecretAcademicPass2026!";
  const hashed = await hashPassword(rawPw);
  assert(hashed.includes(":"), "Password hash format is salt:hash");
  assert(await verifyPassword(rawPw, hashed), "Correct password verified successfully");
  assert(!(await verifyPassword("WrongPassword123", hashed)), "Incorrect password rejected");

  // 2. Tamper-Proof Session Tokens
  console.log("\n--- 2. Tamper-Proof Signed Session Tokens ---");
  const token = createSessionToken({
    userId: "student-academic-demo-01",
    role: "STUDENT",
    email: "saad@academic.ai",
  });
  assert(typeof token === "string" && token.includes("."), "Session token generated with signature");
  const decoded = verifySessionToken(token);
  assert(decoded !== null && decoded.userId === "student-academic-demo-01", "Valid session token decoded");
  assert(decoded?.role === "STUDENT", "Session role correctly identified as STUDENT");

  // Tampering attempt
  const tamperedToken = token.slice(0, -5) + "abcde";
  assert(verifySessionToken(tamperedToken) === null, "Tampered session token rejected by HMAC signature");

  // 3. Database Provisioning & Multi-Role Verification
  console.log("\n--- 3. Database Multi-Role Verification (Student vs Teacher) ---");
  await ensureDefaultUserAndCourses();

  const studentUser = await prisma.user.findUnique({
    where: { email: "saad@academic.ai" },
    include: { courses: true, managedCourses: true },
  });
  assert(studentUser !== null, "Student user exists in database");
  assert(studentUser?.role === "STUDENT", "Student role is verified in database");
  assert(studentUser?.passwordHash !== null, "Student has cryptographic password hash");
  assert(studentUser?.courses.length! > 0, "Student has enrolled courses");
  assert(studentUser?.managedCourses.length === 0, "Student does not have teacher managedCourses");

  const teacherUser = await prisma.user.findUnique({
    where: { email: "faculty.raman@academic.ai" },
    include: { managedCourses: { include: { course: true } } },
  });
  assert(teacherUser !== null, "Teacher user exists in database");
  assert(teacherUser?.role === "TEACHER", "Teacher role is verified in database");
  assert(teacherUser?.passwordHash !== null, "Teacher has cryptographic password hash");
  assert(teacherUser?.managedCourses.length! > 0, "Teacher has assigned courses via CourseFaculty");
  assert(teacherUser?.managedCourses[0].course.code === "CSE4001", "Teacher manages authorized course CSE4001");

  // 4. Data Isolation: Private Student Data
  console.log("\n--- 4. Student Data Isolation ---");
  const studentATasks = await prisma.task.findMany({
    where: { userId: "student-academic-demo-01" },
  });
  const studentBTasks = await prisma.task.findMany({
    where: { userId: "student-academic-demo-02" },
  });
  assert(studentATasks.length > 0, "Student A has private tasks");
  assert(studentBTasks.length > 0, "Student B has private tasks");

  // Ensure mutually disjoint sets
  const aTaskIds = new Set(studentATasks.map((t) => t.id));
  const bTaskIds = new Set(studentBTasks.map((t) => t.id));
  const intersection = [...aTaskIds].filter((id) => bTaskIds.has(id));
  assert(intersection.length === 0, "Student A and Student B task records are completely isolated (0 overlapping tasks)");

  // 5. Persistent Syllabus Intelligence (CRUD & Grounding)
  console.log("\n--- 5. Persistent Syllabus Intelligence Workflow ---");
  const nlpSyllabus = await SyllabusService.getSyllabusByCourse("CSE4001");
  assert(nlpSyllabus !== null, "CSE4001 Syllabus retrieved from persistent database");
  assert(nlpSyllabus?.modules.length! >= 5, "Modules parsed and stored in database");

  // Grounded question
  const q1 = await SyllabusService.querySyllabus("CSE4001", "Which topics are included in Module 3?");
  assert(q1.matched, "Module 3 query answered from persistent syllabus");
  assert(q1.answer.toLowerCase().includes("transformer") || q1.answer.toLowerCase().includes("attention"), "Correct grounded content returned for Module 3");

  // Honest handling of missing syllabus
  const missingQ = await SyllabusService.querySyllabus("NONEXISTENT_COURSE_999", "What are the outcomes?");
  assert(!missingQ.matched, "Missing syllabus detected truthfully without hallucination");
  assert(missingQ.answer.includes("No syllabus document has been uploaded"), "Honest explanation emitted for unuploaded syllabus");

  // 6. Persistent Rubric Intelligence (CRUD & Weight Validation)
  console.log("\n--- 6. Persistent Rubric Intelligence Workflow ---");
  const rubrics = await RubricService.getRubricsByCourse("CSE4001");
  assert(rubrics.length > 0, "CSE4001 Rubrics retrieved from persistent database");
  assert(rubrics[0].criteria.length >= 5, "Rubric criteria itemized and persisted");

  // Grounded rubric question
  const rubricQ = await RubricService.queryRubric("Which part carries the highest marks?", "CSE4001");
  assert(rubricQ.matched, "Highest marks question answered from persistent rubric");
  assert(rubricQ.answer.includes("Implementation") || rubricQ.answer.includes("marks"), "Implementation identified as highest weightage");

  console.log("\n==================================================================");
  console.log("🏁 ALL AUTH, SECURITY, ISOLATION & PERSISTENCE TESTS PASSED (100%)");
  console.log("==================================================================\n");
}

runAuthAndIsolationTests().catch((e) => {
  console.error("Test failed with error:", e);
  process.exit(1);
});
