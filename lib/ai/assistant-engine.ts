import { ACADEMIC_TOOLS, AcademicToolsService } from "@/lib/services/academic-tools.service";
import { ChatService } from "@/lib/services/chat.service";
import { getCurrentSession } from "@/lib/auth/session";
import { RubricStore } from "@/lib/intelligence/rubric-store";

export interface StreamCallbacks {
  onToolStart?: (toolName: string, label: string) => Promise<void> | void;
  onToolResult?: (toolName: string, result: any) => Promise<void> | void;
  onToken?: (token: string) => Promise<void> | void;
  onCard?: (cardType: string, cardData: any) => Promise<void> | void;
  onDone?: (fullText: string, metadata?: any) => Promise<void> | void;
  onError?: (error: string) => Promise<void> | void;
}

/** Prefix used for confirmed action execution from the UI */
const CONFIRM_PREFIX = "__CONFIRM__:";

export class AssistantEngine {
  private static getGeminiConfig() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    const model = process.env.AI_MODEL || "gemini-1.5-flash";
    const isConfigured = !!apiKey && apiKey.trim().length > 0;
    return { apiKey, model, isConfigured };
  }

  private static getOpenAIConfig() {
    const apiKey = process.env.OPENAI_API_KEY || "";
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    const isConfigured = !!apiKey && apiKey.trim().length > 0;
    return { apiKey, model, isConfigured };
  }

  public static isLLMConfigured(): boolean {
    const gemini = this.getGeminiConfig();
    const openai = this.getOpenAIConfig();
    const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();

    if (provider === "gemini") return gemini.isConfigured;
    if (provider === "openai") return openai.isConfigured;
    return gemini.isConfigured || openai.isConfigured;
  }

  public static getActiveProviderInfo() {
    const gemini = this.getGeminiConfig();
    const openai = this.getOpenAIConfig();
    const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();

    if (provider === "gemini" || (provider === "auto" && gemini.isConfigured)) {
      return {
        provider: "Google Gemini",
        model: gemini.model,
        isConfigured: gemini.isConfigured,
      };
    }

    if (provider === "openai" || (provider === "auto" && openai.isConfigured)) {
      return {
        provider: "OpenAI GPT",
        model: openai.model,
        isConfigured: openai.isConfigured,
      };
    }

    return {
      provider: "Grounded Academic Engine (Deterministic Fallback)",
      model: "Local SQLite + Rule-Based Proximity",
      isConfigured: false,
    };
  }

  /**
   * Main conversation turn orchestrator with streaming and tool calling.
   * Handles the special __CONFIRM__:{toolName}:{base64args} protocol for
   * safe action/mutation confirmation before execution.
   */
  public static async processMessage(
    sessionId: string,
    userMessage: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    // ─── Safe Action Confirmation Protocol ────────────────────────────────────
    // When the UI user confirms a pending action, the client sends:
    //   __CONFIRM__:{toolName}:{base64-encoded JSON args}
    // We extract and execute the action directly without re-routing through LLM.
    if (userMessage.startsWith(CONFIRM_PREFIX)) {
      await this.handleConfirmedAction(sessionId, userMessage, callbacks);
      return;
    }

    // Persist user message to session memory
    await ChatService.saveMessage(sessionId, "user", userMessage);

    // Fetch recent conversation history for multi-turn context
    const historyData = await ChatService.getSessionMessages(sessionId);
    const messagesHistory = historyData?.messages || [];

    const llmConfig = this.getGeminiConfig();
    const isOpenAI = (process.env.AI_PROVIDER || "").toLowerCase() === "openai";
    const openAIConfig = this.getOpenAIConfig();

    // If LLM is configured, run full tool-calling LLM loop
    if (llmConfig.isConfigured || openAIConfig.isConfigured) {
      try {
        if (isOpenAI && openAIConfig.isConfigured) {
          await this.runOpenAILoop(sessionId, userMessage, messagesHistory, callbacks, openAIConfig);
        } else if (llmConfig.isConfigured) {
          await this.runGeminiLoop(sessionId, userMessage, messagesHistory, callbacks, llmConfig);
        }
        return;
      } catch (err: any) {
        console.warn("[AssistantEngine] LLM invocation failed, falling back to deterministic grounder:", err);
        callbacks.onToken?.("\n\n*[Notice: LLM API returned an error — falling back to grounded database queries.]*\n\n");
      }
    }

    // DETERMINISTIC ACADEMIC FALLBACK (When no LLM API key is configured, or on error)
    await this.runDeterministicGroundedEngine(sessionId, userMessage, messagesHistory, callbacks);
  }

  /**
   * Handles a confirmed action from the client side.
   * Decodes the toolName and args from the confirmation payload and executes the action.
   */
  private static async handleConfirmedAction(
    sessionId: string,
    rawMessage: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      // Format: __CONFIRM__:{toolName}:{base64EncodedArgs}
      const withoutPrefix = rawMessage.slice(CONFIRM_PREFIX.length);
      const colonIdx = withoutPrefix.indexOf(":");
      const toolName = colonIdx === -1 ? withoutPrefix : withoutPrefix.slice(0, colonIdx);
      const argsBase64 = colonIdx === -1 ? "{}" : withoutPrefix.slice(colonIdx + 1);
      const args = JSON.parse(Buffer.from(argsBase64, "base64url").toString("utf-8"));

      // Persist hidden system message to track confirmation in history
      await ChatService.saveMessage(sessionId, "user", `[Confirmed action: ${toolName}]`);

      callbacks.onToolStart?.(toolName, this.getToolLabel(toolName));
      const result = await AcademicToolsService.executeTool(toolName, args);
      callbacks.onToolResult?.(toolName, result);

      const toolCallsMade = [{ tool: toolName, args, result }];

      let responseText: string;
      if (result.success) {
        responseText = this.buildActionSuccessMessage(toolName, result);
      } else {
        responseText = `⚠️ **Action could not be completed.**\n\n${result.message || "An unexpected error occurred. Please try again."}`;
      }

      await this.streamTextProgressively(responseText, callbacks);
      await ChatService.saveMessage(sessionId, "assistant", responseText, toolCallsMade);
      callbacks.onDone?.(responseText);
    } catch (err: any) {
      const errText = `⚠️ **Failed to execute action:** ${err.message}`;
      callbacks.onToken?.(errText);
      callbacks.onDone?.(errText);
    }
  }

  /**
   * Gemini multi-turn tool-calling loop (up to 4 tool turns).
   * For action/mutation tools: emits a confirm_action card instead of executing.
   */
  private static async runGeminiLoop(
    sessionId: string,
    userMessage: string,
    history: any[],
    callbacks: StreamCallbacks,
    config: { apiKey: string; model: string }
  ) {
    const session = getCurrentSession();
    const systemPrompt = `You are AcademicAI Assistant, a specialized, calm, highly competent AI academic advisor for ${session.name} (Roll No: ${session.rollNumber}, ${session.program}).
You have access to tools to query and modify the student's actual database (tasks, courses, deadlines, exams, workload, and circular notices).
CRITICAL RULES:
1. Always call the appropriate tool when asked about deadlines, priorities, assignments, exams, notices, or workload. NEVER invent or guess dates, tasks, or course names.
2. If the user asks what to do first, call 'get_priority_tasks'. Explain clearly why the first item is prioritized (strict submission clauses, proximity).
3. For write/mutation actions (create_task, update_task, mark_task_completed, create_reminder, update_event): call the tool normally and the system will handle safe confirmation.
4. Keep answers concise, articulate, and cleanly formatted using Markdown.
5. Always ground your answers in the tool data returned. Do not embellish or invent.`;

    const functionDeclarations = ACADEMIC_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: "OBJECT",
        properties: t.parameters.properties,
        required: t.parameters.required || [],
      },
    }));

    // Build contents array from history (last 6 turns)
    const contents: any[] = [];
    const recent = history.slice(-7, -1);
    for (const h of recent) {
      if (h.role === "user" || h.role === "assistant") {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        });
      }
    }
    contents.push({ role: "user", parts: [{ text: userMessage }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    let toolCallsMade: any[] = [];
    let assistantText = "";
    let iterationContents = [...contents];

    // ── Multi-turn tool calling loop (up to 4 tool turns) ──────────────────────
    for (let turn = 0; turn < 4; turn++) {
      const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: iterationContents,
        tools: [{ functionDeclarations }],
        generationConfig: { temperature: 0.2 },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      const functionCallPart = parts.find((p: any) => p.functionCall);

      if (!functionCallPart) {
        // Model returned a text response — we're done
        assistantText = parts.map((p: any) => p.text || "").join("");
        break;
      }

      const fn = functionCallPart.functionCall;
      const toolName = fn.name;
      const args = fn.args || {};

      // ── Action confirmation gate ──────────────────────────────────────────────
      const toolDef = ACADEMIC_TOOLS.find((t) => t.name === toolName);
      if (toolDef?.isAction) {
        // Build a preview summary and emit confirmation card instead of executing
        const previewText = this.buildActionPreviewText(toolName, args);
        callbacks.onToken?.(previewText);

        const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64url");
        callbacks.onCard?.("confirm_action", {
          toolName,
          label: this.getToolLabel(toolName),
          args,
          confirmPayload: `${CONFIRM_PREFIX}${toolName}:${argsBase64}`,
          previewText,
        });

        const confirmationMsg = previewText;
        await ChatService.saveMessage(sessionId, "assistant", confirmationMsg, toolCallsMade);
        callbacks.onDone?.(confirmationMsg, { pendingAction: { toolName, args } });
        return;
      }

      // ── Non-action tool: execute and loop ─────────────────────────────────────
      callbacks.onToolStart?.(toolName, this.getToolLabel(toolName));
      const toolResult = await AcademicToolsService.executeTool(toolName, args);
      callbacks.onToolResult?.(toolName, toolResult);
      toolCallsMade.push({ tool: toolName, args, result: toolResult });

      // Append to conversation for next turn
      iterationContents = [
        ...iterationContents,
        { role: "model", parts: [{ functionCall: fn }] },
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: toolResult,
              },
            },
          ],
        },
      ];
    }

    // Stream the final text response
    await this.streamTextProgressively(assistantText, callbacks);
    await ChatService.saveMessage(sessionId, "assistant", assistantText, toolCallsMade);
    callbacks.onDone?.(assistantText);
  }

  /**
   * OpenAI / DeepSeek compatible execution loop with action confirmation.
   */
  private static async runOpenAILoop(
    sessionId: string,
    userMessage: string,
    history: any[],
    callbacks: StreamCallbacks,
    config: { apiKey: string; model: string }
  ) {
    const session = getCurrentSession();
    const systemPrompt = `You are AcademicAI Assistant for student ${session.name} (${session.rollNumber}).
Use the provided tools to query real syllabus tasks, courses, deadlines, and circulars. Never invent dates or tasks.
For write actions, the system handles safe confirmation — call the tool normally.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: userMessage },
    ];

    const tools = ACADEMIC_TOOLS.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        tools,
        temperature: 0.2,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    let assistantText = msg?.content || "";
    let toolCallsMade: any[] = [];

    if (msg?.tool_calls?.length > 0) {
      const call = msg.tool_calls[0];
      const toolName = call.function.name;
      const args = JSON.parse(call.function.arguments || "{}");

      const toolDef = ACADEMIC_TOOLS.find((t) => t.name === toolName);
      if (toolDef?.isAction) {
        const previewText = this.buildActionPreviewText(toolName, args);
        callbacks.onToken?.(previewText);
        const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64url");
        callbacks.onCard?.("confirm_action", {
          toolName,
          label: this.getToolLabel(toolName),
          args,
          confirmPayload: `${CONFIRM_PREFIX}${toolName}:${argsBase64}`,
          previewText,
        });
        await ChatService.saveMessage(sessionId, "assistant", previewText, toolCallsMade);
        callbacks.onDone?.(previewText, { pendingAction: { toolName, args } });
        return;
      }

      callbacks.onToolStart?.(toolName, this.getToolLabel(toolName));
      const toolResult = await AcademicToolsService.executeTool(toolName, args);
      callbacks.onToolResult?.(toolName, toolResult);
      toolCallsMade.push({ tool: toolName, args, result: toolResult });

      assistantText = toolResult.message || `Retrieved information from ${toolName}.`;
    }

    await this.streamTextProgressively(assistantText, callbacks);
    await ChatService.saveMessage(sessionId, "assistant", assistantText, toolCallsMade);
    callbacks.onDone?.(assistantText);
  }

  /**
   * Deterministic Grounded Academic Engine.
   * Activated when no LLM API key is configured, or as a fallback.
   * Evaluates intent via keyword routing, calls typed DB tools, streams grounded real responses.
   */
  private static async runDeterministicGroundedEngine(
    sessionId: string,
    userMessage: string,
    history: any[],
    callbacks: StreamCallbacks
  ) {
    const lower = userMessage.toLowerCase().trim();
    let assistantText = "";
    let toolCallsMade: any[] = [];

    // ── Confirmation detection in deterministic mode ──────────────────────────
    // (already handled at top-level but kept for completeness)

    // ── Check for academic search ────────────────────────────────────────────
    const searchMatch = lower.match(/search\s+(?:for\s+)?(.+)/i) ||
      lower.match(/find\s+(.+)/i) ||
      lower.match(/look\s+up\s+(.+)/i);

    if (searchMatch) {
      const query = searchMatch[1].trim();
      callbacks.onToolStart?.("search_academic_information", "Searching academic records...");
      const res = await AcademicToolsService.executeTool("search_academic_information", { query });
      callbacks.onToolResult?.("search_academic_information", res);
      toolCallsMade.push({ tool: "search_academic_information", args: { query }, result: res });

      const { tasks, courses, notices } = res.data || {};
      assistantText = `### SEARCH RESULTS FOR: "${query}"\n\n`;
      if (tasks?.length > 0) {
        assistantText += `**Tasks (${tasks.length} found):**\n`;
        tasks.forEach((t: any) => {
          assistantText += `- **${t.title}** (${t.course || "GEN"}) — Due: ${t.deadline || "TBD"}\n`;
        });
        assistantText += "\n";
      }
      if (courses?.length > 0) {
        assistantText += `**Courses (${courses.length} found):**\n`;
        courses.forEach((c: any) => {
          assistantText += `- **${c.code}**: ${c.title} · Faculty: *${c.faculty || "N/A"}*\n`;
        });
        assistantText += "\n";
      }
      if (notices?.length > 0) {
        assistantText += `**Notices (${notices.length} found):**\n`;
        notices.forEach((n: any, i: number) => {
          assistantText += `${i + 1}. ${n.snippet}\n`;
        });
      }
      if (!tasks?.length && !courses?.length && !notices?.length) {
        assistantText += `No records found matching *"${query}"* in your academic database.`;
      }

    } else if (lower === "why" || lower.startsWith("why?") || lower.startsWith("why is") || lower.startsWith("explain")) {
      // Source evidence / explanation
      callbacks.onToolStart?.("get_source_evidence", "Inspecting circular evidence and priority factors...");
      const ev = await AcademicToolsService.executeTool("get_source_evidence", {});
      callbacks.onToolResult?.("get_source_evidence", ev);
      toolCallsMade.push({ tool: "get_source_evidence", result: ev });

      callbacks.onToolStart?.("get_priority_tasks", "Re-evaluating priority rationale...");
      const pt = await AcademicToolsService.executeTool("get_priority_tasks", {});
      callbacks.onToolResult?.("get_priority_tasks", pt);
      toolCallsMade.push({ tool: "get_priority_tasks", result: pt });

      const topTask = pt.data?.[0];
      const evidence = ev.data;

      assistantText = `### WHY THIS IS YOUR TOP PRIORITY\n\n`;
      if (topTask) {
        assistantText += `**${topTask.title}** (${topTask.courseCode}) is ranked '${topTask.priority}' because:\n\n`;
        assistantText += `1. **Deadline Proximity:** Due on **${topTask.deadline}**\n`;
        if (topTask.reason) {
          assistantText += `2. **Policy Context:** ${topTask.reason}\n`;
        }
        if (evidence?.snippet) {
          assistantText += `3. **Source Evidence (verbatim):**\n   > *"${evidence.snippet}"*\n`;
        }
        if (evidence?.interpretation) {
          assistantText += `4. **Interpretation:** ${evidence.interpretation}\n`;
        }
      } else {
        assistantText += `No high-priority tasks currently found in the database. You appear to be on track!`;
      }

    } else if (lower.includes("finish first") || lower.includes("most urgent") || lower.includes("priority") || lower.includes("do first") || lower.includes("what should i")) {
      callbacks.onToolStart?.("get_priority_tasks", "Evaluating deadline proximity and priority rules...");
      const tasksRes = await AcademicToolsService.executeTool("get_priority_tasks", {});
      callbacks.onToolResult?.("get_priority_tasks", tasksRes);
      toolCallsMade.push({ tool: "get_priority_tasks", result: tasksRes });

      const items: any[] = tasksRes.data || [];
      assistantText = `### YOUR TOP PRIORITIES\n\n`;

      if (items.length === 0) {
        assistantText += `No pending high-priority tasks found — your academic slate appears clear for now.`;
      } else {
        items.slice(0, 5).forEach((item, idx) => {
          assistantText += `**${String(idx + 1).padStart(2, "0")}. ${item.title}**\n`;
          assistantText += `- **Course:** ${item.courseCode} · **Priority:** \`${item.priority}\`\n`;
          assistantText += `- **Deadline:** ${item.deadline}\n`;
          if (item.reason) assistantText += `- **Reason:** ${item.reason}\n`;
          assistantText += "\n";
        });
        const top = items[0];
        assistantText += `**Recommendation:** Focus on **${top.title}** first — it carries the highest urgency.`;
      }

    } else if (
      (lower.includes("due this week") ||
        lower.includes("deadlines") ||
        lower.includes("what is due") ||
        lower.includes("upcoming")) &&
      !lower.includes("exam") &&
      !lower.includes("cat") &&
      !lower.includes("fat") &&
      !lower.includes("test") &&
      !lower.includes("review")
    ) {
      callbacks.onToolStart?.("get_upcoming_tasks", "Querying upcoming syllabus deliverables...");
      const up = await AcademicToolsService.executeTool("get_upcoming_tasks", {});
      callbacks.onToolResult?.("get_upcoming_tasks", up);
      toolCallsMade.push({ tool: "get_upcoming_tasks", result: up });

      const items: any[] = up.data || [];
      assistantText = `### UPCOMING DELIVERABLES\n\n`;
      if (items.length === 0) {
        assistantText += `No active deliverables found in the database for this period.`;
      } else {
        items.forEach((item, idx) => {
          assistantText += `${idx + 1}. **${item.title}** (${item.courseCode})\n`;
          assistantText += `   - Priority: \`${item.priority}\` | Due: **${item.deadline}**\n`;
        });
      }

    } else if (lower.includes("today") && (lower.includes("plan") || lower.includes("schedule") || lower.includes("agenda"))) {
      callbacks.onToolStart?.("get_today_plan", "Building your recommended study schedule...");
      const plan = await AcademicToolsService.executeTool("get_today_plan", {});
      callbacks.onToolResult?.("get_today_plan", plan);
      toolCallsMade.push({ tool: "get_today_plan", result: plan });

      const data = plan.data;
      assistantText = `### TODAY'S RECOMMENDED PLAN (${data.date})\n\n`;
      assistantText += `**Focus Priority:** ${data.focus}\n\n`;
      if (data.recommendedBlocks?.length > 0) {
        assistantText += `**Time Blocks:**\n`;
        data.recommendedBlocks.forEach((b: any) => {
          assistantText += `- **${b.time}** · ${b.action} *(${b.durationMinutes} min)*\n`;
        });
      }

    } else if (lower.includes("changed") || lower.includes("recent change") || lower.includes("extension") || lower.includes("update")) {
      callbacks.onToolStart?.("get_recent_changes", "Checking audit log for circular changes...");
      const ch = await AcademicToolsService.executeTool("get_recent_changes", {});
      callbacks.onToolResult?.("get_recent_changes", ch);
      toolCallsMade.push({ tool: "get_recent_changes", result: ch });

      assistantText = `### RECENT ACADEMIC CHANGES\n\n`;

      const modifications = ch.data?.detectedModifications || [];
      if (modifications.length === 0) {
        assistantText += `No recent changes detected in the academic audit log.\n\n`;
      } else {
        modifications.forEach((mod: any) => {
          assistantText += `**${mod.type}:** ${mod.action}\n`;
          if (mod.changes?.length > 0) {
            mod.changes.forEach((c: any) => {
              assistantText += `- \`${c.field}\`: **${c.oldValue}** → **${c.newValue}** *(${c.reason || ""})*\n`;
            });
          }
          assistantText += "\n";
        });
      }

      const notices = ch.data?.recentNotices || [];
      if (notices.length > 0) {
        assistantText += `**Recent Notices Ingested:**\n`;
        notices.forEach((n: any) => {
          assistantText += `- **${n.title}** (${new Date(n.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}): ${n.snippet}\n`;
        });
      }

    } else if (lower.includes("workload") || lower.includes("pressure") || lower.includes("hours") || lower.includes("busy")) {
      callbacks.onToolStart?.("get_workload", "Calculating total estimated cognitive hours...");
      const wl = await AcademicToolsService.executeTool("get_workload", {});
      callbacks.onToolResult?.("get_workload", wl);
      toolCallsMade.push({ tool: "get_workload", result: wl });

      const data = wl.data;
      assistantText = `### ACADEMIC WORKLOAD SUMMARY\n\n`;
      assistantText += `- **Status:** **${data.level} PRESSURE**\n`;
      assistantText += `- **Total Estimated Effort:** **${data.totalEstimatedHours} hours** across ${data.activeTasks} active syllabus deliverables.\n`;
      assistantText += `- **Assessment:** ${data.riskSummary}\n`;
      if (data.breakdown?.length > 0) {
        assistantText += `\n**Breakdown:**\n`;
        data.breakdown.slice(0, 5).forEach((b: any) => {
          assistantText += `- ${b.title} (${b.course}) — ~${b.hours}h\n`;
        });
      }

    } else if (
      lower.includes("exam") ||
      lower.includes("cat") ||
      lower.includes("fat") ||
      lower.includes("test") ||
      lower.includes("assessment") ||
      lower.includes("review") ||
      lower.includes("when is")
    ) {
      callbacks.onToolStart?.("get_upcoming_events", "Querying exams and continuous assessments...");
      const evts = await AcademicToolsService.executeTool("get_upcoming_events", {});
      callbacks.onToolResult?.("get_upcoming_events", evts);
      toolCallsMade.push({ tool: "get_upcoming_events", result: evts });

      const exams: any[] = evts.data?.exams || [];
      const events: any[] = evts.data?.events || [];

      assistantText = `### UPCOMING ASSESSMENTS & EVENTS\n\n`;
      if (exams.length > 0) {
        assistantText += `**Exams:**\n`;
        exams.forEach((ex) => {
          assistantText += `- **${ex.title}** (${ex.course || "GEN"}) · ${new Date(ex.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${ex.time || "TBA"} — Venue: ${ex.venue || "TBA"}\n`;
        });
        assistantText += "\n";
      }
      if (events.length > 0) {
        assistantText += `**Scheduled Events:**\n`;
        events.slice(0, 4).forEach((ev) => {
          assistantText += `- **${ev.title}** (${ev.course || "GEN"}) · ${ev.type} — ${ev.venue || "TBA"}\n`;
        });
      }
      if (exams.length === 0 && events.length === 0) {
        assistantText += `No formal CAT, FAT, or special events currently scheduled in your academic calendar.`;
      }

    } else if (
      lower.includes("which module") ||
      lower.includes("what module") ||
      (lower.includes("module") && (lower.includes("project") || lower.includes("related") || lower.includes("topic") || lower.includes("cover"))) ||
      (lower.includes("syllabus") && (lower.includes("module") || lower.includes("topic") || lower.includes("assessment") || lower.includes("weightage") || lower.includes("breakdown") || lower.includes("unit")))
    ) {
      callbacks.onToolStart?.("query_syllabus", "Querying structured syllabus intelligence...");
      const sylRes = await AcademicToolsService.executeTool("query_syllabus", { query: userMessage });
      callbacks.onToolResult?.("query_syllabus", sylRes);
      toolCallsMade.push({ tool: "query_syllabus", result: sylRes });

      if (sylRes.success && sylRes.data?.matched) {
        assistantText = `### SYLLABUS INTELLIGENCE\n\n${sylRes.data.answer}`;
      } else {
        assistantText = `No specific syllabus module or topic match found for that query. You can check your enrolled courses or upload the full course syllabus.`;
      }

    } else if (
      lower.includes("rubric") ||
      lower.includes("requirement") ||
      lower.includes("criteria") ||
      (lower.includes("missing") && (lower.includes("project") || lower.includes("assignment") || lower.includes("nlp") || lower.includes("ml"))) ||
      (lower.includes("most marks") || lower.includes("highest marks") || lower.includes("highest weightage"))
    ) {
      if (lower.includes("finish first") || lower.includes("which requirement") || lower.includes("start with")) {
        callbacks.onToolStart?.("get_requirement_risks", "Auditing rubric requirements by marks and urgency...");
        const reqRisk = await AcademicToolsService.executeTool("get_requirement_risks", {});
        toolCallsMade.push({ tool: "get_requirement_risks", result: reqRisk });
        if (reqRisk.success && reqRisk.data?.length > 0) {
          const firstRubric = reqRisk.data[0];
          assistantText = `### RUBRIC REQUIREMENTS TO FINISH FIRST\n\n`;
          assistantText += `For **${firstRubric.rubricTitle}** (${firstRubric.courseCode}):\n\n`;
          if (firstRubric.recommendedFirst) {
            assistantText += `🎯 **Immediate Top Priority:** **${firstRubric.recommendedFirst.title}** (${firstRubric.recommendedFirst.marks} marks)\n`;
            assistantText += `   - Status: \`${firstRubric.recommendedFirst.status}\` · Mandatory: ${firstRubric.recommendedFirst.mandatory ? "Yes" : "No"}\n\n`;
          }
          assistantText += `**Remaining Incomplete Criteria (${firstRubric.incompleteCount} items · ${firstRubric.marksAtRisk} marks total):**\n`;
          firstRubric.incompleteItems.forEach((it: any) => {
            assistantText += `- **${it.title}** — ${it.marks ?? "—"} marks (${it.mandatory ? "Mandatory" : "Optional"})\n`;
          });
        } else {
          assistantText = `No incomplete rubric requirements found. All tracked criteria appear completed.`;
        }
      } else {
        callbacks.onToolStart?.("get_rubric_breakdown", "Retrieving structured rubric requirements and criteria...");
        const res = RubricStore.handleAssistantQuery(userMessage);
        toolCallsMade.push({ tool: "get_rubric_breakdown", result: res });
        assistantText = res.answer;
      }

    } else if (
      lower.includes("smart plan") ||
      lower.includes("work on tonight") ||
      lower.includes("study tonight") ||
      lower.includes("schedule tonight") ||
      (lower.includes("what should i") && (lower.includes("work on") || lower.includes("focus on") || lower.includes("do tonight")))
    ) {
      callbacks.onToolStart?.("get_smart_plan", "Generating smart academic study schedule...");
      const planRes = await AcademicToolsService.executeTool("get_smart_plan", {});
      callbacks.onToolResult?.("get_smart_plan", planRes);
      toolCallsMade.push({ tool: "get_smart_plan", result: planRes });

      if (planRes.success && planRes.data) {
        const plan = planRes.data;
        assistantText = `### SMART ACADEMIC PLAN (${plan.planDate})\n\n`;
        assistantText += `**Focus:** ${plan.focusHeadline}\n\n`;
        if (plan.sessions?.length > 0) {
          assistantText += `**Recommended Schedule:**\n\n`;
          plan.sessions.forEach((s: any) => {
            assistantText += `**${s.timeSlot}** · **${s.taskTitle}**\n`;
            assistantText += `  - Focus: *${s.moduleOrRequirementTitle}* (${s.marksAtStake ? `${s.marksAtStake} marks` : "Core topic"})\n`;
            assistantText += `  - Why now? ${s.whyNow.join("; ")}\n\n`;
          });
        } else {
          assistantText += `${plan.summary}\n`;
        }
      } else {
        assistantText = "Unable to compute smart study schedule from current academic state.";
      }

    } else if (
      lower.includes("overloaded") ||
      lower.includes("academic risk") ||
      lower.includes("risk radar") ||
      lower.includes("why is this week high risk") ||
      (lower.includes("what are my") && lower.includes("risk")) ||
      (lower.includes("which course") && lower.includes("risk")) ||
      (lower.includes("course") && lower.includes("highest risk"))
    ) {
      callbacks.onToolStart?.("get_academic_risks", "Evaluating academic risk radar...");
      const riskRes = await AcademicToolsService.executeTool("get_academic_risks", {});
      callbacks.onToolResult?.("get_academic_risks", riskRes);
      toolCallsMade.push({ tool: "get_academic_risks", result: riskRes });

      if (riskRes.success && riskRes.data) {
        const report = riskRes.data;
        if (lower.includes("which course") || lower.includes("course") && lower.includes("highest risk")) {
          assistantText = `### HIGHEST RISK COURSE\n\n`;
          if (report.highestRiskCourse) {
            const cRisk = report.courseRisks.find((c: any) => c.courseCode === report.highestRiskCourse);
            assistantText += `**Course:** **${report.highestRiskCourse}**\n`;
            assistantText += `- **Risk Level:** \`${cRisk?.riskLevel || "HIGH"}\` (Score: ${cRisk?.riskScore || 0}/100)\n`;
            assistantText += `- **Active Deliverables:** ${cRisk?.activeDeliverablesCount || 0}\n`;
            assistantText += `- **Marks at Stake:** ${cRisk?.totalMarksAtStake || 0}\n`;
            assistantText += `- **Imminent Deadlines (<72h):** ${cRisk?.imminentDeadlinesCount || 0}\n`;
            if (cRisk?.triggers?.length > 0) {
              assistantText += `\n**Triggers:**\n`;
              cRisk.triggers.forEach((trig: string) => {
                assistantText += `- ${trig}\n`;
              });
            }
          } else {
            assistantText += `No elevated course risks detected across your active curriculum.`;
          }
        } else {
          assistantText = `### ACADEMIC RISK RADAR — ${report.overallRiskLevel}\n\n`;
          assistantText += `**${report.headline}**\n\n`;
          assistantText += `${report.summary}\n\n`;
          if (report.mainTriggers?.length > 0) {
            assistantText += `**Contributing Factors:**\n`;
            report.mainTriggers.forEach((trig: any) => {
              assistantText += `- **[${trig.severity}] ${trig.title}:** ${trig.description}\n`;
              if (trig.contributingItems?.length > 0) {
                assistantText += `  *Items:* ${trig.contributingItems.join(", ")}\n`;
              }
            });
            assistantText += "\n";
          }
          assistantText += `**Recommendation:** ${report.recommendedAction}\n`;
        }
      } else {
        assistantText = "Unable to compute academic risk assessment from current academic state.";
      }

    } else if (lower.includes("course") || lower.includes("enrolled") || lower.includes("faculty") || lower.includes("syllabus")) {
      const courseCode = lower.match(/\b([a-z]{2,4}\d{4})\b/i)?.[1]?.toUpperCase();
      callbacks.onToolStart?.("get_course_information", "Retrieving enrolled curriculum courses...");
      const crs = await AcademicToolsService.executeTool("get_course_information", courseCode ? { courseCode } : {});
      callbacks.onToolResult?.("get_course_information", crs);
      toolCallsMade.push({ tool: "get_course_information", result: crs });

      const list: any[] = crs.data || [];
      assistantText = `### ${courseCode ? `COURSE: ${courseCode}` : "ENROLLED COURSES"}\n\n`;
      if (list.length === 0) {
        assistantText += "No course information found for that query.";
      } else {
        list.forEach((c) => {
          assistantText += `- **${c.code}**: ${c.title} (${c.credits} credits) · Faculty: *${c.faculty || "N/A"}* · Slot: \`${c.slot || "—"}\` · Venue: ${c.venue || "—"}\n`;
          if (c.activeTasksCount > 0) {
            assistantText += `  Active deliverables: ${c.activeTasksCount}\n`;
          }
        });
      }

    } else if (lower.includes("notice") || lower.includes("circular") || lower.includes("announcement")) {
      callbacks.onToolStart?.("summarize_notice", "Retrieving latest academic notice...");
      const noticeRes = await AcademicToolsService.executeTool("summarize_notice", {});
      callbacks.onToolResult?.("summarize_notice", noticeRes);
      toolCallsMade.push({ tool: "summarize_notice", result: noticeRes });

      if (!noticeRes.success || !noticeRes.data) {
        assistantText = `No academic notices or circulars have been ingested into AcademicAI yet. Use the Ingest page to add a notice.`;
      } else {
        const n = noticeRes.data;
        assistantText = `### LATEST ACADEMIC NOTICE\n\n`;
        assistantText += `**${n.title}** *(${n.channel} · ${new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})*\n\n`;
        assistantText += `${n.rawText.slice(0, 400)}${n.rawText.length > 400 ? "..." : ""}`;
      }

    } else if ((lower.includes("mark") || lower.includes("complete") || lower.includes("done")) && (lower.includes("task") || lower.includes("project") || lower.includes("assignment") || lower.includes("nlp") || lower.includes("submission") || lower.includes("it"))) {
      // Check for ambiguity
      const titleMatch = lower.match(/mark\s+(.+?)\s+(?:as\s+)?(?:complete|done)/i) ||
        lower.match(/complete\s+(.+)/i);
      const rawTitle = titleMatch?.[1]?.trim();
      const ambiguousTokens = ["it", "this", "the task", "my task", "done", "completed", "a task", "task", ""];
      const isAmbiguous = !rawTitle || ambiguousTokens.includes(rawTitle.toLowerCase());

      if (isAmbiguous) {
        assistantText = `Which task would you like me to mark as completed? Please specify the task title or course code (e.g., *"NLP Mini Project Report"* or *"ML Assignment 3"*).`;
        await this.streamTextProgressively(assistantText, callbacks);
        await ChatService.saveMessage(sessionId, "assistant", assistantText, []);
        callbacks.onDone?.(assistantText);
        return;
      }

      const taskTitle = rawTitle;
      const previewText = `I'll mark **"${taskTitle}"** as completed in your database.\n\n> ⚠️ **Please confirm this action** — this updates the task status to COMPLETED and cannot be easily reversed.`;

      const args = { taskTitle };
      const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64url");
      callbacks.onToken?.(previewText);
      callbacks.onCard?.("confirm_action", {
        toolName: "mark_task_completed",
        label: "Marking task as COMPLETED",
        args,
        confirmPayload: `${CONFIRM_PREFIX}mark_task_completed:${argsBase64}`,
        previewText,
      });

      await ChatService.saveMessage(sessionId, "assistant", previewText, toolCallsMade);
      callbacks.onDone?.(previewText, { pendingAction: { toolName: "mark_task_completed", args } });
      return;

    } else if (lower.includes("reminder") || lower.includes("remind me")) {
      // MUTATION — create reminder
      const reminderTitle = lower.includes("for") ? lower.split("for").slice(1).join("for").trim() : "Academic Reminder";
      const formattedTitle = reminderTitle.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, "");

      const args = {
        title: formattedTitle || "Academic Reminder",
        message: `Reminder created via assistant: ${userMessage}`,
        scheduledFor: "Tomorrow at 7:00 PM",
        urgency: "NORMAL",
      };

      const previewText = `I'll create a reminder: **"${args.title}"** scheduled for **Tomorrow · 7:00 PM**.\n\n> ⚠️ **Confirm to add** this reminder to your Notifications Center.`;

      const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64url");
      callbacks.onToken?.(previewText);
      callbacks.onCard?.("confirm_action", {
        toolName: "create_reminder",
        label: "Creating academic reminder",
        args,
        confirmPayload: `${CONFIRM_PREFIX}create_reminder:${argsBase64}`,
        previewText,
      });

      await ChatService.saveMessage(sessionId, "assistant", previewText, toolCallsMade);
      callbacks.onDone?.(previewText, { pendingAction: { toolName: "create_reminder", args } });
      return;

    } else if (lower.includes("create") && lower.includes("task")) {
      // MUTATION — create task
      const titleMatch = lower.match(/create\s+(?:a\s+)?task\s+(?:for\s+)?(.+)/i);
      const taskTitle = titleMatch?.[1]?.trim() || "New Academic Task";

      const args = {
        title: taskTitle.slice(0, 80),
        priority: "MEDIUM" as const,
      };

      const previewText = `I'll create a new task: **"${args.title}"** with priority \`${args.priority}\`.\n\n> ⚠️ **Confirm to save** this task to your academic database.`;

      const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64url");
      callbacks.onToken?.(previewText);
      callbacks.onCard?.("confirm_action", {
        toolName: "create_task",
        label: "Creating academic task",
        args,
        confirmPayload: `${CONFIRM_PREFIX}create_task:${argsBase64}`,
        previewText,
      });

      await ChatService.saveMessage(sessionId, "assistant", previewText, toolCallsMade);
      callbacks.onDone?.(previewText, { pendingAction: { toolName: "create_task", args } });
      return;

    } else {
      // Default fallback: Show capabilities + today's top task for context
      callbacks.onToolStart?.("get_priority_tasks", "Loading your current academic overview...");
      const overview = await AcademicToolsService.executeTool("get_priority_tasks", {});
      callbacks.onToolResult?.("get_priority_tasks", overview);
      toolCallsMade.push({ tool: "get_priority_tasks", result: overview });

      const topTask = overview.data?.[0];

      assistantText = `I have access to your AcademicAI workspace.\n\n`;
      if (topTask) {
        assistantText += `**Currently tracking:** ${topTask.title} (${topTask.courseCode}) — Due ${topTask.deadline} · \`${topTask.priority}\`\n\n`;
      }
      assistantText += `I can help you with:\n\n`;
      assistantText += `- **Priorities & Workload:** *"What should I finish first?"* or *"Show my workload"*\n`;
      assistantText += `- **Deadlines & Changes:** *"What is due this week?"* or *"What changed recently?"*\n`;
      assistantText += `- **Exams & Events:** *"When is my next exam?"*\n`;
      assistantText += `- **Courses:** *"Show course information for CSE4001"*\n`;
      assistantText += `- **Search:** *"Search for machine learning"*\n`;
      assistantText += `- **Actions:** *"Mark my NLP project as completed"* or *"Create a reminder"*`;
    }

    await this.streamTextProgressively(assistantText, callbacks);
    await ChatService.saveMessage(sessionId, "assistant", assistantText, toolCallsMade);
    callbacks.onDone?.(assistantText);
  }

  // ─── Utility Helpers ─────────────────────────────────────────────────────────

  private static buildActionPreviewText(toolName: string, args: Record<string, any>): string {
    switch (toolName) {
      case "mark_task_completed":
        return `I'll mark **"${args.taskTitle || args.taskId || "the task"}"** as COMPLETED in your database.\n\n> ⚠️ **Please confirm this action** to update the task status permanently.`;
      case "create_task":
        return `I'll create a new task: **"${args.title}"** (${args.courseCode || "GEN"}) · Priority: \`${args.priority || "MEDIUM"}\` · ${args.deadline ? `Due: ${args.deadline}` : "No deadline set"}.\n\n> ⚠️ **Please confirm** to add this to your academic database.`;
      case "update_task":
        return `I'll update task \`${args.taskId}\` with the following changes: ${JSON.stringify(args)}.\n\n> ⚠️ **Please confirm this update** before it is saved.`;
      case "create_reminder":
        return `I'll create a reminder: **"${args.title}"** scheduled for **${args.scheduledFor || "Tomorrow"}**.\n\n> ⚠️ **Please confirm** to add this to your Notifications Center.`;
      case "update_event":
        return `I'll update event \`${args.eventId}\` with new details: ${JSON.stringify(args)}.\n\n> ⚠️ **Please confirm this change** to your academic calendar.`;
      default:
        return `I'm about to execute **${toolName}** with args: \`${JSON.stringify(args)}\`.\n\n> ⚠️ **Please confirm** to proceed.`;
    }
  }

  private static buildActionSuccessMessage(toolName: string, result: any): string {
    const data = result.data;
    switch (toolName) {
      case "mark_task_completed":
        return `✅ **Task marked as COMPLETED:**\n\n- **Title:** ${data?.title}\n- **Status:** \`COMPLETED\`\n- Your dashboard and analytics have been updated automatically.`;
      case "create_task":
        return `✅ **New task created:**\n\n- **Title:** ${data?.title}\n- **Priority:** \`${data?.priority}\`\n- **Status:** \`${data?.status}\`\n- Added to your syllabus database.`;
      case "update_task":
        return `✅ **Task updated:**\n\n- **Title:** ${data?.title}\n- **Status:** \`${data?.status}\`\n- **Priority:** \`${data?.priority}\``;
      case "create_reminder":
        return `✅ **Reminder created:**\n\n- **Title:** ${data?.title}\n- **Scheduled:** ${data?.scheduledFor}\n- Registered in your Notifications Center.`;
      case "update_event":
        return `✅ **Event updated:**\n\n- **Title:** ${data?.title}\n- **Venue:** ${data?.venue}`;
      default:
        return `✅ **Action completed:** ${result.message || toolName}`;
    }
  }

  private static async streamTextProgressively(fullText: string, callbacks: StreamCallbacks) {
    const words = fullText.split(" ");
    let buffer = "";

    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? "" : " ") + words[i];
      buffer += chunk;
      callbacks.onToken?.(chunk);
      // Smooth cadence — ~18ms per 2-word group
      if (i % 2 === 0) {
        await new Promise((r) => setTimeout(r, 18));
      }
    }
  }

  private static getToolLabel(toolName: string): string {
    switch (toolName) {
      case "get_today_tasks":
        return "Checking tasks due today...";
      case "get_upcoming_tasks":
        return "Checking upcoming syllabus deliverables...";
      case "get_priority_tasks":
        return "Evaluating deadline proximity and priority rules...";
      case "get_upcoming_events":
        return "Checking academic exams and lecture timetable...";
      case "get_course_information":
        return "Looking up course details...";
      case "get_workload":
        return "Calculating academic workload and study hours...";
      case "get_today_plan":
        return "Building recommended study time-blocks for today...";
      case "get_recent_changes":
        return "Checking detected circular changes and extensions...";
      case "search_academic_information":
        return "Searching academic records...";
      case "summarize_notice":
        return "Retrieving and summarizing academic notice...";
      case "get_source_evidence":
        return "Inspecting source circular quote and policy evidence...";
      case "mark_task_completed":
        return "Marking task as completed in database...";
      case "create_task":
        return "Creating new syllabus task...";
      case "update_task":
        return "Updating task in database...";
      case "create_reminder":
        return "Scheduling academic reminder in database...";
      case "update_event":
        return "Updating event in academic calendar...";
      case "get_academic_risks":
        return "Scanning academic risk radar and deadline clusters...";
      case "get_smart_plan":
        return "Generating smart time-blocked study schedule...";
      case "get_course_risk":
        return "Calculating academic risk level for course...";
      case "get_requirement_risks":
        return "Auditing rubric requirements and marks at risk...";
      case "get_rubric_requirements":
        return "Extracting rubric criteria and marks distribution...";
      case "get_missing_requirements":
        return "Auditing missing and incomplete rubric criteria...";
      case "get_rubric_breakdown":
        return "Retrieving structured rubric requirements...";
      default:
        return `Executing ${toolName}...`;
    }
  }
}
