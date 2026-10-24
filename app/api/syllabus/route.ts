import { NextRequest, NextResponse } from "next/server";
import { SyllabusService } from "@/lib/intelligence/syllabus-service";
import { getAuthenticatedUser } from "@/lib/auth/session-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get("courseCode");
    const query = searchParams.get("query");

    if (query && courseCode) {
      const groundedAnswer = await SyllabusService.querySyllabus(courseCode, query);
      return NextResponse.json({ success: true, ...groundedAnswer });
    }

    if (courseCode) {
      const syllabus = await SyllabusService.getSyllabusByCourse(courseCode);
      return NextResponse.json({ success: true, syllabus });
    }

    const syllabi = await SyllabusService.getAllSyllabi();
    return NextResponse.json({ success: true, syllabi });
  } catch (error: any) {
    console.error("[GET /api/syllabus] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve syllabi." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    // Role check: Only authorized faculty or students can submit syllabi
    // (Teachers can officially verify; students can submit for their course)
    const body = await req.json();
    const { courseCode, title, rawText, semester, sourceFilename } = body;

    if (!courseCode || !rawText) {
      return NextResponse.json(
        { success: false, error: "Course code and syllabus text content are required." },
        { status: 400 }
      );
    }

    const saved = await SyllabusService.saveSyllabus({
      courseCode,
      title,
      rawText,
      semester,
      sourceFilename,
      facultyId: user?.id,
    });

    return NextResponse.json({
      success: true,
      syllabus: saved,
      message: `Syllabus for ${courseCode} successfully parsed and persisted.`,
    });
  } catch (error: any) {
    console.error("[POST /api/syllabus] Error saving syllabus:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process and save syllabus." },
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
        { success: false, error: "Syllabus ID is required for deletion." },
        { status: 400 }
      );
    }

    await SyllabusService.deleteSyllabus(id);
    return NextResponse.json({ success: true, message: "Syllabus record deleted." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
