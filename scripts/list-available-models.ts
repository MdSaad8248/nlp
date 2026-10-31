import fs from "fs";
import path from "path";
import https from "https";
import { sanitize } from "./diagnose-gemini";

// Load key safely
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

function getModels(): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "generativelanguage.googleapis.com",
        port: 443,
        path: `/v1beta/models?key=${apiKey}`,
        method: "GET",
        family: 4,
        timeout: 8000,
      },
      (res) => {
        let respData = "";
        res.on("data", (chunk) => (respData += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, data: respData }));
      }
    );
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function main() {
  console.log("Checking available Gemini models via Google v1beta/models endpoint...");
  try {
    const res = await getModels();
    console.log(`HTTP Status: ${res.status}`);
    if (res.status === 200) {
      const parsed = JSON.parse(res.data);
      const models = (parsed.models || []).map((m: any) => m.name.replace("models/", ""));
      console.log("Available models count:", models.length);
      console.log("Flash / Pro models found:", models.filter((m: string) => m.includes("flash") || m.includes("pro")).slice(0, 15));
    } else {
      console.log("Error response:", sanitize(res.data.slice(0, 300), apiKey));
    }
  } catch (err: any) {
    console.log("Fetch error:", sanitize(err.message, apiKey));
  }
}

main();
