import fs from "fs";
import path from "path";
import dns from "dns";
import https from "https";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

export type GeminiDiagnosticCategory =
  | "CONFIG_ERROR"
  | "AUTH_ERROR"
  | "INVALID_MODEL"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NETWORK_FAILURE"
  | "SERVICE_ERROR"
  | "MALFORMED_RESPONSE"
  | "SUCCESS";

export interface DiagnosticResult {
  category: GeminiDiagnosticCategory;
  model: string;
  isKeyConfigured: boolean;
  keyFormatValid: boolean;
  httpStatus?: number;
  message: string;
  rawDetails?: string;
  latencyMs: number;
}

export function sanitize(text: string, key?: string): string {
  if (!text) return "";
  let clean = text;
  if (key && key.length > 5) {
    clean = clean.split(key).join("[REDACTED_API_KEY]");
  }
  clean = clean.replace(/key=[a-zA-Z0-9_\-\.]{10,}/gi, "key=[REDACTED]");
  clean = clean.replace(/AIza[a-zA-Z0-9_\-]{30,}/g, "[REDACTED_API_KEY]");
  return clean;
}

export function makeHttpsRequestIPv4(
  urlStr: string,
  bodyObj: any,
  timeoutMs: number = 8000
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const bodyStr = JSON.stringify(bodyObj);
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        family: 4, // Explicitly force IPv4 to prevent Windows IPv6 socket abort
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let respData = "";
        res.on("data", (chunk) => (respData += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, data: respData }));
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms`));
    });

    req.on("error", (err) => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

export async function runGeminiDiagnostic(): Promise<DiagnosticResult> {
  const startTime = Date.now();

  // 1. Load environment variables safely
  let apiKey = (process.env.GEMINI_API_KEY || "").trim();
  let model = (process.env.GEMINI_MODEL || "gemini-3.8-flash").trim();

  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const lines = fs.readFileSync(envLocalPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("GEMINI_API_KEY=")) {
        const val = trimmed.slice("GEMINI_API_KEY=".length).trim();
        if (val) apiKey = val;
      }
      if (trimmed.startsWith("GEMINI_MODEL=")) {
        const val = trimmed.slice("GEMINI_MODEL=".length).trim();
        if (val) model = val;
      }
    }
  }

  // 2. Validate configuration
  if (!apiKey) {
    return {
      category: "CONFIG_ERROR",
      model,
      isKeyConfigured: false,
      keyFormatValid: false,
      message: "GEMINI_API_KEY is not configured or empty in .env.local / process.env.",
      latencyMs: Date.now() - startTime,
    };
  }

  // Standard Google AI Studio keys typically start with "AIzaSy" and are 39 characters.
  const isKeyFormatStandard = apiKey.startsWith("AIzaSy") && apiKey.length >= 35;

  // 3. DNS check
  try {
    await dns.promises.lookup("generativelanguage.googleapis.com", { family: 4 });
  } catch (dnsErr: any) {
    return {
      category: "NETWORK_FAILURE",
      model,
      isKeyConfigured: true,
      keyFormatValid: isKeyFormatStandard,
      message: `DNS resolution failed for generativelanguage.googleapis.com: ${dnsErr.code || dnsErr.message}`,
      latencyMs: Date.now() - startTime,
    };
  }

  // 4. Probe call with short harmless prompt
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: "Respond with the single word: OK" }] }],
    generationConfig: { maxOutputTokens: 10, temperature: 0.0 },
  };

  try {
    const { status: httpStatus, data: rawData } = await makeHttpsRequestIPv4(url, payload, 8000);
    const latencyMs = Date.now() - startTime;

    if (httpStatus >= 200 && httpStatus < 300) {
      let data: any = {};
      try {
        data = JSON.parse(rawData);
      } catch {}
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (text) {
        return {
          category: "SUCCESS",
          model,
          isKeyConfigured: true,
          keyFormatValid: true,
          httpStatus,
          message: `Genuine Gemini response received successfully: "${text}"`,
          latencyMs,
        };
      } else {
        return {
          category: "MALFORMED_RESPONSE",
          model,
          isKeyConfigured: true,
          keyFormatValid: true,
          httpStatus,
          message: "HTTP 200 OK received but response candidates were empty or blocked by safety filters.",
          latencyMs,
        };
      }
    }

    // Handle HTTP error responses
    const cleanError = sanitize(rawData, apiKey);
    let parsedErr: any = null;
    try {
      parsedErr = JSON.parse(rawData);
    } catch {}

    const errStatus = parsedErr?.error?.status || "";
    const errMessage = sanitize(parsedErr?.error?.message || cleanError.slice(0, 200), apiKey);

    if (httpStatus === 400 || httpStatus === 401 || httpStatus === 403) {
      const isAuth =
        (errStatus === "INVALID_ARGUMENT" && cleanError.includes("API key not valid")) ||
        errStatus === "PERMISSION_DENIED" ||
        errStatus === "UNAUTHENTICATED" ||
        cleanError.includes("API_KEY_INVALID") ||
        cleanError.includes("not valid");

      return {
        category: isAuth ? "AUTH_ERROR" : "SERVICE_ERROR",
        model,
        isKeyConfigured: true,
        keyFormatValid: isKeyFormatStandard,
        httpStatus,
        message: isAuth
          ? `Authentication failed: ${errMessage || "API key rejected by Google API."}`
          : `HTTP ${httpStatus} error: ${errMessage}`,
        rawDetails: errStatus,
        latencyMs,
      };
    }

    if (httpStatus === 404) {
      return {
        category: "INVALID_MODEL",
        model,
        isKeyConfigured: true,
        keyFormatValid: isKeyFormatStandard,
        httpStatus,
        message: `Model "${model}" was not found or is unsupported on v1beta endpoint: ${errMessage}`,
        rawDetails: errStatus,
        latencyMs,
      };
    }

    if (httpStatus === 429) {
      return {
        category: "RATE_LIMIT",
        model,
        isKeyConfigured: true,
        keyFormatValid: isKeyFormatStandard,
        httpStatus,
        message: `Quota or rate limit reached: ${errMessage}`,
        rawDetails: errStatus,
        latencyMs,
      };
    }

    return {
      category: "SERVICE_ERROR",
      model,
      isKeyConfigured: true,
      keyFormatValid: isKeyFormatStandard,
      httpStatus,
      message: `Google API service error (HTTP ${httpStatus}): ${errMessage}`,
      rawDetails: errStatus,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isTimeout =
      err.name === "TimeoutError" ||
      err.name === "AbortError" ||
      (err.message && err.message.toLowerCase().includes("aborted")) ||
      (err.message && err.message.toLowerCase().includes("timeout"));

    if (isTimeout) {
      return {
        category: "TIMEOUT",
        model,
        isKeyConfigured: true,
        keyFormatValid: isKeyFormatStandard,
        message: `Connection to Google Gemini API timed out after ${latencyMs}ms.`,
        latencyMs,
      };
    }

    return {
      category: "NETWORK_FAILURE",
      model,
      isKeyConfigured: true,
      keyFormatValid: isKeyFormatStandard,
      message: `Network connectivity failure: ${sanitize(err.message, apiKey)}`,
      rawDetails: err.code,
      latencyMs,
    };
  }
}

async function main() {
  console.log("================================================================================");
  console.log("             ACADEMIC AI — GEMINI INTEGRATION DIAGNOSTIC                        ");
  console.log("================================================================================\n");

  const diag = await runGeminiDiagnostic();

  console.log(`Diagnostic Category:      ${diag.category}`);
  console.log(`Configured Model ID:      "${diag.model}"`);
  console.log(`API Key Configured:       ${diag.isKeyConfigured ? "Yes (Loaded)" : "No (Missing)"}`);
  console.log(`Standard Key Format:      ${diag.keyFormatValid ? "Yes (AIzaSy... standard)" : "No (Non-standard prefix or length)"}`);
  if (diag.httpStatus) {
    console.log(`HTTP Status Code:         ${diag.httpStatus}`);
  }
  console.log(`Diagnostic Latency:       ${diag.latencyMs}ms`);
  console.log(`Diagnostic Message:       ${diag.message}`);
  if (diag.rawDetails) {
    console.log(`Status Identifier:        ${diag.rawDetails}`);
  }
  console.log("\n================================================================================\n");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Diagnostic execution error:", err);
    process.exit(1);
  });
}
