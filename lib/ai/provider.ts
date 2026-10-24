import { AIExtractionOutput, AIExtractionOutputSchema } from "./types";
import { ACADEMIC_EXTRACTION_SYSTEM_PROMPT, buildAcademicExtractionUserPrompt } from "./prompts";

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  extract(rawText: string): Promise<AIExtractionOutput | null>;
}

function cleanJsonResponse(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```json")) {
    text = text.slice(7);
  } else if (text.startsWith("```")) {
    text = text.slice(3);
  }
  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }
  return text.trim();
}

export class GeminiProvider implements AIProvider {
  public name = "Google Gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    this.model = model || process.env.AI_MODEL || "gemini-1.5-flash";
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  public async extract(rawText: string): Promise<AIExtractionOutput | null> {
    if (!this.isConfigured()) return null;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const payload = {
        systemInstruction: {
          parts: [{ text: ACADEMIC_EXTRACTION_SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: [{ text: buildAcademicExtractionUserPrompt(rawText) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[GeminiProvider] API request failed (${res.status}): ${errText}`);
        return null;
      }

      const data = await res.json();
      const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) return null;

      const parsed = JSON.parse(cleanJsonResponse(contentText));
      const validated = AIExtractionOutputSchema.safeParse({
        ...parsed,
        modelName: `Gemini (${this.model})`,
      });

      if (!validated.success) {
        console.warn("[GeminiProvider] Output schema validation mismatch:", validated.error.format());
        return null;
      }

      return validated.data;
    } catch (err) {
      console.warn("[GeminiProvider] Error during Gemini extraction, falling back to rule-based:", err);
      return null;
    }
  }
}

export class OpenAIProvider implements AIProvider {
  public name = "OpenAI GPT";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.model = model || process.env.AI_MODEL || "gpt-4o-mini";
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  public async extract(rawText: string): Promise<AIExtractionOutput | null> {
    if (!this.isConfigured()) return null;

    try {
      const url = "https://api.openai.com/v1/chat/completions";
      const payload = {
        model: this.model,
        messages: [
          { role: "system", content: ACADEMIC_EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: buildAcademicExtractionUserPrompt(rawText) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[OpenAIProvider] API request failed (${res.status}): ${errText}`);
        return null;
      }

      const data = await res.json();
      const contentText = data?.choices?.[0]?.message?.content;
      if (!contentText) return null;

      const parsed = JSON.parse(cleanJsonResponse(contentText));
      const validated = AIExtractionOutputSchema.safeParse({
        ...parsed,
        modelName: `OpenAI (${this.model})`,
      });

      if (!validated.success) {
        console.warn("[OpenAIProvider] Schema validation mismatch:", validated.error.format());
        return null;
      }

      return validated.data;
    } catch (err) {
      console.warn("[OpenAIProvider] Error during extraction, falling back to rule-based:", err);
      return null;
    }
  }
}

export class RuleBasedFallbackProvider implements AIProvider {
  public name = "Deterministic Rule-Based Engine";

  public isConfigured(): boolean {
    return true;
  }

  public async extract(): Promise<AIExtractionOutput | null> {
    // Returns null to signal the pipeline to use local rule-based engine directly
    return null;
  }
}

export function getAIProvider(): AIProvider {
  const preferred = (process.env.AI_PROVIDER || "auto").toLowerCase();

  if (preferred === "rule_based") {
    return new RuleBasedFallbackProvider();
  }

  if (preferred === "gemini") {
    const gemini = new GeminiProvider();
    if (gemini.isConfigured()) return gemini;
  }

  if (preferred === "openai") {
    const openai = new OpenAIProvider();
    if (openai.isConfigured()) return openai;
  }

  // "auto" mode: check Gemini first, then OpenAI, then Fallback
  const gemini = new GeminiProvider();
  if (gemini.isConfigured()) return gemini;

  const openai = new OpenAIProvider();
  if (openai.isConfigured()) return openai;

  return new RuleBasedFallbackProvider();
}
