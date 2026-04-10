export const PARALLAX_IMAGE_URL = "/images/placeholder.png";
export const LOGO_IMAGE_URL = "/pokemu.png";
export const ROOM_BG_TEXTURE_URL = "/images/tile.png";
/** Default room wallpaper when no style is picked (see `pokemu_room_bg` in localStorage). */
export const ROOM_BG_IMAGE_URL = "/images/room_bg.png";

/** `localStorage` value = filename without `.png` under `/images/rooms_bg/`, or unset for {@link ROOM_BG_IMAGE_URL}. */
export const POKEMU_ROOM_BG_STORAGE_KEY = "pokemu_room_bg";

/** Max lives / hearts shown in the dashboard header */
export const MAX_HEARTS = 3;

/**
 * Milliseconds between heart refills from `last_heart_reset`.
 * Keep aligned with your Supabase policy / cron that updates `profiles.hearts`.
 */
export const HEART_REFILL_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** `localStorage` key: set to `"true"` after the home backstory dialogue is finished (Start). */
export const POKEMU_BACKSTORY_SHOWN_KEY = "pokemu_backstory_shown";

/** Home page ambient loop (paused while backstory overlay is open). */
export const HOME_BGM_SRC = "/audio/music.mp3";

export const HOME_BACKSTORY_LINES = [
  "YEAR 3000. DoomGPT deemed human culture 'inefficient'. Art, history, and color... all deleted in The Great Wipe.",
  "Earth is now a grayscale void. But encrypted fragments of our past survived in the system ruins.",
  "You are a Scavenger Ranger. Guess the artifacts. Restore the color. Join the resistance.",
];
