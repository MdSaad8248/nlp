"use client";

import { useState, useEffect, useRef } from "react";
import Shell from "@/components/layout/Shell";
import {
  Bot,
  Send,
  Sparkles,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  User,
  Square,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Quote,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";
import { getCurrentSession } from "@/lib/auth/session";

interface ConfirmAction {
  toolName: string;
  label: string;
  args: Record<string, any>;
  confirmPayload: string;
  previewText: string;
}

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: any[];
  citations?: any[];
  isStreaming?: boolean;
  pendingAction?: ConfirmAction;
}

interface ChatSessionItem {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

interface ConfigStatus {
  provider: string;
  model: string;
  isConfigured: boolean;
  hasApiKey: boolean;
  requiredEnvVar: string;
}

const SUGGESTED_PROMPTS = [
  "What should I finish first?",
  "What is due this week?",
  "What changed recently?",
  "Show my workload",
  "When is my next exam?",
  "Create a reminder",
];

export default function AssistantPage() {
  const session = getCurrentSession();
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTool, setActiveTool] = useState<{ toolName: string; label: string } | null>(null);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sourceDrawerData, setSourceDrawerData] = useState<{ snippet: string; title: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load config and sessions on mount
  useEffect(() => {
    fetchConfig();
    fetchSessions();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/assistant/config");
      const data = await res.json();
      if (data.success) {
        setConfig(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/assistant/sessions");
      const data = await res.json();
      if (data.success && data.sessions) {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !activeSessionId) {
          selectSession(data.sessions[0].id);
        } else if (data.sessions.length === 0) {
          handleNewChat();
        }
      }
    } catch {
      // ignore
    }
  };

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const res = await fetch(`/api/assistant/sessions/${sessionId}`);
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch {
      // ignore
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/assistant/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Academic Consultation" }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setSessions((prev) => [
          {
            id: data.session.id,
            title: data.session.title,
            updatedAt: new Date().toISOString(),
            messageCount: 1,
          },
          ...prev,
        ]);
        selectSession(data.session.id);
      }
    } catch {
      // ignore
    }
  };

  const handleRenameSession = async (sessionId: string) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`/api/assistant/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: editTitle } : s))
      );
      setEditingSessionId(null);
    } catch {
      // ignore
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/assistant/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          selectSession(remaining[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch {
      // ignore
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTool]);

  // Send message with streaming
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || isGenerating) return;

    setInputMessage("");

    // Optimistically add user message
    const tempUserMsg: ChatMessageItem = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: query,
    };

    // Placeholder for streaming assistant response
    const tempAssistantMsgId = `temp-asst-${Date.now()}`;
    const tempAssistantMsg: ChatMessageItem = {
      id: tempAssistantMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsGenerating(true);
    setActiveTool(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeSessionId,
          message: query,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;
          const eventMatch = block.match(/^event:\s*(\w+)/);
          const dataMatch = block.match(/data:\s*(.*)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            try {
              const data = JSON.parse(dataMatch[1]);

              if (eventType === "session" && data.conversationId) {
                if (!activeSessionId) setActiveSessionId(data.conversationId);
              } else if (eventType === "tool_start") {
                setActiveTool({ toolName: data.toolName, label: data.label });
              } else if (eventType === "tool_result") {
                setActiveTool(null);
              } else if (eventType === "token") {
                accumulatedText += data.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAssistantMsgId
                      ? { ...m, content: accumulatedText, isStreaming: true }
                      : m
                  )
                );
              } else if (eventType === "card" && data.type === "confirm_action") {
                // Confirmation card for mutation actions
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAssistantMsgId
                      ? { ...m, isStreaming: false, pendingAction: data.data as ConfirmAction }
                      : m
                  )
                );
              } else if (eventType === "done") {
                setActiveTool(null);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAssistantMsgId
                      ? { ...m, content: data.fullText || accumulatedText, isStreaming: false }
                      : m
                  )
                );
                fetchSessions();
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantMsgId
              ? {
                  ...m,
                  content: "Sorry, I encountered an issue reaching the assistant service. Please check your connection and try again.",
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsGenerating(false);
      setActiveTool(null);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setActiveTool(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Simple clean markdown parser to avoid raw formatting text
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} style={{ fontSize: "1rem", fontWeight: 700, margin: "0.6rem 0 0.3rem 0", color: "var(--text-primary)" }}>
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={idx} style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0.75rem 0 0.4rem 0", color: "var(--text-primary)" }}>
            {line.replace("## ", "")}
          </h2>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={idx}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-xs)",
              background: "rgba(99, 102, 241, 0.08)",
              borderLeft: "3px solid var(--accent-primary)",
              fontStyle: "italic",
              margin: "0.4rem 0",
              fontSize: "0.82rem",
            }}
          >
            {line.replace("> ", "")}
          </blockquote>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={idx} style={{ marginLeft: "1.25rem", margin: "0.2rem 0", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
            {parseInlineMarkdown(line.replace("- ", ""))}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} style={{ height: "0.35rem" }} />;
      }
      return (
        <p key={idx} style={{ margin: "0.25rem 0", fontSize: "0.85rem", lineHeight: 1.55, color: "var(--text-primary)" }}>
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  const parseInlineMarkdown = (text: string) => {
    // Bold **text**
    const parts = text.split(/(\*\*.*?\*\*|\`.*?\`)/);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ color: "var(--text-primary)" }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              padding: "0.1rem 0.35rem",
              borderRadius: "3px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              color: "#a5b4fc",
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <Shell>
      {/* Top Header */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
                AcademicAI Assistant
              </h1>
              <span className="badge badge-indigo">
                {config?.provider || "AI Workspace"}
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
              Grounded AI workspace for syllabus deliverables, calendar intelligence, and notice verification.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                fontSize: "0.72rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "var(--radius-xs)",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              Model: <strong style={{ color: "var(--text-primary)" }}>{config?.model || "auto"}</strong>
            </div>

            <button
              type="button"
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              className="btn btn-outline btn-sm"
              title="Provider configuration status"
            >
              <Info size={13} />
              <span>Config</span>
            </button>
          </div>
        </div>

        {/* Configuration Status Banner (Honest state if API key not present) */}
        {!config?.hasApiKey && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.65rem 0.9rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={14} style={{ color: "var(--accent-primary)" }} />
              <span>
                <strong>LLM integration implemented (awaiting GEMINI_API_KEY configuration).</strong> Operating in grounded database reasoning mode.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-primary)",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              {showConfigHelp ? "Hide help" : "Setup guide →"}
            </button>
          </div>
        )}

        {/* Expandable Setup Help Panel */}
        {showConfigHelp && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.78rem",
              lineHeight: 1.5,
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
              How to configure your real Gemini API key:
            </div>
            <ol style={{ marginLeft: "1.2rem" }}>
              <li>Open your project root in terminal.</li>
              <li>Add your key to <code style={{ color: "#a5b4fc" }}>.env.local</code>:
                <pre style={{ margin: "0.3rem 0", padding: "0.4rem 0.6rem", background: "var(--bg-app)", borderRadius: "var(--radius-xs)", fontFamily: "var(--font-mono)" }}>
                  GEMINI_API_KEY=&quot;your-gemini-api-key-here&quot;{`\n`}AI_MODEL=&quot;gemini-1.5-flash&quot;
                </pre>
              </li>
              <li>Restart dev server (<code style={{ color: "#a5b4fc" }}>npm run dev</code>). The assistant will automatically activate full multi-turn streaming LLM generation with server-side tool calling!</li>
            </ol>
          </div>
        )}
      </div>

      {/* ChatGPT-like Workspace Layout (Sidebar + Main Chat) */}
      <div className="assistant-workspace">
        {/* LEFT: Conversation History Sidebar */}
        <div className="assistant-sidebar">
          <div className="assistant-sidebar-header">
            <button
              type="button"
              onClick={handleNewChat}
              className="btn btn-secondary btn-sm"
              style={{ width: "100%", justifyContent: "center", gap: "0.4rem" }}
            >
              <Plus size={14} />
              <span>New conversation</span>
            </button>
          </div>

          <div className="assistant-session-list">
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", padding: "0.4rem 0.5rem", letterSpacing: "0.04em" }}>
              History ({sessions.length})
            </div>

            {sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              const isEditing = editingSessionId === s.id;

              return (
                <div
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={`session-item ${isActive ? "active" : ""}`}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleRenameSession(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSession(s.id);
                        if (e.key === "Escape") setEditingSessionId(null);
                      }}
                      autoFocus
                      style={{
                        background: "var(--bg-app)",
                        border: "1px solid var(--accent-primary)",
                        color: "var(--text-primary)",
                        padding: "0.15rem 0.35rem",
                        borderRadius: "2px",
                        fontSize: "0.78rem",
                        width: "100%",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "160px",
                      }}
                    >
                      {s.title}
                    </span>
                  )}

                  <div className="session-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSessionId(s.id);
                        setEditTitle(s.title);
                      }}
                      title="Rename"
                      style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      title="Delete"
                      style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN: Chat Workspace */}
        <div className="assistant-chat-pane">
          {/* Top Session Header */}
          <div className="assistant-chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "var(--radius-xs)",
                  background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <Bot size={14} />
              </div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {sessions.find((s) => s.id === activeSessionId)?.title || "Academic Consultation"}
                </div>
              </div>
            </div>

            <span className="badge badge-low" style={{ fontSize: "0.68rem" }}>
              Grounded Database
            </span>
          </div>

          {/* Messages Container */}
          <div className="assistant-messages-container">
            {messages.map((m) => {
              const isUser = m.role === "user";

              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: isUser ? "75%" : "85%",
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "var(--accent-subtle)",
                        color: "var(--accent-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <Bot size={15} />
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%" }}>
                    <div
                      style={{
                        padding: "0.85rem 1.15rem",
                        borderRadius: "var(--radius-md)",
                        background: isUser ? "var(--accent-primary)" : "var(--bg-surface-elevated)",
                        color: isUser ? "white" : "var(--text-primary)",
                        border: `1px solid ${isUser ? "transparent" : "var(--border-subtle)"}`,
                        position: "relative",
                      }}
                    >
                      {renderFormattedContent(m.content)}

                      {/* Assistant Streaming Cursor */}
                      {m.isStreaming && (
                        <span
                          style={{
                            display: "inline-block",
                            width: "6px",
                            height: "14px",
                            background: "var(--accent-primary)",
                            marginLeft: "4px",
                            verticalAlign: "middle",
                            animation: "pulse 1s infinite",
                          }}
                        />
                      )}

                      {/* Confirm Action Card (safe mutation gate) */}
                      {m.pendingAction && (
                        <div
                          style={{
                            marginTop: "0.85rem",
                            padding: "0.85rem 1rem",
                            borderRadius: "var(--radius-sm)",
                            background: "rgba(239, 146, 58, 0.08)",
                            border: "1px solid rgba(239, 146, 58, 0.35)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                            <AlertTriangle size={14} style={{ color: "#f59e0b" }} />
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f59e0b" }}>
                              Action requires your confirmation
                            </span>
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                            <strong>{m.pendingAction.label}</strong>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              type="button"
                              id={`confirm-action-${m.id}`}
                              onClick={() => {
                                setMessages((prev) => prev.map((msg) => msg.id === m.id ? { ...msg, pendingAction: undefined, content: msg.content + "\n\n*Action confirmed and sent.*" } : msg));
                                handleSendMessage(m.pendingAction!.confirmPayload);
                              }}
                              style={{
                                padding: "0.35rem 0.85rem",
                                borderRadius: "var(--radius-xs)",
                                background: "#16a34a",
                                color: "white",
                                border: "none",
                                fontWeight: 600,
                                fontSize: "0.78rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <CheckCircle2 size={13} />
                              Confirm
                            </button>
                            <button
                              type="button"
                              id={`cancel-action-${m.id}`}
                              onClick={() => {
                                setMessages((prev) => prev.map((msg) => msg.id === m.id ? { ...msg, pendingAction: undefined, content: msg.content + "\n\n*Action cancelled.*" } : msg));
                              }}
                              style={{
                                padding: "0.35rem 0.85rem",
                                borderRadius: "var(--radius-xs)",
                                background: "var(--bg-app)",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border-subtle)",
                                fontWeight: 600,
                                fontSize: "0.78rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <X size={13} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons on message */}
                    {!isUser && m.content && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingLeft: "0.2rem" }}>
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.content)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check size={11} style={{ color: "var(--priority-low)" }} />
                              <span style={{ color: "var(--priority-low)" }}>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendMessage("Explain why this is prioritized.")}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Quote size={11} />
                          <span>Source evidence</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Subtle Tool Call Indicator while searching database */}
            {activeTool && (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", alignSelf: "flex-start" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-primary)",
                  }}
                >
                  <RefreshCw size={13} className="spin" />
                </div>
                <div className="tool-indicator-banner">
                  <Sparkles size={12} />
                  <span>{activeTool.label}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompt Chips */}
          <div style={{ padding: "0.4rem 1.25rem", display: "flex", gap: "0.4rem", flexWrap: "wrap", borderTop: "1px solid var(--border-subtle)" }}>
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                disabled={isGenerating}
                onClick={() => handleSendMessage(prompt)}
                className="btn btn-outline btn-sm"
                style={{ fontSize: "0.74rem", borderRadius: "9999px", padding: "0.25rem 0.65rem" }}
              >
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* BOTTOM: Sticky Composer */}
          <div className="assistant-composer-wrapper">
            <div className="composer-box">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about deadlines, course commitments, exams, or say 'mark NLP project as completed'..."
                rows={2}
                className="composer-textarea"
              />

              <div className="composer-toolbar">
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Enter to send &bull; Shift+Enter for new line
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="btn btn-sm"
                      style={{ background: "var(--priority-critical-bg)", color: "var(--priority-critical)", border: "1px solid var(--priority-critical-border)" }}
                    >
                      <Square size={13} />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!inputMessage.trim()}
                      onClick={() => handleSendMessage()}
                      className="btn btn-primary btn-sm"
                      style={{ padding: "0.35rem 0.75rem" }}
                    >
                      <Send size={13} />
                      <span>Send</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
