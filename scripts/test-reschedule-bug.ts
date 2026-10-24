import { extractAcademicNotice } from "../lib/nlp/extractor";
import { parseTemporalExpressions } from "../lib/nlp/temporal";

const text = "The NLP project review has been shifted from Friday at 2 PM to Monday at 3 PM.";
const anchor = new Date("2026-09-18T10:00:00+05:30");

console.log("Input:", text);

const temp = parseTemporalExpressions(text, anchor);
console.log("\n--- TEMPORAL RESULT ---");
console.log("Transition detected:", temp.transition ? "YES" : "NO");
console.log("previousDateTime:", temp.previousDateTime?.combinedFormatted, "| snippet:", temp.previousDateTime?.rawSnippet);
console.log("newDateTime:", temp.newDateTime?.combinedFormatted, "| snippet:", temp.newDateTime?.rawSnippet);
console.log("primaryDeadline:", temp.primaryDeadline?.formatted, "| snippet:", temp.primaryDeadline?.rawSnippet);

const result = extractAcademicNotice(text, { referenceDate: anchor });
console.log("\n--- EXTRACTOR RESULT ---");
console.log("Category:", result.category);
console.log("previousDateTime:", result.previousDateTime);
console.log("newDateTime:", result.newDateTime);
console.log("Tasks:", JSON.stringify(result.tasks.map(t => ({
  title: t.title,
  deadline: t.deadline,
  normalizedDeadline: t.normalizedDeadline,
  rawSnippet: t.rawDeadlineSnippet,
  prev: t.previousDateTime,
  new: t.newDateTime,
  isRescheduled: t.isRescheduled,
})), null, 2));
console.log("Events:", JSON.stringify(result.events.map(e => ({
  title: e.title,
  startTime: e.startTime,
  formattedTime: e.formattedTime,
  prev: e.previousDateTime,
  new: e.newDateTime,
  isRescheduled: e.isRescheduled,
})), null, 2));
console.log("Deadline Evidences:", JSON.stringify(result.evidences.filter(e => ['deadline', 'previousDateTime', 'newDateTime'].includes(e.field)), null, 2));
