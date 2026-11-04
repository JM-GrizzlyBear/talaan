import { EMAIL_CODE } from "@talaan/shared";
import type { EmailCode } from "./EmailCode.js";

export function codeExpiry(now: Date) {
  return new Date(now.getTime() + EMAIL_CODE.minutes * 60 * 1000);
}

// A code works until it expires or has been guessed wrong too many times
export function isCodeUsable(
  code: Pick<EmailCode, "expiresAt" | "tries">,
  now: Date,
) {
  return (
    now.getTime() < code.expiresAt.getTime() && code.tries < EMAIL_CODE.maxTries
  );
}

export function triesLeft(triesUsed: number) {
  return Math.max(0, EMAIL_CODE.maxTries - triesUsed);
}
