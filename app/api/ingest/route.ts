import { NextRequest, NextResponse } from "next/server";
import { extractAcademicNoticeWithModel } from "@/lib/nlp/extractor";

/**
 * POST /api/ingest
 *
 * Input: { text: string, title?: string, channel?: string }
 * Output: Structured NLP analysis (Classification, Entities, Deliverables, Temporal Spans, Source Evidence)
 *
 * CRITICAL RULE:
 * This endpoint executes the NLP extraction pipeline ONLY.
 * It DOES NOT save any records to the database.
 * The user must review, optionally edit, and explicitly confirm via /api/ingest/confirm.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body?.text;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Notice text is required for NLP ingestion analysis.",
        },
        { status: 400 }
      );
    }

    // Execute the Hybrid NLP Extraction Pipeline backed by trained classifier + deterministic fallback
    const analysisResult = await extractAcademicNoticeWithModel(text.trim());

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      noticeMeta: {
        title: body.title || null,
        channel: body.channel || "MANUAL_PASTE",
        characterCount: text.trim().length,
        receivedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[POST /api/ingest] Error during NLP ingestion:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred during NLP ingestion analysis.",
      },
      { status: 500 }
    );
  }
}
