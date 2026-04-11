import { createClient, type User } from "@supabase/supabase-js";

export async function getUserFromBearer(request: Request): Promise<{
  user: User | null;
  accessToken: string | null;
}> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim() ?? null;
  if (!token) {
    return { user: null, accessToken: null };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
  if (!url || !anon) {
    return { user: null, accessToken: token };
  }
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, accessToken: token };
  }
  return { user: data.user, accessToken: token };
}
