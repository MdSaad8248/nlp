import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        course: true,
        evidences: {
          include: {
            source: {
              select: { id: true, title: true, createdAt: true },
            },
          },
        },
        progress: {
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: [
        { priority: "desc" },
        { deadline: "asc" },
      ],
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("Error in GET /api/tasks:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
