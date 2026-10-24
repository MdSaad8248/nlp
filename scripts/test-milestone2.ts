import { DEMO_NOTICES } from "../lib/nlp/demo-notices";
import { classifyAcademicDocument } from "../lib/nlp/classifier";
import { extractAcademicEntities } from "../lib/nlp/ner";
import { parseTemporalExpressions } from "../lib/nlp/temporal";
import { extractAcademicNotice } from "../lib/nlp/extractor";
import { prisma } from "../lib/db/prisma";

async function runMilestone2Tests() {
  console.log("=================================================");
  console.log("🧪 ACADEMIC AI - MILESTONE 2 VERIFICATION SUITE");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details: string = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    }
  }

  // TEST SUITE 1: CLASSIFICATION ACROSS 16 DEMO NOTICES
  console.log("--- 1. Testing Notice Classification (All Categories) ---");
  for (const demo of DEMO_NOTICES) {
    const res = classifyAcademicDocument(demo.text);
    const isExpected = res.category === demo.expectedCategory;
    assert(
      isExpected,
      `Classification of "${demo.label}" -> Expected ${demo.expectedCategory}, got ${res.category}`,
      `Score: ${res.candidateScores[res.category]}, Indicators: ${res.indicators.slice(0, 2).join("; ")}`
    );
  }

  // TEST SUITE 2: TEMPORAL NORMALIZATION (Asia/Kolkata)
  console.log("\n--- 2. Testing Temporal Extraction & Asia/Kolkata Normalization ---");
  const anchorDate = new Date("2026-09-18T10:00:00+05:30"); // Friday Sep 18, 2026

  // Case A: Relative expressions
  const temp1 = parseTemporalExpressions("Submit project by tomorrow evening before 8 PM", anchorDate);
  assert(temp1.dates.length > 0, "Relative date 'tomorrow' parsed");
  assert(temp1.dates[0].day === 19 && temp1.dates[0].month === 9, "Tomorrow correctly resolved to Sep 19, 2026");
  assert(temp1.primaryDeadline !== null, "Primary deadline formulated for tomorrow evening");

  // Case B: Weekday expression
  const temp2 = parseTemporalExpressions("The NLP review is shifted to Monday at 3 PM", anchorDate);
  assert(temp2.dates.length > 0, "Weekday 'Monday' parsed");
  assert(temp2.dates[0].day === 21 && temp2.dates[0].month === 9, "Upcoming Monday resolved to Sep 21, 2026");
  assert(temp2.times.some((t) => t.formatted.includes("03:00 PM")), "Time 3 PM formatted correctly");

  // Case C: Transition detection
  const temp3 = parseTemporalExpressions(
    "The deadline is extended from September 18, 2026 to September 28, 2026 before 11:59 PM",
    anchorDate
  );
  assert(Boolean(temp3.transition), "Date transition (extension) detected");
  assert(Boolean(temp3.transition?.toRaw.includes("September 28")), "Transition target date is September 28");

  // TEST SUITE 2B: REGRESSION TESTS FOR DATE-TIME ASSOCIATION & RESCHEDULING (5 EXAMPLES)
  console.log("\n--- 2B. Regression Tests: Rescheduling & Date-Time Association (5 Examples) ---");

  // Regression 1: Shifted from Friday at 2 PM to Monday at 3 PM
  const r1Text = "The NLP project review has been shifted from Friday at 2 PM to Monday at 3 PM.";
  const r1Temp = parseTemporalExpressions(r1Text, anchorDate);
  assert(Boolean(r1Temp.transition), "R1: Shifted transition detected");
  assert(r1Temp.previousDateTime?.rawSnippet === "Friday at 2 PM", "R1: Old datetime snippet is 'Friday at 2 PM'");
  assert(Boolean(r1Temp.previousDateTime?.combinedFormatted.includes("September 25, 2026 at 2:00 PM")), "R1: Old datetime resolved to September 25, 2026 at 2:00 PM IST");
  assert(r1Temp.newDateTime?.rawSnippet === "Monday at 3 PM", "R1: New datetime snippet is 'Monday at 3 PM'");
  assert(Boolean(r1Temp.newDateTime?.combinedFormatted.includes("September 21, 2026 at 3:00 PM")), "R1: New datetime resolved to September 21, 2026 at 3:00 PM IST");
  assert(r1Temp.primaryDeadline?.rawSnippet === "Monday at 3 PM", "R1: Primary deadline raw snippet is 'Monday at 3 PM'");
  const r1Notice = extractAcademicNotice(r1Text, { referenceDate: anchorDate });
  assert(Boolean(r1Notice.tasks[0]?.normalizedDeadline?.includes("September 21, 2026 at 3:00 PM") || r1Notice.events[0]?.formattedTime?.includes("September 21, 2026 at 3:00 PM")), "R1: Actionable item uses NEW datetime (Monday at 3 PM)");
  assert(r1Notice.evidences.some((e) => e.field === "deadline" && e.rawSnippet === "Monday at 3 PM"), "R1: Grounded evidence points to 'Monday at 3 PM'");

  // Regression 2: Rescheduled from Wednesday at 4 PM to Friday at 5 PM
  const r2Text = "The ML Quiz 2 was rescheduled from Wednesday at 4 PM to Friday at 5 PM.";
  const r2Temp = parseTemporalExpressions(r2Text, anchorDate);
  assert(Boolean(r2Temp.transition), "R2: Rescheduled transition detected");
  assert(r2Temp.previousDateTime?.rawSnippet === "Wednesday at 4 PM", "R2: Old datetime snippet is 'Wednesday at 4 PM'");
  assert(Boolean(r2Temp.previousDateTime?.combinedFormatted.includes("September 23, 2026 at 4:00 PM")), "R2: Old datetime resolved to Sep 23 at 4 PM");
  assert(r2Temp.newDateTime?.rawSnippet === "Friday at 5 PM", "R2: New datetime snippet is 'Friday at 5 PM'");
  assert(Boolean(r2Temp.newDateTime?.combinedFormatted.includes("September 25, 2026 at 5:00 PM")), "R2: New datetime resolved to Sep 25 at 5 PM");
  assert(r2Temp.primaryDeadline?.rawSnippet === "Friday at 5 PM", "R2: Primary deadline snippet is 'Friday at 5 PM'");

  // Regression 3: Moved from Thursday at 10 AM to Saturday at 11 AM
  const r3Text = "The OS lecture has been moved from Thursday at 10 AM to Saturday at 11 AM in SJT 402.";
  const r3Temp = parseTemporalExpressions(r3Text, anchorDate);
  assert(Boolean(r3Temp.transition), "R3: Moved transition detected");
  assert(r3Temp.previousDateTime?.rawSnippet === "Thursday at 10 AM", "R3: Old datetime snippet is 'Thursday at 10 AM'");
  assert(Boolean(r3Temp.previousDateTime?.combinedFormatted.includes("September 24, 2026 at 10:00 AM")), "R3: Old datetime resolved to Sep 24 at 10 AM");
  assert(r3Temp.newDateTime?.rawSnippet === "Saturday at 11 AM", "R3: New datetime snippet is 'Saturday at 11 AM'");
  assert(Boolean(r3Temp.newDateTime?.combinedFormatted.includes("September 19, 2026 at 11:00 AM")), "R3: New datetime resolved to Sep 19 at 11 AM");
  assert(r3Temp.primaryDeadline?.rawSnippet === "Saturday at 11 AM", "R3: Primary deadline snippet is 'Saturday at 11 AM'");

  // Regression 4: Postponed from Oct 05 at 9:30 AM to Oct 12 at 10:30 AM
  const r4Text = "Computer Networks CAT-1 is postponed from October 05 at 9:30 AM to October 12 at 10:30 AM.";
  const r4Temp = parseTemporalExpressions(r4Text, anchorDate);
  assert(Boolean(r4Temp.transition), "R4: Postponed transition detected");
  assert(r4Temp.previousDateTime?.rawSnippet === "October 05 at 9:30 AM", "R4: Old datetime snippet is 'October 05 at 9:30 AM'");
  assert(Boolean(r4Temp.previousDateTime?.combinedFormatted.includes("October 05, 2026 at 9:30 AM")), "R4: Old datetime resolved to Oct 05 at 9:30 AM");
  assert(r4Temp.newDateTime?.rawSnippet === "October 12 at 10:30 AM", "R4: New datetime snippet is 'October 12 at 10:30 AM'");
  assert(Boolean(r4Temp.newDateTime?.combinedFormatted.includes("October 12, 2026 at 10:30 AM")), "R4: New datetime resolved to Oct 12 at 10:30 AM");
  assert(r4Temp.primaryDeadline?.rawSnippet === "October 12 at 10:30 AM", "R4: Primary deadline snippet is 'October 12 at 10:30 AM'");

  // Regression 5: Preponed from Monday at 5 PM to Sunday at 6 PM
  const r5Text = "DSA Defaulters lab submission has been preponed from Monday at 5 PM to Sunday at 6 PM.";
  const r5Temp = parseTemporalExpressions(r5Text, anchorDate);
  assert(Boolean(r5Temp.transition), "R5: Preponed transition detected");
  assert(r5Temp.previousDateTime?.rawSnippet === "Monday at 5 PM", "R5: Old datetime snippet is 'Monday at 5 PM'");
  assert(Boolean(r5Temp.previousDateTime?.combinedFormatted.includes("September 21, 2026 at 5:00 PM")), "R5: Old datetime resolved to Sep 21 at 5 PM");
  assert(r5Temp.newDateTime?.rawSnippet === "Sunday at 6 PM", "R5: New datetime snippet is 'Sunday at 6 PM'");
  assert(Boolean(r5Temp.newDateTime?.combinedFormatted.includes("September 20, 2026 at 6:00 PM")), "R5: New datetime resolved to Sep 20 at 6 PM");
  assert(r5Temp.primaryDeadline?.rawSnippet === "Sunday at 6 PM", "R5: Primary deadline snippet is 'Sunday at 6 PM'");

  // TEST SUITE 3: ENTITY & CONDITION EXTRACTION
  console.log("\n--- 3. Testing Entity, Marks, and Condition Extraction ---");

  // Case A: Course code explicitly extracted from source
  const ent1 = extractAcademicEntities("Assignment for CSE4001 Natural Language Processing on VTOP.");
  assert(ent1.courseCodes.includes("CSE4001"), "Course code CSE4001 extracted");
  assert(ent1.primaryCourseCodeOrigin === "EXTRACTED_FROM_SOURCE", "Course code marked as EXTRACTED_FROM_SOURCE");
  assert(ent1.courses.includes("Natural Language Processing"), "Course name Natural Language Processing extracted");
  assert(ent1.platforms.includes("VTOP"), "Platform VTOP extracted");

  // Case B: Course code inferred/resolved from academic database registry (no code in notice)
  const entInferred = extractAcademicEntities("The Natural Language Processing project review has been scheduled.");
  assert(entInferred.primaryCourseCode === "CSE4001", "Course code CSE4001 inferred from course name");
  assert(entInferred.primaryCourseCodeOrigin === "RESOLVED_FROM_REGISTRY", "Course code marked as RESOLVED_FROM_REGISTRY");
  assert(
    Boolean(entInferred.courseResolutions.some((r) => r.code === "CSE4001" && r.codeOrigin === "RESOLVED_FROM_REGISTRY")),
    "CourseResolution records registry origin distinction"
  );

  // Case C: Conditions extraction
  const ent2 = extractAcademicEntities(
    "Final reminder for students who have not submitted Assignment 1. Defaulters will receive zero marks."
  );
  assert(
    ent2.conditions.some((c) => c.toLowerCase().includes("students who have not submitted")),
    "Condition 'students who have not submitted' extracted"
  );
  assert(ent2.penaltyClause !== null, "Penalty clause detected");

  // Case D: Marks and weightage
  const ent3 = extractAcademicEntities("Lab report carries 20% weightage, total 50 marks.");
  assert(ent3.weightage === 20, "20% weightage extracted as numeric 20");
  assert(ent3.marks === 50, "Total 50 marks extracted as numeric 50");

  // Case E: Venue
  const ent4 = extractAcademicEntities("Review session in SJT 402 at 10 AM.");
  assert(ent4.venues.includes("SJT 402"), "Venue SJT 402 extracted");

  // TEST SUITE 4: END-TO-END EXTRACTION PIPELINE & SOURCE EVIDENCE
  console.log("\n--- 4. Testing End-to-End NLP Extractor with Source Evidence & Classification Score ---");
  const sampleNotice = DEMO_NOTICES[0].text; // NLP Assignment 2
  const pipelineResult = extractAcademicNotice(sampleNotice, { referenceDate: anchorDate });

  assert(pipelineResult.category === "ASSIGNMENT", "Pipeline classified as ASSIGNMENT");
  assert(pipelineResult.classificationScore > 0, `Classification score calculated (${pipelineResult.classificationScore})`);
  assert(pipelineResult.tasks.length > 0, "Candidate task created");
  assert(pipelineResult.tasks[0].courseCode === "CSE4001", "Task linked to course code CSE4001");
  assert(pipelineResult.tasks[0].courseCodeOrigin === "EXTRACTED_FROM_SOURCE", "Task courseCodeOrigin preserved");
  assert(pipelineResult.tasks[0].submissionPlatform === "VTOP", "Task linked to platform VTOP");
  assert(pipelineResult.tasks[0].marks === 20, "Task marks extracted as 20");
  assert(pipelineResult.tasks[0].evidences.length > 0, "Source evidences attached to task");
  assert(
    pipelineResult.tasks[0].evidences.some((ev) => ev.field === "courseCode" && ev.rawSnippet === "CSE4001"),
    "Verbatim source evidence present for course code"
  );

  // TEST SUITE 5: DATABASE PERSISTENCE & PRISMA MODELS VERIFICATION
  console.log("\n--- 5. Testing Database Models & Ingest/Confirm Flow ---");

  let testSourceId: string | null = null;
  let testTaskId: string | null = null;
  let evidenceId: string | null = null;
  let testUserId: string | null = null;

  try {
    const testSource = await prisma.academicSource.create({
      data: {
        title: "Test Ingest Source",
        rawText: sampleNotice,
        channel: "TEST_RUNNER",
      },
    });
    testSourceId = testSource.id;
    assert(testSource.id !== null, "AcademicSource record created");

    const defaultUser = await prisma.user.upsert({
      where: { email: "test.student@academicai.edu" },
      update: {},
      create: {
        email: "test.student@academicai.edu",
        name: "Test Student",
      },
    });
    testUserId = defaultUser.id;
    assert(defaultUser.id !== null, "User record verified");

    const testTask = await prisma.task.create({
      data: {
        userId: defaultUser.id,
        title: pipelineResult.tasks[0].title,
        category: pipelineResult.tasks[0].category,
        priority: pipelineResult.tasks[0].priority,
        weightage: pipelineResult.tasks[0].marks,
        isAiGenerated: true,
        confidence: pipelineResult.tasks[0].confidence,
      },
    });
    testTaskId = testTask.id;
    assert(testTask.id !== null, "Task record created");

    // Create SourceEvidence linking source and task
    const evidence = await prisma.sourceEvidence.create({
      data: {
        sourceId: testSource.id,
        taskId: testTask.id,
        fieldName: "task",
        extractedSnippet: "Assignment 2 for CSE4001 Natural Language Processing",
        confidence: 0.98,
      },
    });
    evidenceId = evidence.id;
    assert(evidence.id !== null, "SourceEvidence record created and linked to source and task");
  } finally {
    // Clean up test data completely
    if (evidenceId) await prisma.sourceEvidence.deleteMany({ where: { id: evidenceId } });
    if (testTaskId) await prisma.task.deleteMany({ where: { id: testTaskId } });
    if (testSourceId) await prisma.academicSource.deleteMany({ where: { id: testSourceId } });
    if (testUserId) await prisma.user.deleteMany({ where: { id: testUserId } });
    assert(true, "Database cleanup successful");
  }

  console.log("\n=================================================");
  console.log(`🏁 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=================================================\n");

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runMilestone2Tests()
  .then(() => {
    prisma.$disconnect();
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    prisma.$disconnect();
    process.exit(1);
  });
