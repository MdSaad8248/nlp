/**
 * lib/document/types.ts
 * 
 * Milestone 7 — Multimodal Academic Document Intelligence
 * Core type definitions for document ingestion, validation, and extraction.
 * 
 * These types feed INTO the existing NLP pipeline (lib/nlp/pipeline.ts).
 * No separate NLP pipeline is created here.
 */

// ─── Supported File Types ────────────────────────────────────────────────────

export type SupportedMimeType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/jpg";

export type SupportedExtension = "pdf" | "png" | "jpg" | "jpeg";

export const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

export const SUPPORTED_EXTENSIONS: SupportedExtension[] = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
];

/** Maximum file size: 10 MB */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Minimum text length to consider a page "has readable text" */
export const MIN_TEXT_LENGTH_CHARS = 30;

// ─── Document Type Enum ───────────────────────────────────────────────────────

export type DocumentFileType = "PDF" | "IMAGE";

// ─── Validation ───────────────────────────────────────────────────────────────

export interface DocumentValidationResult {
  valid: boolean;
  /** Human-readable error if invalid */
  error?: string;
  /** Detected MIME type */
  mimeType?: string;
  /** Normalised extension (lowercase) */
  extension?: string;
  /** File size in bytes */
  sizeBytes?: number;
  /** Resolved high-level type */
  documentFileType?: DocumentFileType;
}

// ─── Extraction ───────────────────────────────────────────────────────────────

/**
 * A single extracted page or image unit with its source provenance.
 */
export interface ExtractedPage {
  /** 1-indexed page number (for PDFs) or 1 for a single image */
  pageNumber: number;
  /** Extracted text (may be empty for blank/unreadable pages) */
  text: string;
  /** How text was obtained */
  extractionMethod: ExtractionMethod;
  /** Optional confidence [0..1] if OCR engine provides it; undefined otherwise */
  ocrConfidence?: number;
  /** Optional bounding boxes from OCR engine, serialised as JSON string */
  boundingBoxes?: BoundingBox[];
}

export type ExtractionMethod =
  | "PDF_TEXT"        // Direct text layer from PDF
  | "PDF_OCR"         // Page rendered to image then OCR'd
  | "IMAGE_OCR"       // Direct image → Tesseract OCR
  | "EMPTY"           // Page/image was blank
  | "FAILED";         // Extraction attempted but failed

// ─── Bounding Box (Tesseract HOCR output) ────────────────────────────────────

export interface BoundingBox {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

// ─── Document Extraction Result ───────────────────────────────────────────────

/**
 * The full result of extracting text from a document (PDF or image).
 * This is what gets handed to the NLP pipeline.
 */
export interface DocumentExtractionResult {
  /** Safe display name (basename only, no full path) */
  filename: string;
  /** Original MIME type */
  mimeType: string;
  /** Resolved file type */
  documentFileType: DocumentFileType;
  /** File size in bytes */
  sizeBytes: number;
  /** Upload timestamp (ISO string) */
  uploadedAt: string;
  /** All pages / image units extracted */
  pages: ExtractedPage[];
  /** Combined text across all pages in order (for NLP pipeline input) */
  combinedText: string;
  /** Primary extraction method used */
  primaryExtractionMethod: ExtractionMethod;
  /** Whether extraction produced useful text */
  hasReadableText: boolean;
  /** Human-readable extraction warning (if any) */
  extractionWarning?: string;
  /** Total pages (for PDFs) */
  totalPages?: number;
}

// ─── Document Ingestion Result ────────────────────────────────────────────────

/**
 * Final result after document → NLP → academic understanding.
 * The analysis field uses the same NLPAnalysisResult type from M2.
 */
export interface DocumentIngestionResult {
  /** Document extraction metadata and text */
  document: DocumentExtractionResult;
  /** NLP analysis result — from the EXISTING pipeline */
  // typed as any here to avoid circular imports; consumer casts to NLPAnalysisResult
  nlpAnalysis: unknown;
  /** Change intelligence result — from the EXISTING M3 pipeline */
  changeCheckResult?: unknown;
  /**
   * M7-E: Document source context (filename, pages, extraction method, OCR confidence).
   * Stored in AcademicSource.sourceMetadata as JSON when confirmed.
   */
  documentSource?: unknown;
  /**
   * M7-E: NLP evidences enriched with document provenance
   * (page number, bounding box, OCR confidence where Tesseract provides them).
   */
  enrichedEvidences?: unknown[];
  /** Processing time for extraction only (ms) */
  extractionTimeMs: number;
  /** Total processing time including NLP (ms) */
  totalProcessingTimeMs: number;
}


// ─── Source Evidence (document-level) ────────────────────────────────────────

/**
 * Links an NLP-extracted field value back to its document source.
 * Extends the existing FieldEvidence concept with document provenance.
 */
export interface DocumentFieldEvidence {
  field: string;
  value: string;
  /** Source filename (basename only) */
  sourceFilename: string;
  /** Page/image number where the text was found */
  pageNumber: number;
  /** Verbatim snippet from extraction */
  rawSnippet: string;
  /** Character start index in combinedText */
  startIndex?: number;
  /** Character end index in combinedText */
  endIndex?: number;
  /** Bounding box if OCR provides it */
  boundingBox?: BoundingBox;
  /** Extraction method for this piece of evidence */
  extractionMethod: ExtractionMethod;
  /** Actual OCR confidence [0..1] if provided by engine; undefined otherwise */
  ocrConfidence?: number;
}

// ─── Upload API Types ─────────────────────────────────────────────────────────

export interface DocumentUploadResponse {
  success: boolean;
  error?: string;
  /** Document extraction result */
  document?: DocumentExtractionResult;
  /** Ingest channel to use for NLP */
  channel?: string;
}
