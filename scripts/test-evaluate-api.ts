import { prisma } from "../lib/db/prisma";
import { createSessionToken } from "../lib/auth/session-service";

async function runEvaluateApiTests() {
  console.log("================================================================================");
  console.log("       TEST SUITE: POST /api/submissions/evaluate API Integration            ");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✔ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Fetch Dr. Raman (faculty) and his managed courses
  const faculty = await prisma.user.findFirst({
    where: { role: "TEACHER", email: "faculty.raman@academic.ai" },
    include: { managedCourses: { include: { course: true } } },
  });
  assert(!!faculty, "Found Dr. P. Raman faculty account");

  // 2. Fetch a task belonging to CSE4001 (managed by Dr. Raman)
  const ramanTask = await prisma.task.findFirst({
    where: {
      course: { code: "CSE4001" },
      status: { not: "CANCELLED" },
    },
    include: { course: true, user: true },
  });
  assert(!!ramanTask, "Found CSE4001 task managed by Dr. Raman");

  // 3. Fetch a task belonging to an unauthorized course (e.g., CSE2004 managed by Dr. Kulkarni)
  const unauthorizedTask = await prisma.task.findFirst({
    where: {
      course: { code: "CSE2004" },
      status: { not: "CANCELLED" },
    },
    include: { course: true },
  });
  assert(!!unauthorizedTask, "Found CSE2004 task (not managed by Dr. Raman)");

  // Create valid HMAC-signed session cookie for Dr. Raman
  const sessionToken = createSessionToken({
    userId: faculty!.id,
    email: faculty!.email,
    role: "TEACHER",
  });

  const baseUrl = "http://localhost:3000";

  // Test 1: Unauthorized request (no cookie)
  console.log("\n>>> Test 1: Testing unauthorized request without session cookie...");
  const resNoAuth = await fetch(`${baseUrl}/api/submissions/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId: ramanTask!.id }),
  });
  assert(resNoAuth.status === 403, `Returns 403 without faculty auth (got ${resNoAuth.status})`);

  // Test 2: Forbidden request (Dr. Raman requesting submission for Dr. Kulkarni's course)
  console.log("\n>>> Test 2: Testing multi-faculty isolation (unauthorized course)...");
  const resForbidden = await fetch(`${baseUrl}/api/submissions/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `academic_auth_session=${sessionToken}; academic_student_id=${faculty!.id}; academic_user_role=TEACHER`,
    },
    body: JSON.stringify({ taskId: unauthorizedTask!.id }),
  });
  assert(
    resForbidden.status === 403,
    `Returns 403 when evaluating course not assigned to faculty (got ${resForbidden.status})`
  );

  // Test 3: Authorized request (Dr. Raman evaluating submission for his CSE4001 course)
  console.log("\n>>> Test 3: Testing authorized rubric evaluation for Dr. Raman's course...");
  const resOk = await fetch(`${baseUrl}/api/submissions/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `academic_auth_session=${sessionToken}; academic_student_id=${faculty!.id}; academic_user_role=TEACHER`,
    },
    body: JSON.stringify({ taskId: ramanTask!.id }),
  });

  assert(resOk.status === 200, `Authorized request returned 200 OK (got ${resOk.status})`);
  const data = await resOk.json();
  assert(data.success === true, "Response reports success: true");
  assert(data.taskId === ramanTask!.id, "Response matches requested taskId");
  assert(data.course.code === "CSE4001", "Course code matches CSE4001");
  assert(!!data.evaluation, "Evaluation object present in response");
  assert(typeof data.evaluation.totalMarksAwarded === "number", "Evaluation has totalMarksAwarded");
  assert(data.evaluation.criteriaResults.length >= 4, `Evaluation has ${data.evaluation.criteriaResults.length} criteria results`);

  console.log("\n================================================================================");
  console.log(`  POST /api/submissions/evaluate API: ALL ${passed} / ${total} TESTS PASSED (100%)`);
  console.log("================================================================================\n");
}

runEvaluateApiTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
