/**
 * lib/document/pdf-parser.ts
 *
 * Milestone 7 — Multimodal Academic Document Intelligence (M7-B)
 * PDF text extraction.
 *
 * Strategy:
 * 1. Try to extract the text layer from the PDF (fast, accurate).
 * 2. If the extracted text is too short (< MIN_TEXT_LENGTH_CHARS),
 *    the PDF is likely scanned/image-based. In that case we flag it
 *    so the caller can route it through OCR (M7-C).
 *
 * We do NOT silently treat failed extraction as valid text.
 * We do NOT fabricate text.
 *
 * Note: pdf-parse works in Node.js environments (API routes / scripts).
 * It does NOT run in the browser.
 */

import { ExtractedPage, ExtractionMethod, MIN_TEXT_LENGTH_CHARS } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PDFParseResult {
  pages: ExtractedPage[];
  totalPages: number;
  primaryExtractionMethod: ExtractionMethod;
  isScannedPDF: boolean;
  combinedText: string;
  hasReadableText: boolean;
  extractionWarning?: string;
}

// ─── PDF Text Extraction ──────────────────────────────────────────────────────

/**
 * Extract text from a PDF buffer.
 *
 * Returns per-page extracted text. If the PDF has no text layer
 * (scanned PDF), isScannedPDF will be true and pages will show
 * ExtractionMethod "EMPTY" so the caller knows to OCR them.
 *
 * @param buffer    Raw PDF bytes
 * @param filename  Safe display name for logging/evidence
 */
export async function extractPDFText(
  buffer: Buffer,
  filename: string
): Promise<PDFParseResult> {
  // Dynamically import pdf-parse to keep it server-side only
  const pdfParseModule: any = await import("pdf-parse");
  const pdfParse = pdfParseModule.default || pdfParseModule;

  let rawResult: {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  };

  try {
    rawResult = await pdfParse(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Return a failure result — do not throw silently
    return buildFailureResult(filename, `PDF parsing failed: ${message}`);
  }

  const totalPages = rawResult.numpages || 1;
  const fullText = (rawResult.text || "").trim();

  // ── Case 1: No text at all → scanned PDF ──────────────────────────────────
  if (fullText.length < MIN_TEXT_LENGTH_CHARS) {
    const pages: ExtractedPage[] = Array.from({ length: totalPages }, (_, i) => ({
      pageNumber: i + 1,
      text: "",
      extractionMethod: "EMPTY" as ExtractionMethod,
    }));

    return {
      pages,
      totalPages,
      primaryExtractionMethod: "EMPTY",
      isScannedPDF: true,
      combinedText: "",
      hasReadableText: false,
      extractionWarning:
        `PDF "${filename}" appears to be a scanned/image-based PDF ` +
        `(${fullText.length} chars extracted). ` +
        `Routing through OCR for text extraction.`,
    };
  }

  // ── Case 2: Text layer exists — split by page ─────────────────────────────
  // pdf-parse returns the full text without reliable page boundaries.
  // We split by form-feed character (\f) which most PDFs use.
  const pageTexts = fullText.split(/\f/);

  const pages: ExtractedPage[] = [];

  for (let i = 0; i < totalPages; i++) {
    const rawPageText = (pageTexts[i] ?? "").trim();
    pages.push({
      pageNumber: i + 1,
      text: rawPageText,
      extractionMethod: rawPageText.length >= MIN_TEXT_LENGTH_CHARS
        ? "PDF_TEXT"
        : "EMPTY",
    });
  }

  // Ensure we have at least one page entry
  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      text: fullText,
      extractionMethod: "PDF_TEXT",
    });
  }

  const combinedText = pages
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n\n");

  return {
    pages,
    totalPages,
    primaryExtractionMethod: "PDF_TEXT",
    isScannedPDF: false,
    combinedText,
    hasReadableText: combinedText.length >= MIN_TEXT_LENGTH_CHARS,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFailureResult(filename: string, warning: string): PDFParseResult {
  return {
    pages: [
      {
        pageNumber: 1,
        text: "",
        extractionMethod: "FAILED",
      },
    ],
    totalPages: 1,
    primaryExtractionMethod: "FAILED",
    isScannedPDF: false,
    combinedText: "",
    hasReadableText: false,
    extractionWarning: `${warning} (document: ${filename})`,
  };
}
