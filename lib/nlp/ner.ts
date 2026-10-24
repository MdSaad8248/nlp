import { ExtractedEntity, FieldEvidence, TaskCategory, PriorityLevel, CourseResolution, EntityOrigin } from "./schemas";

export interface AcademicEntities {
  courses: string[];
  courseCodes: string[];
  courseCode: string | null;
  primaryCourseName: string | null;
  primaryCourseCode: string | null;
  primaryCourseCodeOrigin: EntityOrigin;
  courseResolutions: CourseResolution[];
  taskType: string | null;
  taskCategory: TaskCategory;
  platforms: string[];
  venues: string[];
  marks: number | null;
  weightage: number | null;
  conditions: string[];
  penaltyClause: string | null;
  urgencyKeywords: string[];
  urgencyLevel: PriorityLevel;
  actions: string[];
  allEntities: ExtractedEntity[];
  evidences: FieldEvidence[];
}

const KNOWN_COURSES = [
  { code: "CSE4001", name: "Natural Language Processing", aliases: ["nlp", "natural language processing", "cse4001"] },
  { code: "CSE3002", name: "Machine Learning", aliases: ["ml", "machine learning", "cse3002"] },
  { code: "CSE2001", name: "Computer Networks", aliases: ["computer networks", "cn", "networks", "cse2001"] },
  { code: "CSE3001", name: "Database Management Systems", aliases: ["dbms", "database management", "databases", "cse3001"] },
  { code: "CSE2004", name: "Operating Systems", aliases: ["operating systems", "os", "cse2004"] },
  { code: "MAT2001", name: "Applied Statistics", aliases: ["applied statistics", "statistics", "stats", "mat2001"] },
  { code: "CSE3005", name: "Artificial Intelligence", aliases: ["ai", "artificial intelligence", "cse3005"] },
  { code: "CSE4002", name: "Deep Learning", aliases: ["deep learning", "dl", "cse4002"] },
  { code: "CSE3003", name: "Software Engineering", aliases: ["software engineering", "se", "cse3003"] },
  { code: "ECE3001", name: "Internet of Things", aliases: ["iot", "internet of things", "ece3001"] },
  { code: "CSE2002", name: "Data Structures and Algorithms", aliases: ["dsa", "data structures", "cse2002"] },
];

const KNOWN_PLATFORMS = [
  "vtop", "moodle", "canvas", "google classroom", "blackboard",
  "github", "microsoft teams", "teams", "zoom", "codetantra", "hackerearth"
];

const PENALTY_PATTERNS = [
  /late\s+submissions?\s+(?:will\s+not|won't)\s+be\s+accepted/i,
  /late\s+submission\s+policy/i,
  /no\s+(?:further\s+)?extensions?\s+(?:will\s+be\s+given|permitted|granted)/i,
  /(?:zero\s+marks?\s+will\s+be\s+awarded|will\s+receive\s+zero\s+marks)/i,
  /(?:marks?\s+will\s+be\s+deducted|face\s+marks?\s+deductions?)/i,
  /strictly\s+prohibited/i,
  /strict\s+deadline/i,
  /defaulters\s+will\s+be\s+penalized/i,
];

// Specific condition patterns e.g. "students who have not submitted"
const CONDITION_PATTERNS = [
  /students\s+who\s+have\s+not\s+submitted/i,
  /only\s+for\s+(?:registered|enrolled|eligible)\s+students/i,
  /defaulters\s+only/i,
  /students\s+with\s+attendance\s+(?:shortage|below\s+\d+%\s*)/i,
  /those\s+who\s+(?:missed|failed\s+to\s+attend)/i,
  /subject\s+to\s+faculty\s+approval/i,
  /mandatory\s+for\s+all\s+students/i,
  /students\s+scoring\s+below\s+\d+/i,
];

export function extractAcademicEntities(text: string): AcademicEntities {
  const allEntities: ExtractedEntity[] = [];
  const evidences: FieldEvidence[] = [];
  const courses: string[] = [];
  const courseCodes: string[] = [];
  const courseResolutions: CourseResolution[] = [];
  const platforms: string[] = [];
  const venues: string[] = [];
  const actions: string[] = [];
  const conditions: string[] = [];
  const urgencyKeywords: string[] = [];
  let primaryCourseName: string | null = null;
  let primaryCourseCode: string | null = null;
  let primaryCourseCodeOrigin: EntityOrigin = "EXTRACTED_FROM_SOURCE";
  let penaltyClause: string | null = null;
  let marks: number | null = null;
  let weightage: number | null = null;

  // 1. Explicit Course Code regex (e.g. CSE4001, MAT2001, ECE3001 in notice text)
  const courseCodeRegex = /\b([A-Z]{2,4})\s*(\d{3,4}[A-Z]?)\b/g;
  let codeMatch: RegExpExecArray | null;
  while ((codeMatch = courseCodeRegex.exec(text)) !== null) {
    const fullCode = `${codeMatch[1]}${codeMatch[2]}`;
    if (!courseCodes.includes(fullCode)) {
      courseCodes.push(fullCode);
      if (!primaryCourseCode) {
        primaryCourseCode = fullCode;
        primaryCourseCodeOrigin = "EXTRACTED_FROM_SOURCE";
      }

      allEntities.push({
        type: "COURSE_CODE",
        text: fullCode,
        normalizedValue: fullCode,
        origin: "EXTRACTED_FROM_SOURCE",
        resolutionNote: "Explicitly extracted from notice text",
        confidence: 0.98,
        rawSnippet: codeMatch[0],
        startIndex: codeMatch.index,
        endIndex: codeMatch.index + codeMatch[0].length,
      });

      evidences.push({
        field: "courseCode",
        value: fullCode,
        rawSnippet: codeMatch[0],
        startIndex: codeMatch.index,
        endIndex: codeMatch.index + codeMatch[0].length,
        confidence: 0.98,
      });
    }
  }

  // 2. Known Courses & Aliases (Resolution against academic course registry)
  for (const course of KNOWN_COURSES) {
    for (const alias of course.aliases) {
      const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const match = aliasRegex.exec(text);
      if (match) {
        // Check if code was explicitly present in the source notice
        const codeExplicitlyInNotice = courseCodes.includes(course.code);
        const codeOrigin: EntityOrigin = codeExplicitlyInNotice ? "EXTRACTED_FROM_SOURCE" : "RESOLVED_FROM_REGISTRY";

        if (!courses.includes(course.name)) {
          courses.push(course.name);
          if (!primaryCourseName) primaryCourseName = course.name;
          if (!primaryCourseCode) {
            primaryCourseCode = course.code;
            primaryCourseCodeOrigin = codeOrigin;
          }

          courseResolutions.push({
            code: course.code,
            name: course.name,
            codeOrigin,
            nameOrigin: "EXTRACTED_FROM_SOURCE",
            rawSnippet: match[0],
            resolutionNote: codeExplicitlyInNotice
              ? `Course code ${course.code} explicitly present in notice text.`
              : `Course code ${course.code} resolved from academic database catalog (matched "${match[0]}").`,
          });

          allEntities.push({
            type: "COURSE_NAME",
            text: course.name,
            normalizedValue: course.code,
            origin: "EXTRACTED_FROM_SOURCE",
            confidence: 0.95,
            rawSnippet: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          });

          if (!codeExplicitlyInNotice && !courseCodes.includes(course.code)) {
            // Register inferred code with clear provenance flag
            courseCodes.push(course.code);
            allEntities.push({
              type: "COURSE_CODE",
              text: course.code,
              normalizedValue: course.code,
              origin: "RESOLVED_FROM_REGISTRY",
              resolutionNote: `Resolved from academic database catalog via keyword "${match[0]}"`,
              confidence: 0.90,
              rawSnippet: match[0],
            });
          }

          evidences.push({
            field: "courseName",
            value: course.name,
            rawSnippet: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 0.95,
          });
        }
        break;
      }
    }
  }

  // Fallback: capitalized subject titles e.g. "Software Engineering Project"
  if (courses.length === 0) {
    const genericSubjectRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s+(?:Project|Assignment|Course|Class|Lab|Lecture)\b/g;
    let subjMatch: RegExpExecArray | null;
    while ((subjMatch = genericSubjectRegex.exec(text)) !== null) {
      const candidate = subjMatch[1];
      if (!["Mini", "Final", "Major", "Term", "Group", "Dear"].includes(candidate)) {
        courses.push(candidate);
        if (!primaryCourseName) primaryCourseName = candidate;
        allEntities.push({
          type: "COURSE_NAME",
          text: candidate,
          normalizedValue: candidate,
          confidence: 0.78,
          rawSnippet: subjMatch[0],
          startIndex: subjMatch.index,
          endIndex: subjMatch.index + subjMatch[0].length,
        });
        evidences.push({
          field: "courseName",
          value: candidate,
          rawSnippet: subjMatch[0],
          confidence: 0.78,
        });
        break;
      }
    }
  }

  // 3. Task Type & Category
  let taskType: string | null = null;
  let taskCategory: TaskCategory = "ASSIGNMENT";

  const taskTypeRules = [
    { regex: /\b(?:project\s+review\s*[-–#]?\s*([0-3]|one|two|three)?|viva(?:\s+voce)?)\b/i, category: "REVIEW" as TaskCategory, label: "Project Review" },
    { regex: /\b(?:mini\s*project|capstone|final\s*project|major\s*project)\b/i, category: "PROJECT" as TaskCategory, label: "Project Deliverable" },
    { regex: /\b(?:cat\s*[-–]?\s*[12]|continuous\s+assessment\s+test\s*[12])\b/i, category: "EXAM" as TaskCategory, label: "CAT Exam" },
    { regex: /\b(?:fat|final\s+assessment\s+test|end\s+sem(?:ester)?\s+exam)\b/i, category: "EXAM" as TaskCategory, label: "Final Assessment Test (FAT)" },
    { regex: /\b(?:surprise\s+)?quiz(?:\s*[-–#]?\s*(\d+))?\b/i, category: "QUIZ" as TaskCategory, label: "Quiz" },
    { regex: /\b(?:lab\s+report|experiment(?:\s*\d+)?|lab\s+submission)\b/i, category: "LAB" as TaskCategory, label: "Lab Report" },
    { regex: /\bassignment\s*[-–#]?\s*(\d+)?\b/i, category: "ASSIGNMENT" as TaskCategory, label: "Assignment" },
    { regex: /\bhomework\b/i, category: "HOMEWORK" as TaskCategory, label: "Homework" },
  ];

  for (const rule of taskTypeRules) {
    const match = rule.regex.exec(text);
    if (match) {
      taskType = match[1] && !isNaN(Number(match[1])) ? `${rule.label} ${match[1]}` : match[0];
      taskCategory = rule.category;

      allEntities.push({
        type: "TASK_TYPE",
        text: taskType,
        normalizedValue: taskCategory,
        confidence: 0.94,
        rawSnippet: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });

      evidences.push({
        field: "taskType",
        value: taskType,
        rawSnippet: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.94,
      });
      break;
    }
  }

  // 4. Marks & Weightage Extraction
  // e.g. "10 marks", "marks: 20", "weightage: 15%", "carries 30% weightage", "total 50 marks"
  const marksRegex = /\b(?:total\s+)?marks?\s*[:=]?\s*(\d{1,3})\b|\b(\d{1,3})\s*marks?\b/gi;
  let marksMatch: RegExpExecArray | null;
  while ((marksMatch = marksRegex.exec(text)) !== null) {
    const value = parseInt(marksMatch[1] || marksMatch[2], 10);
    if (value > 0 && value <= 100) {
      marks = value;
      allEntities.push({
        type: "MARKS_WEIGHTAGE",
        text: `${value} marks`,
        normalizedValue: String(value),
        confidence: 0.92,
        rawSnippet: marksMatch[0],
        startIndex: marksMatch.index,
        endIndex: marksMatch.index + marksMatch[0].length,
      });
      evidences.push({
        field: "marks",
        value,
        rawSnippet: marksMatch[0],
        startIndex: marksMatch.index,
        endIndex: marksMatch.index + marksMatch[0].length,
        confidence: 0.92,
      });
      break;
    }
  }

  const weightageRegex = /\b(?:weightage\s*[:=]?\s*(\d{1,3})%?|(\d{1,3})%\s*weightage)\b/gi;
  let wtMatch: RegExpExecArray | null;
  while ((wtMatch = weightageRegex.exec(text)) !== null) {
    const value = parseInt(wtMatch[1] || wtMatch[2], 10);
    if (value > 0 && value <= 100) {
      weightage = value;
      allEntities.push({
        type: "MARKS_WEIGHTAGE",
        text: `${value}% weightage`,
        normalizedValue: String(value),
        confidence: 0.94,
        rawSnippet: wtMatch[0],
        startIndex: wtMatch.index,
        endIndex: wtMatch.index + wtMatch[0].length,
      });
      evidences.push({
        field: "weightage",
        value,
        rawSnippet: wtMatch[0],
        confidence: 0.94,
      });
      break;
    }
  }

  // 5. Platforms
  const foundPlatforms: { canonical: string; index: number; raw: string; isOld: boolean; isExplicit: boolean }[] = [];
  for (const plat of KNOWN_PLATFORMS) {
    const platRegex = new RegExp(`\\b${plat}\\b`, "gi");
    let pMatch: RegExpExecArray | null;
    while ((pMatch = platRegex.exec(text)) !== null) {
      const canonical = plat.toUpperCase();
      const prefix = text.slice(Math.max(0, pMatch.index - 35), pMatch.index).toLowerCase();
      const isOld = /\b(?:changed\s+from|from|previously|earlier|instead\s+of)\s*$/i.test(prefix);
      const isExplicit = /\b(?:submission\s+platform|platform|portal)\s*[:=]?\s*$/i.test(prefix);
      foundPlatforms.push({
        canonical,
        index: pMatch.index,
        raw: pMatch[0],
        isOld,
        isExplicit,
      });
    }
  }

  // Sort platforms: explicit primary first, non-old first, then by occurrence order
  foundPlatforms.sort((a, b) => {
    if (a.isExplicit !== b.isExplicit) return a.isExplicit ? -1 : 1;
    if (a.isOld !== b.isOld) return a.isOld ? 1 : -1;
    return a.index - b.index;
  });

  for (const fp of foundPlatforms) {
    if (!platforms.includes(fp.canonical)) {
      platforms.push(fp.canonical);
      allEntities.push({
        type: "PLATFORM",
        text: fp.canonical,
        normalizedValue: fp.canonical,
        confidence: 0.95,
        rawSnippet: fp.raw,
        startIndex: fp.index,
        endIndex: fp.index + fp.raw.length,
      });
      evidences.push({
        field: "platform",
        value: fp.canonical,
        rawSnippet: fp.raw,
        confidence: 0.95,
      });
    }
  }

  // 6. Venues (e.g. SJT 402, TT 105, MB 210, Auditorium, Room 302)
  const venueRegex = /\b(?:room|hall|venue|sjt|tt|mb|cdmm|prp|smv)\s*[-:]?\s*(\d{2,4}[a-z]?)\b|\b(anna\s+auditorium|seminar\s+hall\s*\d*|main\s+auditorium)\b/gi;
  let venueMatch: RegExpExecArray | null;
  while ((venueMatch = venueRegex.exec(text)) !== null) {
    const vText = venueMatch[0].toUpperCase();
    if (!venues.includes(vText)) {
      venues.push(vText);
      allEntities.push({
        type: "VENUE",
        text: vText,
        normalizedValue: vText,
        confidence: 0.92,
        rawSnippet: venueMatch[0],
        startIndex: venueMatch.index,
        endIndex: venueMatch.index + venueMatch[0].length,
      });
      evidences.push({
        field: "venue",
        value: vText,
        rawSnippet: venueMatch[0],
        confidence: 0.92,
      });
    }
  }

  // 7. Conditions Extraction (e.g. "students who have not submitted")
  for (const pattern of CONDITION_PATTERNS) {
    const cMatch = pattern.exec(text);
    if (cMatch) {
      const condText = cMatch[0].trim();
      if (!conditions.includes(condText)) {
        conditions.push(condText);
        allEntities.push({
          type: "CONDITION",
          text: condText,
          normalizedValue: condText,
          confidence: 0.96,
          rawSnippet: cMatch[0],
          startIndex: cMatch.index,
          endIndex: cMatch.index + cMatch[0].length,
        });
        evidences.push({
          field: "condition",
          value: condText,
          rawSnippet: cMatch[0],
          startIndex: cMatch.index,
          endIndex: cMatch.index + cMatch[0].length,
          confidence: 0.96,
        });
      }
    }
  }

  // 8. Penalty Clauses
  for (const pattern of PENALTY_PATTERNS) {
    const pMatch = pattern.exec(text);
    if (pMatch) {
      penaltyClause = pMatch[0].trim();
      allEntities.push({
        type: "PENALTY_CLAUSE",
        text: penaltyClause,
        confidence: 0.95,
        rawSnippet: pMatch[0],
        startIndex: pMatch.index,
        endIndex: pMatch.index + pMatch[0].length,
      });
      evidences.push({
        field: "penaltyClause",
        value: penaltyClause,
        rawSnippet: pMatch[0],
        confidence: 0.95,
      });
      urgencyKeywords.push(penaltyClause);
      break;
    }
  }

  // 9. Urgency level determination
  let urgencyLevel: PriorityLevel = "MEDIUM";
  const urgentWords = ["urgent", "mandatory", "strictly", "penalized", "immediate", "debarred"];
  for (const word of urgentWords) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
      urgencyKeywords.push(word);
      allEntities.push({
        type: "URGENCY",
        text: word,
        confidence: 0.88,
      });
    }
  }

  if (urgencyKeywords.length >= 2 || penaltyClause || taskCategory === "EXAM") {
    urgencyLevel = "HIGH";
  }
  if (text.toLowerCase().includes("debarred") || text.toLowerCase().includes("zero marks")) {
    urgencyLevel = "CRITICAL";
  }

  // 10. Actions
  const actionKeywords = [
    { word: "submit", canonical: "SUBMIT" },
    { word: "upload", canonical: "SUBMIT" },
    { word: "attend", canonical: "ATTEND" },
    { word: "present", canonical: "PRESENT" },
    { word: "register", canonical: "REGISTER" },
  ];
  for (const act of actionKeywords) {
    if (new RegExp(`\\b${act.word}\\b`, "i").test(text)) {
      if (!actions.includes(act.canonical)) {
        actions.push(act.canonical);
        allEntities.push({
          type: "ACTION",
          text: act.word,
          normalizedValue: act.canonical,
          confidence: 0.9,
        });
      }
    }
  }

  return {
    courses,
    courseCodes,
    courseCode: primaryCourseCode,
    primaryCourseName,
    primaryCourseCode,
    primaryCourseCodeOrigin,
    courseResolutions,
    taskType,
    taskCategory,
    platforms,
    venues,
    marks,
    weightage,
    conditions,
    penaltyClause,
    urgencyKeywords,
    urgencyLevel,
    actions,
    allEntities,
    evidences,
  };
}
