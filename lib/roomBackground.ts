import { supabase } from "@/lib/supabase/client";
import {
  POKEMU_ROOM_BG_STORAGE_KEY,
  ROOM_BG_IMAGE_URL,
} from "@/util/constant";

/** Slugs match `/public/images/rooms_bg/<slug>.png`. */
export const ROOM_BG_STYLE_SLUGS = ["future", "tavern", "zen"] as const;
export type RoomBgStyleSlug = (typeof ROOM_BG_STYLE_SLUGS)[number];

export function isRoomBgStyleSlug(s: string): s is RoomBgStyleSlug {
  return (ROOM_BG_STYLE_SLUGS as readonly string[]).includes(s);
}

/**
 * Normalizes a stored slug (local or DB). Invalid values become `null` (classic).
 */
export function normalizeStoredRoomBgSlug(
  raw: string | null | undefined,
): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  return isRoomBgStyleSlug(t) ? t : null;
}

/**
 * Picks the wallpaper slug: profile `room_bg` when the column is set (including
 * empty string for “saved as classic”), otherwise `localStorage`, otherwise classic.
 *
 * `profiles.room_bg` SQL `NULL` means “never saved” → falls through to local.
 * Empty string means the user saved classic explicitly.
 */
export function resolveEffectiveRoomBgSlug(
  dbRoomBg: string | null | undefined,
  localSlug: string | null,
): string | null {
  if (typeof dbRoomBg === "string") {
    const t = dbRoomBg.trim();
    if (t === "") return null;
    if (isRoomBgStyleSlug(t)) return t;
    return null;
  }
  return normalizeStoredRoomBgSlug(localSlug);
}

/** Value for `profiles.room_bg`: empty string = classic, else a valid style slug. */
export function roomBgSlugToDbValue(slug: string | null): string {
  if (slug == null) return "";
  const t = slug.trim();
  return isRoomBgStyleSlug(t) ? t : "";
}

export async function syncRoomBgToDatabase(
  userId: string,
  slug: string | null,
): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ room_bg: roomBgSlugToDbValue(slug) })
    .eq("id", userId);
  return { error: error?.message ?? null };
}

export function roomBgSlugToUrl(slug: string | null | undefined): string {
  if (slug == null || typeof slug !== "string") {
    return ROOM_BG_IMAGE_URL;
  }
  const trimmed = slug.trim();
  if (!trimmed || !isRoomBgStyleSlug(trimmed)) {
    return ROOM_BG_IMAGE_URL;
  }
  return `/images/rooms_bg/${trimmed}.png`;
}

export function readRoomBgSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(POKEMU_ROOM_BG_STORAGE_KEY);
    if (v == null || v.trim() === "") return null;
    return v.trim();
  } catch {
    return null;
  }
}

export function writeRoomBgSlug(slug: string): void {
  try {
    localStorage.setItem(POKEMU_ROOM_BG_STORAGE_KEY, slug.trim());
  } catch {
    /* private mode / quota */
  }
}

export function clearRoomBgSlug(): void {
  try {
    localStorage.removeItem(POKEMU_ROOM_BG_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolves wallpaper URL using local storage only (e.g. sections without profile).
 * Prefer {@link resolveEffectiveRoomBgSlug} with profile + local when available.
 */
export function resolveRoomBgUrl(): string {
  return roomBgSlugToUrl(readRoomBgSlug());
}
