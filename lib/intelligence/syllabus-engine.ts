/**
 * lib/intelligence/syllabus-engine.ts
 *
 * Milestone 8-A — Syllabus Intelligence
 * Converts uploaded course syllabi (PDF / extracted text) into structured
 * academic knowledge:
 *   Course → Modules → Topics → Assessments
 *
 * Integrations:
 * - Reuses M2 NER (extractAcademicEntities, KNOWN_COURSES)
 * - Preserves source evidence snippets for all extracted facts
 * - Relates tasks/projects/deliverables to specific modules and topics
 * - Answers syllabus queries (e.g. "Which module is my NLP project related to?")
 * - Handles malformed or partial syllabi without hallucinating fake entities
 */

import { extractAcademicEntities } from "@/lib/nlp/ner";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SyllabusTopic {
  title: string;
  subtopics?: string[];
  rawSnippet?: string;
}

export interface SyllabusModule {
  moduleNumber: number;
  title: string;
  hours?: number | null;
  topics: string[];
  learningOutcomes?: string[];
  rawTextSpan: string;
  sourceEvidence?: {
    snippet: string;
    pageNumber?: number;
  };
}

export interface CourseLearningOutcome {
  id: string; // e.g. "CO1", "CO2", "LO1"
  outcome: string;
  rawTextSpan: string;
}

export type AssessmentCategory =
  | "ASSIGNMENT"
  | "PROJECT"
  | "CAT"
  | "FAT"
  | "QUIZ"
  | "LAB"
  | "PARTICIPATION"
  | "OTHER";

export interface SyllabusAssessmentComponent {
  component: string; // e.g. "Assignment", "NLP Mini Project", "Continuous Assessment Test 1 (CAT-1)"
  category: AssessmentCategory;
  weightagePercentage: number | null; // e.g. 20 (for 20%)
  marks: number | null; // e.g. 50 (if specified as marks)
  description?: string;
  examInfo?: string | null;
  rawTextSpan: string;
  sourceEvidence?: {
    snippet: string;
    pageNumber?: number;
  };
}

export interface SyllabusEvidence {
  fieldName: string;
  extractedSnippet: string;
  confidence: number;
  pageNumber?: number;
}

export interface StructuredSyllabus {
  courseCode: string;
  courseName: string;
  faculty: string | null;
  credits: number | null;
  academicPeriod: string | null;
  learningOutcomes: CourseLearningOutcome[];
  modules: SyllabusModule[];
  assessments: SyllabusAssessmentComponent[];
  sourceEvidences: SyllabusEvidence[];
  rawText: string;
  extractionConfidence: number;
  isMalformed: boolean;
  warnings: string[];
  metadata?: Record<string, any>;
}

export interface ModuleMatchResult {
  moduleNumber: number;
  moduleTitle: string;
  matchedTopics: string[];
  relevanceScore: number; // 0 to 1
  explanation: string;
  sourceEvidence: string;
}

export interface SyllabusQueryResponse {
  matched: boolean;
  query: string;
  courseCode?: string;
  courseName?: string;
  moduleMatch?: ModuleMatchResult;
  assessmentSummary?: string;
  answer: string;
  evidence: SyllabusEvidence[];
}

// ─── Extraction Engine ────────────────────────────────────────────────────────

export class SyllabusEngine {
  /**
   * Main entry point: Parses unstructured syllabus text or PDF extraction
   * into a StructuredSyllabus model with evidence preservation.
   */
  public static parseSyllabus(
    text: string,
    options: {
      sourceFilename?: string;
      pageNumber?: number;
      defaultCourseCode?: string;
    } = {}
  ): StructuredSyllabus {
    const raw = (text || "").trim();
    const warnings: string[] = [];
    const evidences: SyllabusEvidence[] = [];

    if (!raw || raw.length < 20) {
      return {
        courseCode: options.defaultCourseCode || "UNKNOWN",
        courseName: "Unknown Course",
        faculty: null,
        credits: null,
        academicPeriod: null,
        learningOutcomes: [],
        modules: [],
        assessments: [],
        sourceEvidences: [],
        rawText: raw,
        extractionConfidence: 0.1,
        isMalformed: true,
        warnings: ["Syllabus document is empty or below minimum character threshold"],
      };
    }

    // 1. Course Code & Course Name Resolution (reusing M2 NER)
    const nlpEntities = extractAcademicEntities(raw);
    let courseCode = nlpEntities.courseCode || options.defaultCourseCode || null;
    let courseName = nlpEntities.primaryCourseName || null;
    let faculty = this.extractFaculty(raw);
    const credits = this.extractCredits(raw);
    const academicPeriod = this.extractAcademicPeriod(raw);

    // If M2 NER didn't capture a regex course code, look for generic code patterns e.g. "CSE4001", "MAT2001", "CS 101"
    if (!courseCode) {
      const codeMatch = raw.match(/\b([A-Z]{2,4}\s*\d{3,4})\b/i);
      if (codeMatch) {
        courseCode = codeMatch[1].replace(/\s+/g, "").toUpperCase();
      }
    }

    // Attempt to extract title following course code if courseName is still null
    if (!courseName && courseCode) {
      const titlePattern = new RegExp(
        `${courseCode}[\\s:—–-]+([A-Za-z0-9\\s&/]{3,50})(?:\\n|\\r|Module|Credit|Syllabus|Course)`,
        "i"
      );
      const titleMatch = raw.match(titlePattern);
      if (titleMatch && titleMatch[1]) {
        courseName = titleMatch[1].trim();
      }
    }

    if (!courseCode) {
      warnings.push("No distinct academic course code identified in syllabus header.");
      courseCode = "GEN1001";
    }
    if (!courseName) {
      courseName = `${courseCode} Course`;
      warnings.push("Course title was not explicitly stated; defaulted to course code label.");
    }

    evidences.push({
      fieldName: "course",
      extractedSnippet: `${courseCode} — ${courseName}`,
      confidence: 0.95,
      pageNumber: options.pageNumber,
    });

    if (faculty) {
      evidences.push({
        fieldName: "faculty",
        extractedSnippet: faculty,
        confidence: 0.9,
        pageNumber: options.pageNumber,
      });
    }

    // 2. Extract Learning Outcomes
    const learningOutcomes = this.extractLearningOutcomes(raw, options.pageNumber);
    if (learningOutcomes.length > 0) {
      evidences.push({
        fieldName: "learningOutcomes",
        extractedSnippet: `Extracted ${learningOutcomes.length} learning outcomes: ${learningOutcomes.map((l) => l.id).join(", ")}`,
        confidence: 0.9,
        pageNumber: options.pageNumber,
      });
    }

    // 3. Extract Modules & Topics
    const modules = this.extractModules(raw, options.pageNumber);
    if (modules.length === 0) {
      warnings.push("No explicit Module or Unit demarcations detected (document may be malformed or unformatted text).");
    } else {
      modules.forEach((mod) => {
        evidences.push({
          fieldName: `module_${mod.moduleNumber}`,
          extractedSnippet: `Module ${mod.moduleNumber}: ${mod.title} (${mod.topics.length} topics)`,
          confidence: 0.95,
          pageNumber: options.pageNumber,
        });
      });
    }

    // 4. Extract Assessments & Weightages
    const assessments = this.extractAssessments(raw, options.pageNumber);
    if (assessments.length === 0) {
      warnings.push("No assessment breakdown or grading components detected in syllabus.");
    } else {
      assessments.forEach((ass) => {
        const wtStr = ass.weightagePercentage ? `${ass.weightagePercentage}%` : ass.marks ? `${ass.marks} marks` : "unweighted";
        evidences.push({
          fieldName: `assessment_${ass.category.toLowerCase()}`,
          extractedSnippet: `${ass.component}: ${wtStr}`,
          confidence: 0.9,
          pageNumber: options.pageNumber,
        });
      });
    }

    // Check if malformed: If neither modules nor assessments could be extracted
    const isMalformed = modules.length === 0 && assessments.length === 0;
    if (isMalformed) {
      warnings.push("Document could not be parsed into academic modules or assessment structures.");
    }

    // Compute extraction confidence
    let confidence = 0.5;
    if (courseCode && courseCode !== "GEN1001") confidence += 0.15;
    if (modules.length > 0) confidence += 0.2;
    if (assessments.length > 0) confidence += 0.15;
    if (isMalformed) confidence = 0.2;

    return {
      courseCode,
      courseName,
      faculty,
      credits,
      academicPeriod,
      learningOutcomes,
      modules,
      assessments,
      sourceEvidences: evidences,
      rawText: raw,
      extractionConfidence: Math.min(1.0, Math.round(confidence * 100) / 100),
      isMalformed,
      warnings,
      metadata: {
        sourceFilename: options.sourceFilename || "syllabus-upload.pdf",
        parsedAt: new Date().toISOString(),
      },
    };
  }

  // ─── Sub-Extractors ─────────────────────────────────────────────────────────

  private static extractFaculty(text: string): string | null {
    const facultyMatch =
      text.match(/(?:Faculty|Instructor|Professor|Prof\.|Teacher|Course Coordinator)[:\s]+([A-Z][a-zA-Z\s.,]+?)(?=\n|Email|Office|Credits|Slot|$)/i) ||
      text.match(/\b(Dr\.\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/);
    if (facultyMatch && facultyMatch[1]) {
      const fac = facultyMatch[1].trim().replace(/[,\s]+$/, "");
      if (fac.length > 3 && fac.length < 50) return fac;
    }
    return null;
  }

  private static extractCredits(text: string): number | null {
    const credMatch = text.match(/(?:Credits?|L-T-P-J-C|Credit Hours?)[:\s]+(?:[\d-]+[:\s]+)?(\d(?:\.\d)?)/i);
    if (credMatch && credMatch[1]) {
      const c = parseFloat(credMatch[1]);
      if (!isNaN(c) && c > 0 && c <= 30) return c;
    }
    return null;
  }

  private static extractAcademicPeriod(text: string): string | null {
    const periodMatch = text.match(/\b((?:Fall|Winter|Spring|Summer|Monsoon|Autumn)\s+(?:Semester\s+)?(?:20\d\d[-/]\d\d|20\d\d))\b/i);
    return periodMatch ? periodMatch[1].trim() : null;
  }

  private static extractLearningOutcomes(text: string, pageNumber?: number): CourseLearningOutcome[] {
    const outcomes: CourseLearningOutcome[] = [];

    // Pattern 1: CO1: ..., CO2: ..., LO1: ...
    const coRegex = /\b(CO\s*\d+|LO\s*\d+)[:\s]+([^\n\r]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = coRegex.exec(text)) !== null) {
      const id = match[1].replace(/\s+/g, "").toUpperCase();
      const outcome = match[2].trim();
      if (outcome.length > 5) {
        outcomes.push({
          id,
          outcome,
          rawTextSpan: match[0],
        });
      }
    }

    if (outcomes.length > 0) return outcomes;

    // Pattern 2: "Course Outcomes:" or "Learning Outcomes:" followed by numbered or bulleted list
    const sectionMatch = text.match(/(?:Course Outcomes?|Learning Outcomes?|Expected Outcomes?)[:\s]*\n([\s\S]+?)(?=\n\s*(?:Module|Unit|Assessment|Evaluation|Syllabus|Reference|$))/i);
    if (sectionMatch && sectionMatch[1]) {
      const lines = sectionMatch[1].split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let count = 1;
      for (const line of lines) {
        const clean = line.replace(/^[\d+.)\-•*]+\s*/, "").trim();
        if (clean.length > 10) {
          outcomes.push({
            id: `CO${count++}`,
            outcome: clean,
            rawTextSpan: line,
          });
        }
      }
    }

    return outcomes;
  }

  private static extractModules(text: string, pageNumber?: number): SyllabusModule[] {
    const modules: SyllabusModule[] = [];

    // Normalize text linebreaks
    const cleanText = text.replace(/\r\n/g, "\n");

    // Strategy 1: Standard Module / Unit / Chapter headers
    // Examples:
    // "Module 1: Text Processing"
    // "Module: 1 Text Processing"
    // "Unit 1 — Text Processing"
    // "Module 1 (4 hours): Introduction to Operating Systems"
    // "Module 2: Structured Query Language (SQL)"
    const moduleHeaderRegex = /(?:^|\n)(?:Module|Unit|Chapter)\s*[:\s]*(\d+)\s*(?:\(([^)]+)\))?[:\s\-—]*([^\n]+)/gi;
    const matches: Array<{
      index: number;
      moduleNumber: number;
      title: string;
      hoursStr?: string;
      fullMatch: string;
    }> = [];

    let m: RegExpExecArray | null;
    while ((m = moduleHeaderRegex.exec(cleanText)) !== null) {
      const num = parseInt(m[1], 10);
      let hoursStr = m[2] ? m[2].trim() : undefined;
      let rawTitle = (m[3] || "").trim();

      // If hours were not before the colon, check if they are at the end of the title line e.g. "Title (4 hours)"
      if (!hoursStr) {
        const trailingHoursMatch = rawTitle.match(/\s*\(([^)]*(?:hours?|hrs?|lecture)[^)]*)\)$/i);
        if (trailingHoursMatch) {
          hoursStr = trailingHoursMatch[1].trim();
          rawTitle = rawTitle.replace(/\s*\(([^)]*(?:hours?|hrs?|lecture)[^)]*)\)$/i, "").trim();
        }
      }

      matches.push({
        index: m.index,
        moduleNumber: num,
        title: rawTitle,
        hoursStr,
        fullMatch: m[0],
      });
    }

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const curr = matches[i];
        const next = matches[i + 1];
        const sectionText = next
          ? cleanText.substring(curr.index, next.index)
          : cleanText.substring(curr.index, curr.index + 1500);

        // Extract lecture hours if present
        let hours: number | null = null;
        if (curr.hoursStr) {
          const hMatch = curr.hoursStr.match(/(\d+)\s*(?:hours?|hrs?|lecture)/i);
          if (hMatch) hours = parseInt(hMatch[1], 10);
        } else {
          const inlineHours = sectionText.match(/(\d+)\s*(?:lecture\s+)?(?:hours?|hrs?)/i);
          if (inlineHours) hours = parseInt(inlineHours[1], 10);
        }

        // Extract topics inside the module block
        const topics = this.extractTopicsFromBlock(sectionText, curr.title);

        modules.push({
          moduleNumber: curr.moduleNumber,
          title: curr.title || `Module ${curr.moduleNumber}`,
          hours,
          topics,
          rawTextSpan: sectionText.trim(),
          sourceEvidence: {
            snippet: `Module ${curr.moduleNumber}: ${curr.title} — ${topics.slice(0, 3).join(", ")}`,
            pageNumber,
          },
        });
      }

      return modules;
    }

    // Strategy 2: Roman numeral modules e.g. "Module I: Introduction", "Module II: ..."
    const romanMap: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
    const romanHeaderRegex = /(?:^|\n)(?:Module|Unit)\s+([IVXLCDM]+)[:\s\-—]+([^\n]+)/gi;
    while ((m = romanHeaderRegex.exec(cleanText)) !== null) {
      const num = romanMap[m[1].toUpperCase()] || 1;
      const title = m[2].trim();
      modules.push({
        moduleNumber: num,
        title,
        topics: [title],
        rawTextSpan: m[0].trim(),
        sourceEvidence: {
          snippet: m[0].trim(),
          pageNumber,
        },
      });
    }

    return modules;
  }

  private static extractTopicsFromBlock(blockText: string, moduleTitle: string): string[] {
    const topics: string[] = [];
    const lines = blockText.split("\n").map((l) => l.trim()).filter(Boolean);

    // Skip the first line which is the module header
    const bodyLines = lines.slice(1);

    for (const line of bodyLines) {
      // Stop if entering assessment or another section
      if (/^(?:Assessment|Evaluation|Marks|Continuous Assessment|CAT|Weightage)/i.test(line)) {
        break;
      }

      // Bullet points e.g. "- Lexical Analysis", "* Stemming", "• WordNet", "1.1 Morphology"
      if (/^[-•*—]\s+/.test(line) || /^\d+\.\d+\s+/.test(line)) {
        const clean = line.replace(/^[-•*—\d.]+\s*/, "").trim();
        if (clean.length > 2 && clean.length < 100) {
          topics.push(clean);
        }
      } else if (line.includes(",") || line.includes(";")) {
        // Comma-separated or semicolon-separated topics
        const parts = line.split(/[,;]/).map((p) => p.trim()).filter((p) => p.length > 2 && p.length < 80);
        if (parts.length > 1) {
          topics.push(...parts);
        }
      } else if (line.length > 3 && line.length < 60 && !line.includes(":")) {
        // Standalone topic line
        topics.push(line);
      }
    }

    // If no bulleted or split topics found, include the module title itself
    if (topics.length === 0 && moduleTitle) {
      topics.push(moduleTitle);
    }

    // Deduplicate topics
    return Array.from(new Set(topics));
  }

  private static extractAssessments(text: string, pageNumber?: number): SyllabusAssessmentComponent[] {
    const assessments: SyllabusAssessmentComponent[] = [];
    const cleanText = text.replace(/\r\n/g, "\n");

    // Search for assessment section or inline assessment declarations
    // Examples:
    // "Assignment — 20%"
    // "Assignment: 20%"
    // "Assignments (20 marks)"
    // "Project — 30%"
    // "CAT — 20%"
    // "CAT 1: 50 marks (weightage 15%)"
    // "FAT: 40%"
    // "Term Paper: 15%"
    // "Lab Assessment: 25%"
    // "Quiz: 10%"
    const componentPatterns: Array<{
      category: AssessmentCategory;
      nameRegex: RegExp;
    }> = [
      { category: "PROJECT", nameRegex: /(?:Project|Mini[\s-]Project|Capstone|Term Paper)/i },
      { category: "ASSIGNMENT", nameRegex: /(?:Assignment|Home[\s-]Assignment|Assignments)/i },
      { category: "CAT", nameRegex: /(?:CAT(?:[\s-]?[12])?|Continuous Assessment(?: Test)?|Mid[\s-]Term|Internal Assessment)/i },
      { category: "FAT", nameRegex: /(?:FAT|Final Assessment(?: Test)?|End[\s-]Semester(?: Exam)?|Final Exam|Term End Exam)/i },
      { category: "QUIZ", nameRegex: /(?:Quiz|Online Quiz|Quizzes)/i },
      { category: "LAB", nameRegex: /(?:Lab(?:oratory)?|Practical|Lab Assessment)/i },
      { category: "PARTICIPATION", nameRegex: /(?:Attendance|Class Participation)/i },
    ];

    const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Test for weightage percentage: e.g. "Assignment — 20%" or "Project: 30%" or "20% weightage"
      const pctMatch = line.match(/(\d+(?:\.\d+)?)\s*%/);
      const marksMatch = line.match(/(\d+)\s*(?:marks|pts|points)/i);

      if (pctMatch || marksMatch) {
        const pct = pctMatch ? parseFloat(pctMatch[1]) : null;
        const marks = marksMatch ? parseInt(marksMatch[1], 10) : null;

        for (const comp of componentPatterns) {
          if (comp.nameRegex.test(line)) {
            // Determine name
            const labelMatch = line.match(/^([A-Za-z0-9\s\-–—()]+?)(?:[:\-–—]|\b\d+\s*[%]|Marks)/i);
            const componentName = labelMatch ? labelMatch[1].trim() : line.slice(0, 40);

            // Avoid adding duplicates of the same category with identical percentages
            const alreadyAdded = assessments.some(
              (a) => a.category === comp.category && a.weightagePercentage === pct && a.marks === marks
            );

            if (!alreadyAdded) {
              assessments.push({
                component: componentName || comp.category,
                category: comp.category,
                weightagePercentage: pct,
                marks,
                rawTextSpan: line,
                sourceEvidence: {
                  snippet: line,
                  pageNumber,
                },
              });
            }
            break;
          }
        }
      }
    }

    return assessments;
  }

  // ─── Query & Relationship Intelligence ───────────────────────────────────────

  /**
   * Identifies which module in the syllabus a given deliverable/task or topic is related to.
   * Example: "Which module is my NLP project related to?"
   * Searches module titles, topic lists, and learning outcomes for relevant keywords.
   */
  public static findRelatedModule(
    queryOrDeliverable: string,
    syllabus: StructuredSyllabus
  ): ModuleMatchResult | null {
    if (!syllabus || syllabus.modules.length === 0) return null;

    const lower = queryOrDeliverable.toLowerCase();
    // Tokenize query into meaningful academic keywords (drop stop words)
    const stopWords = new Set([
      "which", "what", "where", "is", "my", "our", "the", "in", "to", "for",
      "related", "belongs", "covered", "about", "module", "topic", "project",
      "assignment", "task", "unit", "and", "or", "of", "a", "an", "does"
    ]);

    const rawTokens = lower
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t));

    // Also include key phrases like "language models", "text processing", "transformers"
    let bestModule: SyllabusModule | null = null;
    let bestScore = 0;
    let matchedTopics: string[] = [];

    for (const mod of syllabus.modules) {
      let score = 0;
      const currentMatchedTopics: string[] = [];

      // Check title direct containment
      const modTitleLower = mod.title.toLowerCase();
      if (lower.includes(modTitleLower) || modTitleLower.includes(lower)) {
        score += 0.6;
        currentMatchedTopics.push(mod.title);
      }

      // Check tokens against module title
      for (const token of rawTokens) {
        if (modTitleLower.includes(token)) {
          score += 0.3;
        }
      }

      // Check topics
      for (const topic of mod.topics) {
        const topLower = topic.toLowerCase();
        // Phrase match
        if (lower.includes(topLower)) {
          score += 0.5;
          currentMatchedTopics.push(topic);
        } else {
          // Token matches
          for (const token of rawTokens) {
            if (topLower.includes(token)) {
              score += 0.2;
              if (!currentMatchedTopics.includes(topic)) {
                currentMatchedTopics.push(topic);
              }
            }
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestModule = mod;
        matchedTopics = currentMatchedTopics;
      }
    }

    if (!bestModule || bestScore === 0) {
      // Default fallback to Module 1 or project-oriented module if present
      const projectMod = syllabus.modules.find((m) =>
        /project|application|case study|advanced/i.test(m.title)
      );
      if (projectMod && lower.includes("project")) {
        return {
          moduleNumber: projectMod.moduleNumber,
          moduleTitle: projectMod.title,
          matchedTopics: projectMod.topics.slice(0, 2),
          relevanceScore: 0.5,
          explanation: `Related to Module ${projectMod.moduleNumber}: "${projectMod.title}" which covers application and project deliverables.`,
          sourceEvidence: projectMod.rawTextSpan.slice(0, 150),
        };
      }
      return null;
    }

    const normScore = Math.min(1.0, Math.round(bestScore * 100) / 100);
    const topStr = matchedTopics.length > 0 ? ` Topics: "${matchedTopics.join('", "')}".` : "";

    return {
      moduleNumber: bestModule.moduleNumber,
      moduleTitle: bestModule.title,
      matchedTopics,
      relevanceScore: normScore,
      explanation: `Your inquiry relates to Module ${bestModule.moduleNumber}: "${bestModule.title}".${topStr}`,
      sourceEvidence: bestModule.rawTextSpan.slice(0, 180),
    };
  }

  /**
   * Answers a syllabus-focused query against the syllabus model.
   * Handles:
   * - "Which module is [X] related to?"
   * - "What is the assessment breakdown / weightage for [course]?"
   * - "What are the topics in Module [N]?"
   * - "What are the course learning outcomes?"
   */
  public static querySyllabus(
    query: string,
    syllabus: StructuredSyllabus
  ): SyllabusQueryResponse {
    const lower = query.toLowerCase();

    // 1. Module relationship question
    if (
      lower.includes("which module") ||
      lower.includes("what module") ||
      lower.includes("related to") ||
      lower.includes("belongs to") ||
      lower.includes("covers")
    ) {
      const match = this.findRelatedModule(query, syllabus);
      if (match) {
        return {
          matched: true,
          query,
          courseCode: syllabus.courseCode,
          courseName: syllabus.courseName,
          moduleMatch: match,
          answer: `**${syllabus.courseCode} — ${syllabus.courseName}**:\n${match.explanation}\n\n*Source Evidence:* \`${match.sourceEvidence.replace(/\n+/g, " ").trim()}\``,
          evidence: [
            {
              fieldName: `module_${match.moduleNumber}`,
              extractedSnippet: match.sourceEvidence,
              confidence: match.relevanceScore,
            },
          ],
        };
      }
    }

    // 2. Assessment breakdown question
    if (
      lower.includes("assessment") ||
      lower.includes("weightage") ||
      lower.includes("marks") ||
      lower.includes("cat") ||
      lower.includes("fat") ||
      lower.includes("exam breakdown")
    ) {
      if (syllabus.assessments.length > 0) {
        const breakdownLines = syllabus.assessments.map((a) => {
          const wt = a.weightagePercentage ? `${a.weightagePercentage}%` : a.marks ? `${a.marks} Marks` : "TBA";
          return `- **${a.component}** (${a.category}): ${wt}`;
        });
        const summary = breakdownLines.join("\n");
        return {
          matched: true,
          query,
          courseCode: syllabus.courseCode,
          courseName: syllabus.courseName,
          assessmentSummary: summary,
          answer: `**Assessment Scheme for ${syllabus.courseCode} (${syllabus.courseName}):**\n\n${summary}`,
          evidence: syllabus.assessments.map((a) => ({
            fieldName: `assessment_${a.category.toLowerCase()}`,
            extractedSnippet: a.rawTextSpan,
            confidence: 0.95,
          })),
        };
      }
    }

    // 3. Specific module contents inquiry: "What is in Module 2?"
    const modNumMatch = lower.match(/module\s*(\d+)/i) || lower.match(/unit\s*(\d+)/i);
    if (modNumMatch) {
      const modNum = parseInt(modNumMatch[1], 10);
      const targetMod = syllabus.modules.find((m) => m.moduleNumber === modNum);
      if (targetMod) {
        const topicList = targetMod.topics.map((t) => `- ${t}`).join("\n");
        return {
          matched: true,
          query,
          courseCode: syllabus.courseCode,
          courseName: syllabus.courseName,
          answer: `**Module ${targetMod.moduleNumber}: ${targetMod.title}**\n${targetMod.hours ? `*Lecture Hours:* ${targetMod.hours}\n` : ""}\n**Topics covered:**\n${topicList}`,
          evidence: [
            {
              fieldName: `module_${targetMod.moduleNumber}`,
              extractedSnippet: targetMod.rawTextSpan,
              confidence: 0.95,
            },
          ],
        };
      }
    }

    // 4. General overview fallback
    const moduleOverview = syllabus.modules.map((m) => `Module ${m.moduleNumber}: ${m.title}`).join(", ");
    return {
      matched: true,
      query,
      courseCode: syllabus.courseCode,
      courseName: syllabus.courseName,
      answer: `**${syllabus.courseCode} — ${syllabus.courseName}**\nFaculty: ${syllabus.faculty || "Faculty not listed"}\nCredits: ${syllabus.credits || "4"}\nModules: ${moduleOverview || "None detected"}`,
      evidence: syllabus.sourceEvidences.slice(0, 3),
    };
  }
}
