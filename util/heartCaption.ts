import { HEART_REFILL_INTERVAL_MS, MAX_HEARTS } from "@/util/constant";

export function heartRefillCaption(
  heartsLeft: number,
  lastHeartReset: string | null,
): string {
  if (heartsLeft >= MAX_HEARTS) {
    return "You're at full hearts.";
  }
  if (!lastHeartReset) {
    return "Next refill time will appear after your first heart is used.";
  }
  const nextMs = new Date(lastHeartReset).getTime() + HEART_REFILL_INTERVAL_MS;
  const delta = nextMs - Date.now();
  if (delta <= 0) {
    return "Hearts should refill soon — refresh if the count looks stale.";
  }
  const hours = Math.ceil(delta / (60 * 60 * 1000));
  if (hours >= 24) {
    const days = Math.ceil(delta / (24 * 60 * 60 * 1000));
    return `Next refill in about ${days} day${days === 1 ? "" : "s"}.`;
  }
  if (hours >= 1) {
    return `Next refill in about ${hours} hour${hours === 1 ? "" : "s"}.`;
  }
  const mins = Math.max(1, Math.ceil(delta / (60 * 1000)));
  return `Next refill in about ${mins} minute${mins === 1 ? "" : "s"}.`;
}
