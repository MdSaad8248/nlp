/**
 * lib/document/validator.ts
 *
 * Milestone 7 — Multimodal Academic Document Intelligence
 * Secure file validation for document uploads.
 *
 * Security rules enforced:
 * - Only PDF, PNG, JPG/JPEG accepted
 * - Magic-byte (file signature) validation — not just extension
 * - Maximum file size: 10 MB
 * - Rejects empty files
 * - Rejects executable/script content
 * - Filename is sanitised; the original path is never exposed
 */

import {
  DocumentValidationResult,
  DocumentFileType,
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  SupportedExtension,
} from "./types";

// ─── Magic Byte Signatures ────────────────────────────────────────────────────

/**
 * Minimal magic-byte table.
 * These are the first bytes of each supported format.
 * We only check enough bytes to distinguish formats — not a full forensic check.
 */
const MAGIC_SIGNATURES: Array<{
  mime: string;
  ext: SupportedExtension | SupportedExtension[];
  bytes: number[];
  offset?: number;
}> = [
  // PDF: starts with %PDF
  { mime: "application/pdf", ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  // PNG: \x89PNG\r\n\x1a\n
  { mime: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // JPEG/JPG: FFD8FF
  { mime: "image/jpeg", ext: ["jpg", "jpeg"], bytes: [0xff, 0xd8, 0xff] },
];

/** Dangerous content patterns that must never be accepted */
const DANGEROUS_PATTERNS = [
  /^#!/,                     // shebang scripts
  /<%/,                      // ASP/JSP
  /<script/i,               // HTML script injection
  /eval\s*\(/,              // JS eval
  /exec\s*\(/,              // shell exec
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate a file buffer and its declared filename.
 *
 * Rules:
 * 1. Filename must have a supported extension
 * 2. File must not be empty
 * 3. File must not exceed MAX_FILE_SIZE_BYTES
 * 4. File magic bytes must match the declared extension
 * 5. File content must not contain dangerous patterns
 *
 * @param buffer    Raw file bytes
 * @param filename  Declared filename (untrusted — used for extension only)
 * @returns         Validation result with error message if invalid
 */
export function validateDocumentFile(
  buffer: Buffer,
  filename: string
): DocumentValidationResult {
  // ── 1. Sanitise filename and extract extension ────────────────────────────
  const basename = sanitiseFilename(filename);
  const ext = extractExtension(basename);

  if (!ext || !SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension)) {
    return {
      valid: false,
      error: `Unsupported file type ".${ext || "unknown"}". Only PDF, PNG, JPG/JPEG files are accepted.`,
    };
  }

  // ── 2. Check for empty file ───────────────────────────────────────────────
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      error: "The uploaded file is empty.",
    };
  }

  // ── 3. File size limit ────────────────────────────────────────────────────
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMB} MB). Maximum allowed size is 10 MB.`,
    };
  }

  // ── 4. Magic byte validation ──────────────────────────────────────────────
  const magicResult = checkMagicBytes(buffer, ext as SupportedExtension);
  if (!magicResult.valid) {
    return magicResult;
  }

  // ── 5. Dangerous content check (text slice) ───────────────────────────────
  // Only check the first 512 bytes decoded as latin-1 for speed
  const head = buffer.slice(0, 512).toString("latin1");
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(head)) {
      return {
        valid: false,
        error: "File content appears to contain executable or scripting content and cannot be accepted.",
      };
    }
  }

  // ── Pass ──────────────────────────────────────────────────────────────────
  const documentFileType: DocumentFileType =
    ext === "pdf" ? "PDF" : "IMAGE";

  return {
    valid: true,
    mimeType: magicResult.mimeType,
    extension: ext,
    sizeBytes: buffer.length,
    documentFileType,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Remove any directory components and normalise the filename.
 * Prevents path traversal attacks.
 */
function sanitiseFilename(filename: string): string {
  // Strip any path separators
  return filename.replace(/[\\/]/g, "").trim();
}

/**
 * Extract the lowercase extension from a filename.
 */
function extractExtension(filename: string): string | null {
  const parts = filename.split(".");
  if (parts.length < 2) return null;
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Check that the first bytes of the buffer match the expected magic for the extension.
 */
function checkMagicBytes(
  buffer: Buffer,
  ext: SupportedExtension
): DocumentValidationResult & { mimeType?: string } {
  const candidates = MAGIC_SIGNATURES.filter((sig) => {
    if (Array.isArray(sig.ext)) {
      return sig.ext.includes(ext);
    }
    return sig.ext === ext;
  });

  if (candidates.length === 0) {
    return {
      valid: false,
      error: `No magic signature defined for extension ".${ext}". This is an internal error.`,
    };
  }

  for (const sig of candidates) {
    const offset = sig.offset ?? 0;
    const matches = sig.bytes.every(
      (byte, i) => buffer[offset + i] === byte
    );
    if (matches) {
      return { valid: true, mimeType: sig.mime };
    }
  }

  return {
    valid: false,
    error: `File content does not match the expected format for ".${ext}" files. The file may be corrupt or misnamed.`,
  };
}

/**
 * Compute a safe display filename.
 * Returns only the basename — never exposes local file paths.
 */
export function safeDisplayFilename(filename: string): string {
  return sanitiseFilename(filename);
}
