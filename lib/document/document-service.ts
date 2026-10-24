/**
 * lib/document/document-service.ts
 *
 * Milestone 7 — Multimodal Academic Document Intelligence (M7-D)
 * Main orchestrator: validate → extract → NLP pipeline.
 *
 * ARCHITECTURE (as specified in M7 requirements):
 *
 *   PDF / Image / Screenshot
 *           ↓
 *   validateDocumentFile()
 *           ↓
 *   extractPDFText() / runImageOCR()
 *           ↓
 *   combinedText (real extracted text)
 *           ↓
 *   processAcademicNotice()  ← EXISTING M2 NLP PIPELINE (no duplicate)
 *           ↓
 *   NLPAnalysisResult (same as text-paste flow)
 *           ↓
 *   M3 change intelligence / M4 priority / M5 notifications (downstream)
 *
 * This file is the ONLY new intelligence layer. Everything downstream
 * reuses existing milestones.
 */

import { validateDocumentFile, safeDisplayFilename } from "./validator";
import { runImageOCR } from "./image-ocr";
import {
  DocumentExtractionResult,
  DocumentIngestionResult,
  ExtractedPage,
  ExtractionMethod,
  MIN_TEXT_LENGTH_CHARS,
} from "./types";

// Import the EXISTING M2/M3 NLP pipeline — not a new one
import { processAcademicNotice, PipelineOptions } from "@/lib/nlp/pipeline";

// M7-E: Evidence grounding — enriches NLP evidences with document provenance
import {
  buildDocumentSourceContext,
  enrichEvidencesWithDocumentProvenance,
  buildPageLevelEvidences,
  type DocumentSourceContext,
} from "./evidence-grounding";

// Re-export grounding types for API consumers
export type { DocumentSourceContext };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessDocumentOptions extends PipelineOptions {
  /** Skip NLP and return only the extraction result */
  extractionOnly?: boolean;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Ingest a document file buffer through the full pipeline:
 * validate → extract text → existing NLP pipeline.
 *
 * @param buffer    Raw file bytes from the upload
 * @param filename  Declared filename (untrusted; will be sanitised)
 * @param options   Pipeline options (existingTasks, existingEvents, etc.)
 */
export async function processDocument(
  buffer: Buffer,
  filename: string,
  options: ProcessDocumentOptions = {}
): Promise<DocumentIngestionResult> {
  const totalStart = Date.now();
  const safeName = safeDisplayFilename(filename);

  // ── Step 1: Validate ─────────────────────────────────────────────────────
  const validation = validateDocumentFile(buffer, filename);
  if (!validation.valid) {
    // Return a structured failure — do not throw
    const failDocument = buildFailDocument(safeName, buffer, "FAILED", validation.error!);
    return {
      document: failDocument,
      nlpAnalysis: null,
      extractionTimeMs: Date.now() - totalStart,
      totalProcessingTimeMs: Date.now() - totalStart,
    };
  }

  const { documentFileType, mimeType } = validation;
  const extractionStart = Date.now();

  // ── Step 2: Extract text ─────────────────────────────────────────────────
  let extractionResult: DocumentExtractionResult;

  if (documentFileType === "PDF") {
    extractionResult = await extractFromPDF(buffer, safeName, mimeType!);
  } else {
    // IMAGE (PNG / JPG / JPEG)
    extractionResult = await extractFromImage(buffer, safeName, mimeType!);
  }

  const extractionTimeMs = Date.now() - extractionStart;

  // Update size (validator confirmed)
  extractionResult.sizeBytes = buffer.length;
  extractionResult.mimeType = mimeType!;
  extractionResult.uploadedAt = new Date().toISOString();

  // ── Step 3: Guard — no readable text ─────────────────────────────────────
  if (!extractionResult.hasReadableText) {
    return {
      document: extractionResult,
      nlpAnalysis: null,
      extractionTimeMs,
      totalProcessingTimeMs: Date.now() - totalStart,
    };
  }

  // ── Step 4: If extraction-only requested, stop here ────────────────────
  if (options.extractionOnly) {
    return {
      document: extractionResult,
      nlpAnalysis: null,
      extractionTimeMs,
      totalProcessingTimeMs: Date.now() - totalStart,
    };
  }

  // ── Step 5: Hand off to the EXISTING NLP pipeline ─────────────────────
  // This is the core of M7-D: extracted text → processAcademicNotice()
  // No new classifier, no new NER, no new temporal parser.
  const { extractionOnly: _skip, ...pipelineOpts } = options;
  const nlpAnalysis = await processAcademicNotice(
    extractionResult.combinedText,
    pipelineOpts
  );

  // ── Step 6 (M7-E): Enrich evidences with document provenance ──────────
  // Takes the existing FieldEvidence array from NLP and adds:
  //   • source filename (safe display name)
  //   • page number where the snippet was found
  //   • extraction method
  //   • OCR confidence [0..1] if Tesseract provided it (not fabricated)
  //   • bounding box if Tesseract provided it (not fabricated)
  const nlpResult = nlpAnalysis as any;
  const nlpEvidences = nlpResult?.evidences ?? [];

  const enrichedEvidences =
    nlpEvidences.length > 0
      ? enrichEvidencesWithDocumentProvenance(nlpEvidences, extractionResult)
      : buildPageLevelEvidences(extractionResult, "document_text");

  // Attach grounded evidences back to the NLP result
  if (nlpResult) {
    nlpResult.evidences = enrichedEvidences;
    nlpResult.documentSource = buildDocumentSourceContext(extractionResult);
  }

  return {
    document: extractionResult,
    nlpAnalysis,
    documentSource: buildDocumentSourceContext(extractionResult),
    enrichedEvidences,
    extractionTimeMs,
    totalProcessingTimeMs: Date.now() - totalStart,
  };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Handle PDF extraction. If the PDF is scanned (no text layer),
 * we route each page through OCR automatically.
 */
async function extractFromPDF(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<DocumentExtractionResult> {
  const { extractPDFText } = await import("./pdf-parser");
  const pdfResult = await extractPDFText(buffer, filename);

  // If the PDF has readable text, return directly
  if (!pdfResult.isScannedPDF && pdfResult.hasReadableText) {
    return {
      filename,
      mimeType,
      documentFileType: "PDF",
      sizeBytes: buffer.length,
      uploadedAt: new Date().toISOString(),
      pages: pdfResult.pages,
      combinedText: pdfResult.combinedText,
      primaryExtractionMethod: "PDF_TEXT",
      hasReadableText: true,
      totalPages: pdfResult.totalPages,
    };
  }

  // Scanned PDF — attempt to OCR each page
  // Note: Rendering individual PDF pages to images requires a native PDF renderer
  // (e.g., pdf2pic, Poppler) which we intentionally exclude for student local dev.
  // We return the scanned-PDF result with a clear warning.
  return {
    filename,
    mimeType,
    documentFileType: "PDF",
    sizeBytes: buffer.length,
    uploadedAt: new Date().toISOString(),
    pages: pdfResult.pages,
    combinedText: pdfResult.combinedText,
    primaryExtractionMethod: pdfResult.primaryExtractionMethod,
    hasReadableText: pdfResult.hasReadableText,
    totalPages: pdfResult.totalPages,
    extractionWarning:
      pdfResult.extractionWarning ||
      `PDF "${filename}" appears to be scanned (image-based). ` +
        `Automatic page rendering for OCR is not available in this environment. ` +
        `Please convert the scanned PDF to images (PNG/JPG) and upload those for OCR processing.`,
  };
}

/**
 * Handle image OCR extraction.
 */
async function extractFromImage(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<DocumentExtractionResult> {
  const { runImageOCR } = await import("./image-ocr");
  const ocrResult = await runImageOCR(buffer, filename, 1);

  const pages: ExtractedPage[] = [ocrResult.page];
  const combinedText = ocrResult.page.text;

  return {
    filename,
    mimeType,
    documentFileType: "IMAGE",
    sizeBytes: buffer.length,
    uploadedAt: new Date().toISOString(),
    pages,
    combinedText,
    primaryExtractionMethod: ocrResult.page.extractionMethod,
    hasReadableText: ocrResult.hasReadableText,
    totalPages: 1,
    extractionWarning: ocrResult.extractionWarning,
  };
}

/**
 * Build a failed-validation document result.
 */
function buildFailDocument(
  filename: string,
  buffer: Buffer,
  method: ExtractionMethod,
  errorMessage: string
): DocumentExtractionResult {
  const failPage: ExtractedPage = {
    pageNumber: 1,
    text: "",
    extractionMethod: method,
  };

  return {
    filename,
    mimeType: "unknown",
    documentFileType: "IMAGE", // placeholder
    sizeBytes: buffer?.length ?? 0,
    uploadedAt: new Date().toISOString(),
    pages: [failPage],
    combinedText: "",
    primaryExtractionMethod: method,
    hasReadableText: false,
    extractionWarning: errorMessage,
  };
}

// ─── Multi-Page Document Splitting ───────────────────────────────────────────

/**
 * Detect separate candidate academic items from a multi-page document.
 * 
 * Strategy: if the document has multiple pages and each page has >= MIN_TEXT_LENGTH_CHARS,
 * treat each page as a separate candidate notice. The caller can then run NLP
 * on each independently.
 *
 * For single-page documents or short documents, returns a single combined candidate.
 */
export function splitDocumentIntoNotices(
  doc: DocumentExtractionResult
): Array<{ pageNumbers: number[]; text: string }> {
  const readablePages = doc.pages.filter(
    (p) => p.text.length >= MIN_TEXT_LENGTH_CHARS
  );

  if (readablePages.length <= 1) {
    // Single page or insufficient content — combine all as one
    return [
      {
        pageNumbers: readablePages.map((p) => p.pageNumber),
        text: doc.combinedText,
      },
    ];
  }

  // Multiple readable pages → each page is a separate candidate
  return readablePages.map((p) => ({
    pageNumbers: [p.pageNumber],
    text: p.text,
  }));
}

// Re-export types for convenience
export type { DocumentExtractionResult, DocumentIngestionResult };
