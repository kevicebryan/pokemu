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

export function resolveRoomBgUrl(): string {
  return roomBgSlugToUrl(readRoomBgSlug());
}
