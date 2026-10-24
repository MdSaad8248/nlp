import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: {
        course: true,
        evidences: {
          include: {
            source: {
              select: { id: true, title: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("Error in GET /api/events:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch events" },
      { status: 500 }
    );
  }
}
