import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/artifacts/analyze
 * Analyzes an uploaded image with Gemini Vision and checks if the artifact
 * matches anything in the `artifacts` table. If matched, the artifact is
 * added to the authenticated user's `user_collections`.
 *
 * Body (JSON):
 *   imageBase64  string  — base64-encoded image (no data-URL prefix)
 *   mimeType     string  — "image/png" | "image/jpeg"
 *   accessToken  string  — Supabase JWT from supabase.auth.getSession()
 */

const MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-preview",
  "gemini-3-flash-preview",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-flash-latest",
] as const;

function shouldTryNextModel(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|quota|RESOURCE_EXHAUSTED|rate.?limit|404|Not Found|not found for API version|models\/.*is not found/i.test(msg);
}

function modelCandidates(): string[] {
  const explicit = process.env.GEMINI_MODEL?.trim();
  const ordered = explicit ? [explicit, ...MODEL_FALLBACKS] : [...MODEL_FALLBACKS];
  return [...new Set(ordered)];
}

type CatalogEntry = { id: string; title: string };

type GeminiMatch = {
  matched: boolean;
  title: string | null;
  confidence: "high" | "medium" | "low" | null;
  description: string;
};

function buildPrompt(catalog: CatalogEntry[]): string {
  const list = catalog.map((a, i) => `${i + 1}. ${a.title}`).join("\n");
  return `You are an artifact recognition system for a historical and cultural heritage app.

Examine this image carefully. Determine whether it shows a recognizable historical artifact, artwork, sculpture, painting, monument, or cultural object that matches an entry in the artifact library below.

ARTIFACT LIBRARY:
${list}

Rules:
- Only match if you are reasonably confident the depicted object corresponds to an entry.
- Use the exact title from the library in your response.
- If nothing clearly matches, set matched to false.

Respond with ONLY a JSON object — no markdown, no explanation, just raw JSON:
{"matched": true, "title": "<exact title from library>", "confidence": "high|medium|low", "description": "<one sentence describing what you see>"}
or
{"matched": false, "title": null, "confidence": null, "description": "<one sentence describing what you see or why no match>"}`;
}

type Body = {
  imageBase64?: unknown;
  mimeType?: unknown;
  accessToken?: unknown;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 503 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 503 });
  }

  let parsed: Body;
  try {
    parsed = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageBase64 = typeof parsed.imageBase64 === "string" ? parsed.imageBase64.trim() : null;
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
  }

  const mimeType: "image/png" | "image/jpeg" =
    parsed.mimeType === "image/png" ? "image/png" : "image/jpeg";

  const accessToken = typeof parsed.accessToken === "string" ? parsed.accessToken.trim() : null;
  if (!accessToken) {
    return NextResponse.json({ error: "accessToken is required. You must be logged in." }, { status: 401 });
  }

  // Anon client — same credentials the client-side collectionSlice uses.
  // Used for reading public data (artifacts table) where RLS allows anon reads.
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  // Authenticated client — carries the user's JWT so Supabase can verify identity
  // and RLS can enforce ownership rules on user_collections writes.
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });

  // Verify the token and get the user.
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized — invalid or expired session." }, { status: 401 });
  }

  // Fetch all artifact titles using the anon client (mirrors what collectionSlice does).
  const { data: artifactRows, error: artError } = await anonClient
    .from("artifacts")
    .select("id, name");

  if (artError) {
    console.error("[analyze] artifact catalog fetch error:", artError);
    return NextResponse.json({ error: `Failed to fetch artifact catalog: ${artError.message}` }, { status: 500 });
  }

  if (!artifactRows || artifactRows.length === 0) {
    return NextResponse.json({ matched: false, message: "Artifact catalog is empty." });
  }

  type RawRow = { id: unknown; name?: unknown };
  const catalog: CatalogEntry[] = (artifactRows as RawRow[])
    .map((row) => ({
      id: String(row.id),
      title: String(row.name ?? "").trim(),
    }))
    .filter((a) => a.title.length > 0);

  if (catalog.length === 0) {
    return NextResponse.json({ matched: false, message: "No named artifacts in catalog." });
  }

  // Run Gemini Vision analysis with model fallback.
  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildPrompt(catalog);
  let geminiMatch: GeminiMatch | null = null;

  for (const modelName of modelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 256, temperature: 0.1 },
      });

      const text = result.response.text()?.trim() ?? "";
      if (!text) continue;

      // Extract the first JSON object from the response.
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      geminiMatch = JSON.parse(jsonMatch[0]) as GeminiMatch;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[analyze] model=${modelName} error: ${msg}`);
      if (!shouldTryNextModel(err)) {
        return NextResponse.json({ error: `Image analysis failed (${modelName}): ${msg}` }, { status: 502 });
      }
    }
  }

  if (!geminiMatch) {
    return NextResponse.json({ error: "Image analysis failed — no working Gemini model found. Check server logs for details." }, { status: 502 });
  }

  if (!geminiMatch.matched || !geminiMatch.title) {
    return NextResponse.json({
      matched: false,
      description: geminiMatch.description,
      message: "No matching artifact found in our library.",
    });
  }

  // Find the artifact in the catalog (exact match first, then partial).
  const normalizedGeminiTitle = geminiMatch.title.toLowerCase();
  let matched = catalog.find((a) => a.title.toLowerCase() === normalizedGeminiTitle);
  if (!matched) {
    matched = catalog.find(
      (a) =>
        a.title.toLowerCase().includes(normalizedGeminiTitle) ||
        normalizedGeminiTitle.includes(a.title.toLowerCase()),
    );
  }

  if (!matched) {
    return NextResponse.json({
      matched: false,
      description: geminiMatch.description,
      message: `Gemini identified "${geminiMatch.title}" but it wasn't found in our catalog.`,
    });
  }

  // Fetch full artifact row (public data — anon client).
  const { data: artifact, error: fetchErr } = await anonClient
    .from("artifacts")
    .select("*")
    .eq("id", matched.id)
    .single();

  if (fetchErr || !artifact) {
    return NextResponse.json({ error: "Failed to load artifact details." }, { status: 500 });
  }

  // Check whether the user already owns this artifact (auth client — RLS scoped to user).
  const { data: existing } = await authClient
    .from("user_collections")
    .select("artifact_id")
    .eq("user_id", user.id)
    .eq("artifact_id", matched.id)
    .maybeSingle();

  const alreadyOwned = !!existing;

  if (!alreadyOwned) {
    const { error: insertError } = await authClient
      .from("user_collections")
      .insert({ user_id: user.id, artifact_id: matched.id });

    if (insertError) {
      console.error("[analyze] Failed to add to collection:", insertError);
      return NextResponse.json({ error: "Failed to add artifact to your collection." }, { status: 500 });
    }
  }

  return NextResponse.json({
    matched: true,
    alreadyOwned,
    artifact,
    confidence: geminiMatch.confidence,
    description: geminiMatch.description,
    message: alreadyOwned
      ? `You already have "${matched.title}" in your collection.`
      : `"${matched.title}" has been added to your collection!`,
  });
}
