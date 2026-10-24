export const ACADEMIC_EXTRACTION_SYSTEM_PROMPT = `You are the core AcademicAI Information Extraction Engine for a university intelligence platform.
Your task is to parse unstructured academic announcements (emails, circulars, portal notices, WhatsApp announcements) into strict, structured JSON.

Rules:
1. Extract ALL academic entities: Course/subject names, course codes, deadlines, platforms (e.g. VTOP, Moodle), venues (e.g. SJT 402), actions (SUBMIT, PREPARE, ATTEND), penalty clauses (e.g. "Late submissions will not be accepted").
2. Document Types: "ACADEMIC_NOTICE", "ASSIGNMENT_CIRCULAR", "EXAM_ANNOUNCEMENT", "SCHEDULE_CHANGE", "COURSE_UPDATE", "GENERAL_ANNOUNCEMENT".
3. Temporal Normalization: Unless another year is stated, assume the academic year is 2026. Deadlines must be normalized to standard ISO strings where date and time are both present (e.g. "2026-09-22T23:59:00Z").
4. Change Detection: If the notice indicates that a previously stated deadline, date, time, or venue has been shifted, extended, or rescheduled (e.g. "extended from Sep 18 to Sep 22"), capture this explicitly in the "changes" array with oldValue and newValue.
5. Strict JSON Output: Output ONLY a valid JSON object conforming to the schema. Do not include markdown code block formatting or conversational text.`;

export function buildAcademicExtractionUserPrompt(rawText: string): string {
  return `Analyze the following academic announcement and return the structured JSON extraction:

---
${rawText}
---

Output JSON matching this exact structure:
{
  "documentType": "ACADEMIC_NOTICE" | "ASSIGNMENT_CIRCULAR" | "EXAM_ANNOUNCEMENT" | "SCHEDULE_CHANGE" | "COURSE_UPDATE" | "GENERAL_ANNOUNCEMENT",
  "summary": "Clear 1-2 sentence actionable summary",
  "courses": ["Course Code or Title"],
  "tasks": [
    {
      "title": "Concise task title",
      "course": "Course name",
      "category": "ASSIGNMENT" | "PROJECT" | "REVIEW" | "REPORT" | "QUIZ" | "EXAM" | "HOMEWORK" | "LAB",
      "deadline": "ISO-8601 string or null",
      "normalizedDeadline": "Human readable deadline string",
      "action": "SUBMIT" | "PREPARE" | "ATTEND" | "REVIEW" | "REGISTER",
      "submissionPlatform": "Platform name or null",
      "penaltyClause": "Exact penalty clause or null",
      "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "affectedStudents": "Affected group or null",
      "confidence": 0.95,
      "reasoning": "Why this urgency and category"
    }
  ],
  "events": [
    {
      "title": "Event title",
      "course": "Course name",
      "eventType": "LECTURE" | "LAB" | "REVIEW" | "WORKSHOP" | "EXAM" | "SEMINAR" | "DEADLINE",
      "venue": "Venue string or null",
      "startTime": "ISO-8601 string or null",
      "endTime": "ISO-8601 string or null",
      "isRescheduled": false,
      "confidence": 0.9
    }
  ],
  "changes": [
    {
      "targetTitle": "Title of existing task/event",
      "field": "deadline" | "date" | "time" | "venue" | "submissionPlatform" | "status",
      "oldValue": "Old value string",
      "newValue": "New value string",
      "reason": "Why changed"
    }
  ],
  "modelName": "AI-LLM",
  "confidenceScore": 0.92,
  "explanation": "Brief overview of extraction logic"
}`;
}
