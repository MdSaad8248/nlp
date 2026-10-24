import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processAndPersistNotice } from "@/lib/services/notice.service";

const RequestSchema = z.object({
  text: z.string().min(5, "Notice text must be at least 5 characters long"),
  force: z.boolean().optional().default(false),
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

    const result = await processAndPersistNotice(parseResult.data.text, {
      force: parseResult.data.force,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/notices/process:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process notice" },
      { status: 500 }
    );
  }
}
