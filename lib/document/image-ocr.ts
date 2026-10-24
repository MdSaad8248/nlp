/**
 * lib/document/image-ocr.ts
 *
 * Milestone 7 — Multimodal Academic Document Intelligence (M7-C)
 * OCR for PNG/JPG/JPEG images using Tesseract.js v7.
 *
 * Design rules:
 * - Confidence is ONLY reported if Tesseract actually provides it (it does).
 * - Bounding boxes from Tesseract word-level output are preserved.
 * - No fabricated scores are generated.
 * - Poor OCR results (low confidence, minimal text) are flagged with warnings.
 * - We never fabricate academic information from poor OCR.
 *
 * Tesseract.js v7 uses createWorker(lang) → recognize(buffer).
 * Page structure: page.blocks → paragraphs → lines → words
 */

import type Tesseract from "tesseract.js";
import { ExtractedPage, BoundingBox, MIN_TEXT_LENGTH_CHARS } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageOCRResult {
  /** Single page result for an image file */
  page: ExtractedPage;
  /** Detailed bounding boxes from Tesseract word recognition */
  words: BoundingBox[];
  /** Whether the OCR produced useful text */
  hasReadableText: boolean;
  /** Warning message if extraction quality is poor */
  extractionWarning?: string;
}

// Low-confidence threshold below which we warn the user
const LOW_CONFIDENCE_THRESHOLD = 40; // out of 100

// ─── OCR Entry Point ──────────────────────────────────────────────────────────

/**
 * Run Tesseract OCR on an image buffer.
 *
 * Confidence values [0..100] from Tesseract are preserved as-is and
 * normalised to [0..1] for storage. If Tesseract does not provide
 * confidence for a word, that word's entry will have confidence = 0.
 *
 * @param buffer    Raw image bytes (PNG/JPG/JPEG)
 * @param filename  Safe display name for provenance
 * @param pageNumber  Page number (1 for a standalone image)
 */
export async function runImageOCR(
  buffer: Buffer,
  filename: string,
  pageNumber: number = 1
): Promise<ImageOCRResult> {
  // Dynamically import tesseract.js (server-side only)
  const Tesseract = await import("tesseract.js");

  try {
    // Create a worker for English language recognition
    // Tesseract.js v7 API
    const worker = await Tesseract.createWorker("eng");

    let result: Awaited<ReturnType<typeof worker.recognize>>;
    try {
      result = await worker.recognize(buffer);
    } finally {
      await worker.terminate();
    }

    const { data } = result;
    const rawText = (data.text || "").trim();

    // ── Extract word-level bounding boxes ────────────────────────────────────
    // Tesseract v7: page.blocks → paragraphs → lines → words
    const rawWords: Tesseract.Word[] = [];
    for (const block of (data.blocks || [])) {
      for (const para of (block.paragraphs || [])) {
        for (const line of (para.lines || [])) {
          for (const word of (line.words || [])) {
            rawWords.push(word);
          }
        }
      }
    }

    const words: BoundingBox[] = rawWords.map((w) => ({
      text: w.text,
      // Tesseract confidence is [0..100]; preserve as-is for users
      confidence: w.confidence,
      bbox: {
        x0: w.bbox.x0,
        y0: w.bbox.y0,
        x1: w.bbox.x1,
        y1: w.bbox.y1,
      },
    }));

    // ── Compute page-level confidence ─────────────────────────────────────────
    // Tesseract provides per-word confidence. We take the mean of words with
    // non-trivial text (length >= 2) as the page-level confidence.
    const meaningfulWords = words.filter((w) => w.text.trim().length >= 2);
    const pageConfidence =
      meaningfulWords.length > 0
        ? meaningfulWords.reduce((sum, w) => sum + w.confidence, 0) /
          meaningfulWords.length
        : 0;

    // Normalise to [0..1] for our types
    const normalisedConfidence = Math.round(pageConfidence) / 100;

    const hasReadableText = rawText.length >= MIN_TEXT_LENGTH_CHARS;

    // ── Build warning ─────────────────────────────────────────────────────────
    let extractionWarning: string | undefined;

    if (!hasReadableText) {
      extractionWarning =
        `Unable to extract sufficient text from "${filename}". ` +
        `The image may be blank, blurry, or contain non-textual content. ` +
        `Extracted ${rawText.length} characters.`;
    } else if (pageConfidence < LOW_CONFIDENCE_THRESHOLD) {
      extractionWarning =
        `OCR confidence is low (${Math.round(pageConfidence)}%) for "${filename}". ` +
        `The image may be blurry or low-resolution. Extracted text may contain errors.`;
    }

    const page: ExtractedPage = {
      pageNumber,
      text: rawText,
      extractionMethod: hasReadableText ? "IMAGE_OCR" : "EMPTY",
      ocrConfidence: normalisedConfidence,
      boundingBoxes: words.length > 0 ? words : undefined,
    };

    return {
      page,
      words,
      hasReadableText,
      extractionWarning,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const failPage: ExtractedPage = {
      pageNumber,
      text: "",
      extractionMethod: "FAILED",
    };

    return {
      page: failPage,
      words: [],
      hasReadableText: false,
      extractionWarning: `OCR failed for "${filename}": ${message}`,
    };
  }
}
