export const PARALLAX_IMAGE_URL = "/images/placeholder.png";
export const LOGO_IMAGE_URL = "/pokemu.png";
export const ROOM_BG_TEXTURE_URL = "/images/tile.png";
/** Default room wallpaper when no style is picked (see `profiles.room_bg` and `pokemu_room_bg`). */
export const ROOM_BG_IMAGE_URL = "/images/room_bg.png";

/**
 * `localStorage` fallback when `profiles.room_bg` is unset: filename stem under `/images/rooms_bg/`,
 * or unset for {@link ROOM_BG_IMAGE_URL}.
 */
export const POKEMU_ROOM_BG_STORAGE_KEY = "pokemu_room_bg";

/** Max lives / hearts shown in the dashboard header */
export const MAX_HEARTS = 5;

/** Shown on heart icons (header + profile) — daily refill behavior. */
export const HEARTS_REFRESH_TOOLTIP =
  "Hearts refill over time: one heart restores every 24 hours after you use a life.";

/**
 * Milliseconds between heart refills from `last_heart_reset`.
 * Keep aligned with your Supabase policy / cron that updates `profiles.hearts`.
 */
export const HEART_REFILL_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** `localStorage` key: set to `"true"` after the home backstory dialogue is finished (Start). */
export const POKEMU_BACKSTORY_SHOWN_KEY = "pokemu_backstory_shown";

/**
 * `localStorage` value: ISO 8601 timestamp of the last time the user successfully claimed
 * a free heart from the reward video (24h cooldown starts from this instant; not stored in DB).
 */
export const POKEMU_VIDEO_HEART_STORAGE_KEY = "pokemu_last_video_heart_at";

/** Minimum time between free “watch video” heart rewards (must match API + DB). */
export const VIDEO_HEART_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Reward clip shown in the out-of-hearts modal. Replace with your own file under `/public` or a CDN URL.
 * Default: short CC0 sample (MDN) for development.
 */
export const REWARD_VIDEO_SRC =
  "https://umobaabrcacefoogbodr.supabase.co/storage/v1/object/public/pokemu%20assets/TikTok%20Video%20DA%20VINKY.mp4";

/** Home page ambient loop (paused while backstory overlay is open). */
export const HOME_BGM_SRC = "/audio/music.mp3";

export const HOME_BACKSTORY_LINES = [
  "YEAR 3000. DoomGPT deemed human culture 'inefficient'. Art, history, and color... all deleted in The Great Wipe.",
  "Earth is now a grayscale void. But encrypted fragments of our past survived in the system ruins.",
  "You are a Scavenger Ranger. Guess the artifacts. Restore the color. Join the resistance.",
];
