/**
 * Academic Notice Classifier - Model Integration & Fallback Layer
 * ===============================================================
 * Integrates the trained NLP classifier (DistilBERT / TF-IDF Baseline) into
 * the TypeScript pipeline with:
 * - Configurable confidence threshold (default 0.70)
 * - Calibrated model probability (never fabricated)
 * - Deterministic rule-based safeguard fallback
 * - Label normalization between dataset canonical labels and internal NoticeCategory enum
 */

import { NoticeCategory } from "./schemas";
import { classifyAcademicDocument, ClassificationResult } from "./classifier";

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.70;

export interface ModelPrediction {
  category: NoticeCategory;
  rawDatasetCategory: string;
  confidence: number; // Genuine model probability [0.0 - 1.0]
  modelUsed: "DistilBERT Transformer" | "TF-IDF Baseline" | "Deterministic Rules";
  isModelBacked: boolean;
  requiresReview: boolean;
  confidenceStatus: "HIGH" | "LOW";
  threshold: number;
  candidateScores: Record<string, number>;
  ruleFallback: ClassificationResult;
  explanation: string;
}

/**
 * Bi-directional mapping between Dataset Canonical Labels (11) and
 * internal TypeScript NoticeCategory schemas.
 */
export const DATASET_TO_INTERNAL_CATEGORY: Record<string, NoticeCategory> = {
  ASSIGNMENT: "ASSIGNMENT",
  QUIZ: "QUIZ",
  EXAM: "EXAM",
  PROJECT: "PROJECT",
  PROJECT_REVIEW: "REVIEW",
  CLASS_CHANGE: "CLASS_CHANGE",
  CLASS_CANCELLATION: "CLASS_CANCELLATION",
  ATTENDANCE: "ATTENDANCE_NOTICE",
  ACADEMIC_EVENT: "EVENT",
  CIRCULAR: "CIRCULAR",
  GENERAL_ANNOUNCEMENT: "GENERAL_ANNOUNCEMENT",
};

export const INTERNAL_TO_DATASET_CATEGORY: Record<NoticeCategory, string> = {
  ASSIGNMENT: "ASSIGNMENT",
  QUIZ: "QUIZ",
  EXAM: "EXAM",
  PROJECT: "PROJECT",
  REVIEW: "PROJECT_REVIEW",
  CLASS_CHANGE: "CLASS_CHANGE",
  CLASS_CANCELLATION: "CLASS_CANCELLATION",
  ATTENDANCE_NOTICE: "ATTENDANCE",
  EVENT: "ACADEMIC_EVENT",
  CIRCULAR: "CIRCULAR",
  GENERAL_ANNOUNCEMENT: "GENERAL_ANNOUNCEMENT",
};

export function normalizeDatasetCategory(rawCategory: string): NoticeCategory {
  if (rawCategory in DATASET_TO_INTERNAL_CATEGORY) {
    return DATASET_TO_INTERNAL_CATEGORY[rawCategory];
  }
  // If already matches internal category
  return (rawCategory as NoticeCategory) || "GENERAL_ANNOUNCEMENT";
}

/**
 * Query the local FastAPI microservice if active (ultra-low latency ~5ms)
 */
async function queryMicroservice(
  text: string,
  modelType: string,
  threshold: number
): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 400);

    const response = await fetch("http://127.0.0.1:8001/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, model: modelType, threshold }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Executes Python CLI inference (predict.py) synchronously or as child process
 */
function queryPythonCLI(
  text: string,
  modelType: "transformer" | "baseline" = "baseline",
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): any | null {
  if (typeof window !== "undefined") {
    return null;
  }
  try {
    const nodeRequire = eval("require");
    const { spawnSync } = nodeRequire("child_process");
    const path = nodeRequire("path");

    const projectRoot = process.cwd();
    const scriptPath = path.join(projectRoot, "ml", "predict.py");

    const run = spawnSync(
      "python",
      [scriptPath, "--model", modelType, "--threshold", threshold.toString(), "--text", text],
      {
        cwd: projectRoot,
        encoding: "utf-8",
        timeout: 12000,
        maxBuffer: 1024 * 1024,
      }
    );

    if (run.stdout) {
      const start = run.stdout.indexOf("{");
      const end = run.stdout.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const jsonStr = run.stdout.slice(start, end + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed && !parsed.error) {
          return parsed;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Core Hybrid Academic Classifier:
 * 1. Executes real NLP classifier (Transformer or Calibrated Baseline)
 * 2. Evaluates confidence against threshold
 * 3. Incorporates deterministic rule-based safeguard
 * 4. Yields transparent provenance and review flag
 */
export async function classifyWithTrainedModel(
  text: string,
  options: {
    modelType?: "transformer" | "baseline";
    threshold?: number;
    preferService?: boolean;
  } = {}
): Promise<ModelPrediction> {
  const threshold = options.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const modelType = options.modelType ?? "transformer";

  // 1. Run deterministic rule-based baseline safeguard first
  const ruleResult = classifyAcademicDocument(text);

  if (!text || !text.trim()) {
    return {
      category: "GENERAL_ANNOUNCEMENT",
      rawDatasetCategory: "GENERAL_ANNOUNCEMENT",
      confidence: 0.0,
      modelUsed: "Deterministic Rules",
      isModelBacked: false,
      requiresReview: true,
      confidenceStatus: "LOW",
      threshold,
      candidateScores: {},
      ruleFallback: ruleResult,
      explanation: "Empty input text.",
    };
  }

  // 2. Try fast in-memory microservice if running
  let mlOutput = await queryMicroservice(text, modelType, threshold);

  // 3. If microservice not running, try CLI inference
  if (!mlOutput) {
    mlOutput = queryPythonCLI(text, modelType, threshold);
  }

  // 4. If ML model yielded a result
  if (mlOutput && mlOutput.category) {
    const rawCategory = mlOutput.category;
    const internalCategory = normalizeDatasetCategory(rawCategory);
    const confidence = Number(mlOutput.confidence || 0);
    const requiresReview = confidence < threshold;

    let finalCategory = internalCategory;
    let modelName: ModelPrediction["modelUsed"] =
      mlOutput.model === "DistilBERT" ? "DistilBERT Transformer" : "TF-IDF Baseline";

    let explanation = `Classified as ${rawCategory} by ${modelName} with ${Math.round(
      confidence * 100
    )}% model probability.`;

    // Phase 6 Safeguard: If confidence is LOW, flag for review and document secondary rule check
    if (requiresReview) {
      explanation += ` Model probability (${Math.round(
        confidence * 100
      )}%) is below threshold (${Math.round(
        threshold * 100
      )}%). Marked as requires review. Secondary rule check indicates: ${ruleResult.category}.`;
    }

    return {
      category: finalCategory,
      rawDatasetCategory: rawCategory,
      confidence,
      modelUsed: modelName,
      isModelBacked: true,
      requiresReview,
      confidenceStatus: requiresReview ? "LOW" : "HIGH",
      threshold,
      candidateScores: mlOutput.candidateScores || {},
      ruleFallback: ruleResult,
      explanation,
    };
  }

  // 5. Complete Fallback to Deterministic Rules if Python runtime not invoked
  return {
    category: ruleResult.category,
    rawDatasetCategory: INTERNAL_TO_DATASET_CATEGORY[ruleResult.category] || ruleResult.category,
    confidence: ruleResult.confidence,
    modelUsed: "Deterministic Rules",
    isModelBacked: false,
    requiresReview: ruleResult.confidence < threshold,
    confidenceStatus: ruleResult.confidence >= threshold ? "HIGH" : "LOW",
    threshold,
    candidateScores: ruleResult.candidateScores as any,
    ruleFallback: ruleResult,
    explanation: `Classified via deterministic rules: ${ruleResult.ruleExplanation}`,
  };
}

/**
 * Synchronous version for backwards-compatible call sites
 */
export function classifyWithTrainedModelSync(
  text: string,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): ModelPrediction {
  const ruleResult = classifyAcademicDocument(text);
  // Attempt quick CLI baseline inference
  const mlOutput = queryPythonCLI(text, "baseline", threshold);

  if (mlOutput && mlOutput.category) {
    const rawCategory = mlOutput.category;
    const internalCategory = normalizeDatasetCategory(rawCategory);
    const confidence = Number(mlOutput.confidence || 0);
    const requiresReview = confidence < threshold;

    return {
      category: requiresReview && ruleResult.confidence >= 0.85 ? ruleResult.category : internalCategory,
      rawDatasetCategory: rawCategory,
      confidence,
      modelUsed: "TF-IDF Baseline",
      isModelBacked: true,
      requiresReview,
      confidenceStatus: requiresReview ? "LOW" : "HIGH",
      threshold,
      candidateScores: mlOutput.candidateScores || {},
      ruleFallback: ruleResult,
      explanation: `Classified as ${rawCategory} via TF-IDF Baseline (prob: ${confidence}).`,
    };
  }

  return {
    category: ruleResult.category,
    rawDatasetCategory: INTERNAL_TO_DATASET_CATEGORY[ruleResult.category] || ruleResult.category,
    confidence: ruleResult.confidence,
    modelUsed: "Deterministic Rules",
    isModelBacked: false,
    requiresReview: ruleResult.confidence < threshold,
    confidenceStatus: ruleResult.confidence >= threshold ? "HIGH" : "LOW",
    threshold,
    candidateScores: ruleResult.candidateScores as any,
    ruleFallback: ruleResult,
    explanation: ruleResult.ruleExplanation,
  };
}
