import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/lib/services/chat.service";

export async function GET() {
  try {
    const sessions = await ChatService.listSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const newSession = await ChatService.createSession(body.title);
    return NextResponse.json({ success: true, session: newSession });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
