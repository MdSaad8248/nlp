/**
 * lib/document/evidence-grounding.ts
 *
 * Milestone 7 — M7-E: Source Evidence / Grounding
 *
 * Preserves the chain:
 *   uploaded document
 *     → extracted text (page/image)
 *       → NLP entity
 *         → academic record (Task / Event / Exam)
 *
 * Design rules:
 * - Extends the EXISTING FieldEvidence type from lib/nlp/schemas.ts
 * - Does NOT create a separate evidence system
 * - Bounding boxes only reported when Tesseract actually provides them
 * - OCR confidence only reported when Tesseract actually provides it
 * - Page numbers preserved for PDF documents
 * - Source filename is the safe display name (no full path)
 */

import type { FieldEvidence } from "@/lib/nlp/schemas";
import type { DocumentExtractionResult, ExtractedPage, BoundingBox, ExtractionMethod } from "./types";

// ─── Document Source Context ──────────────────────────────────────────────────

/**
 * Serialisable metadata about the document that produced an NLP analysis.
 * This is stored in AcademicSource.sourceMetadata as JSON.
 */
export interface DocumentSourceContext {
  /** Safe display filename (basename only, no full path) */
  filename: string;
  /** MIME type e.g. "application/pdf" */
  mimeType: string;
  /** File type: PDF or IMAGE */
  documentFileType: "PDF" | "IMAGE";
  /** Total pages (PDFs) or 1 (images) */
  totalPages: number;
  /** How the text was extracted */
  primaryExtractionMethod: ExtractionMethod;
  /** Upload timestamp */
  uploadedAt: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Per-page metadata */
  pages: Array<{
    pageNumber: number;
    extractionMethod: ExtractionMethod;
    /** Actual OCR confidence [0..1] from Tesseract — only if provided */
    ocrConfidence?: number;
    /** Character count of extracted text for this page */
    textLength: number;
  }>;
  /** Overall OCR confidence [0..1] averaged across pages — only if OCR was used */
  averageOcrConfidence?: number;
}

// ─── Document Field Evidence ──────────────────────────────────────────────────

/**
 * Extends the existing FieldEvidence with document-level provenance.
 * Used when the source of an NLP entity is a document page rather than
 * a manually pasted text.
 */
export interface DocumentFieldEvidence extends FieldEvidence {
  /** Safe display filename */
  sourceFilename: string;
  /** Page/image number where this snippet was found */
  pageNumber: number;
  /** Extraction method for this specific page */
  extractionMethod: ExtractionMethod;
  /** OCR confidence [0..1] for this page — ONLY if Tesseract provided it */
  ocrConfidence?: number;
  /** Bounding box from Tesseract — ONLY if provided */
  boundingBox?: BoundingBox;
}

// ─── Grounding Functions ──────────────────────────────────────────────────────

/**
 * Build a DocumentSourceContext from a DocumentExtractionResult.
 * This is stored in AcademicSource.sourceMetadata.
 */
export function buildDocumentSourceContext(
  doc: DocumentExtractionResult
): DocumentSourceContext {
  const ocrPages = doc.pages.filter(
    (p) => p.extractionMethod === "IMAGE_OCR" || p.extractionMethod === "PDF_OCR"
  );

  const averageOcrConfidence =
    ocrPages.length > 0 && ocrPages.every((p) => p.ocrConfidence !== undefined)
      ? ocrPages.reduce((sum, p) => sum + (p.ocrConfidence ?? 0), 0) / ocrPages.length
      : undefined;

  return {
    filename: doc.filename,
    mimeType: doc.mimeType,
    documentFileType: doc.documentFileType,
    totalPages: doc.totalPages ?? 1,
    primaryExtractionMethod: doc.primaryExtractionMethod,
    uploadedAt: doc.uploadedAt,
    sizeBytes: doc.sizeBytes,
    pages: doc.pages.map((p) => ({
      pageNumber: p.pageNumber,
      extractionMethod: p.extractionMethod,
      // Only include ocrConfidence if Tesseract actually reported it
      ...(p.ocrConfidence !== undefined ? { ocrConfidence: p.ocrConfidence } : {}),
      textLength: p.text.length,
    })),
    // Only include average if OCR was used
    ...(averageOcrConfidence !== undefined ? { averageOcrConfidence } : {}),
  };
}

/**
 * Enrich the NLP evidences array with document provenance information.
 *
 * Locates each FieldEvidence rawSnippet within the page-level text to
 * identify which page it came from, then attaches:
 * - sourceFilename
 * - pageNumber
 * - extractionMethod
 * - ocrConfidence (if Tesseract provided it)
 * - boundingBox (if available from Tesseract)
 *
 * @param evidences   FieldEvidence array from NLP analysis
 * @param doc         Document extraction result
 */
export function enrichEvidencesWithDocumentProvenance(
  evidences: FieldEvidence[],
  doc: DocumentExtractionResult
): DocumentFieldEvidence[] {
  return evidences.map((ev) => {
    const page = findPageForSnippet(ev.rawSnippet, doc.pages);
    const boundingBox = page
      ? findBoundingBoxForSnippet(ev.rawSnippet, page)
      : undefined;

    return {
      ...ev,
      sourceFilename: doc.filename,
      pageNumber: page?.pageNumber ?? 1,
      extractionMethod: page?.extractionMethod ?? doc.primaryExtractionMethod,
      // Only attach OCR confidence if Tesseract provided it
      ...(page?.ocrConfidence !== undefined
        ? { ocrConfidence: page.ocrConfidence }
        : {}),
      // Only attach bounding box if OCR provided it
      ...(boundingBox !== undefined ? { boundingBox } : {}),
    };
  });
}

/**
 * Build a summary evidence array from the document pages.
 * Used when the NLP analysis doesn't produce granular evidences
 * (e.g., for brief documents where the entire page is the evidence).
 */
export function buildPageLevelEvidences(
  doc: DocumentExtractionResult,
  field: string = "document_text"
): DocumentFieldEvidence[] {
  return doc.pages
    .filter((p) => p.text.length > 0)
    .map((p) => {
      const snippet = p.text.length > 300 ? p.text.slice(0, 300) + "…" : p.text;
      const ev: DocumentFieldEvidence = {
        field: `${field}_page_${p.pageNumber}`,
        value: snippet,
        rawSnippet: snippet,
        confidence: 1.0,
        sourceFilename: doc.filename,
        pageNumber: p.pageNumber,
        extractionMethod: p.extractionMethod,
      };
      if (p.ocrConfidence !== undefined) {
        ev.ocrConfidence = p.ocrConfidence;
      }
      return ev;
    });
}

/**
 * Format a human-readable evidence summary for the UI.
 * Used in the document upload panel.
 */
export function formatEvidenceSummary(ev: DocumentFieldEvidence): string {
  const location =
    ev.sourceFilename +
    (ev.pageNumber > 1 ? ` (page ${ev.pageNumber})` : "");

  const confidence =
    ev.ocrConfidence !== undefined
      ? ` • OCR: ${Math.round(ev.ocrConfidence * 100)}%`
      : "";

  const bbox = ev.boundingBox
    ? ` • bbox:(${ev.boundingBox.bbox.x0},${ev.boundingBox.bbox.y0})`
    : "";

  return `${location}${confidence}${bbox}`;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Find which page a snippet came from by substring search.
 * Returns the first page whose text contains the snippet.
 */
function findPageForSnippet(
  snippet: string,
  pages: ExtractedPage[]
): ExtractedPage | null {
  if (!snippet) return pages[0] ?? null;

  const normalizedSnippet = snippet.trim().toLowerCase();

  for (const page of pages) {
    if (page.text.toLowerCase().includes(normalizedSnippet)) {
      return page;
    }
  }

  // Fallback: return the first page with readable text
  const readablePage = pages.find((p) => p.text.length > 0);
  return readablePage ?? pages[0] ?? null;
}

/**
 * Find the Tesseract bounding box for a word that matches the snippet.
 * Returns the bounding box of the best-matching word.
 * Returns undefined if OCR data is not available.
 */
function findBoundingBoxForSnippet(
  snippet: string,
  page: ExtractedPage
): BoundingBox | undefined {
  if (!page.boundingBoxes || page.boundingBoxes.length === 0) {
    return undefined;
  }

  const normalizedSnippet = snippet.trim().toLowerCase();

  // Try to find an exact word match first
  const exactMatch = page.boundingBoxes.find(
    (bb) => bb.text.trim().toLowerCase() === normalizedSnippet
  );
  if (exactMatch) return exactMatch;

  // Try substring match (snippet may be a phrase — return first word that appears in it)
  const containsMatch = page.boundingBoxes.find(
    (bb) => normalizedSnippet.includes(bb.text.trim().toLowerCase()) && bb.text.trim().length > 2
  );
  return containsMatch;
}
