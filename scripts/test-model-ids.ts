import fs from "fs";
import path from "path";
import https from "https";
import { sanitize } from "./diagnose-gemini";

let apiKey = (process.env.GEMINI_API_KEY || "").trim();
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("GEMINI_API_KEY=")) {
      const val = trimmed.slice("GEMINI_API_KEY=".length).trim();
      if (val) apiKey = val;
    }
  }
}

function testModel(modelName: string): Promise<void> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: "Respond with the single word: OK" }] }],
      generationConfig: { maxOutputTokens: 10 },
    });

    const req = https.request(
      {
        hostname: "generativelanguage.googleapis.com",
        port: 443,
        path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        method: "POST",
        family: 4,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 8000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          console.log(`Model [${modelName}] -> HTTP ${res.statusCode}`);
          if (res.statusCode === 200) {
            try {
              const p = JSON.parse(data);
              console.log(`  Candidate text: "${p.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}"`);
            } catch {}
          } else {
            console.log(`  Response: ${sanitize(data.slice(0, 160), apiKey)}`);
          }
          resolve();
        });
      }
    );

    req.on("timeout", () => {
      console.log(`Model [${modelName}] -> Timeout (8s)`);
      req.destroy();
      resolve();
    });

    req.on("error", (e) => {
      console.log(`Model [${modelName}] -> Error: ${sanitize(e.message, apiKey)}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("================================================================================");
  console.log("             TESTING ACTIVE MODEL IDENTIFIERS AGAINST GEMINI API                ");
  console.log("================================================================================\n");

  const candidates = [
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-2.5-flash-lite",
  ];

  for (const m of candidates) {
    await testModel(m);
  }

  console.log("\n================================================================================\n");
}

run();
