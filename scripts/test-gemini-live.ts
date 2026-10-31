import fs from "fs";
import path from "path";

// Read .env.local manually
const envLocalPath = path.resolve(process.cwd(), ".env.local");
let apiKey = "";
let model = "gemini-3.8-flash";

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("GEMINI_API_KEY=")) {
      apiKey = trimmed.replace("GEMINI_API_KEY=", "").trim();
    }
    if (trimmed.startsWith("GEMINI_MODEL=")) {
      model = trimmed.replace("GEMINI_MODEL=", "").trim();
    }
  }
}

console.log("==========================================================================");
console.log("       ACADEMIC AI — GEMINI CREDENTIALS & LIVE API VERIFICATION           ");
console.log("==========================================================================");
console.log(`Configured Model:  "${model}"`);
console.log(`API Key Configured: ${apiKey ? `Yes (length: ${apiKey.length}, starts with: ${apiKey.slice(0, 3)}...)` : "No (empty)"}`);

async function testGemini() {
  if (!apiKey) {
    console.log("Result: No API key found. System properly defaults to deterministic rubric evaluation.");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  console.log(`Sending controlled probe to: https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say 'Gemini OK' and nothing else." }] }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Response Snippet: ${text.slice(0, 300)}`);

    if (res.ok) {
      console.log("✅ Real Gemini API verified and working!");
    } else {
      console.log(`⚠ Gemini API rejected the request with HTTP ${res.status}.`);
      console.log("Reason:", text.includes("API_KEY_INVALID") ? "API_KEY_INVALID" : "Other API error");
      console.log("The application gracefully falls back to deterministic evaluation without crashing.");
    }
  } catch (err: any) {
    console.log(`⚠ Network/Fetch error: ${err.message}`);
    console.log("The application gracefully handles timeouts and network failures.");
  }
}

testGemini();
