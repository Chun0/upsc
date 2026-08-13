// Quick sanity check that a GEMINI_API_KEY is valid and lists models.
// Usage: GEMINI_API_KEY=... node scripts/keycheck.mjs
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("No GEMINI_API_KEY in environment.");
  process.exit(2);
}

const ai = new GoogleGenAI({ apiKey: key });
try {
  const res = await ai.models.list();
  const names: string[] = [];
  if (Array.isArray(res)) {
    for (const m of res) names.push(m.name);
  } else if ((res as any)?.models) {
    for (const m of (res as any).models) names.push(m.name);
  } else {
    for await (const m of res as AsyncIterable<any>) names.push(m.name);
  }
  const generative = names.filter((n) => !n.includes("embedding") && !n.includes("imagen") && !n.includes("veo"));
  console.log("KEY OK. Total models:", names.length);
  console.log("Generative models sample:", generative.slice(0, 12).join(", "));
} catch (e) {
  console.error("KEY FAILED:", String(e && e.message ? e.message : e).slice(0, 400));
  process.exit(1);
}
