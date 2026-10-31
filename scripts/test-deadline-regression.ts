/**
 * Regression Test Suite: Title Casing, Course Code Deduplication & IST Deadline Accuracy
 * Verifies Requirement 1 and Requirement 4
 */

import assert from "assert";
import {
  formatTaskTitle,
  formatDescription,
  formatKolkataDate,
  evaluateDeadlineStatus,
  isSameDayIST,
  isTomorrowIST,
} from "../lib/utils/formatters";

console.log("================================================================================");
console.log("  ACADEMICAI — DEADLINE ACCURACY & TYPOGRAPHY REGRESSION TEST SUITE");
console.log("================================================================================");

// --- 1. Course Code Deduplication and Title Casing ---
console.log("\n>>> Test Set 1: Title Casing & Course Code Deduplication");

const t1 = formatTaskTitle(
  "Overdue Recovery: CSE2001 - [CSE2001] Computer Networks CAT-1 Exam",
  "CSE2001"
);
console.log("  Input:  'Overdue Recovery: CSE2001 - [CSE2001] Computer Networks CAT-1 Exam'");
console.log("  Result: '" + t1 + "'");
assert.strictEqual(
  t1,
  "Overdue Recovery: Computer Networks CAT-1 Exam",
  "Should remove repeated course code while retaining 'Overdue Recovery:' and acronym 'CAT-1'"
);

const t2 = formatTaskTitle("[CSE4001] Assignment 1: Language Modeling & Tokenization", "CSE4001");
console.log("  Input:  '[CSE4001] Assignment 1: Language Modeling & Tokenization'");
console.log("  Result: '" + t2 + "'");
assert.strictEqual(
  t2,
  "Assignment 1: Language Modeling & Tokenization",
  "Should remove leading bracketed code"
);

const t3 = formatTaskTitle("machine learning term paper on transformers", "CSE3002");
console.log("  Input:  'machine learning term paper on transformers'");
console.log("  Result: '" + t3 + "'");
assert.strictEqual(
  t3,
  "Machine Learning Term Paper on Transformers",
  "Should apply Title Case with minor words like 'on' in lowercase"
);

// --- 2. Description Sentence Casing ---
console.log("\n>>> Test Set 2: Description Sentence Casing");
const d1 = formatDescription("SHARDING AND 2PC TRANSACTION COORDINATOR IMPLEMENTATION. LATE SUBMISSIONS WILL RECEIVE ZERO CREDIT.");
console.log("  Input:  'SHARDING AND 2PC TRANSACTION COORDINATOR IMPLEMENTATION...'");
console.log("  Result: '" + d1 + "'");
assert(d1.includes("2PC"), "Should preserve technical acronym 2PC");
assert(d1.startsWith("Sharding and"), "Should sentence-case normal words without capitalizing every word");

// --- 3. IST Deadline Status Calculation & Edge Cases ---
console.log("\n>>> Test Set 3: Single Normalized Deadline & IST Edge Cases");

// Reference anchor: 2026-10-24 at 10:00 AM IST (04:30 UTC)
const nowIST = new Date("2026-10-24T04:30:00.000Z");

// Case A: Overdue task (yesterday 11:59 PM IST)
const pastDeadline = new Date("2026-10-23T18:29:00.000Z");
const pastStatus = evaluateDeadlineStatus(pastDeadline, "PENDING", nowIST);
console.log("  Past deadline:", pastStatus);
assert.strictEqual(pastStatus.isOverdue, true, "Past date must be overdue");
assert.strictEqual(pastStatus.isDueToday, false, "Past date cannot be due today");
assert.strictEqual(pastStatus.isDueTomorrow, false, "Past date cannot be due tomorrow");
assert(pastStatus.timeRemainingLabel.startsWith("Overdue"), "Label must clearly state Overdue");
assert(!pastStatus.timeRemainingLabel.includes("tomorrow"), "Overdue task must NEVER claim due tomorrow");

// Case B: Due Today (tonight 11:59 PM IST, 14 hours away)
const todayDeadline = new Date("2026-10-24T18:29:00.000Z");
const todayStatus = evaluateDeadlineStatus(todayDeadline, "PENDING", nowIST);
console.log("  Today deadline (14h away):", todayStatus);
assert.strictEqual(todayStatus.isOverdue, false, "Today future time is not overdue");
assert.strictEqual(todayStatus.isDueToday, true, "Must be due today in IST");
assert.strictEqual(todayStatus.isDueTomorrow, false, "Must not be due tomorrow");
assert.strictEqual(todayStatus.statusBadge, "DUE TODAY", "Badge must be DUE TODAY");

// Case C: Due Tomorrow (tomorrow night 11:59 PM IST, 38 hours away)
const tomorrowDeadline = new Date("2026-10-25T18:29:00.000Z");
const tomorrowStatus = evaluateDeadlineStatus(tomorrowDeadline, "PENDING", nowIST);
console.log("  Tomorrow deadline:", tomorrowStatus);
assert.strictEqual(tomorrowStatus.isOverdue, false);
assert.strictEqual(tomorrowStatus.isDueToday, false);
assert.strictEqual(tomorrowStatus.isDueTomorrow, true);
assert.strictEqual(tomorrowStatus.statusBadge, "DUE TOMORROW");

// Case D: Midnight boundary edge case (12:05 AM IST vs 11:55 PM IST)
const midnightJustPassed = new Date("2026-10-24T18:35:00.000Z"); // Oct 25, 00:05 AM IST
assert(isTomorrowIST(midnightJustPassed, nowIST), "00:05 AM on next day is tomorrow");

// Case E: Completed task with past deadline
const completedPast = evaluateDeadlineStatus(pastDeadline, "COMPLETED", nowIST);
assert.strictEqual(completedPast.isCompleted, true);
assert.strictEqual(completedPast.isOverdue, false, "Completed task must never be marked overdue");
assert.strictEqual(completedPast.statusBadge, "COMPLETED");

console.log("\n================================================================================");
console.log("  ALL REGRESSION CHECKS PASSED: 100% CORRECTNESS VERIFIED");
console.log("================================================================================\n");
