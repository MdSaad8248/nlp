import { NextRequest, NextResponse } from "next/server";
import { dismissNotification } from "@/lib/intelligence";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await dismissNotification(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Notification not found or dismiss failed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dismiss notification" },
      { status: 500 }
    );
  }
}
