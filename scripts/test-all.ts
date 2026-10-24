/**
 * AcademicAI - Master Unified Test Suite Runner
 * Executes all automated test suites and outputs a consolidated test report.
 */

import { execSync } from "child_process";

interface TestSuite {
  id: string;
  name: string;
  command: string;
  category: string;
}

const SUITES: TestSuite[] = [
  {
    id: "AUTH",
    name: "Authentication, Multi-Role Security & Data Isolation",
    command: "npx tsx scripts/test-auth-isolation.ts",
    category: "Security & Isolation",
  },
  {
    id: "M2",
    name: "Academic NLP Extraction & Temporal Normalization",
    command: "npx tsx scripts/test-milestone2.ts",
    category: "Core NLP",
  },
  {
    id: "M3",
    name: "Change Intelligence, Deduplication & Rescheduling",
    command: "npx tsx scripts/test-milestone3.ts",
    category: "Change Intelligence",
  },
  {
    id: "M4",
    name: "Academic Priority Scoring & Cognitive Workload",
    command: "npx tsx scripts/test-milestone4.ts",
    category: "Priority Engine",
  },
  {
    id: "M5",
    name: "Adaptive Notification Intelligence & Suppression",
    command: "npx tsx scripts/test-milestone5.ts",
    category: "Notifications",
  },
  {
    id: "M6",
    name: "AI Assistant Grounded RAG & Tool Execution",
    command: "npx tsx scripts/test-milestone6.ts",
    category: "Assistant Engine",
  },
  {
    id: "M8-A",
    name: "Database-Persistent Syllabus Intelligence",
    command: "npx tsx scripts/test-milestone8-syllabus.ts",
    category: "Syllabus Intelligence",
  },
  {
    id: "M8-C",
    name: "Assessment Rubric & Criteria Intelligence",
    command: "npx tsx scripts/test-milestone8-rubric.ts",
    category: "Rubric Intelligence",
  },
  {
    id: "M8-B",
    name: "Academic Contradiction & Conflict Detection",
    command: "npx tsx scripts/test-milestone8-contradiction.ts",
    category: "Contradiction Engine",
  },
  {
    id: "M8-D",
    name: "Academic Risk Radar & Smart Study Planning",
    command: "npx tsx scripts/test-milestone8-risk-planning.ts",
    category: "Risk & Planning",
  },
];

async function runMasterTestHarness() {
  console.log("================================================================================");
  console.log("  ACADEMICAI — MASTER AUTOMATED TEST HARNESS");
  console.log("  Evaluating Core Intelligence, Security, and Persistence Subsystems");
  console.log("================================================================================\n");

  const results: Array<{
    id: string;
    name: string;
    category: string;
    status: "PASS" | "FAIL";
    durationMs: number;
    error?: string;
  }> = [];

  let totalPassed = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (const suite of SUITES) {
    process.stdout.write(`>>> Running [${suite.id}] ${suite.name}... `);
    const suiteStart = Date.now();
    try {
      execSync(suite.command, {
        cwd: process.cwd(),
        stdio: "pipe",
        encoding: "utf-8",
        env: { ...process.env, NODE_ENV: "test" },
      });
      const durationMs = Date.now() - suiteStart;
      console.log(`\x1b[32mPASS\x1b[0m (${durationMs}ms)`);
      results.push({
        id: suite.id,
        name: suite.name,
        category: suite.category,
        status: "PASS",
        durationMs,
      });
      totalPassed++;
    } catch (err: any) {
      const durationMs = Date.now() - suiteStart;
      console.log(`\x1b[31mFAIL\x1b[0m (${durationMs}ms)`);
      results.push({
        id: suite.id,
        name: suite.name,
        category: suite.category,
        status: "FAIL",
        durationMs,
        error: err.message?.slice(0, 120),
      });
      totalFailed++;
    }
  }

  const totalTimeMs = Date.now() - startTime;

  console.log("\n================================================================================");
  console.log("  MASTER TEST SUITE EXECUTION SUMMARY");
  console.log("================================================================================");
  console.log(
    "| ID     | Subsystem Category     | Suite Name                                      | Status | Time   |"
  );
  console.log(
    "|--------|------------------------|-------------------------------------------------|--------|--------|"
  );

  for (const r of results) {
    const statusStr = r.status === "PASS" ? "PASS  " : "FAIL  ";
    const idPad = r.id.padEnd(6);
    const catPad = r.category.padEnd(22);
    const namePad = r.name.padEnd(47);
    const timePad = `${r.durationMs}ms`.padStart(6);
    console.log(`| ${idPad} | ${catPad} | ${namePad} | ${statusStr} | ${timePad} |`);
  }

  console.log("================================================================================");
  console.log(`Total Suites Run : ${SUITES.length}`);
  console.log(`Suites Passed    : ${totalPassed} / ${SUITES.length} (${Math.round((totalPassed / SUITES.length) * 100)}%)`);
  console.log(`Suites Failed    : ${totalFailed}`);
  console.log(`Total Runtime    : ${(totalTimeMs / 1000).toFixed(2)}s`);
  console.log("================================================================================\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runMasterTestHarness();
