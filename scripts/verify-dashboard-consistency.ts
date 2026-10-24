import { getDashboardData } from "../lib/services/dashboard.service";
import { getFullAcademicState } from "../lib/intelligence/academic-state";
import { prisma } from "../lib/db/prisma";

async function verifyDashboardConsistency() {
  console.log("================================================================================");
  console.log("             DASHBOARD & ANALYTICS DATA CONSISTENCY VERIFICATION                ");
  console.log("================================================================================");

  const data = await getDashboardData();
  const state = await getFullAcademicState();
  const dbTasks = await prisma.task.findMany({ include: { course: true } });
  const dbEvents = await prisma.event.findMany({ include: { course: true } });
  const dbExams = await prisma.exam.findMany({ include: { course: true } });

  const activeDbTasks = dbTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
  const completedDbTasks = dbTasks.filter((t) => t.status === "COMPLETED");

  let allChecksPassed = true;
  function check(name: string, condition: boolean, detail: string = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${name} ${detail ? `(${detail})` : ""}`);
    } else {
      console.error(`  ❌ FAIL: ${name} ${detail ? `(${detail})` : ""}`);
      allChecksPassed = false;
    }
  }

  console.log("\n--- 1. Verification of Task & Event Counts ---");
  check("Tasks Due Count", data.stats.taskCount === activeDbTasks.length, `Expected: ${activeDbTasks.length}, Got: ${data.stats.taskCount}`);
  check("Upcoming Events Count", data.stats.eventCount === dbEvents.length, `Expected: ${dbEvents.length}, Got: ${data.stats.eventCount}`);
  check("Completed Tasks Count", data.stats.completedCount === completedDbTasks.length, `Expected: ${completedDbTasks.length}, Got: ${data.stats.completedCount}`);

  console.log("\n--- 2. Verification of 'What Needs Attention' Uniqueness ---");
  const attentionTitles = data.todayPriorities.map((t) => `[${t.courseCode}] ${t.title}`);
  const uniqueAttentionTitles = new Set(attentionTitles);
  check("No Duplicate Attention Items", attentionTitles.length === uniqueAttentionTitles.size, `Total: ${attentionTitles.length}, Unique: ${uniqueAttentionTitles.size}`);

  const a2Count = attentionTitles.filter((t) => t.includes("Assignment 2")).length;
  check("Assignment 2 Appears Exactly Once", a2Count === 1, `Count: ${a2Count}`);

  console.log("\n--- 3. Verification of 'Academic Pulse' Uniqueness ---");
  const pulseLabels = data.pulseEvents.map((p) => p.label);
  const uniquePulseLabels = new Set(pulseLabels);
  check("No Duplicate Pulse Entries", pulseLabels.length === uniquePulseLabels.size, `Total: ${pulseLabels.length}, Unique: ${uniquePulseLabels.size}`);

  console.log("\n--- 4. Verification of Recommendation & Observations ---");
  check("Recommendation Present", data.recommendation.recommendedItem !== null, `Recommended: "${data.recommendation.recommendedItem?.title}"`);
  check("AI Observation Generated", state.observations.length > 0, `Observation: "${state.observations[0]?.observationText}"`);

  console.log("\n--- 5. Verification of Multi-Horizon Workload Consistency ---");
  const workload = data.workload;
  check("Today Deliverables Calculated", workload.today.incompleteTasks + workload.today.exams >= 0, `Today count: ${workload.today.incompleteTasks + workload.today.exams}`);
  check("Next 7 Days Deliverables Match Active Items", workload.next7Days.incompleteTasks <= activeDbTasks.length, `7 Days: ${workload.next7Days.incompleteTasks}, Total Active: ${activeDbTasks.length}`);

  console.log("\n--- 6. Items in Active Deliverables Feed ---");
  data.todayPriorities.forEach((item, i) => {
    console.log(`  [${i + 1}] ${item.title} (${item.courseCode}) | Score: ${item.priorityScore} | Level: ${item.priority} | Due: ${item.normalizedDeadline}`);
  });

  console.log("\n================================================================================");
  console.log(`CONSISTENCY RESULT: ${allChecksPassed ? "✔ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED"}`);
  console.log("================================================================================");

  if (!allChecksPassed) {
    process.exit(1);
  }
}

verifyDashboardConsistency()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Consistency check error:", err);
    prisma.$disconnect();
    process.exit(1);
  });
