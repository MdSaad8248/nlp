import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    // Ping SQLite database
    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: "healthy",
      service: "AcademicAI Platform",
      milestone: "Milestone 1: Project Foundation",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        type: "sqlite",
        users: userCount,
      },
      nlpEngine: {
        status: "pending_milestone_3",
        note: "NLP pipeline scheduled for incremental implementation in Milestone 3+",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown database error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
