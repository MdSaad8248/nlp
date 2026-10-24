import { prisma } from "@/lib/db/prisma";
import {
  SyllabusEngine,
  StructuredSyllabus,
  SyllabusQueryResponse,
} from "./syllabus-engine";

export interface CreateSyllabusInput {
  courseCode: string;
  title?: string;
  rawText: string;
  semester?: string;
  sourceFilename?: string;
  facultyId?: string;
}

export class SyllabusService {
  /**
   * Retrieves the active syllabus for a specific course code from persistent database storage.
   */
  public static async getSyllabusByCourse(courseCode: string) {
    const cleanCode = courseCode.trim().toUpperCase().replace(/\s+/g, "");
    const record = await prisma.syllabus.findFirst({
      where: {
        courseCode: { equals: cleanCode },
        isArchived: false,
      },
      orderBy: { version: "desc" },
      include: {
        course: true,
        faculty: { select: { id: true, name: true, email: true, department: true } },
      },
    });

    if (!record) return null;

    let modules = [];
    let courseOutcomes = [];
    let assessments = [];

    try {
      if (record.modulesJson) modules = JSON.parse(record.modulesJson);
      if (record.courseOutcomesJson) courseOutcomes = JSON.parse(record.courseOutcomesJson);
      if (record.assessmentsJson) assessments = JSON.parse(record.assessmentsJson);
    } catch {
      // Fallback if parsing fails
    }

    return {
      ...record,
      modules,
      courseOutcomes,
      assessments,
    };
  }

  /**
   * Retrieves all verified syllabi stored in the database.
   */
  public static async getAllSyllabi() {
    const records = await prisma.syllabus.findMany({
      where: { isArchived: false },
      orderBy: [{ courseCode: "asc" }, { version: "desc" }],
      include: {
        course: true,
        faculty: { select: { id: true, name: true, email: true } },
      },
    });

    return records.map((record) => {
      let modules = [];
      let courseOutcomes = [];
      let assessments = [];
      try {
        if (record.modulesJson) modules = JSON.parse(record.modulesJson);
        if (record.courseOutcomesJson) courseOutcomes = JSON.parse(record.courseOutcomesJson);
        if (record.assessmentsJson) assessments = JSON.parse(record.assessmentsJson);
      } catch {}

      return {
        ...record,
        modules,
        courseOutcomes,
        assessments,
      };
    });
  }

  /**
   * Parses, validates, and persists an uploaded or entered syllabus to the database.
   */
  public static async saveSyllabus(input: CreateSyllabusInput) {
    const cleanCode = input.courseCode.trim().toUpperCase().replace(/\s+/g, "");

    // 1. Verify that the associated course exists
    let course = await prisma.course.findUnique({ where: { code: cleanCode } });
    if (!course) {
      // Auto-create course if not registered
      course = await prisma.course.create({
        data: {
          code: cleanCode,
          title: input.title || `${cleanCode} Course`,
          credits: 4,
        },
      });
    }

    // 2. Parse syllabus text using the deterministic NLP Syllabus Engine
    const parsed: StructuredSyllabus = SyllabusEngine.parseSyllabus(input.rawText, {
      defaultCourseCode: cleanCode,
      sourceFilename: input.sourceFilename,
    });

    // 3. Determine current version number for version tracking
    const existing = await prisma.syllabus.findFirst({
      where: { courseCode: cleanCode },
      orderBy: { version: "desc" },
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    // 4. Persist to database
    const saved = await prisma.syllabus.create({
      data: {
        courseId: course.id,
        courseCode: cleanCode,
        title: input.title || `${cleanCode} — ${course.title} Syllabus`,
        semester: input.semester || "Fall 2026-27",
        facultyId: input.facultyId || null,
        sourceFilename: input.sourceFilename || "syllabus.pdf",
        rawText: input.rawText,
        modulesJson: JSON.stringify(parsed.modules),
        courseOutcomesJson: JSON.stringify(parsed.learningOutcomes),
        assessmentsJson: JSON.stringify(parsed.assessments),
        version: nextVersion,
        isVerified: true,
      },
      include: {
        course: true,
        faculty: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      ...saved,
      parsed,
    };
  }

  /**
   * Queries a specific course syllabus grounded strictly in the persisted database content.
   * If syllabus has not been uploaded, returns a transparent explanation instead of fabricating.
   */
  public static async querySyllabus(courseCode: string, query: string): Promise<SyllabusQueryResponse> {
    const record = await this.getSyllabusByCourse(courseCode);

    if (!record) {
      return {
        matched: false,
        query,
        answer: `No syllabus document has been uploaded for course ${courseCode}. Grounded syllabus intelligence requires an authorized faculty or course coordinator to upload the verified syllabus document.`,
        evidence: [],
      };
    }

    const structured: StructuredSyllabus = {
      courseCode: record.courseCode,
      courseName: record.course.title,
      credits: record.course.credits,
      faculty: record.faculty?.name || record.course.faculty || null,
      academicPeriod: record.semester,
      learningOutcomes: (record.courseOutcomes || []).map((o: any, idx: number) =>
        typeof o === "string" ? { id: `CO${idx + 1}`, outcome: o, rawTextSpan: o } : o
      ),
      modules: record.modules || [],
      assessments: record.assessments || [],
      sourceEvidences: [],
      rawText: record.rawText,
      extractionConfidence: 1.0,
      isMalformed: false,
      warnings: [],
    };

    return SyllabusEngine.querySyllabus(query, structured);
  }

  /**
   * Deletes or archives a syllabus.
   */
  public static async deleteSyllabus(id: string) {
    return prisma.syllabus.delete({ where: { id } });
  }
}
