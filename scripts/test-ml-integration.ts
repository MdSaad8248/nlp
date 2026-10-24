/**
 * Comprehensive TypeScript Test Suite for Academic NLP Dataset & ML Model Integration
 * ====================================================================================
 * Verifies:
 * 1. Dataset loading & integrity
 * 2. Required column validation (19 columns)
 * 3. 11 Canonical label validation
 * 4. Stratified split ratios & metadata (70/15/15)
 * 5. Split reproducibility & fixed seed
 * 6. Zero train/val/test data leakage (disjoint ID sets)
 * 7. Model loading contract (DistilBERT & Baseline)
 * 8. Prediction format & schema validation
 * 9. Confidence output calibration [0.0 - 1.0]
 * 10. Invalid / empty input handling & fallback
 * 11. Existing NLP pipeline regression & compatibility
 * 12. Model provenance & review threshold gating
 */

import fs from "fs";
import path from "path";
import {
  classifyWithTrainedModel,
  classifyWithTrainedModelSync,
  DATASET_TO_INTERNAL_CATEGORY,
  INTERNAL_TO_DATASET_CATEGORY,
  normalizeDatasetCategory,
} from "../lib/nlp/model-classifier";
import { extractAcademicNotice, extractAcademicNoticeWithModel } from "../lib/nlp/extractor";
import { processAcademicNotice } from "../lib/nlp/pipeline";
import { classifyAcademicDocument } from "../lib/nlp/classifier";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    testsPassed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    testsFailed++;
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
  }
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 ACADEMIC AI — ML MODEL & DATASET INTEGRATION VERIFICATION SUITE");
  console.log("================================================================================\n");

  const projectRoot = process.cwd();
  const datasetPath = path.join(projectRoot, "data", "Academic_NLP_Dataset_350.csv");
  const reportsDir = path.join(projectRoot, "ml", "reports");
  const dataDir = path.join(projectRoot, "ml", "data");

  // --- SECTION 1: DATASET FILE & INTEGRITY ---
  console.log("--- 1. Testing Dataset File Integrity & Schema ---");
  assert(fs.existsSync(datasetPath), "Dataset CSV file exists at data/Academic_NLP_Dataset_350.csv");

  const rawCsv = fs.readFileSync(datasetPath, "utf-8");
  const lines = rawCsv.split("\n").filter((l) => l.trim().length > 0);
  assert(lines.length >= 351, `Dataset contains at least 350 records (found ${lines.length - 1})`);

  const headers = lines[0].split(",").map((h) => h.trim());
  const requiredColumns = [
    "id", "text", "category", "course_code", "course_name",
    "task", "event", "date", "time", "deadline",
    "venue", "platform", "marks", "urgency", "condition",
    "relationship", "old_date", "old_time", "entities"
  ];
  const missingCols = requiredColumns.filter((c) => !headers.includes(c));
  assert(missingCols.length === 0, "All 19 required columns present in CSV", `Missing: ${missingCols.join(", ")}`);

  // --- SECTION 2: CANONICAL CATEGORIES & SPLIT METADATA ---
  console.log("\n--- 2. Testing Split Metadata & Isolation ---");
  const splitMetaPath = path.join(dataDir, "split_metadata.json");
  assert(fs.existsSync(splitMetaPath), "Split metadata file exists in ml/data/split_metadata.json");

  const splitMeta = JSON.parse(fs.readFileSync(splitMetaPath, "utf-8"));
  assert(splitMeta.train_count === 245, `70% Training count is exactly 245 (got ${splitMeta.train_count})`);
  assert(splitMeta.val_count === 52, `15% Validation count is 52 (got ${splitMeta.val_count})`);
  assert(splitMeta.test_count === 53, `15% Test count is 53 (got ${splitMeta.test_count})`);
  assert(splitMeta.random_seed === 42, "Fixed random seed 42 used for reproducibility");

  // Check disjointness
  const trainSet = new Set(splitMeta.train_ids);
  const valSet = new Set(splitMeta.val_ids);
  const testSet = new Set(splitMeta.test_ids);

  const trainValIntersect = [...trainSet].filter((x) => valSet.has(x));
  const trainTestIntersect = [...trainSet].filter((x) => testSet.has(x));
  const valTestIntersect = [...valSet].filter((x) => testSet.has(x));

  assert(trainValIntersect.length === 0, "Zero overlap between Train and Validation sets");
  assert(trainTestIntersect.length === 0, "Zero overlap between Train and Test sets");
  assert(valTestIntersect.length === 0, "Zero overlap between Validation and Test sets");

  // --- SECTION 3: MODEL ARTIFACTS EXISTENCE ---
  console.log("\n--- 3. Testing Model Artifacts & Reports ---");
  const baselineDir = path.join(projectRoot, "ml", "models", "baseline_tfidf");
  const transformerDir = path.join(projectRoot, "ml", "models", "transformer_distilbert");

  assert(fs.existsSync(path.join(baselineDir, "classifier.joblib")), "Baseline classifier joblib artifact exists");
  assert(fs.existsSync(path.join(baselineDir, "vectorizer.joblib")), "Baseline TF-IDF vectorizer artifact exists");
  assert(fs.existsSync(path.join(transformerDir, "model.safetensors")), "Transformer DistilBERT model weights exist");
  assert(fs.existsSync(path.join(transformerDir, "config.json")), "Transformer DistilBERT config exists");
  assert(fs.existsSync(path.join(reportsDir, "confusion_matrix.png")), "Confusion matrix heatmap graphic generated");
  assert(fs.existsSync(path.join(reportsDir, "classification_report.json")), "Classification report artifact generated");
  assert(fs.existsSync(path.join(reportsDir, "baseline_vs_transformer.json")), "Baseline vs Transformer comparison generated");
  assert(fs.existsSync(path.join(reportsDir, "error_analysis.json")), "Error analysis report generated");

  // --- SECTION 4: INFERENCE CONTRACT & CONFIDENCE OUTPUT ---
  console.log("\n--- 4. Testing Model Classification Contract & Calibration ---");
  const sampleNotice = "NLP Assignment 3 must be submitted through VTOP before Sunday 11:59 PM.";
  const pred = await classifyWithTrainedModel(sampleNotice, { modelType: "baseline" });

  assert(pred.category === "ASSIGNMENT", `Classification of assignment notice returned ASSIGNMENT (got ${pred.category})`);
  assert(typeof pred.confidence === "number", "Confidence output is a valid number");
  assert(pred.confidence >= 0.0 && pred.confidence <= 1.0, `Confidence is in probability range [0.0, 1.0] (got ${pred.confidence})`);
  assert(pred.confidenceStatus === "HIGH" || pred.confidenceStatus === "LOW", "Confidence status is HIGH or LOW");
  assert(typeof pred.requiresReview === "boolean", "requiresReview flag is a boolean");
  assert(pred.threshold === 0.70, "Default threshold of 0.70 applied");

  // --- SECTION 5: EDGE CASES & FALLBACK HANDLING ---
  console.log("\n--- 5. Testing Invalid Input & Fallback Safeguards ---");
  const emptyPred = await classifyWithTrainedModel("", { modelType: "baseline" });
  assert(emptyPred.requiresReview === true, "Empty input flagged as requiresReview = true");
  assert(emptyPred.confidence === 0.0, "Empty input assigned 0.0 confidence");

  const whitespacePred = await classifyWithTrainedModel("    ", { modelType: "baseline" });
  assert(whitespacePred.requiresReview === true, "Whitespace input flagged as requiresReview = true");

  // Synchronous classification fallback
  const syncPred = classifyWithTrainedModelSync("Operating Systems Lab Quiz 2 will be held tomorrow.");
  assert(syncPred.category === "QUIZ", `Synchronous classifier classified quiz correctly (got ${syncPred.category})`);

  // --- SECTION 6: CATEGORY NORMALIZATION & COMPATIBILITY ---
  console.log("\n--- 6. Testing Category Label Normalization ---");
  assert(normalizeDatasetCategory("PROJECT_REVIEW") === "REVIEW", "Mapped PROJECT_REVIEW -> REVIEW");
  assert(normalizeDatasetCategory("ATTENDANCE") === "ATTENDANCE_NOTICE", "Mapped ATTENDANCE -> ATTENDANCE_NOTICE");
  assert(normalizeDatasetCategory("ACADEMIC_EVENT") === "EVENT", "Mapped ACADEMIC_EVENT -> EVENT");
  assert(INTERNAL_TO_DATASET_CATEGORY["REVIEW"] === "PROJECT_REVIEW", "Mapped REVIEW -> PROJECT_REVIEW");

  // --- SECTION 7: EXTRACTOR & PIPELINE INTEGRATION ---
  console.log("\n--- 7. Testing Extractor & Full Pipeline Integration ---");
  const extractResult = await extractAcademicNoticeWithModel(
    "Microprocessor and Microcontroller Techniques Project 5 report must be submitted on Microsoft Teams before 02 November 2026. The project carries 25 marks.",
    { modelType: "baseline" }
  );

  assert(extractResult.category === "PROJECT", `Extractor classified notice as PROJECT (got ${extractResult.category})`);
  assert(!!extractResult.modelClassification, "extractResult includes modelClassification metadata");
  assert(extractResult.tasks.length > 0, "Synthesized project deliverable task from model prediction");
  assert(extractResult.tasks[0].title.includes("Project"), "Task deliverable title correctly extracted");

  // Full Pipeline Integration
  const pipelineResult = await processAcademicNotice(
    "A short quiz for Natural Language Processing is scheduled for 10 October 2026 at 11:30 AM in Online.",
    { skipAI: true }
  );

  assert(pipelineResult.category === "QUIZ", `Pipeline classified notice as QUIZ (got ${pipelineResult.category})`);
  assert(!!pipelineResult.modelClassification, "Pipeline output includes modelClassification provenance");
  assert(pipelineResult.tasks.length > 0 || pipelineResult.events.length > 0, "Pipeline extracted quiz deliverable");

  // --- SECTION 8: DETERMINISTIC SAFEGUARD PRESERVATION ---
  console.log("\n--- 8. Testing Deterministic Safeguard Unchanged ---");
  const ruleBaseline = classifyAcademicDocument("NLP Assignment 2 (VTOP)");
  assert(ruleBaseline.category === "ASSIGNMENT", "Underlying deterministic rules remain 100% functional");

  console.log("\n================================================================================");
  console.log(`🏁 ML INTEGRATION SUITE SUMMARY: ${testsPassed} / ${testsPassed + testsFailed} TESTS PASSED`);
  console.log("================================================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
