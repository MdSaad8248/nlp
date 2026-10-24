import { prisma } from "@/lib/db/prisma";
import {
  RubricEngine,
  StructuredRubric,
  RubricRequirement,
} from "./rubric-engine";

export interface CreateRubricInput {
  courseCode: string;
  taskTitle: string;
  title?: string;
  rawText: string;
  totalMarks?: number;
  sourceDocument?: string;
  authorId?: string;
}

export class RubricService {
  /**
   * Retrieves all rubrics for a specific course code from the database.
   */
  public static async getRubricsByCourse(courseCode: string) {
    const cleanCode = courseCode.trim().toUpperCase().replace(/\s+/g, "");
    const records = await prisma.rubric.findMany({
      where: { courseCode: cleanCode },
      orderBy: { updatedAt: "desc" },
      include: {
        course: true,
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return records.map((r) => {
      let criteria: RubricRequirement[] = [];
      let guidelines: string[] = [];
      try {
        if (r.criteriaJson) criteria = JSON.parse(r.criteriaJson);
        if (r.guidelinesJson) guidelines = JSON.parse(r.guidelinesJson);
      } catch {}

      return {
        ...r,
        criteria,
        guidelines,
      };
    });
  }

  /**
   * Retrieves all verified rubrics across all courses.
   */
  public static async getAllRubrics() {
    const records = await prisma.rubric.findMany({
      orderBy: [{ courseCode: "asc" }, { updatedAt: "desc" }],
      include: {
        course: true,
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return records.map((r) => {
      let criteria: RubricRequirement[] = [];
      let guidelines: string[] = [];
      try {
        if (r.criteriaJson) criteria = JSON.parse(r.criteriaJson);
        if (r.guidelinesJson) guidelines = JSON.parse(r.guidelinesJson);
      } catch {}

      return {
        ...r,
        criteria,
        guidelines,
      };
    });
  }

  /**
   * Parses, validates, and persists an assessment rubric to the database.
   */
  public static async saveRubric(input: CreateRubricInput) {
    const cleanCode = input.courseCode.trim().toUpperCase().replace(/\s+/g, "");

    // 1. Ensure course exists
    let course = await prisma.course.findUnique({ where: { code: cleanCode } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          code: cleanCode,
          title: `${cleanCode} Course`,
          credits: 4,
        },
      });
    }

    // 2. Parse using deterministic RubricEngine
    const parsed: StructuredRubric = RubricEngine.parseRubric(input.rawText, {
      taskTitleHint: input.taskTitle,
      courseCodeHint: cleanCode,
      sourceDocument: input.sourceDocument,
    });

    // 3. Version tracking
    const existing = await prisma.rubric.findFirst({
      where: {
        courseCode: cleanCode,
        taskTitle: { equals: input.taskTitle },
      },
      orderBy: { version: "desc" },
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    // 4. Validate marks consistency
    const totalMarks = input.totalMarks || parsed.totalMarks || 100;
    const sumCriteriaMarks = parsed.requirements.reduce((acc, r) => acc + (r.marks || 0), 0);
    const hasWeightDiscrepancy = sumCriteriaMarks > 0 && Math.abs(sumCriteriaMarks - totalMarks) > 0.01;

    // 5. Persist to database
    const saved = await prisma.rubric.create({
      data: {
        courseId: course.id,
        courseCode: cleanCode,
        taskTitle: input.taskTitle,
        title: input.title || `${cleanCode} ${input.taskTitle} Rubric`,
        totalMarks,
        sourceDocument: input.sourceDocument || "rubric.pdf",
        criteriaJson: JSON.stringify(parsed.requirements),
        guidelinesJson: JSON.stringify(parsed.submissionGuidelines),
        authorId: input.authorId || null,
        version: nextVersion,
        isVerified: true,
      },
      include: {
        course: true,
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      ...saved,
      parsed,
      sumCriteriaMarks,
      hasWeightDiscrepancy,
    };
  }

  /**
   * Queries rubric requirements grounded in saved database rubrics.
   */
  public static async queryRubric(query: string, courseCodeHint?: string) {
    const cleanCode = courseCodeHint?.trim().toUpperCase().replace(/\s+/g, "");
    let rubrics = await this.getAllRubrics();

    if (cleanCode) {
      const filtered = rubrics.filter((r) => r.courseCode === cleanCode);
      if (filtered.length > 0) rubrics = filtered;
    }

    if (rubrics.length === 0) {
      return {
        matched: false,
        answer: "No assessment rubrics have been uploaded yet for this course. You can upload a rubric PDF or criteria document through the Rubrics tab.",
      };
    }

    const primary = rubrics[0];
    const structured: StructuredRubric = {
      id: primary.id,
      title: primary.title,
      taskTitle: primary.taskTitle,
      courseCode: primary.courseCode,
      courseName: primary.courseCode,
      totalMarks: primary.totalMarks,
      totalWeightage: null,
      requirements: primary.criteria,
      submissionGuidelines: primary.guidelines,
      deadline: null,
      sourceDocument: primary.sourceDocument || "rubric.pdf",
      isMalformed: false,
      warnings: [],
      rawText: "",
      createdAt: primary.updatedAt.toISOString(),
    };

    const lower = query.toLowerCase();

    if (
      lower.includes("missing") ||
      lower.includes("not done") ||
      lower.includes("remaining") ||
      lower.includes("pending")
    ) {
      return {
        matched: true,
        answer: RubricEngine.getMissingRequirementsResponse(structured),
        rubric: structured,
      };
    }

    if (
      lower.includes("highest mark") ||
      lower.includes("most mark") ||
      lower.includes("weightage")
    ) {
      return {
        matched: true,
        answer: RubricEngine.getHighestMarkResponse(structured),
        rubric: structured,
      };
    }

    return {
      matched: true,
      answer: RubricEngine.getBreakdownResponse(structured),
      rubric: structured,
    };
  }

  /**
   * Deletes a rubric record.
   */
  public static async deleteRubric(id: string) {
    return prisma.rubric.delete({ where: { id } });
  }
}
