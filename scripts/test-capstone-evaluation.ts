import { prisma } from "../lib/db/prisma";
import { evaluateSubmissionWithRubric, getSampleCapstoneReportText } from "../lib/ai/gemini-evaluator";

async function runCapstoneEvaluationTests() {
  console.log("================================================================================");
  console.log("       TEST SUITE: AI Capstone Report Evaluation (Gemini 3.8 Flash & Rubric)   ");
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

  // 1. Fetch sample task and rubric from DB
  const task = await prisma.task.findFirst({
    where: {
      course: { code: "CSE4001" },
      title: { contains: "Capstone" },
    },
    include: {
      course: true,
      user: true,
      rubrics: true,
    },
  });

  assert(!!task, "Found CSE4001 Capstone task in database");
  console.log(`     Task: ${task?.title} | Student: ${task?.user.name}`);

  const rubric = await prisma.rubric.findFirst({
    where: { courseCode: "CSE4001", taskTitle: { contains: "Review 1" } },
  }) || await prisma.rubric.findFirst({ where: { courseCode: "CSE4001" } });
  assert(!!rubric, "Found CSE4001 assessment rubric in database");

  const rawCriteria = JSON.parse(rubric!.criteriaJson);
  assert(Array.isArray(rawCriteria) && rawCriteria.length >= 4, `Parsed ${rawCriteria.length} rubric criteria`);

  // 2. Generate and test report text
  const reportText = getSampleCapstoneReportText("CSE4001", task!.title, task!.user.name);
  assert(reportText.length > 500, "Generated realistic capstone report text (>500 chars)");
  assert(reportText.includes("LITERATURE SURVEY"), "Report contains literature survey section");
  assert(reportText.includes("METHODOLOGY"), "Report contains methodology section");
  assert(reportText.includes("EVALUATION METRICS"), "Report contains evaluation metrics section");

  // 3. Run evaluator
  console.log("\n>>> Executing evaluateSubmissionWithRubric()...");
  const result = await evaluateSubmissionWithRubric({
    documentText: reportText,
    rubricCriteria: rawCriteria,
    courseCode: "CSE4001",
    taskTitle: task!.title,
    studentName: task!.user.name,
    studentRollNumber: task!.user.rollNumber || "22BDS0001",
    totalMarks: rubric!.totalMarks,
  });

  assert(result.success === true, "Evaluation succeeded");
  assert(typeof result.totalMarksAwarded === "number", `Total marks awarded is numeric: ${result.totalMarksAwarded}`);
  assert(
    result.totalMarksAwarded <= result.maxPossibleMarks,
    `Total marks (${result.totalMarksAwarded}) does not exceed max (${result.maxPossibleMarks})`
  );
  assert(result.percentageScore >= 0 && result.percentageScore <= 100, `Percentage score valid: ${result.percentageScore}%`);
  assert(result.criteriaResults.length > 0, `Evaluated criteria: ${result.criteriaResults.length} scored criteria`);

  // 4. Verify each criterion result
  for (const critRes of result.criteriaResults) {
    assert(
      critRes.awardedMarks >= 0 && critRes.awardedMarks <= critRes.maxMarks,
      `Criterion '${critRes.title}': awarded marks ${critRes.awardedMarks} is clamped within [0, ${critRes.maxMarks}]`
    );
    assert(
      typeof critRes.evidenceQuote === "string" && critRes.evidenceQuote.length > 0,
      `Criterion '${critRes.title}' has evidence quote: "${critRes.evidenceQuote.slice(0, 50)}..."`
    );
  }

  assert(result.strengths.length > 0, `Strengths highlighted: ${result.strengths.length}`);
  assert(result.areasForImprovement.length > 0, `Improvement areas highlighted: ${result.areasForImprovement.length}`);
  console.log(`\n     Evaluator Model: ${result.evaluatorModel}`);
  console.log(`     Overall Score: ${result.totalMarksAwarded} / ${result.maxPossibleMarks} (${result.percentageScore}%)`);
  console.log(`     Feedback snippet: ${result.overallFeedback.slice(0, 100)}...`);

  console.log("\n================================================================================");
  console.log(`  AI Capstone Evaluation Suite: ALL ${passed} / ${total} TESTS PASSED (100%)`);
  console.log("================================================================================\n");
}

runCapstoneEvaluationTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
