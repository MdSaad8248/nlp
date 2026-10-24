import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  messageCount: number;
}

export class ChatService {
  public static async getOrCreateUser(): Promise<string> {
    const session = getCurrentSession();
    let user = await prisma.user.findFirst({
      where: { rollNumber: session.rollNumber },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.email,
          name: session.name,
          rollNumber: session.rollNumber,
          program: session.program,
          semester: session.semester,
        },
      });
    }

    return user.id;
  }

  public static async listSessions(): Promise<ChatSessionSummary[]> {
    const userId = await this.getOrCreateUser();
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      lastMessage: s.messages[0]?.content || "New conversation",
      messageCount: s._count.messages,
    }));
  }

  public static async createSession(title?: string): Promise<{ id: string; title: string }> {
    const userId = await this.getOrCreateUser();
    const newSession = await prisma.chatSession.create({
      data: {
        userId,
        title: title || "New Consultation",
      },
    });

    // Add initial welcoming message
    await prisma.chatMessage.create({
      data: {
        sessionId: newSession.id,
        role: "assistant",
        content: "Hello! I am your AcademicAI Assistant. I am directly connected to your syllabus, course deliverables, exam dates, and official notices. What would you like to check?",
      },
    });

    return { id: newSession.id, title: newSession.title };
  }

  public static async renameSession(sessionId: string, newTitle: string): Promise<boolean> {
    try {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: newTitle.trim() },
      });
      return true;
    } catch {
      return false;
    }
  }

  public static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await prisma.chatSession.delete({
        where: { id: sessionId },
      });
      return true;
    } catch {
      return false;
    }
  }

  public static async getSessionMessages(sessionId: string) {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) return null;

    return {
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt.toISOString(),
      },
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : undefined,
        citations: m.citations ? JSON.parse(m.citations) : undefined,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  public static async saveMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    toolCalls?: any,
    citations?: any
  ) {
    const msg = await prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        toolCalls: toolCalls ? JSON.stringify(toolCalls) : null,
        citations: citations ? JSON.stringify(citations) : null,
      },
    });

    // Touch session updatedAt
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return msg;
  }
}
