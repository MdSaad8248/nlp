import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const notices = await prisma.academicSource.findMany({
      include: {
        evidences: {
          include: {
            task: true,
            event: true,
            exam: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ success: true, notices });
  } catch (error) {
    console.error("Error in GET /api/notices:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notices" },
      { status: 500 }
    );
  }
}
