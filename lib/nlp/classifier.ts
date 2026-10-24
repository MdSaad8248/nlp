import { NoticeCategory } from "./schemas";

export interface ClassificationResult {
  category: NoticeCategory;
  documentType: NoticeCategory; // alias for compatibility
  classificationScore: number;  // Raw rule indicator salience score
  confidence: number;
  indicators: string[];
  candidateScores: Record<NoticeCategory, number>;
  ruleExplanation: string;
}

interface RuleDefinition {
  category: NoticeCategory;
  patterns: RegExp[];
  weight: number;
  indicators: string[];
}

// Deterministic rule-based classifier dictionary
const CLASSIFICATION_RULES: RuleDefinition[] = [
  {
    category: "CLASS_CANCELLATION",
    patterns: [
      /\b(?:class(?:es)?|lecture|lab|event|session)\s+(?:is|are|stands?)\s+(?:now\s+)?(?:officially\s+)?(?:cancelled|suspended|called\s+off)\b/i,
      /\bno\s+(?:class|lecture|lab)\s+(?:tomorrow|today|on\s+[a-z]+)\b/i,
      /\b(?:faculty|professor|instructor)\s+(?:is\s+)?on\s+leave\b/i,
      /\bclass(?:es)?\s+cancelled\b/i,
      /\blecure\s+cancelled\b/i,
      /\bno\s+classes\s+will\s+be\s+held\b/i,
      /\bofficially\s+cancelled\b/i,
    ],
    weight: 3.5,
    indicators: ["class cancellation phrasing", "faculty on leave", "lecture suspended"],
  },
  {
    category: "CLASS_CHANGE",
    patterns: [
      /\b(?:class|lecture|lab|session|review)\s+(?:has\s+been\s+)?(?:rescheduled|shifted|moved|postponed|preponed)\b/i,
      /\b(?:relocated|moved)\s+to\s+(?:room|hall|venue|sjt|tt|mb|cdmm|prp)\b/i,
      /\bextra\s+class\b/i,
      /\bcompensatory\s+(?:class|lecture)\b/i,
      /\bmakeup\s+class\b/i,
      /\b(?:new|revised)\s+(?:timing|time\s+slot|venue|classroom)\b/i,
      /\bswapped\s+with\b/i,
    ],
    weight: 3.0,
    indicators: ["class rescheduling", "venue relocation", "makeup/extra class"],
  },
  {
    category: "ATTENDANCE_NOTICE",
    patterns: [
      /\battendance\s+(?:shortage|percentage|status|requirement|defaulter|debar)\b/i,
      /\b(?:debarred|ineligible)\s+due\s+to\s+attendance\b/i,
      /\bminimum\s+(?:75|80)%\s+attendance\b/i,
      /\bcondonation\s+of\s+attendance\b/i,
      /\battendance\s+proctor\b/i,
      /\bdefaulters\s+list\b/i,
    ],
    weight: 3.2,
    indicators: ["attendance shortage", "minimum attendance rule", "debarred notice"],
  },
  {
    category: "REVIEW",
    patterns: [
      /\b(?:project|interim|final|phase\s*[-–]?\s*[1-3]|stage\s*[-–]?\s*[1-3]|capstone|dbms|nlp|ml)\s+review\b/i,
      /\breview\s+(?:0?[1-3]|one|two|three)\b/i,
      /\breview\s+of\s+literature\b/i,
      /\bviva(?:\s+voce)?\b/i,
      /\bppt\s+presentation\b/i,
      /\bposter\s+presentation\b/i,
      /\bdemo\s+and\s+evaluation\b/i,
      /\bpanel\s+review\b/i,
    ],
    weight: 2.8,
    indicators: ["project review session", "viva voce", "panel evaluation"],
  },
  {
    category: "QUIZ",
    patterns: [
      /\b(?:surprise\s+)?quiz(?:\s*[-–]?\s*\d+)?\b/i,
      /\bmoodle\s+quiz\b/i,
      /\bmcqs?\s+(?:test|quiz)\b/i,
      /\bonline\s+quiz\b/i,
      /\bobjective\s+assessment\b/i,
    ],
    weight: 2.7,
    indicators: ["quiz assessment", "mcq online test"],
  },
  {
    category: "EXAM",
    patterns: [
      /\b(?:cat|continuous\s+assessment\s+test)\s*[-–]?\s*[12]\b/i,
      /\b(?:fat|final\s+assessment\s+test|term\s+end\s+exam|end\s+sem(?:ester)?\s+exam|theory\s+exams?)\b/i,
      /\bmid[- ]?term\s+(?:exam|test|assessment)\b/i,
      /\bhall\s+ticket\b/i,
      /\bexam\s+schedule\b/i,
      /\binvigilat(?:or|ion)\b/i,
      /\bseating\s+(?:allotment|arrangement)\b/i,
      /\bexamination\s+hall\b/i,
    ],
    weight: 2.9,
    indicators: ["formal examination (CAT/FAT/Midterm)", "hall ticket/invigilation", "exam venue"],
  },
  {
    category: "PROJECT",
    patterns: [
      /\b(?:mini|capstone|major|term|course|group)\s+project\b/i,
      /\bproject\s+(?:submission|report|code|implementation|github|deliverable|repository)\b/i,
      /\b(?:capstone|project)\s+evaluation\b/i,
      /\bsoftware\s+development\s+project\b/i,
      /\bproject\s+milestone\b/i,
    ],
    weight: 2.5,
    indicators: ["project deliverable", "github repository", "capstone/mini-project"],
  },
  {
    category: "ASSIGNMENT",
    patterns: [
      /\b(?:assign(?:ment)?|ass1gn)\s*(?:[-–#]?\s*\d+)?\b/i,
      /\blab\s+(?:assignment|exercise|manual|sheet|report|experiment)\b/i,
      /\b(?:experiment|lab\s+report|report\s+and\s+weights|simulation\s+code)\b/i,
      /\bproblem\s+set\b/i,
      /\bhomework\b/i,
      /\btutorial\s+sheet\b/i,
      /\b(?:must\s+be\s+submitted|submit\s+your\s+(?:solutions?|write[- ]?up|code|report)|submit\s+by)\b/i,
      /\bupload\s+your\s+report\b/i,
      /\bdeadline\s+(?:extended|for\s+submission)\b/i,
      /\bproject\s+abstracts?\s+must\s+be\s+submitted\b/i,
    ],
    weight: 3.2,
    indicators: ["homework/assignment", "problem set submission", "lab report", "submission deadline"],
  },
  {
    category: "EVENT",
    patterns: [
      /\b(?:guest\s+lecture|webinar|workshop|seminar|symposium|hackathon|colloquium)\b/i,
      /\bkeynote\s+speaker\b/i,
      /\borientation\s+session\b/i,
      /\bannual\s+(?:day|fest|meet)\b/i,
      /\bdepartment\s+meeting\b/i,
      /\bregister\s+at\s+https?:\/\//i,
    ],
    weight: 2.4,
    indicators: ["guest lecture / webinar / workshop", "hackathon / seminar"],
  },
  {
    category: "CIRCULAR",
    patterns: [
      /\bofficial\s+circular\b/i,
      /\boffice\s+of\s+the\s+(?:dean|registrar|controller|director)\b/i,
      /\bref(?:\s+no)?\s*:\s*[a-z0-9\/-]+/i,
      /\bcircular\s+no\b/i,
      /\buniversity\s+order\b/i,
      /\bstanding\s+order\b/i,
      /\bto\s+all\s+heads\s+of\s+departments\b/i,
    ],
    weight: 2.3,
    indicators: ["official dean/registrar circular", "university notification ref"],
  },
];

/**
 * Deterministic rule-based notice classifier.
 * Evaluates text against curated syntactic and lexical patterns.
 * Returns winning category, score breakdown, and triggering indicators.
 */
export function classifyAcademicDocument(text: string): ClassificationResult {
  const scores: Record<NoticeCategory, number> = {
    ASSIGNMENT: 0,
    QUIZ: 0,
    EXAM: 0,
    PROJECT: 0,
    REVIEW: 0,
    CLASS_CHANGE: 0,
    CLASS_CANCELLATION: 0,
    ATTENDANCE_NOTICE: 0,
    EVENT: 0,
    CIRCULAR: 0,
    GENERAL_ANNOUNCEMENT: 0.1, // baseline fallback
  };

  const triggeredIndicators: string[] = [];

  for (const rule of CLASSIFICATION_RULES) {
    let matchesCount = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        matchesCount++;
      }
    }

    if (matchesCount > 0) {
      scores[rule.category] += matchesCount * rule.weight;
      triggeredIndicators.push(`${rule.category}: ${rule.indicators.join(", ")}`);
    }
  }

  // Find category with maximum score
  let maxScore = 0;
  let topCategory: NoticeCategory = "GENERAL_ANNOUNCEMENT";

  for (const [cat, score] of Object.entries(scores) as [NoticeCategory, number][]) {
    if (score > maxScore) {
      maxScore = score;
      topCategory = cat;
    }
  }

  // Calculate calibrated confidence
  // Score of 2.0+ gives >= 0.82 confidence; capped at 0.98 for rule-based layer
  const confidence = topCategory === "GENERAL_ANNOUNCEMENT"
    ? 0.70
    : Math.min(0.98, Number((0.72 + Math.tanh(maxScore / 4.5) * 0.25).toFixed(2)));

  const explanation = topCategory === "GENERAL_ANNOUNCEMENT"
    ? "No high-salience category patterns triggered; classified as General Academic Announcement."
    : `Classified as ${topCategory} (score: ${maxScore.toFixed(1)}) based on matched rules: ${triggeredIndicators.slice(0, 3).join("; ")}.`;

  return {
    category: topCategory,
    documentType: topCategory,
    classificationScore: Number(maxScore.toFixed(1)),
    confidence,
    indicators: triggeredIndicators,
    candidateScores: scores,
    ruleExplanation: explanation,
  };
}

export const classifyNotice = classifyAcademicDocument;
