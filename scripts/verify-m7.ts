/**
 * scripts/verify-m7.ts
 *
 * Milestone 7-F Verification Script
 *
 * Runs all M7 test fixtures through the existing NLP + change intelligence
 * without requiring a database connection.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/verify-m7.ts
 *
 * Expected output: all 5 test cases should pass.
 */

import { runM7Evaluation } from "../lib/evaluation/m7-test-fixtures";

runM7Evaluation()
  .then(() => process.exit(0))
  .catch((err: any) => {
    console.error("M7 evaluation failed:", err);
    process.exit(1);
  });
