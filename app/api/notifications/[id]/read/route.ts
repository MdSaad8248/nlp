import { NextRequest, NextResponse } from "next/server";
import { markNotificationAsRead } from "@/lib/intelligence";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await markNotificationAsRead(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Notification not found or update failed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
