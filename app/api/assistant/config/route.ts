import { NextResponse } from "next/server";
import { AssistantEngine } from "@/lib/ai/assistant-engine";

export async function GET() {
  const info = AssistantEngine.getActiveProviderInfo();
  return NextResponse.json({
    success: true,
    provider: info.provider,
    model: info.model,
    isConfigured: info.isConfigured,
    hasApiKey: !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY,
    requiredEnvVar: "GEMINI_API_KEY",
  });
}
