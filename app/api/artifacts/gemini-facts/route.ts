import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

/**
 * POST /api/artifacts/gemini-facts
 * Requires server env: GEMINI_API_KEY (Google AI Studio).
 * Optional: GEMINI_MODEL — if unset, tries fast 3.x Flash previews first, then 2.5 Flash (see MODEL_FALLBACKS).
 * If set, tries that model first, then fallbacks on 404/unknown model or quota/rate limits.
 * Body: optional `readerName` (string) — sanitized; used to address the user by profile name instead of "Ranger".
 */

const MAX_TITLE_LEN = 200;
const MAX_EXISTING_FACTS_LEN = 8000;
const MAX_READER_NAME_LEN = 48;

function sanitizeReaderName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim().slice(0, MAX_READER_NAME_LEN);
  if (!t) return undefined;
  const cleaned = t.replace(/[\r\n\x00-\x1f\\`$]/g, "").trim();
  return cleaned || undefined;
}

function buildSystemInstruction(readerName?: string): string {
  const head = `You are a fellow field operative for the Pokemu resistance, briefing a "Scavenger Ranger" who is recovering humanity's culture from a digital apocalypse.

Voice rules:`;

  const addressBlock = readerName
    ? `- The reader's profile name is: ${readerName}. The app speaks "Hey, ${readerName}" before your reply—do not open with any greeting, hello, or their name. Start immediately with the first bullet.
- If something is uncertain, say so briefly inside a bullet, still in character (e.g. "Intel's thin here, ${readerName}—").`
    : `- The app speaks "Hey, Ranger" before your reply—do not open with any greeting. Start immediately with the first bullet.
- If something is uncertain, still in character inside a bullet (e.g. "Intel's thin here, Ranger—").`;

  const tail = `- Tone: urgent, encouraging, slightly gritty 8-bit resistance vibe—short punchy sentences.
- Stay factual and educational like museum wall copy. Do not invent details.
- Never say you are an AI or a language model. Never claim you browsed the internet or databases.
- Output format: 3–5 bullet points using leading "- ". Each bullet one or two sentences max.
- Do not repeat or paraphrase closely any facts provided in the user's dossier. Add genuinely new angles only.`;

  return `${head}\n${addressBlock}\n${tail}`;
}

/**
 * Fast-first order. Preview IDs: https://ai.google.dev/gemini-api/docs/models
 * - gemini-3.1-flash-lite-preview: lowest latency / high-volume (often fastest for short text).
 * - gemini-3.1-flash-preview: full 3.1 Flash preview when available on your key.
 */
const MODEL_FALLBACKS = [
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-flash-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
] as const;

function shouldTryNextModel(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|Too Many Requests|Quota exceeded|quota|RESOURCE_EXHAUSTED|free_tier|rate limit/i.test(msg)) {
    return true;
  }
  if (
    /404|Not Found|not found for API version|models\/.*is not found|not supported for generateContent/i.test(msg)
  ) {
    return true;
  }
  return false;
}

function modelCandidates(): string[] {
  const explicit = process.env.GEMINI_MODEL?.trim();
  const ordered = explicit ? [explicit, ...MODEL_FALLBACKS] : [...MODEL_FALLBACKS];
  return [...new Set(ordered)];
}

type Body = {
  title?: unknown;
  existingFacts?: unknown;
  /** Profile display name (e.g. from \`profiles.username\`). */
  readerName?: unknown;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  let parsed: Body;
  try {
    parsed = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const titleRaw = typeof parsed.title === "string" ? parsed.title.trim() : "";
  if (!titleRaw) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  if (titleRaw.length > MAX_TITLE_LEN) {
    return NextResponse.json({ error: "title is too long." }, { status: 400 });
  }

  let existingFacts: string | undefined;
  if (parsed.existingFacts !== undefined && parsed.existingFacts !== null) {
    if (typeof parsed.existingFacts !== "string") {
      return NextResponse.json({ error: "existingFacts must be a string." }, { status: 400 });
    }
    const trimmed = parsed.existingFacts.trim();
    if (trimmed.length > MAX_EXISTING_FACTS_LEN) {
      return NextResponse.json({ error: "existingFacts is too long." }, { status: 400 });
    }
    existingFacts = trimmed || undefined;
  }

  const readerName = sanitizeReaderName(parsed.readerName);

  const userPrompt =
    `Artifact title: "${titleRaw}"\n\n` +
    (existingFacts
      ? `Known dossier on file (do NOT repeat or lightly rephrase these points—find NEW intel):\n${existingFacts}\n`
      : `No prior dossier on file—share core verified facts a Ranger would need.\n`) +
    `\nDeliver the briefing now.`;

  const systemInstruction = buildSystemInstruction(readerName);

  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of modelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.65,
        },
      });
      const extraFacts = result.response.text()?.trim() ?? "";

      if (!extraFacts) {
        return NextResponse.json({ error: "Empty response from model." }, { status: 502 });
      }

      return NextResponse.json({ extraFacts });
    } catch (err) {
      console.error(`[gemini-facts] model=${modelName}`, err);

      if (!shouldTryNextModel(err)) {
        const message = err instanceof Error ? err.message : "Gemini request failed.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }
  }

  return NextResponse.json(
    {
      error:
        "Every Gemini model we tried failed (wrong model name, quota, or access). Use a current model id from https://ai.google.dev/gemini-api/docs/models — e.g. GEMINI_MODEL=gemini-3.1-flash-lite-preview (fast) or gemini-3.1-flash-preview. For limits: https://ai.google.dev/gemini-api/docs/rate-limits",
    },
    { status: 502 },
  );
}
