-- Allow signed-in users to list and visit other rangers' rooms.
-- Without this, RLS often limits SELECT to auth.uid() = user_id, so "Other rangers' rooms" stays empty.

ALTER TABLE public.room_decorations ENABLE ROW LEVEL SECURITY;

-- Drop if you re-run migration locally; safe name for idempotent-ish deploys.
DROP POLICY IF EXISTS "room_decorations_select_authenticated_all" ON public.room_decorations;

CREATE POLICY "room_decorations_select_authenticated_all"
ON public.room_decorations
FOR SELECT
TO authenticated
USING (true);

-- Usernames on room cards: allow reading profile rows for discovery (many projects already allow this).
DROP POLICY IF EXISTS "profiles_select_authenticated_discovery" ON public.profiles;

CREATE POLICY "profiles_select_authenticated_discovery"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
