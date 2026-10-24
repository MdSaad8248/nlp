import { NextRequest, NextResponse } from "next/server";
import { getFullAcademicState } from "@/lib/intelligence";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const nowParam = searchParams.get("now");
    const now = nowParam ? new Date(nowParam) : new Date();

    const state = await getFullAcademicState(userId, now);
    return NextResponse.json({
      success: true,
      data: {
        workload: state.workload,
        observations: state.observations,
        stats: state.stats,
      },
    });
  } catch (error) {
    console.error("Error fetching academic workload intelligence:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compute workload intelligence" },
      { status: 500 }
    );
  }
}
