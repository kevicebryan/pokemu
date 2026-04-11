import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { MAX_HEARTS } from "@/util/constant";

export async function grantHeartsWithServiceRole(userId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  if (!admin) return false;
  const { error } = await admin.from("profiles").update({ hearts: MAX_HEARTS }).eq("id", userId);
  return !error;
}

export async function grantHeartsWithUserJwt(
  accessToken: string,
  userId: string,
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
  if (!url || !anon) return false;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.from("profiles").update({ hearts: MAX_HEARTS }).eq("id", userId);
  return !error;
}
