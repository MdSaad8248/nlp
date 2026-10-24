import { NextRequest, NextResponse } from "next/server";
import { RubricService } from "@/lib/intelligence/rubric-service";
import { getAuthenticatedUser } from "@/lib/auth/session-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get("courseCode");
    const query = searchParams.get("query");

    if (query) {
      const response = await RubricService.queryRubric(query, courseCode || undefined);
      return NextResponse.json({ success: true, ...response });
    }

    if (courseCode) {
      const rubrics = await RubricService.getRubricsByCourse(courseCode);
      return NextResponse.json({ success: true, rubrics });
    }

    const rubrics = await RubricService.getAllRubrics();
    return NextResponse.json({ success: true, rubrics });
  } catch (error: any) {
    console.error("[GET /api/rubrics] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve rubrics." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { courseCode, taskTitle, title, rawText, totalMarks, sourceDocument } = body;

    if (!courseCode || !taskTitle || !rawText) {
      return NextResponse.json(
        { success: false, error: "Course code, task title, and rubric text are required." },
        { status: 400 }
      );
    }

    const saved = await RubricService.saveRubric({
      courseCode,
      taskTitle,
      title,
      rawText,
      totalMarks: totalMarks ? Number(totalMarks) : undefined,
      sourceDocument,
      authorId: user?.id,
    });

    return NextResponse.json({
      success: true,
      rubric: saved,
      message: `Assessment rubric for ${courseCode} ${taskTitle} successfully saved.`,
    });
  } catch (error: any) {
    console.error("[POST /api/rubrics] Error saving rubric:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process and save rubric." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Rubric ID is required for deletion." },
        { status: 400 }
      );
    }

    await RubricService.deleteRubric(id);
    return NextResponse.json({ success: true, message: "Rubric record deleted." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
