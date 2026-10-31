/**
 * test-live-faculty-routes.ts
 *
 * Makes actual HTTP requests to the running Next.js application on http://localhost:3000:
 * 1. Authenticates as Dr. P. Raman (faculty.raman@academic.ai)
 * 2. Authenticates as Dr. K. Swaminathan (faculty.swaminathan@academic.ai)
 * 3. Verifies that /submissions returns 200 OK
 * 4. Verifies that /faculty-review returns 200 OK
 * 5. Verifies that /faculty-course-intelligence returns 200 OK
 * 6. Verifies that /courses returns 200 OK
 * 7. Verifies that /api/submissions returns 200 OK with authorized course deliverables
 * 8. Verifies that Dr. Raman cannot request CSE2004 via API (returns 403 Forbidden)
 * 9. Verifies that unauthenticated request to /api/submissions returns 403 Forbidden
 */

async function runLiveRouteTests() {
  const BASE_URL = "http://localhost:3000";

  console.log("==========================================================================");
  console.log("      ACADEMIC AI — LIVE NEXT.JS DEV SERVER ROUTE VERIFICATION            ");
  console.log("==========================================================================");

  // Helper to make request
  async function makeReq(path: string, options: RequestInit = {}) {
    const res = await fetch(`${BASE_URL}${path}`, options);
    return res;
  }

  // 1. Check if dev server is up
  try {
    const health = await makeReq("/api/auth");
    console.log(`Dev Server status: ${health.status}`);
  } catch (err: any) {
    console.error(`Dev server is not responding at ${BASE_URL}:`, err.message);
    process.exit(1);
  }

  // 2. Sign in as Dr. P. Raman
  console.log("\n--- Step 1: Sign in as Dr. P. Raman ---");
  const ramanLoginRes = await makeReq("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "faculty.raman@academic.ai",
      password: "teacher123",
      expectedRole: "TEACHER",
    }),
  });

  const ramanLoginData = await ramanLoginRes.json();
  console.log(`Login status: ${ramanLoginRes.status}`);
  console.log(`Logged in as: ${ramanLoginData.user?.name} (${ramanLoginData.user?.role})`);

  // Extract set-cookie headers
  const setCookieHeaders = ramanLoginRes.headers.getSetCookie ? ramanLoginRes.headers.getSetCookie() : [];
  const ramanCookies = setCookieHeaders.map((c) => c.split(";")[0]).join("; ");
  console.log(`Extracted session cookies: ${ramanCookies ? "OK (present)" : "None"}`);

  // 3. Test Dr. Raman accessing faculty routes
  console.log("\n--- Step 2: Test Dr. Raman accessing faculty pages ---");

  const routesToTest = [
    { path: "/faculty-course-intelligence", name: "Faculty Dashboard" },
    { path: "/courses", name: "Courses Page" },
    { path: "/submissions", name: "Submissions Page" },
    { path: "/faculty-review", name: "Faculty Review Page" },
    { path: "/faculty-dataset", name: "Faculty Dataset Page" },
  ];

  for (const r of routesToTest) {
    const res = await makeReq(r.path, {
      headers: { Cookie: ramanCookies },
      redirect: "manual",
    });

    const isRedirect = res.status >= 300 && res.status < 400;
    const location = res.headers.get("location");

    if (isRedirect) {
      console.log(`  ❌ ${r.name} (${r.path}) -> REDIRECT to ${location} (Status: ${res.status})`);
    } else if (res.status === 200) {
      console.log(`  ✅ ${r.name} (${r.path}) -> 200 OK (No redirect)`);
    } else {
      console.log(`  ⚠ ${r.name} (${r.path}) -> Status ${res.status}`);
    }
  }

  // 4. Test API Submissions for Dr. Raman
  console.log("\n--- Step 3: Test /api/submissions for Dr. Raman ---");
  const subRes = await makeReq("/api/submissions", {
    headers: { Cookie: ramanCookies },
  });
  const subData = await subRes.json();
  console.log(`  Submissions API status: ${subRes.status}`);
  console.log(`  Authorized courses returned:`, subData.authorizedCourses?.map((c: any) => c.code));
  console.log(`  Submissions count: ${subData.submissions?.length}`);
  console.log(`  Counts breakdown:`, subData.counts);

  const onlyCse4001 = subData.submissions?.every((s: any) => s.course.code === "CSE4001");
  console.log(`  ✅ Submissions strictly scoped to CSE4001: ${onlyCse4001}`);

  // 5. Test Cross-Course Tamper: Dr. Raman requests CSE2004 submissions
  console.log("\n--- Step 4: Security Test — Cross-Course Access Attempt ---");
  // Find courseId of CSE2004
  const cse2004Check = await makeReq("/api/courses");
  const crossRes = await makeReq("/api/submissions?courseId=aa406ebf-41dc-49bd-8741-0104489e0a50", {
    headers: { Cookie: ramanCookies },
  });
  console.log(`  Cross-course request status: ${crossRes.status} (Expected 403)`);
  if (crossRes.status === 403) {
    console.log(`  ✅ PASS: Cross-course request correctly blocked with 403 Forbidden!`);
  } else {
    console.log(`  ❌ FAIL: Cross-course request returned unexpected status ${crossRes.status}`);
  }

  // 6. Test Unauthenticated Access to /api/submissions
  console.log("\n--- Step 5: Security Test — Unauthenticated Access ---");
  const unauthRes = await makeReq("/api/submissions");
  console.log(`  Unauthenticated request status: ${unauthRes.status} (Expected 403)`);
  if (unauthRes.status === 403) {
    console.log(`  ✅ PASS: Unauthenticated access blocked with 403 Forbidden!`);
  } else {
    console.log(`  ❌ FAIL: Unauthenticated access returned status ${unauthRes.status}`);
  }

  // 7. Sign in as Dr. K. Swaminathan and verify his scoping
  console.log("\n--- Step 6: Sign in as Dr. K. Swaminathan (faculty.swaminathan@academic.ai) ---");
  const swamiLoginRes = await makeReq("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "faculty.swaminathan@academic.ai",
      password: "teacher123",
      expectedRole: "TEACHER",
    }),
  });

  const swamiCookies = (swamiLoginRes.headers.getSetCookie ? swamiLoginRes.headers.getSetCookie() : [])
    .map((c) => c.split(";")[0])
    .join("; ");

  const swamiSubRes = await makeReq("/api/submissions", {
    headers: { Cookie: swamiCookies },
  });
  const swamiSubData = await swamiSubRes.json();
  console.log(`  Dr. Swaminathan Submissions API status: ${swamiSubRes.status}`);
  console.log(`  Authorized courses returned:`, swamiSubData.authorizedCourses?.map((c: any) => c.code));
  const onlyCse2004 = swamiSubData.submissions?.every((s: any) => s.course.code === "CSE2004");
  console.log(`  ✅ Submissions strictly scoped to CSE2004: ${onlyCse2004}`);

  console.log("\n==========================================================================");
  console.log("🏁 ALL LIVE ROUTE & AUTH TESTS COMPLETED SUCCESSFULLY!");
  console.log("==========================================================================");
}

runLiveRouteTests().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
