import { DuplicateDetectionResult } from "./schemas";

export interface CandidateNotice {
  id: string;
  title?: string | null;
  rawText: string;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are",
  "was", "were", "be", "been", "has", "have", "had", "it", "this", "that", "these",
  "dear", "students", "student", "all", "please", "note"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function calculateJaccard(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) {
      intersection++;
    }
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

function getCharNgrams(text: string, n: number = 3): Map<string, number> {
  const clean = text.toLowerCase().replace(/\s+/g, " ");
  const ngrams = new Map<string, number>();
  for (let i = 0; i <= clean.length - n; i++) {
    const gram = clean.slice(i, i + n);
    ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
  }
  return ngrams;
}

function calculateCosineSimilarity(textA: string, textB: string): number {
  const mapA = getCharNgrams(textA);
  const mapB = getCharNgrams(textB);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const count of mapA.values()) {
    normA += count * count;
  }
  for (const count of mapB.values()) {
    normB += count * count;
  }

  for (const [gram, countA] of mapA.entries()) {
    const countB = mapB.get(gram);
    if (countB) {
      dotProduct += countA * countB;
    }
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function detectDuplicateNotice(
  rawText: string,
  existingNotices: CandidateNotice[],
  threshold: number = 0.82
): DuplicateDetectionResult {
  const inputTokens = tokenize(rawText);

  let highestScore = 0;
  let bestMatch: CandidateNotice | null = null;
  let matchMethod = "";

  for (const candidate of existingNotices) {
    // 1. Exact or near-exact string match
    if (candidate.rawText.trim().toLowerCase() === rawText.trim().toLowerCase()) {
      return {
        isDuplicate: true,
        matchedSourceId: candidate.id,
        matchedTitle: candidate.title || "Academic Announcement",
        similarityScore: 1.0,
        reason: "Exact match with a previously processed academic notice.",
      };
    }

    const candidateTokens = tokenize(candidate.rawText);
    const jaccardScore = calculateJaccard(inputTokens, candidateTokens);
    const cosineScore = calculateCosineSimilarity(rawText, candidate.rawText);

    // Blended semantic score
    const blendedScore = 0.5 * jaccardScore + 0.5 * cosineScore;

    if (blendedScore > highestScore) {
      highestScore = blendedScore;
      bestMatch = candidate;
      matchMethod = jaccardScore > 0.85 ? "token similarity" : "n-gram text similarity";
    }
  }

  if (bestMatch && highestScore >= threshold) {
    return {
      isDuplicate: true,
      matchedSourceId: bestMatch.id,
      matchedTitle: bestMatch.title || "Academic Announcement",
      similarityScore: Math.round(highestScore * 100) / 100,
      reason: `Substantially similar (${Math.round(highestScore * 100)}% via ${matchMethod}) to existing notice "${bestMatch.title || bestMatch.id.slice(0, 8)}".`,
    };
  }

  return {
    isDuplicate: false,
    similarityScore: Math.round(highestScore * 100) / 100,
    reason: "No duplicate detected. This is a unique announcement.",
  };
}
