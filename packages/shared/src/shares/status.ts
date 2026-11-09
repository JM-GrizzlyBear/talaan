import type { ShareStatus } from "./constants.js";

// Open, no more new opens (the most opens were used; people who already opened
// it can still look), ended, or stopped
export function shareStatus(
  link: {
    stoppedAt: Date | string | null;
    expiresAt: Date | string;
    maxViews: number | null;
    viewCount: number;
  },
  now: Date,
): ShareStatus {
  if (link.stoppedAt) return "stopped";
  if (new Date(link.expiresAt).getTime() <= now.getTime()) return "expired";
  if (link.maxViews !== null && link.viewCount >= link.maxViews) return "used";
  return "open";
}

// A random 6-digit PIN (crypto when there is one)
export function randomPin(random = Math.random) {
  const values = new Uint32Array(1);
  const n =
    typeof globalThis.crypto?.getRandomValues === "function"
      ? globalThis.crypto.getRandomValues(values)[0] % 1_000_000
      : Math.floor(random() * 1_000_000);
  return String(n).padStart(6, "0");
}
