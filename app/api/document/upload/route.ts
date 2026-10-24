/**
 * app/api/document/upload/route.ts
 *
 * Milestone 7 — Multimodal Academic Document Intelligence
 * POST /api/document/upload
 *
 * Accepts multipart/form-data with a single "file" field.
 * 
 * Security:
 * - Only PDF/PNG/JPG/JPEG accepted
 * - Magic-byte validation (not just extension)
 * - Max 10 MB
 * - Filename is sanitised; original path never stored or returned
 * - File is never executed or stored to disk — processed in-memory only
 * - No secrets accepted as document content
 *
 * Returns DocumentExtractionResult (extracted text, pages, method, etc.)
 * The NLP pipeline step happens separately via /api/ingest to preserve the
 * existing text-based review/confirm flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { processDocument } from "@/lib/document/document-service";
import { safeDisplayFilename } from "@/lib/document/validator";

export const maxDuration = 60; // Tesseract OCR can take up to 30-40s

export async function POST(req: NextRequest) {
  try {
    // ── Parse multipart form ────────────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format. Please upload a file using multipart/form-data.",
        },
        { status: 400 }
      );
    }

    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided. Please upload a PDF, PNG, JPG, or JPEG file.",
        },
        { status: 400 }
      );
    }

    // ── Extract filename safely ─────────────────────────────────────────────
    const rawFilename =
      (file as File).name || "upload.bin";
    const safeFilename = safeDisplayFilename(rawFilename);

    // ── Read file into buffer (never written to disk) ───────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── Process: validate → extract → NLP pipeline ────────────────────────
    const result = await processDocument(buffer, safeFilename, {
      // Extraction only at this stage; NLP analysis is returned separately
      // so the existing /api/ingest/confirm flow can be reused.
      extractionOnly: false,
    });

    // ── Build response ──────────────────────────────────────────────────────
    if (!result.document.hasReadableText) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.document.extractionWarning ||
            `Could not extract readable academic text from "${safeFilename}".`,
          document: result.document,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      document: result.document,
      nlpAnalysis: result.nlpAnalysis,
      // M7-E: Document source context and evidence provenance
      documentSource: result.documentSource ?? null,
      enrichedEvidences: result.enrichedEvidences ?? [],
      meta: {
        filename: safeFilename,
        sizeBytes: buffer.length,
        extractionMethod: result.document.primaryExtractionMethod,
        totalPages: result.document.totalPages ?? 1,
        extractionTimeMs: result.extractionTimeMs,
        totalProcessingTimeMs: result.totalProcessingTimeMs,
        uploadedAt: result.document.uploadedAt,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during document processing.";

    console.error("[POST /api/document/upload] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
