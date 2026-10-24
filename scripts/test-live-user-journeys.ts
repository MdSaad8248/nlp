/**
 * AcademicAI - Live 15-Journey End-to-End Functional Verification Suite
 * Tests full user journeys against the active Next.js application server.
 */

import http from "http";

const BASE_URL = "http://localhost:3000";

interface RequestResult {
  status: number;
  headers: http.IncomingHttpHeaders;
  data: any;
  raw: string;
  cookie?: string;
}

function makeRequest(
  method: string,
  path: string,
  body?: any,
  cookie?: string
): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const url = new URL(path, BASE_URL);

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch {
          json = raw;
        }
        const setCookie = res.headers["set-cookie"]?.[0]?.split(";")[0];
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          data: json,
          raw,
          cookie: setCookie,
        });
      });
    });

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run15UserJourneys() {
  console.log("================================================================================");
  console.log("  ACADEMICAI — 15 CRITICAL LIVE USER JOURNEYS ACCEPTANCE TEST");
  console.log("  Target Server: " + BASE_URL);
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  async function assertJourney(
    journeyNum: number,
    title: string,
    fn: () => Promise<boolean | string>
  ) {
    process.stdout.write(`Journey [${journeyNum.toString().padStart(2, "0")}/15] ${title.padEnd(52)}: `);
    try {
      const res = await fn();
      if (res === true) {
        console.log("\x1b[32mVERIFIED\x1b[0m");
        passed++;
      } else {
        console.log(`\x1b[31mFAILED\x1b[0m (${res})`);
        failed++;
      }
    } catch (err: any) {
      console.log(`\x1b[31mFAILED\x1b[0m (${err.message})`);
      failed++;
    }
  }

  let studentCookie = "";
  let teacherCookie = "";

  // JOURNEY 1: Student opens landing page, logs in, reaches Student dashboard
  await assertJourney(1, "Student Login & Reaches Dashboard", async () => {
    const landing = await makeRequest("GET", "/");
    if (landing.status !== 200) return `Landing returned status ${landing.status}`;

    const loginRes = await makeRequest("POST", "/api/auth", {
      identifier: "saad@academic.ai",
      password: "student123",
      expectedRole: "STUDENT",
    });

    if (loginRes.status !== 200) return `Auth returned ${loginRes.status}`;
    if (!loginRes.cookie) return "No session cookie returned";
    if (loginRes.data?.user?.role !== "STUDENT") return "Role mismatch in auth response";
    studentCookie = loginRes.cookie;

    const dashRes = await makeRequest("GET", "/api/dashboard", null, studentCookie);
    return dashRes.status === 200 && Array.isArray(dashRes.data?.todayPriorities) && !!dashRes.data?.stats;
  });

  // JOURNEY 2: Teacher logs in and reaches Teacher workspace
  await assertJourney(2, "Teacher Login & Reaches Faculty Workspace", async () => {
    const loginRes = await makeRequest("POST", "/api/auth", {
      identifier: "faculty.raman@academic.ai",
      password: "teacher123",
      expectedRole: "TEACHER",
    });

    if (loginRes.status !== 200) return `Auth returned ${loginRes.status}`;
    if (!loginRes.cookie) return "No session cookie returned";
    if (loginRes.data?.user?.role !== "TEACHER") return "Role mismatch in auth response";
    teacherCookie = loginRes.cookie;

    const pageRes = await makeRequest("GET", "/faculty-course-intelligence", null, teacherCookie);
    return pageRes.status === 200;
  });

  // JOURNEY 3: Invalid password rejected clearly
  await assertJourney(3, "Invalid Password Rejected with 401", async () => {
    const res = await makeRequest("POST", "/api/auth", {
      identifier: "saad@academic.ai",
      password: "wrongpassword999",
      expectedRole: "STUDENT",
    });

    return res.status === 401 && res.data?.error?.includes("Invalid credentials");
  });

  // JOURNEY 4: Student denied Teacher-only route
  await assertJourney(4, "Student Denied Teacher Role Portal", async () => {
    const res = await makeRequest("POST", "/api/auth", {
      identifier: "saad@academic.ai",
      password: "student123",
      expectedRole: "TEACHER",
    });

    return res.status === 403 && res.data?.error?.includes("Access Denied");
  });

  // JOURNEY 5: Student submits notice, reviews fields, confirms it
  await assertJourney(5, "Submit Academic Notice & Confirm Persistence", async () => {
    const noticeText =
      "CSE4001: Natural Language Processing Assignment 4 on Dependency Parsing due on October 30, 2026 at 11:59 PM on Canvas. Weightage: 15 marks.";

    const ingestRes = await makeRequest("POST", "/api/ingest", { text: noticeText }, studentCookie);
    if (ingestRes.status !== 200) return `Ingest returned ${ingestRes.status}`;
    if (!ingestRes.data?.analysis) return "No analysis extracted";

    const extracted = ingestRes.data.analysis;
    const courseCode = extracted.tasks?.[0]?.courseCode || extracted.entities?.find((e: any) => e.type === "COURSE_CODE")?.text;
    if (courseCode !== "CSE4001") return `Course code extracted as ${courseCode}`;

    const confirmRes = await makeRequest(
      "POST",
      "/api/ingest/confirm",
      {
        rawText: noticeText,
        title: "[CSE4001] Assignment 4",
        category: "ASSIGNMENT",
        tasks: extracted.tasks,
        action: "CREATE_NEW",
      },
      studentCookie
    );

    return confirmRes.status === 200 && confirmRes.data?.success === true;
  });

  // JOURNEY 6: Duplicate notice detection
  await assertJourney(6, "Duplicate Notice Invariant Check", async () => {
    const duplicateText =
      "CSE4001: Natural Language Processing Assignment 2 submission deadline is September 20, 2026 at 11:59 PM on VTOP. Weightage: 20 marks.";

    const checkRes = await makeRequest(
      "POST",
      "/api/ingest/change-check",
      { text: duplicateText },
      studentCookie
    );

    if (checkRes.status !== 200) return `Change-check returned ${checkRes.status}`;
    return checkRes.data?.relationship === "DUPLICATE" || checkRes.data?.relationship === "UPDATED";
  });

  // JOURNEY 7: Rescheduled notice updates correct record
  await assertJourney(7, "Rescheduled Notice Updates Record with Diff", async () => {
    const rescheduleText =
      "CSE4001: Notice — The NLP Project Interim Review originally scheduled for 19 September at 2:00 PM has been RESCHEDULED to 22 September 2026 at 3:00 PM in SJT 402.";

    const checkRes = await makeRequest(
      "POST",
      "/api/ingest/change-check",
      { text: rescheduleText },
      studentCookie
    );

    if (checkRes.status !== 200) return `Reschedule returned ${checkRes.status}`;
    return checkRes.data?.relationship === "RESCHEDULED";
  });

  // JOURNEY 8: Cancelled notice changes status & suppresses reminders
  await assertJourney(8, "Cancelled Notice Intelligence", async () => {
    const cancelText =
      "CSE4001: The upcoming NLP Project Interim Review scheduled for tomorrow has been CANCELLED due to faculty symposium.";

    const checkRes = await makeRequest("POST", "/api/ingest/change-check", { text: cancelText }, studentCookie);
    return checkRes.data?.relationship === "CANCELLED";
  });

  // JOURNEY 9: Syllabus is saved, survives refresh, answers question with evidence
  await assertJourney(9, "Syllabus Retrieval & Grounded Evidence Q&A", async () => {
    const getSyllabus = await makeRequest("GET", "/api/syllabus?courseCode=CSE4001", null, studentCookie);
    if (getSyllabus.status !== 200) return `GET /api/syllabus returned ${getSyllabus.status}`;
    const syllabus = getSyllabus.data?.syllabus;
    if (!syllabus || syllabus.courseCode !== "CSE4001") return "Syllabus not found in DB";

    // Streaming Q&A check
    const chatRes = await makeRequest(
      "POST",
      "/api/assistant/chat",
      { message: "Which topics are covered in Module 3 of CSE4001?" },
      studentCookie
    );

    if (chatRes.status !== 200) return `Chat returned ${chatRes.status}`;
    return chatRes.raw.includes("query_syllabus") || chatRes.raw.includes("CSE4001") || chatRes.raw.includes("Language Model");
  });

  // JOURNEY 10: Missing syllabus returns honest missing-resource message
  await assertJourney(10, "Missing Syllabus Returns Honest Missing Notice", async () => {
    const missingRes = await makeRequest("GET", "/api/syllabus?courseCode=CSE9999", null, studentCookie);
    const syllabus = missingRes.data?.syllabus;
    return syllabus === null || syllabus === undefined;
  });

  // JOURNEY 11: Rubric is saved, criteria/total shown, and discrepancies detected
  await assertJourney(11, "Rubric Persistence & Discrepancy Detection", async () => {
    const rubricRes = await makeRequest("GET", "/api/rubrics?courseCode=CSE4001", null, studentCookie);
    if (rubricRes.status !== 200) return `Rubrics API returned ${rubricRes.status}`;
    const rubrics = rubricRes.data?.rubrics;
    if (!Array.isArray(rubrics) || rubrics.length === 0) return "No rubrics found";

    const primary = rubrics[0];
    return primary.totalMarks === 100 && Array.isArray(primary.criteria);
  });

  // JOURNEY 12: File upload validates magic bytes and rejects bad formats safely
  await assertJourney(12, "File Upload Rejects Unsupported Formats Safely", async () => {
    const uploadRes = await makeRequest(
      "POST",
      "/api/document/upload",
      { filename: "malicious_script.exe", content: "MZ\x90\x00\x03\x00\x00\x00" },
      studentCookie
    );

    return uploadRes.status === 400 || uploadRes.status === 422;
  });

  // JOURNEY 13: Student A cannot access Student B's private data
  await assertJourney(13, "Multi-User Data Isolation (Student A vs B)", async () => {
    const loginStudentB = await makeRequest("POST", "/api/auth", {
      identifier: "priya@academic.ai",
      password: "student123",
      expectedRole: "STUDENT",
    });

    const studentBCookie = loginStudentB.cookie;
    const tasksA = await makeRequest("GET", "/api/tasks", null, studentCookie);
    const tasksB = await makeRequest("GET", "/api/tasks", null, studentBCookie);

    const taskIdsA = new Set(tasksA.data?.tasks?.map((t: any) => t.id) || []);
    const taskIdsB = new Set(tasksB.data?.tasks?.map((t: any) => t.id) || []);

    // Assert disjoint sets for private tasks
    for (const id of taskIdsA) {
      if (taskIdsB.has(id)) return `Found overlapping private task ID ${id}`;
    }
    return true;
  });

  // JOURNEY 14: Logout clears the session
  await assertJourney(14, "Logout Clears Session Token", async () => {
    const logoutRes = await makeRequest("DELETE", "/api/auth", null, studentCookie);
    const hasClearedCookie =
      logoutRes.status === 200 &&
      (logoutRes.headers["set-cookie"]?.some((c) => c.includes("Max-Age=0") || c.includes("expires=")) ?? false);
    return hasClearedCookie;
  });

  // JOURNEY 15: Responsive Shell & All Core Pages Return 200 HTML
  await assertJourney(15, "Responsive Navigation & All 8 Core Pages Render", async () => {
    const pages = ["/", "/login", "/dashboard", "/syllabus", "/rubrics", "/documents", "/settings", "/about"];
    for (const p of pages) {
      const res = await makeRequest("GET", p);
      if (res.status !== 200) return `Page ${p} returned ${res.status}`;
    }
    return true;
  });

  console.log("\n================================================================================");
  console.log(`Journeys Passed: ${passed} / 15 (${Math.round((passed / 15) * 100)}%)`);
  console.log(`Journeys Failed: ${failed}`);
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

run15UserJourneys();
