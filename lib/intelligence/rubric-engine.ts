/**
 * lib/intelligence/rubric-engine.ts
 *
 * Milestone 8-C — Rubric & Requirement Intelligence
 * Parses assignment rubrics, project submission guidelines, and evaluation
 * criteria from PDF/image/text into structured requirement checklists.
 *
 * Capabilities:
 * - Requirements & Sub-requirements extraction
 * - Marks & weightage preservation
 * - Mandatory vs optional distinction
 * - Linking to tasks and verified academic completion status
 * - Answering requirement & mark queries ("What am I missing?", "Which carries highest marks?")
 * - Source evidence grounding with document and text spans
 */

import { extractAcademicEntities } from "@/lib/nlp/ner";
import { parseTemporalExpressions } from "@/lib/nlp/temporal";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export type RequirementStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "NOT_APPLICABLE";

export interface RubricEvidence {
  documentName?: string;
  pageNumber?: number;
  snippet: string;
  confidence: number;
}

export interface RubricRequirement {
  id: string;
  title: string;
  description: string;
  marks: number | null;
  weightagePercentage: number | null;
  isMandatory: boolean;
  status: RequirementStatus;
  subRequirements: string[];
  submissionRequirement: string | null;
  deadline: string | null;
  rawTextSpan: string;
  sourceEvidence: RubricEvidence;
}

export interface StructuredRubric {
  id: string;
  title: string;
  courseCode: string | null;
  courseName: string | null;
  taskTitle: string | null;
  totalMarks: number | null;
  totalWeightage: number | null;
  requirements: RubricRequirement[];
  submissionGuidelines: string[];
  deadline: string | null;
  sourceDocument: string;
  pageNumber?: number | null;
  isMalformed: boolean;
  warnings: string[];
  rawText: string;
  createdAt: string;
}

export interface RubricStatusSummary {
  totalRequirements: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  missingCount: number;
  totalMarks: number;
  completedMarks: number;
  remainingMarks: number;
  completionPercentage: number;
  missingRequirements: RubricRequirement[];
  highestMarkRequirement: RubricRequirement | null;
}

// ─── Rubric Parser Engine ─────────────────────────────────────────────────────

export class RubricEngine {
  /**
   * Parses unstructured rubric text or guideline document into a StructuredRubric model.
   */
  public static parseRubric(
    text: string,
    options: {
      sourceDocument?: string;
      pageNumber?: number;
      taskTitleHint?: string;
      courseCodeHint?: string;
    } = {}
  ): StructuredRubric {
    const raw = (text || "").trim();
    const warnings: string[] = [];

    if (!raw || raw.length < 20) {
      return {
        id: `rubric-empty-${Date.now()}`,
        title: options.taskTitleHint || "Untitled Rubric",
        courseCode: options.courseCodeHint || null,
        courseName: null,
        taskTitle: options.taskTitleHint || null,
        totalMarks: 0,
        totalWeightage: 0,
        requirements: [],
        submissionGuidelines: [],
        deadline: null,
        sourceDocument: options.sourceDocument || "rubric-upload.pdf",
        pageNumber: options.pageNumber,
        isMalformed: true,
        warnings: ["Document text is empty or below readable threshold."],
        rawText: raw,
        createdAt: new Date().toISOString(),
      };
    }

    // 1. Identify Course & Task title using M2 NER
    const nlpEntities = extractAcademicEntities(raw);
    let courseCode = nlpEntities.courseCode || options.courseCodeHint || null;
    let courseName = nlpEntities.primaryCourseName || null;
    let taskTitle = options.taskTitleHint || null;

    // Inferred course code fallback
    if (!courseCode) {
      const codeMatch = raw.match(/\b([A-Z]{2,4}\s*\d{3,4})\b/i);
      if (codeMatch) {
        courseCode = codeMatch[1].replace(/\s+/g, "").toUpperCase();
      }
    }

    // Inferred project / assignment title from header
    if (!taskTitle) {
      const titleMatch = raw.match(
        /([A-Z0-9\s\-]+?(?:Project|Assignment|Rubric|Capstone|Lab\s+Report|Mini[\s-]Project|Submission\s+Guidelines?))\b/i
      );
      if (titleMatch) {
        taskTitle = titleMatch[1].trim();
      } else {
        taskTitle = courseCode ? `${courseCode} Deliverable` : "Course Project";
      }
    }

    // 2. Parse Temporal Deadline if present
    const temporal = parseTemporalExpressions(raw);
    const deadline = temporal.primaryDeadline?.iso || temporal.dates[0]?.iso || null;

    // 3. Extract Requirements & Criteria
    const requirements = this.extractRequirements(raw, options.sourceDocument, options.pageNumber);

    if (requirements.length === 0) {
      warnings.push("No distinct evaluation criteria or rubric checklist items detected.");
    }

    // 4. Extract Submission Guidelines (e.g. format, repository links, portal)
    const submissionGuidelines = this.extractSubmissionGuidelines(raw);

    // Compute total marks
    let totalMarks = 0;
    let hasMarks = false;
    for (const req of requirements) {
      if (req.marks !== null) {
        totalMarks += req.marks;
        hasMarks = true;
      }
    }

    const isMalformed = requirements.length === 0;
    if (isMalformed) {
      warnings.push("Document could not be parsed into structured academic requirements.");
    }

    return {
      id: `rubric-${(courseCode || "GEN").toLowerCase()}-${Date.now()}`,
      title: taskTitle || "Academic Evaluation Rubric",
      courseCode,
      courseName,
      taskTitle,
      totalMarks: hasMarks ? totalMarks : null,
      totalWeightage: null,
      requirements,
      submissionGuidelines,
      deadline,
      sourceDocument: options.sourceDocument || "rubric-upload.pdf",
      pageNumber: options.pageNumber,
      isMalformed,
      warnings,
      rawText: raw,
      createdAt: new Date().toISOString(),
    };
  }

  // ─── Requirements Extractor ─────────────────────────────────────────────────

  private static extractRequirements(
    text: string,
    sourceDocument?: string,
    pageNumber?: number
  ): RubricRequirement[] {
    const requirements: RubricRequirement[] = [];
    const clean = text.replace(/\r\n/g, "\n");
    const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);

    let currentReq: RubricRequirement | null = null;
    let reqIndex = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip generic headers
      if (
        /^(?:Rubric|Requirements|Project Guidelines|Evaluation Criteria|Marking Scheme|Course Project|Weightage|Overview)[:\s]*$/i.test(
          line
        )
      ) {
        continue;
      }

      // Pattern A: Numbered item e.g. "1. Literature Survey — 10 marks", "1.1 Dataset (10 marks)"
      // Pattern B: Bullet / Checkbox item e.g. "□ Literature Survey", "[ ] Dataset", "- Implementation (25 marks)"
      // Pattern C: Plain named component with marks e.g. "Literature Survey — 10 marks", "Dataset: 10 marks"
      const isNumbered = /^(?:Criterion\s+\d+|Requirement\s+\d+|\d+)[\.\):]\s+([A-Za-z0-9\s/&—–-]+)/i.test(line);
      const isCheckbox = /^(\[[ xX]?\]|[□✓✔○●\-\*•])\s+([A-Za-z0-9\s/&—–-]+)/.test(line);
      const isDirectCriterion =
        /^[A-Z][a-zA-Z0-9\s/&]+?\s*(?:[-—–:]|\b)\s*(\d{1,3})\s*(?:marks?|pts?|points|%)/i.test(line) &&
        !line.toLowerCase().startsWith("total");

      if (isNumbered || isCheckbox || isDirectCriterion) {
        // Parse title and marks
        let rawTitle = line
          .replace(/^(?:Criterion\s+\d+|Requirement\s+\d+|\d+)[\.\):]\s*/i, "")
          .replace(/^(\[[ xX]?\]|[□✓✔○●\-\*•])\s*/, "")
          .trim();

        // Extract marks e.g. "10 marks", "25 pts", "(20 marks)"
        const marksMatch = rawTitle.match(/(\d{1,3})\s*(?:marks?|pts?|points)/i);
        const marks = marksMatch ? parseInt(marksMatch[1], 10) : null;

        const pctMatch = rawTitle.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
        const weightagePercentage = pctMatch ? parseFloat(pctMatch[1]) : null;

        // Clean title
        const cleanTitle = rawTitle
          .replace(/[-—–:]?\s*\b\d{1,3}\s*(?:marks?|pts?|points|%)[)]?\s*$/i, "")
          .replace(/[\(\[\{][^\)\]\}]*[\)\]\}]$/, "")
          .replace(/[-—–:]+$/, "")
          .trim();

        // Mandatory vs Optional flag
        const isOptional =
          /\b(?:optional|bonus|extra credit|elective)\b/i.test(line) ||
          /\b(?:optional|bonus)\b/i.test(cleanTitle);

        if (cleanTitle.length >= 2 && cleanTitle.length <= 100) {
          // If we had a previous requirement, save it
          if (currentReq) {
            requirements.push(currentReq);
          }

          currentReq = {
            id: `req-${reqIndex++}`,
            title: cleanTitle,
            description: cleanTitle,
            marks,
            weightagePercentage,
            isMandatory: !isOptional,
            status: "NOT_STARTED", // Completion comes from user/academic state
            subRequirements: [],
            submissionRequirement: null,
            deadline: null,
            rawTextSpan: line,
            sourceEvidence: {
              documentName: sourceDocument,
              pageNumber,
              snippet: line,
              confidence: 0.95,
            },
          };
          continue;
        }
      }

      // Check for sub-requirements or details under currentReq
      if (currentReq) {
        // If line is an indented or bulleted sub-item e.g. "- Minimum 5 IEEE papers"
        if (/^[-•*—]\s+/.test(line) || /^[a-z]\)\s+/i.test(line)) {
          const subText = line.replace(/^[-•*—a-z\)]+\s*/i, "").trim();
          if (subText.length > 3) {
            currentReq.subRequirements.push(subText);
            currentReq.rawTextSpan += `\n${line}`;
          }
        } else if (
          /submission|format|upload|github|pdf|portal|link/i.test(line) &&
          !currentReq.submissionRequirement
        ) {
          currentReq.submissionRequirement = line;
        }
      }
    }

    if (currentReq) {
      requirements.push(currentReq);
    }

    return requirements;
  }

  // ─── Submission Guidelines Extractor ────────────────────────────────────────

  private static extractSubmissionGuidelines(text: string): string[] {
    const guidelines: string[] = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      if (
        /^(?:submit|upload|submission|deliverables?|portal|format|late submission|github|repository|zip)/i.test(
          line
        ) ||
        /\b(?:vtop|moodle|canvas|github|pdf|word|zip file)\b/i.test(line)
      ) {
        if (line.length > 5 && line.length < 200) {
          guidelines.push(line);
        }
      }
    }

    return Array.from(new Set(guidelines));
  }

  // ─── Status & Progress Tracking ─────────────────────────────────────────────

  /**
   * Updates requirement completion status based on verified completed item titles.
   * Does NOT assume completion from document text.
   */
  public static linkTaskStatus(
    rubric: StructuredRubric,
    completedItems: string[]
  ): StructuredRubric {
    const completedSet = new Set(completedItems.map((c) => c.toLowerCase().trim()));

    const updatedRequirements = rubric.requirements.map((req) => {
      const reqTitleLower = req.title.toLowerCase();

      // Check if requirement title matches or is contained in any completed item
      const isCompleted = Array.from(completedSet).some(
        (done) =>
          done.includes(reqTitleLower) ||
          reqTitleLower.includes(done) ||
          (req.subRequirements.length > 0 &&
            req.subRequirements.some((sub) => done.includes(sub.toLowerCase())))
      );

      return {
        ...req,
        status: isCompleted ? ("COMPLETED" as RequirementStatus) : req.status,
      };
    });

    return {
      ...rubric,
      requirements: updatedRequirements,
    };
  }

  /**
   * Generates a status and marks summary across all requirements.
   */
  public static getStatusSummary(rubric: StructuredRubric): RubricStatusSummary {
    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;
    let totalMarks = 0;
    let completedMarks = 0;
    let highestMarkReq: RubricRequirement | null = null;
    let maxMarks = -1;

    const missingRequirements: RubricRequirement[] = [];

    for (const req of rubric.requirements) {
      const m = req.marks || 0;
      totalMarks += m;

      if (req.status === "COMPLETED") {
        completedCount++;
        completedMarks += m;
      } else if (req.status === "IN_PROGRESS") {
        inProgressCount++;
        missingRequirements.push(req);
      } else {
        notStartedCount++;
        missingRequirements.push(req);
      }

      if (m > maxMarks) {
        maxMarks = m;
        highestMarkReq = req;
      }
    }

    const totalRequirements = rubric.requirements.length;
    const completionPercentage =
      totalRequirements > 0 ? Math.round((completedCount / totalRequirements) * 100) : 0;

    return {
      totalRequirements,
      completedCount,
      inProgressCount,
      notStartedCount,
      missingCount: missingRequirements.length,
      totalMarks: rubric.totalMarks || totalMarks,
      completedMarks,
      remainingMarks: (rubric.totalMarks || totalMarks) - completedMarks,
      completionPercentage,
      missingRequirements,
      highestMarkRequirement: highestMarkReq,
    };
  }

  // ─── Query Helpers for Grounded Assistant ────────────────────────────────────

  /**
   * Answers queries like "What requirements am I missing?"
   */
  public static getMissingRequirementsResponse(rubric: StructuredRubric): string {
    const summary = this.getStatusSummary(rubric);
    if (summary.missingRequirements.length === 0) {
      return `🎉 All **${summary.totalRequirements}** requirements for **${rubric.title}** are complete (${summary.completedMarks}/${summary.totalMarks} marks earned).`;
    }

    const lines = summary.missingRequirements.map((r) => {
      const markStr = r.marks ? ` (${r.marks} marks)` : "";
      const statusIcon = r.status === "IN_PROGRESS" ? "⏳ In Progress" : "○ Not Started";
      const mandatoryStr = r.isMandatory ? "" : " · *Optional*";
      return `- **${r.title}**${markStr} — ${statusIcon}${mandatoryStr}`;
    });

    return `### MISSING REQUIREMENTS (${summary.missingCount} remaining · ${summary.remainingMarks} marks pending)\n\n**${rubric.title}**:\n${lines.join("\n")}\n\n*Progress:* ${summary.completedCount}/${summary.totalRequirements} complete (${summary.completionPercentage}%)`;
  }

  /**
   * Answers queries like "Which part of the rubric carries the most marks?"
   */
  public static getHighestMarkResponse(rubric: StructuredRubric): string {
    const summary = this.getStatusSummary(rubric);
    if (!summary.highestMarkRequirement) {
      return `No specific marks allocation found in the rubric for **${rubric.title}**.`;
    }

    const h = summary.highestMarkRequirement;
    const share = summary.totalMarks > 0 ? Math.round(((h.marks || 0) / summary.totalMarks) * 100) : 0;

    return `### HIGHEST WEIGHTAGE COMPONENT\n\n**${h.title}** carries the most marks in the **${rubric.title}** rubric:\n- **Marks:** **${h.marks} marks** (${share}% of total ${summary.totalMarks} marks)\n- **Status:** \`${h.status}\`\n- **Mandatory:** ${h.isMandatory ? "Yes" : "No"}\n\n*Source Evidence:* \`${h.sourceEvidence.snippet}\``;
  }

  /**
   * Generates a complete structured presentation breakdown of all rubric criteria.
   */
  public static getBreakdownResponse(rubric: StructuredRubric): string {
    const summary = this.getStatusSummary(rubric);
    const rows = rubric.requirements.map((r) => {
      const icon = r.status === "COMPLETED" ? "✓" : r.status === "IN_PROGRESS" ? "⏳" : "○";
      const markStr = r.marks ? `${r.marks} marks` : "—";
      return `${icon} ${r.title.padEnd(28)} ${markStr.padStart(10)}`;
    });

    return `### PROJECT REQUIREMENTS: ${rubric.title.toUpperCase()}\n\n\`\`\`\n${rows.join("\n")}\n\`\`\`\n\n**Total:** ${summary.completedMarks}/${summary.totalMarks} marks (${summary.completionPercentage}% completed · ${summary.missingCount} missing)`;
  }
}
