import { TemporalSpan } from "./schemas";

export interface ParsedDate {
  raw: string;
  startIndex: number;
  endIndex: number;
  year: number;
  month: number; // 1-12
  day: number;
  date: Date;
  iso: string; // ISO 8601 UTC
  formatted: string; // e.g. "September 22, 2026"
  isRelative: boolean;
}

export interface ParsedTime {
  raw: string;
  startIndex: number;
  endIndex: number;
  hours: number;   // 0-23
  minutes: number; // 0-59
  formatted: string; // e.g. "03:00 PM"
}

export interface AssociatedDateTime {
  date: ParsedDate;
  time: ParsedTime | null;
  combinedDate: Date;
  combinedIso: string;
  combinedFormatted: string;
  rawSnippet: string;
  startIndex: number;
  endIndex: number;
}

export interface DateTransition {
  fromRaw: string;
  toRaw: string;
  fromDate: Date;
  toDate: Date;
  fromIso: string;
  toIso: string;
  fromFormatted: string;
  toFormatted: string;
  fromSnippet: string;
  toSnippet: string;
  previousDateTime: string;
  newDateTime: string;
}

export interface TemporalExtractionResult {
  dates: ParsedDate[];
  times: ParsedTime[];
  associations: AssociatedDateTime[];
  transition: DateTransition | null;
  previousDateTime: AssociatedDateTime | null;
  newDateTime: AssociatedDateTime | null;
  primaryDeadline: {
    date: Date;
    iso: string;
    formatted: string;
    rawSnippet: string;
  } | null;
  temporalSpans: TemporalSpan[];
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Normalizes an Asia/Kolkata date into an ISO string.
 * Asia/Kolkata is UTC+05:30.
 */
export function formatKolkataDateTime(year: number, month: number, day: number, hours: number = 23, minutes: number = 59): { date: Date; iso: string; formatted: string } {
  // Convert Asia/Kolkata local time to UTC:
  // UTC = Local - 5 hours 30 minutes
  const localTimestamp = Date.UTC(year, month - 1, day, hours, minutes, 0);
  const kolkataOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const utcDate = new Date(localTimestamp - kolkataOffsetMs);

  const monthName = MONTH_NAMES[month];
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  const formatted = `${monthName} ${day.toString().padStart(2, "0")}, ${year} at ${displayHours}:${displayMinutes} ${ampm} (IST)`;

  return {
    date: utcDate,
    iso: utcDate.toISOString(),
    formatted,
  };
}

// Controllable global reference clock for deterministic testing and dynamic real-time production
let _controllableClock: Date | null = null;

/**
 * Sets a global controllable clock for deterministic test execution and evaluations.
 * Set to null to restore standard real-time clock.
 */
export function setControllableReferenceClock(clockDate: Date | null): void {
  _controllableClock = clockDate;
}

/**
 * Returns the active reference date: either configured controllable clock or current system time.
 */
export function getActiveReferenceClock(): Date {
  return _controllableClock ? new Date(_controllableClock.getTime()) : new Date();
}

/**
 * Parses temporal expressions with Asia/Kolkata context.
 * Handles relative expressions (today, tomorrow, next Monday, Friday at 3 PM, Sunday 11:59 PM,
 * before Monday, by tomorrow evening) and absolute academic calendar dates.
 */
export function parseTemporalExpressions(
  text: string,
  referenceDate?: Date
): TemporalExtractionResult {
  const dates: ParsedDate[] = [];
  const times: ParsedTime[] = [];
  const temporalSpans: TemporalSpan[] = [];

  // Use explicitly provided referenceDate, global controllable clock, or current date
  const effectiveRef = referenceDate || (_controllableClock ? _controllableClock : new Date());

  // Extract Asia/Kolkata reference date components
  const kolkataTime = new Date(effectiveRef.getTime() + (5 * 60 + 30) * 60 * 1000);
  const refYear = kolkataTime.getUTCFullYear();
  const refMonth = kolkataTime.getUTCMonth() + 1; // 1-12
  const refDay = kolkataTime.getUTCDate();
  const refDayOfWeek = kolkataTime.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // 1. Time extraction
  // Handles: "11:59 PM", "3 PM", "3:00 PM", "10:30 am", "morning", "afternoon", "evening", "midnight", "noon"
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/gi;
  let timeMatch: RegExpExecArray | null;
  while ((timeMatch = timeRegex.exec(text)) !== null) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = timeMatch[3].toLowerCase().replace(/\./g, "");

    if (meridian === "pm" && hours < 12) {
      hours += 12;
    } else if (meridian === "am" && hours === 12) {
      hours = 0;
    }

    const displayHours = (hours % 12 || 12).toString().padStart(2, "0");
    const displayMinutes = minutes.toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formatted = `${displayHours}:${displayMinutes} ${ampm}`;

    times.push({
      raw: timeMatch[0],
      startIndex: timeMatch.index,
      endIndex: timeMatch.index + timeMatch[0].length,
      hours,
      minutes,
      formatted,
    });

    temporalSpans.push({
      raw: timeMatch[0],
      normalized: formatted,
      iso: null,
      type: "time",
      timezone: "Asia/Kolkata",
    });
  }

  // Word-based time expressions: "evening", "morning", "afternoon", "midnight", "noon"
  const wordTimeRegex = /\b(this\s+evening|tomorrow\s+evening|in\s+the\s+evening|evening|morning|afternoon|midnight|noon)\b/gi;
  let wordTimeMatch: RegExpExecArray | null;
  while ((wordTimeMatch = wordTimeRegex.exec(text)) !== null) {
    const term = wordTimeMatch[1].toLowerCase();
    let hours = 23;
    let minutes = 59;
    let label = "11:59 PM";

    if (term.includes("evening")) {
      hours = 20; // 8:00 PM
      minutes = 0;
      label = "08:00 PM";
    } else if (term === "morning") {
      hours = 9;
      minutes = 0;
      label = "09:00 AM";
    } else if (term === "afternoon") {
      hours = 14;
      minutes = 0;
      label = "02:00 PM";
    } else if (term === "noon") {
      hours = 12;
      minutes = 0;
      label = "12:00 PM";
    } else if (term === "midnight") {
      hours = 23;
      minutes = 59;
      label = "11:59 PM";
    }

    // Avoid duplicate if time already captured around this index
    const exists = times.some((t) => Math.abs(t.startIndex - wordTimeMatch!.index) < 15);
    if (!exists) {
      times.push({
        raw: wordTimeMatch[0],
        startIndex: wordTimeMatch.index,
        endIndex: wordTimeMatch.index + wordTimeMatch[0].length,
        hours,
        minutes,
        formatted: label,
      });

      temporalSpans.push({
        raw: wordTimeMatch[0],
        normalized: label,
        iso: null,
        type: "time",
        timezone: "Asia/Kolkata",
      });
    }
  }

  // 2. Relative Day Expressions: "today", "tomorrow", "tonight", "yesterday", "day after tomorrow"
  const relativeDayRegex = /\b(day\s+after\s+tomorrow|tomorrow(?:\s+evening)?|today(?:\s+evening)?|tonight|yesterday)\b/gi;
  let relMatch: RegExpExecArray | null;
  while ((relMatch = relativeDayRegex.exec(text)) !== null) {
    const phrase = relMatch[1].toLowerCase();
    let dayOffset = 0;
    if (phrase.startsWith("tomorrow")) dayOffset = 1;
    else if (phrase.startsWith("day after tomorrow")) dayOffset = 2;
    else if (phrase.startsWith("yesterday")) dayOffset = -1;
    // "today" and "tonight" both have dayOffset = 0

    const targetDateObj = new Date(Date.UTC(refYear, refMonth - 1, refDay + dayOffset));
    const targetY = targetDateObj.getUTCFullYear();
    const targetM = targetDateObj.getUTCMonth() + 1;
    const targetD = targetDateObj.getUTCDate();

    const normalized = formatKolkataDateTime(targetY, targetM, targetD, 23, 59);

    dates.push({
      raw: relMatch[0],
      startIndex: relMatch.index,
      endIndex: relMatch.index + relMatch[0].length,
      year: targetY,
      month: targetM,
      day: targetD,
      date: normalized.date,
      iso: normalized.iso,
      formatted: `${MONTH_NAMES[targetM]} ${targetD.toString().padStart(2, "0")}, ${targetY}`,
      isRelative: true,
    });

    temporalSpans.push({
      raw: relMatch[0],
      normalized: normalized.formatted,
      iso: normalized.iso,
      type: "relative",
      timezone: "Asia/Kolkata",
    });
  }

  // 3. Weekday Relative Expressions:
  // e.g. "Monday", "next Monday", "this Friday", "coming Wednesday", "before Monday", "by Friday"
  const weekdayRegex = /\b(?:(next|this|coming|before|by|on)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
  let wkMatch: RegExpExecArray | null;
  while ((wkMatch = weekdayRegex.exec(text)) !== null) {
    const modifier = (wkMatch[1] || "").toLowerCase();
    const dayName = wkMatch[2].toLowerCase();
    const targetDayIndex = DAY_NAMES.indexOf(dayName);

    if (targetDayIndex !== -1) {
      let daysUntil = (targetDayIndex - refDayOfWeek + 7) % 7;
      if (daysUntil === 0) {
        // If today is Monday and expression says "next Monday", jump 7 days
        if (modifier === "next") {
          daysUntil = 7;
        } else {
          // If already past or same day, assume upcoming instance within 7 days
          daysUntil = 7;
        }
      } else if (modifier === "next" && daysUntil < 7) {
        daysUntil += 7;
      }

      const targetDateObj = new Date(Date.UTC(refYear, refMonth - 1, refDay + daysUntil));
      const targetY = targetDateObj.getUTCFullYear();
      const targetM = targetDateObj.getUTCMonth() + 1;
      const targetD = targetDateObj.getUTCDate();

      const normalized = formatKolkataDateTime(targetY, targetM, targetD, 23, 59);

      // Avoid duplicate parsing if already parsed in this range
      const exists = dates.some((d) => Math.abs(d.startIndex - wkMatch!.index) < 10);
      if (!exists) {
        dates.push({
          raw: wkMatch[0],
          startIndex: wkMatch.index,
          endIndex: wkMatch.index + wkMatch[0].length,
          year: targetY,
          month: targetM,
          day: targetD,
          date: normalized.date,
          iso: normalized.iso,
          formatted: `${MONTH_NAMES[targetM]} ${targetD.toString().padStart(2, "0")}, ${targetY} (${dayName.toUpperCase()})`,
          isRelative: true,
        });

        temporalSpans.push({
          raw: wkMatch[0],
          normalized: normalized.formatted,
          iso: normalized.iso,
          type: "relative",
          timezone: "Asia/Kolkata",
        });
      }
    }
  }

  // 4. Standard Absolute Dates
  // e.g. "18 September 2026", "Sep 22, 2026", "22nd September", "October 05, 2026"
  const monthNamesRegex = Object.keys(MONTH_MAP).join("|");

  // Format A: Month Day, Year (e.g. "September 18, 2026" or "Sep 22")
  const monthDayRegex = new RegExp(
    `\\b(${monthNamesRegex})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`,
    "gi"
  );
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = monthDayRegex.exec(text)) !== null) {
    const monthKey = mdMatch[1].toLowerCase().replace(".", "");
    const month = MONTH_MAP[monthKey];
    const day = parseInt(mdMatch[2], 10);
    const year = mdMatch[3] ? parseInt(mdMatch[3], 10) : refYear;

    if (month && day >= 1 && day <= 31) {
      const normalized = formatKolkataDateTime(year, month, day, 23, 59);
      const exists = dates.some((d) => d.year === year && d.month === month && d.day === day);
      if (!exists) {
        dates.push({
          raw: mdMatch[0],
          startIndex: mdMatch.index,
          endIndex: mdMatch.index + mdMatch[0].length,
          year,
          month,
          day,
          date: normalized.date,
          iso: normalized.iso,
          formatted: `${MONTH_NAMES[month]} ${day.toString().padStart(2, "0")}, ${year}`,
          isRelative: false,
        });

        temporalSpans.push({
          raw: mdMatch[0],
          normalized: normalized.formatted,
          iso: normalized.iso,
          type: "date",
          timezone: "Asia/Kolkata",
        });
      }
    }
  }

  // Format B: Day Month Year (e.g. "18 September 2026", "22nd Sep")
  const dayMonthRegex = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNamesRegex})\\.?(?:,?\\s*(\\d{4}))?\\b`,
    "gi"
  );
  let dmMatch: RegExpExecArray | null;
  while ((dmMatch = dayMonthRegex.exec(text)) !== null) {
    const day = parseInt(dmMatch[1], 10);
    const monthKey = dmMatch[2].toLowerCase().replace(".", "");
    const month = MONTH_MAP[monthKey];
    const year = dmMatch[3] ? parseInt(dmMatch[3], 10) : refYear;

    if (month && day >= 1 && day <= 31) {
      const exists = dates.some((d) => d.year === year && d.month === month && d.day === day);
      if (!exists) {
        const normalized = formatKolkataDateTime(year, month, day, 23, 59);
        dates.push({
          raw: dmMatch[0],
          startIndex: dmMatch.index,
          endIndex: dmMatch.index + dmMatch[0].length,
          year,
          month,
          day,
          date: normalized.date,
          iso: normalized.iso,
          formatted: `${MONTH_NAMES[month]} ${day.toString().padStart(2, "0")}, ${year}`,
          isRelative: false,
        });

        temporalSpans.push({
          raw: dmMatch[0],
          normalized: normalized.formatted,
          iso: normalized.iso,
          type: "date",
          timezone: "Asia/Kolkata",
        });
      }
    }
  }

  // Format C: Numeric dates (YYYY-MM-DD or DD/MM/YYYY)
  const numericDateRegex = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b|\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g;
  let numMatch: RegExpExecArray | null;
  while ((numMatch = numericDateRegex.exec(text)) !== null) {
    let year = refYear;
    let month = 1;
    let day = 1;

    if (numMatch[1]) {
      year = parseInt(numMatch[1], 10);
      month = parseInt(numMatch[2], 10);
      day = parseInt(numMatch[3], 10);
    } else if (numMatch[6]) {
      day = parseInt(numMatch[4], 10);
      month = parseInt(numMatch[5], 10);
      year = parseInt(numMatch[6], 10);
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const exists = dates.some((d) => d.year === year && d.month === month && d.day === day);
      if (!exists) {
        const normalized = formatKolkataDateTime(year, month, day, 23, 59);
        dates.push({
          raw: numMatch[0],
          startIndex: numMatch.index,
          endIndex: numMatch.index + numMatch[0].length,
          year,
          month,
          day,
          date: normalized.date,
          iso: normalized.iso,
          formatted: `${MONTH_NAMES[month]} ${day.toString().padStart(2, "0")}, ${year}`,
          isRelative: false,
        });

        temporalSpans.push({
          raw: numMatch[0],
          normalized: normalized.formatted,
          iso: normalized.iso,
          type: "date",
          timezone: "Asia/Kolkata",
        });
      }
    }
  }

  // Sort dates and times in textual appearance order
  dates.sort((a, b) => a.startIndex - b.startIndex);
  times.sort((a, b) => a.startIndex - b.startIndex);

  // 5. Date-Time Association: Preserve connection between each date and its nearby time
  const associations: AssociatedDateTime[] = [];
  const assignedTimeIndices = new Set<number>();

  // Pass 1: Look for syntactic proximity (Date followed by Time or Time followed by Date)
  for (const d of dates) {
    let bestTimeIndex = -1;
    let bestDistance = Infinity;

    for (let ti = 0; ti < times.length; ti++) {
      if (assignedTimeIndices.has(ti)) continue;
      const t = times[ti];

      // Time occurs after date (e.g. "Friday at 2 PM", "September 28, 2026 before 11:59 PM")
      if (t.startIndex >= d.endIndex) {
        const dist = t.startIndex - d.endIndex;
        const hasInterveningDate = dates.some(
          (other) => other !== d && other.startIndex >= d.endIndex && other.startIndex < t.startIndex
        );
        if (!hasInterveningDate && dist <= 45) {
          const inBetween = text.slice(d.endIndex, t.startIndex);
          if (/^[\s,;]*(?:at|by|before|around|on|to|-|\s)+[\s,;]*$/i.test(inBetween)) {
            if (dist < bestDistance) {
              bestDistance = dist;
              bestTimeIndex = ti;
            }
          }
        }
      }
      // Time occurs before date (e.g. "at 2 PM on Friday")
      else if (d.startIndex >= t.endIndex) {
        const dist = d.startIndex - t.endIndex;
        const hasInterveningTime = times.some(
          (other, oi) => oi !== ti && other.startIndex >= t.endIndex && other.startIndex < d.startIndex
        );
        if (!hasInterveningTime && dist <= 45) {
          const inBetween = text.slice(t.endIndex, d.startIndex);
          if (/^[\s,;]*(?:on|for|at|,|\s)+[\s,;]*$/i.test(inBetween)) {
            if (dist < bestDistance) {
              bestDistance = dist;
              bestTimeIndex = ti;
            }
          }
        }
      }
    }

    if (bestTimeIndex !== -1) {
      assignedTimeIndices.add(bestTimeIndex);
      const t = times[bestTimeIndex];
      const start = Math.min(d.startIndex, t.startIndex);
      const end = Math.max(d.endIndex, t.endIndex);
      const rawSnippet = text.slice(start, end).trim().replace(/^[\s,;]+|[\s,;]+$/g, "");
      const normalized = formatKolkataDateTime(d.year, d.month, d.day, t.hours, t.minutes);

      associations.push({
        date: d,
        time: t,
        combinedDate: normalized.date,
        combinedIso: normalized.iso,
        combinedFormatted: normalized.formatted,
        rawSnippet,
        startIndex: start,
        endIndex: end,
      });
    } else {
      const normalized = formatKolkataDateTime(d.year, d.month, d.day, 23, 59);
      associations.push({
        date: d,
        time: null,
        combinedDate: normalized.date,
        combinedIso: normalized.iso,
        combinedFormatted: normalized.formatted,
        rawSnippet: d.raw,
        startIndex: d.startIndex,
        endIndex: d.endIndex,
      });
    }
  }

  // Pass 2: If there is exactly one unassigned time and an association without a time, pair them
  const unassignedTimes = times.filter((_, i) => !assignedTimeIndices.has(i));
  if (unassignedTimes.length === 1) {
    const unassignedAssoc = associations.find((a) => a.time === null);
    if (unassignedAssoc) {
      const t = unassignedTimes[0];
      const normalized = formatKolkataDateTime(
        unassignedAssoc.date.year,
        unassignedAssoc.date.month,
        unassignedAssoc.date.day,
        t.hours,
        t.minutes
      );
      unassignedAssoc.time = t;
      unassignedAssoc.combinedDate = normalized.date;
      unassignedAssoc.combinedIso = normalized.iso;
      unassignedAssoc.combinedFormatted = normalized.formatted;
      const start = Math.min(unassignedAssoc.date.startIndex, t.startIndex);
      const end = Math.max(unassignedAssoc.date.endIndex, t.endIndex);
      unassignedAssoc.rawSnippet = text.slice(start, end).trim().replace(/^[\s,;]+|[\s,;]+$/g, "");
      unassignedAssoc.startIndex = start;
      unassignedAssoc.endIndex = end;
    }
  }

  // 6. Detect Date Transition (Extension or Reschedule)
  // e.g. "shifted from Friday at 2 PM to Monday at 3 PM"
  // "extended from September 18, 2026 to September 28, 2026 before 11:59 PM"
  let transition: DateTransition | null = null;
  let previousDateTime: AssociatedDateTime | null = null;
  let newDateTime: AssociatedDateTime | null = null;

  const transitionVerbRegex = /(?:shifted|moved|rescheduled|postponed|preponed|extended|deferred|changed|swap(?:ped)?)\s+(?:from\s+)?([\s\S]+?)\s+\bto\s+([\s\S]+?)(?:[.,;\n]|$)/i;
  const generalFromToRegex = /\bfrom\s+([\s\S]+?)\s+\bto\s+([\s\S]+?)(?:[.,;\n]|$)/i;
  const hasRescheduleKeyword = /(?:rescheduled|shifted|moved|postponed|preponed|extended|deferred|changed|revision|postponement)/i.test(text);

  let match = transitionVerbRegex.exec(text);
  if (!match && hasRescheduleKeyword) {
    match = generalFromToRegex.exec(text);
  }

  if (match && associations.length >= 2) {
    const fromClause = match[1];
    const toClause = match[2];
    const matchIndex = match.index;
    const fromStart = text.indexOf(fromClause, matchIndex);
    const fromEnd = fromStart + fromClause.length;
    const toStart = text.indexOf(toClause, fromEnd);
    const toEnd = toStart + toClause.length;

    let fromAssoc = associations.find(
      (a) =>
        (a.startIndex >= fromStart - 10 && a.startIndex < fromEnd + 5) ||
        fromClause.toLowerCase().includes(a.date.raw.toLowerCase())
    );
    let toAssoc = associations.find(
      (a) =>
        (a.startIndex >= toStart - 10 && a.startIndex < toEnd + 15) ||
        toClause.toLowerCase().includes(a.date.raw.toLowerCase())
    );

    if (!fromAssoc) fromAssoc = associations[0];
    if (!toAssoc) toAssoc = associations[associations.length - 1];

    if (fromAssoc && toAssoc && fromAssoc !== toAssoc) {
      previousDateTime = fromAssoc;
      newDateTime = toAssoc;

      transition = {
        fromRaw: fromAssoc.date.formatted,
        toRaw: toAssoc.date.formatted,
        fromDate: fromAssoc.combinedDate,
        toDate: toAssoc.combinedDate,
        fromIso: fromAssoc.combinedIso,
        toIso: toAssoc.combinedIso,
        fromFormatted: fromAssoc.combinedFormatted,
        toFormatted: toAssoc.combinedFormatted,
        fromSnippet: fromAssoc.rawSnippet,
        toSnippet: toAssoc.rawSnippet,
        previousDateTime: fromAssoc.combinedFormatted,
        newDateTime: toAssoc.combinedFormatted,
      };
    }
  } else if (hasRescheduleKeyword && associations.length >= 2) {
    const fromAssoc = associations[0];
    const toAssoc = associations[associations.length - 1];

    if (fromAssoc.combinedIso !== toAssoc.combinedIso) {
      previousDateTime = fromAssoc;
      newDateTime = toAssoc;

      transition = {
        fromRaw: fromAssoc.date.formatted,
        toRaw: toAssoc.date.formatted,
        fromDate: fromAssoc.combinedDate,
        toDate: toAssoc.combinedDate,
        fromIso: fromAssoc.combinedIso,
        toIso: toAssoc.combinedIso,
        fromFormatted: fromAssoc.combinedFormatted,
        toFormatted: toAssoc.combinedFormatted,
        fromSnippet: fromAssoc.rawSnippet,
        toSnippet: toAssoc.rawSnippet,
        previousDateTime: fromAssoc.combinedFormatted,
        newDateTime: toAssoc.combinedFormatted,
      };
    }
  } else if (hasRescheduleKeyword && associations.length === 1) {
    newDateTime = associations[0];
  }

  // 7. Formulate Primary Deadline (Actionable event/task uses the NEW datetime)
  let primaryDeadline: TemporalExtractionResult["primaryDeadline"] = null;

  if (transition && newDateTime) {
    primaryDeadline = {
      date: newDateTime.combinedDate,
      iso: newDateTime.combinedIso,
      formatted: newDateTime.combinedFormatted,
      rawSnippet: newDateTime.rawSnippet,
    };

    temporalSpans.push({
      raw: transition.toSnippet,
      normalized: transition.toFormatted,
      iso: transition.toIso,
      type: "deadline",
      timezone: "Asia/Kolkata",
    });

    temporalSpans.push({
      raw: transition.fromSnippet,
      normalized: transition.fromFormatted,
      iso: transition.fromIso,
      type: "relative",
      timezone: "Asia/Kolkata",
    });
  } else if (associations.length > 0) {
    const primaryAssoc = associations[0];
    primaryDeadline = {
      date: primaryAssoc.combinedDate,
      iso: primaryAssoc.combinedIso,
      formatted: primaryAssoc.combinedFormatted,
      rawSnippet: primaryAssoc.rawSnippet,
    };

    temporalSpans.push({
      raw: primaryDeadline.rawSnippet,
      normalized: primaryDeadline.formatted,
      iso: primaryDeadline.iso,
      type: "deadline",
      timezone: "Asia/Kolkata",
    });
  }

  return {
    dates,
    times,
    associations,
    transition,
    previousDateTime,
    newDateTime,
    primaryDeadline,
    temporalSpans,
  };
}
