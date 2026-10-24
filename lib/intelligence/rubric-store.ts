/**
 * lib/intelligence/rubric-store.ts
 *
 * Milestone 8-C — Rubric Knowledge Store
 * Repository for indexed assignment and project rubrics, providing instant lookups
 * for assistant tools, missing requirement calculations, and risk radar analysis.
 */

import {
  StructuredRubric,
  RubricRequirement,
  RequirementStatus,
  RubricEngine,
  RubricStatusSummary,
} from "./rubric-engine";

export type { StructuredRubric, RubricRequirement, RequirementStatus };

// ─── Default Pre-seeded Curated Rubrics ───────────────────────────────────────

const SAMPLE_NLP_PROJECT_RUBRIC = `
CSE4001 — Natural Language Processing Capstone Project Rubric
Total Marks: 100

Requirements:
1. Literature Survey — 10 marks
- Review of at least 5 recent peer-reviewed NLP papers
- Comparative analysis of existing transformer models

2. Dataset — 10 marks
- Data collection, annotation, and curation
- Preprocessing, tokenization, and train/val/test splits

3. Methodology — 15 marks
- Mathematical formulation of model architecture
- Attention mechanism and loss function design

4. Implementation — 25 marks
- PyTorch/HuggingFace implementation
- Clean modular code with reproducible training script

5. Evaluation — 20 marks
- Quantitative metrics: BLEU, ROUGE, F1, Perplexity
- Error analysis and ablation study

6. Presentation & Demo — 20 marks
- 10-minute live demonstration and code walkthrough
- Comprehensive IEEE format project report

Submission Guidelines:
- Submit report as PDF and GitHub repository link via VTOP before deadline.
`;

const SAMPLE_ML_PROJECT_GUIDELINES = `
CSE3002 Machine Learning Project Evaluation Criteria
Maximum Score: 100 marks

Evaluation Criteria:
□ Problem Formulation & Data Exploration — 15 marks
□ Feature Engineering & Preprocessing — 15 marks
□ Model Architecture & Baselines — 20 marks
□ Hyperparameter Tuning & Cross Validation — 20 marks
□ Performance Analysis & ROC-AUC Evaluation — 20 marks
□ Project Report & Code Documentation — 10 marks
`;

// ─── Rubric Knowledge Store Class ─────────────────────────────────────────────

export class RubricStore {
  private static rubrics: Map<string, StructuredRubric> = new Map();
  private static initialized = false;

  private static ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    // Seed default NLP project rubric
    let nlpRubric = RubricEngine.parseRubric(SAMPLE_NLP_PROJECT_RUBRIC, {
      taskTitleHint: "NLP Project",
      courseCodeHint: "CSE4001",
      sourceDocument: "CSE4001_NLP_Project_Rubric.pdf",
    });

    // Seed verified academic progress: Literature Survey and Dataset completed
    nlpRubric = RubricEngine.linkTaskStatus(nlpRubric, [
      "Literature Survey",
      "Dataset",
    ]);

    this.rubrics.set("CSE4001", nlpRubric);
    this.rubrics.set("NLP_PROJECT", nlpRubric);

    // Seed default ML project rubric
    let mlRubric = RubricEngine.parseRubric(SAMPLE_ML_PROJECT_GUIDELINES, {
      taskTitleHint: "Machine Learning Project",
      courseCodeHint: "CSE3002",
      sourceDocument: "CSE3002_ML_Project_Guidelines.pdf",
    });
    mlRubric = RubricEngine.linkTaskStatus(mlRubric, [
      "Problem Formulation & Data Exploration",
    ]);

    this.rubrics.set("CSE3002", mlRubric);
    this.rubrics.set("ML_PROJECT", mlRubric);
  }

  /**
   * Register or update a rubric in the store.
   */
  public static registerRubric(rubric: StructuredRubric): void {
    this.ensureInitialized();
    if (rubric.courseCode) {
      this.rubrics.set(rubric.courseCode.toUpperCase(), rubric);
    }
    const key = rubric.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    this.rubrics.set(key, rubric);
  }

  /**
   * Look up rubric by course code or project title query.
   */
  public static findRubric(query: string): StructuredRubric | null {
    this.ensureInitialized();
    const clean = query.toLowerCase().trim();

    // Check course code matches
    for (const [key, rubric] of this.rubrics.entries()) {
      if (
        (rubric.courseCode && clean.includes(rubric.courseCode.toLowerCase())) ||
        (rubric.taskTitle && clean.includes(rubric.taskTitle.toLowerCase())) ||
        clean.includes(key.toLowerCase())
      ) {
        return rubric;
      }
    }

    // Keyword heuristics
    if (/nlp|natural language/i.test(clean)) {
      return this.rubrics.get("CSE4001") || null;
    }
    if (/machine learning|\bml\b/i.test(clean)) {
      return this.rubrics.get("CSE3002") || null;
    }

    // Default to first registered rubric
    const all = Array.from(this.rubrics.values());
    return all.length > 0 ? all[0] : null;
  }

  /**
   * Get all registered rubrics.
   */
  public static getAllRubrics(): StructuredRubric[] {
    this.ensureInitialized();
    return Array.from(new Set(this.rubrics.values()));
  }

  /**
   * Assistant query router for rubric queries.
   */
  public static handleAssistantQuery(
    query: string
  ): { matched: boolean; answer: string; rubric?: StructuredRubric } {
    this.ensureInitialized();
    const lower = query.toLowerCase();
    const rubric = this.findRubric(query);

    if (!rubric) {
      return {
        matched: false,
        answer: "No specific project rubric or requirement guideline found for that query.",
      };
    }

    // Missing requirements question: "What requirements am I missing?"
    if (
      lower.includes("missing") ||
      lower.includes("not done") ||
      lower.includes("remaining") ||
      lower.includes("left") ||
      lower.includes("pending")
    ) {
      return {
        matched: true,
        answer: RubricEngine.getMissingRequirementsResponse(rubric),
        rubric,
      };
    }

    // Highest marks question: "Which part of the rubric carries the most marks?"
    if (
      lower.includes("highest marks") ||
      lower.includes("most marks") ||
      lower.includes("highest weightage") ||
      lower.includes("maximum marks")
    ) {
      return {
        matched: true,
        answer: RubricEngine.getHighestMarkResponse(rubric),
        rubric,
      };
    }

    // Completed requirements question: "How many requirements have I completed?"
    if (
      lower.includes("how many") ||
      lower.includes("completed") ||
      lower.includes("done") ||
      lower.includes("progress")
    ) {
      const summary = RubricEngine.getStatusSummary(rubric);
      return {
        matched: true,
        answer: `### REQUIREMENTS PROGRESS: ${rubric.title.toUpperCase()}\n\nYou have completed **${summary.completedCount} out of ${summary.totalRequirements}** requirements (${summary.completionPercentage}% complete).\n- **Marks Earned:** **${summary.completedMarks} / ${summary.totalMarks} marks**\n- **Remaining Requirements:** ${summary.missingCount} (${summary.remainingMarks} marks to be earned).`,
        rubric,
      };
    }

    // Full breakdown fallback: "Show me the project requirements"
    return {
      matched: true,
      answer: RubricEngine.getBreakdownResponse(rubric),
      rubric,
    };
  }
}
