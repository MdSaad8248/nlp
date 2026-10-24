import { NextRequest, NextResponse } from "next/server";
import { markAllNotificationsAsRead } from "@/lib/intelligence";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || undefined;

    const count = await markAllNotificationsAsRead(userId);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark all as read" },
      { status: 500 }
    );
  }
}
