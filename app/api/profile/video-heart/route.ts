import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromBearer } from "@/lib/supabase/auth-from-request";

/**
 * POST /api/profile/video-heart
 * Grants +1 heart when the player has none left (after the reward video flow on the client).
 * The “once per 24 hours” rule is enforced in the browser via localStorage only — not stored in DB.
 */
export async function POST(request: Request) {
  const { user, accessToken } = await getUserFromBearer(request);
  if (!user?.id || !accessToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json(
      { error: "Server is missing Supabase configuration." },
      { status: 503 },
    );
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: fetchError } = await client
    .from("profiles")
    .select("hearts")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }
  if (!row) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const hearts = typeof row.hearts === "number" ? row.hearts : 0;
  if (hearts !== 0) {
    return NextResponse.json(
      { error: "Video reward is only available when you have no hearts left." },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await client
    .from("profiles")
    .update({ hearts: 1 })
    .eq("id", user.id)
    .select(
      "id, username, hearts, last_heart_reset, total_items_restored, updated_at",
    )
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    hearts: updated?.hearts ?? 1,
  });
}
