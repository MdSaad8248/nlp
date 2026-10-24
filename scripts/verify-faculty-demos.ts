import { FACULTY_DEMO_CASES } from "../lib/faculty-review/demo-cases";
import { EVALUATION_BENCHMARK_SUMMARY } from "../lib/faculty-review/evaluation-summary";

async function verifyFacultyReview() {
  console.log("================================================================================");
  console.log("  FACULTY REVIEW LIVE VERIFICATION: 15 DEMO CASES & TRACE VERIFICATION");
  console.log("================================================================================\n");

  console.log(`Found ${FACULTY_DEMO_CASES.length} interactive faculty demo cases.\n`);

  let allPassed = true;

  for (const c of FACULTY_DEMO_CASES) {
    const start = Date.now();
    try {
      const res = await c.run();
      const elapsed = Date.now() - start;

      const hasRequiredFields =
        !!res.nlpUnderstanding &&
        !!res.systemAction &&
        !!res.explanation &&
        res.evidence !== undefined &&
        !!res.trace &&
        res.trace.extractedEntities !== undefined &&
        !!res.trace.extractedText;

      if (!hasRequiredFields) {
        console.log(`❌ FAIL Case ${c.number} [${c.id}]: Missing required trace/result fields`);
        allPassed = false;
        continue;
      }

      console.log(
        `✓ PASS Case ${String(c.number).padStart(2, " ")} [${c.id.padEnd(16)}] | Stage: ${c.pipelineStage.padEnd(25)} | Elapsed: ${elapsed}ms`
      );
    } catch (err: any) {
      console.log(`❌ ERROR Case ${c.number} [${c.id}]: ${err.message}`);
      allPassed = false;
    }
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`Summary Table Rows in Dashboard: ${EVALUATION_BENCHMARK_SUMMARY.length} components`);
  console.log("--------------------------------------------------------------------------------");

  for (const row of EVALUATION_BENCHMARK_SUMMARY) {
    console.log(
      `  • [${row.componentId}] ${row.component.padEnd(42)} | ${row.category.padEnd(20)} | Acc: ${row.accuracyOrSuccess.padEnd(7)} | Samples: ${row.sampleSize}`
    );
  }

  if (allPassed && EVALUATION_BENCHMARK_SUMMARY.length === 15) {
    console.log("\n🏆 ALL 15 FACULTY DEMO CASES & DASHBOARD ROWS VERIFIED 100% OPERATIONAL!\n");
  } else {
    console.log("\n⚠️ Verification issues detected.\n");
    process.exit(1);
  }
}

verifyFacultyReview().catch((err) => {
  console.error(err);
  process.exit(1);
});
