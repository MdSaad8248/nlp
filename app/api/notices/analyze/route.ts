import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeNotice } from "@/lib/services/notice.service";

const RequestSchema = z.object({
  text: z.string().min(5, "Notice text must be at least 5 characters long"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const analysis = await analyzeNotice(parseResult.data.text);
    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("Error in /api/notices/analyze:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze notice" },
      { status: 500 }
    );
  }
}
