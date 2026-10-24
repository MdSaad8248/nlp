import { NextRequest, NextResponse } from "next/server";
import {
  getStudentNotifications,
  syncAdaptiveNotifications,
} from "@/lib/intelligence";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const shouldSync = searchParams.get("sync") === "true";

    if (shouldSync) {
      const nowParam = searchParams.get("now");
      const now = nowParam ? new Date(nowParam) : new Date();
      await syncAdaptiveNotifications(userId, now);
    }

    const data = await getStudentNotifications(userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching student notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch student notifications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || undefined;
    const now = body.now ? new Date(body.now) : new Date();

    const result = await syncAdaptiveNotifications(userId, now);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error syncing adaptive notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync notifications" },
      { status: 500 }
    );
  }
}
