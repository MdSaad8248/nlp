import { NextRequest, NextResponse } from "next/server";
import { getFullAcademicState, calculateAcademicPriority, PriorityEvaluationInput } from "@/lib/intelligence";

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
        rankedAttentionItems: state.rankedAttentionItems,
        recommendation: state.recommendation,
        stats: state.stats,
      },
    });
  } catch (error) {
    console.error("Error fetching academic priority ranking:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compute priority ranking" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: PriorityEvaluationInput = await req.json();
    const result = calculateAcademicPriority(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error evaluating academic priority:", error);
    return NextResponse.json(
      { success: false, error: "Failed to evaluate academic priority" },
      { status: 400 }
    );
  }
}
