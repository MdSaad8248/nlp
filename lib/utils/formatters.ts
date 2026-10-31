/**
 * AcademicAI - Shared Typography & Display-Layer Formatting Utilities
 *
 * Implements:
 * 1. Title casing for task and event titles (preserves academic acronyms).
 * 2. Deduplication of course codes from titles (e.g. "Overdue Recovery: CSE2001 - [CSE2001] Title" -> "Overdue Recovery: Title").
 * 3. Sentence casing for descriptions (avoids capitalizing every word).
 * 4. Grounded Asia/Kolkata (IST) timezone conversions and deadline status calculations.
 */

// Common academic acronyms and technical abbreviations preserved in uppercase
const ACADEMIC_ACRONYMS = new Set([
  "NLP", "ML", "AI", "DBMS", "OS", "VTOP", "CAT", "CAT-1", "CAT-2", "CAT1", "CAT2",
  "FAT", "API", "SVM", "BPE", "SQL", "2PC", "CPU", "RAM", "TCP", "IP",
  "UDP", "DNS", "HTTP", "HTTPS", "REST", "HTML", "CSS", "JS", "TS", "OCR",
  "RAG", "TF-IDF", "BERT", "LLM", "CNN", "RNN", "LSTM", "GPU", "TPU",
  "SJT", "TT", "PRP", "MB", "SMV", "GDN", "CDMM", "I", "II", "III", "IV", "V", "VI"
]);

// Minor words kept lowercase in Title Case unless at start or after a colon/dash
const MINOR_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to",
  "from", "by", "with", "in", "of", "as", "via", "into", "per"
]);

/**
 * Removes duplicated course codes from task or event titles and applies clean Title Case.
 * Example:
 *   "Overdue Recovery: CSE2001 - [CSE2001] Computer Networks CAT-1 Exam"
 *   -> "Overdue Recovery: Computer Networks CAT-1 Exam"
 */
export function formatTaskTitle(rawTitle: string, courseCode?: string | null): string {
  if (!rawTitle) return "";

  let cleaned = rawTitle.trim();

  // If a course code is known (e.g. "CSE2001"), strip redundant prefixes
  if (courseCode) {
    const codeEsc = courseCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // e.g. [CSE2001] at start
    cleaned = cleaned.replace(new RegExp(`^\\[${codeEsc}\\]\\s*[:-]?\\s*`, "i"), "");
    // e.g. CSE2001 - at start
    cleaned = cleaned.replace(new RegExp(`^${codeEsc}\\s*[:-]\\s*`, "i"), "");
    // e.g. Inside an Overdue Recovery prefix: "Overdue Recovery: CSE2001 - [CSE2001] " -> "Overdue Recovery: "
    cleaned = cleaned.replace(
      new RegExp(`(Overdue\\s+Recovery\\s*:\\s*)(?:${codeEsc}\\s*[-:]\\s*)?(?:\\[${codeEsc}\\]\\s*[-:]?\\s*)?`, "i"),
      "$1"
    );
    // Generic repeated [CODE] inside title
    cleaned = cleaned.replace(new RegExp(`\\[${codeEsc}\\]\\s*`, "gi"), "");
  }

  // Also strip any leading bracketed code like [CSE4001] or [MAT2001] if course code was not explicitly passed
  cleaned = cleaned.replace(/^\[[A-Z]{2,4}\d{3,4}[A-Z]?\]\s*[:-]?\s*/i, "");

  // Clean trailing or leading hyphens/colons/spaces
  cleaned = cleaned.replace(/^[-:\s]+|[-:\s]+$/g, "").trim();

  // Apply Title Case to remaining title
  return toTitleCase(cleaned);
}

/**
 * Converts a string to Title Case while respecting academic acronyms and minor words.
 */
export function toTitleCase(str: string): string {
  if (!str) return "";

  // Split on whitespace or colon delimiters while keeping hyphenated terms together
  const tokens = str.split(/(\s+|:)/);

  let isFirstWord = true;

  return tokens
    .map((token) => {
      // If whitespace delimiter
      if (/^\s+$/.test(token)) {
        return token;
      }
      if (token === ":") {
        isFirstWord = true; // Capitalize word immediately following colon
        return token;
      }

      // If token is hyphenated (e.g. "CAT-1" or "TF-IDF")
      if (token.includes("-")) {
        const parts = token.split("-");
        const transformedParts = parts.map((part, pIdx) => {
          const upperPart = part.toUpperCase();
          if (ACADEMIC_ACRONYMS.has(upperPart) || /^[A-Z]{2,4}\d{3,4}/.test(upperPart)) {
            return upperPart;
          }
          if (/^\d+$/.test(part)) {
            return part;
          }
          const lowerPart = part.toLowerCase();
          if (pIdx > 0 && MINOR_WORDS.has(lowerPart)) {
            return lowerPart;
          }
          return lowerPart.charAt(0).toUpperCase() + lowerPart.slice(1);
        });
        isFirstWord = false;
        return transformedParts.join("-");
      }

      const upper = token.toUpperCase();
      // Check if word is a recognized academic acronym
      if (ACADEMIC_ACRONYMS.has(upper)) {
        isFirstWord = false;
        return upper;
      }

      // Check for course codes like "CSE4001" or roll numbers like "21BDS0142"
      if (/^[A-Z]{2,4}\d{3,4}[A-Z]?$/i.test(token)) {
        isFirstWord = false;
        return upper;
      }

      const lower = token.toLowerCase();

      // If minor word and not first word
      if (!isFirstWord && MINOR_WORDS.has(lower)) {
        return lower;
      }

      isFirstWord = false;
      // Capitalize first letter, lowercase rest
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/**
 * Formats a description into sentence case.
 * Does NOT capitalize every word. Preserves acronyms and punctuation.
 */
export function formatDescription(desc: string | null | undefined): string {
  if (!desc) return "";
  const trimmed = desc.trim();
  if (!trimmed) return "";

  // Split into sentences
  const sentences = trimmed.split(/([.!?]\s+)/);

  return sentences
    .map((seg) => {
      if (/^[.!?]\s+$/.test(seg)) return seg;
      if (!seg) return "";

      // Capitalize first character of sentence, leave rest as is or correct title-casing
      const firstChar = seg.charAt(0).toUpperCase();
      const rest = seg.slice(1);

      // If the rest was aggressively Title Cased (e.g. "Every Word Capitalized Here"),
      // soften ordinary words while keeping acronyms
      const words = rest.split(/(\s+)/);
      const softened = words
        .map((w) => {
          if (/^\s+$/.test(w)) return w;
          const upper = w.toUpperCase().replace(/[^A-Z0-9-]/g, "");
          if (ACADEMIC_ACRONYMS.has(upper)) return w;
          if (/^[A-Z]{2,4}\d{3,4}/.test(w)) return w; // course code
          return w.toLowerCase();
        })
        .join("");

      return firstChar + softened;
    })
    .join("");
}

/* ==========================================================================
   ASIA/KOLKATA (IST = UTC+05:30) TIMEZONE & DEADLINE RESOLUTION
   ========================================================================== */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export interface KolkataDateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;  // 0-23
  minute: number;// 0-59
  second: number;// 0-59
  dateKey: string; // "YYYY-MM-DD"
}

/**
 * Extracts Asia/Kolkata (IST) calendar parts from any UTC Date or timestamp.
 */
export function getKolkataDateParts(dateInput: Date | string | number): KolkataDateParts {
  const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  const istTime = new Date(d.getTime() + IST_OFFSET_MS);

  const year = istTime.getUTCFullYear();
  const month = istTime.getUTCMonth() + 1;
  const day = istTime.getUTCDate();
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();
  const second = istTime.getUTCSeconds();
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return { year, month, day, hour, minute, second, dateKey };
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Formats a Date into standard readable Asia/Kolkata format.
 * Example: "Sep 24, 2026 · 11:59 PM (IST)"
 */
export function formatKolkataDate(dateInput: Date | string | null | undefined, fullMonth = false): string {
  if (!dateInput) return "No deadline scheduled";
  const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "Invalid date";

  const { year, month, day, hour, minute } = getKolkataDateParts(d);
  const mName = fullMonth ? MONTH_FULL[month - 1] : MONTH_SHORT[month - 1];
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  const displayMinute = String(minute).padStart(2, "0");

  return `${mName} ${day}, ${year} · ${displayHour}:${displayMinute} ${ampm} (IST)`;
}

/**
 * Determines whether two timestamps fall on the same calendar day in IST.
 */
export function isSameDayIST(d1: Date, d2: Date): boolean {
  return getKolkataDateParts(d1).dateKey === getKolkataDateParts(d2).dateKey;
}

/**
 * Determines whether d1 falls on tomorrow relative to now in IST.
 */
export function isTomorrowIST(d1: Date, now: Date): boolean {
  const nowParts = getKolkataDateParts(now);
  const nowTomorrow = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + 1));
  const expectedKey = `${nowTomorrow.getUTCFullYear()}-${String(nowTomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(nowTomorrow.getUTCDate()).padStart(2, "0")}`;
  return getKolkataDateParts(d1).dateKey === expectedKey;
}

export interface DeadlineStatusResult {
  isCompleted: boolean;
  isCancelled: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
  diffHours: number | null;
  timeRemainingLabel: string;
  statusBadge: "OVERDUE" | "DUE TODAY" | "DUE TOMORROW" | "UPCOMING" | "COMPLETED" | "CANCELLED" | "NO DEADLINE";
  normalizedDeadlineDisplay: string;
}

/**
 * Unified single source of truth for task deadline evaluation and wording.
 * Eliminates contradictions where an overdue task is labelled as due tomorrow.
 */
export function evaluateDeadlineStatus(
  deadlineInput: Date | string | null | undefined,
  currentStatus = "PENDING",
  nowInput?: Date
): DeadlineStatusResult {
  const statusUpper = (currentStatus || "PENDING").toUpperCase();
  const now = nowInput ? new Date(nowInput) : new Date();

  if (statusUpper === "COMPLETED") {
    return {
      isCompleted: true,
      isCancelled: false,
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      diffHours: null,
      timeRemainingLabel: "Completed",
      statusBadge: "COMPLETED",
      normalizedDeadlineDisplay: deadlineInput ? formatKolkataDate(deadlineInput) : "Completed deliverable",
    };
  }

  if (statusUpper === "CANCELLED") {
    return {
      isCompleted: false,
      isCancelled: true,
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      diffHours: null,
      timeRemainingLabel: "Cancelled",
      statusBadge: "CANCELLED",
      normalizedDeadlineDisplay: deadlineInput ? formatKolkataDate(deadlineInput) : "Notice cancelled",
    };
  }

  if (!deadlineInput) {
    return {
      isCompleted: false,
      isCancelled: false,
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      diffHours: null,
      timeRemainingLabel: "No deadline",
      statusBadge: "NO DEADLINE",
      normalizedDeadlineDisplay: "No deadline scheduled",
    };
  }

  const deadline = typeof deadlineInput === "object" ? deadlineInput : new Date(deadlineInput);
  if (isNaN(deadline.getTime())) {
    return {
      isCompleted: false,
      isCancelled: false,
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      diffHours: null,
      timeRemainingLabel: "Invalid date",
      statusBadge: "NO DEADLINE",
      normalizedDeadlineDisplay: "Invalid date scheduled",
    };
  }

  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  const isPast = diffMs < 0;
  const sameDay = isSameDayIST(deadline, now);
  const tomorrowDay = isTomorrowIST(deadline, now);

  const formattedDate = formatKolkataDate(deadline);

  // 1. OVERDUE: Deadline is in the past (or status was explicitly set to OVERDUE)
  if (isPast || statusUpper === "OVERDUE") {
    const overdueHours = Math.abs(Math.round(diffHours));
    const label = overdueHours >= 24
      ? `Overdue by ${Math.ceil(overdueHours / 24)}d (${overdueHours}h)`
      : `Overdue by ${overdueHours}h`;

    return {
      isCompleted: false,
      isCancelled: false,
      isOverdue: true,
      isDueToday: false,
      isDueTomorrow: false,
      diffHours,
      timeRemainingLabel: label,
      statusBadge: "OVERDUE",
      normalizedDeadlineDisplay: formattedDate,
    };
  }

  // 2. DUE TODAY: Calendar day matches today in IST and has not yet passed
  if (sameDay) {
    const hoursLeft = Math.max(1, Math.round(diffHours));
    return {
      isCompleted: false,
      isCancelled: false,
      isOverdue: false,
      isDueToday: true,
      isDueTomorrow: false,
      diffHours,
      timeRemainingLabel: `Due today (${hoursLeft}h remaining)`,
      statusBadge: "DUE TODAY",
      normalizedDeadlineDisplay: formattedDate,
    };
  }

  // 3. DUE TOMORROW: Calendar day is tomorrow in IST
  if (tomorrowDay) {
    const hoursLeft = Math.round(diffHours);
    return {
      isCompleted: false,
      isCancelled: false,
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: true,
      diffHours,
      timeRemainingLabel: `Due tomorrow (${hoursLeft}h remaining)`,
      statusBadge: "DUE TOMORROW",
      normalizedDeadlineDisplay: formattedDate,
    };
  }

  // 4. UPCOMING: Further in future
  const daysLeft = Math.ceil(diffHours / 24);
  return {
    isCompleted: false,
    isCancelled: false,
    isOverdue: false,
    isDueToday: false,
    isDueTomorrow: false,
    diffHours,
    timeRemainingLabel: `${daysLeft} days remaining`,
    statusBadge: "UPCOMING",
    normalizedDeadlineDisplay: formattedDate,
  };
}
