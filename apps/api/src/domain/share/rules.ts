import { SHARE_LIMITS } from "@talaan/shared";
import { ShareFormError } from "./errors.js";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// A link ends at least a few minutes from now, and within a year
export function checkExpiry(expiresAt: Date, now: Date) {
  if (expiresAt.getTime() < now.getTime() + SHARE_LIMITS.minMinutes * MINUTE) {
    throw new ShareFormError(
      `Choose a time at least ${SHARE_LIMITS.minMinutes} minutes from now.`,
      "expiresAt",
    );
  }
  if (expiresAt.getTime() > now.getTime() + SHARE_LIMITS.maxDays * DAY) {
    throw new ShareFormError(
      `A link can last up to ${SHARE_LIMITS.maxDays} days.`,
      "expiresAt",
    );
  }
}

// After this many wrong PINs in a row, the link waits before taking more
export function afterWrongPin(failures: number, now: Date) {
  const next = failures + 1;
  if (next >= SHARE_LIMITS.pinTries) {
    return {
      failures: 0,
      waitUntil: new Date(now.getTime() + SHARE_LIMITS.pinWaitMinutes * MINUTE),
      left: 0,
    };
  }
  return {
    failures: next,
    waitUntil: null,
    left: SHARE_LIMITS.pinTries - next,
  };
}

// Whole minutes until the wait is over (at least 1)
export const minutesUntil = (until: Date, now: Date) =>
  Math.max(1, Math.ceil((until.getTime() - now.getTime()) / MINUTE));

// "It was opened" alerts: at most one every half hour per link
export const ALERT_GAP_MS = 30 * MINUTE;
