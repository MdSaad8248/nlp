import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/services/dashboard.service";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("Error in GET /api/dashboard:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
