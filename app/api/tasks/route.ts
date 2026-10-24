import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session-service";
import { ensureDefaultUserAndCourses } from "@/lib/services/user.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    let userId: string;

    if (user) {
      userId = user.id;
    } else {
      const defaultData = await ensureDefaultUserAndCourses();
      userId = defaultData.userId;
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId,
      },
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
