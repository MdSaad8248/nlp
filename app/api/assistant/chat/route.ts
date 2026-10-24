import { NextRequest } from "next/server";
import { AssistantEngine } from "@/lib/ai/assistant-engine";
import { ChatService } from "@/lib/services/chat.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let conversationId = body.conversationId;
    const message = body.message;

    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If conversationId is absent, create a new session
    if (!conversationId) {
      const created = await ChatService.createSession(message.slice(0, 30));
      conversationId = created.id;
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        // Notify client of conversationId
        sendEvent("session", { conversationId });

        // Stream assistant processing
        try {
          await AssistantEngine.processMessage(conversationId, message, {
            onToolStart: (toolName, label) => {
              sendEvent("tool_start", { toolName, label });
            },
            onToolResult: (toolName, result) => {
              sendEvent("tool_result", { toolName, result });
            },
            onToken: (token) => {
              sendEvent("token", { text: token });
            },
            onCard: (cardType, cardData) => {
              sendEvent("card", { type: cardType, data: cardData });
            },
            onDone: (fullText) => {
              sendEvent("done", { fullText, conversationId });
              controller.close();
            },
            onError: (err) => {
              sendEvent("error", { error: err });
              controller.close();
            },
          });
        } catch (engineError: any) {
          console.error("[ChatAPI] Error processing message:", engineError);
          sendEvent("token", { text: `\n\n*[Error: ${engineError.message || "Unable to complete request"}]*` });
          sendEvent("done", { conversationId });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("[ChatAPI] Route error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
