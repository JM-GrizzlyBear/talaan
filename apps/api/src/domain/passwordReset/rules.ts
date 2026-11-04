import { RESET_CODE } from "@talaan/shared";
import type { ResetCode } from "./ResetCode.js";

export function resetCodeExpiry(now: Date) {
  return new Date(now.getTime() + RESET_CODE.minutes * 60 * 1000);
}

// A code works until it expires or has been guessed wrong too many times
export function isResetCodeUsable(
  code: Pick<ResetCode, "expiresAt" | "tries">,
  now: Date,
) {
  return (
    now.getTime() < code.expiresAt.getTime() && code.tries < RESET_CODE.maxTries
  );
}

export function triesLeft(triesUsed: number) {
  return Math.max(0, RESET_CODE.maxTries - triesUsed);
}
