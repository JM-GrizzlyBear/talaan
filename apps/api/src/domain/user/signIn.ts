import { EMAIL_CODE } from "@talaan/shared";

// After the password, a two-step sign-in waits for the emailed code this long
export const PENDING_SIGN_IN_MS = EMAIL_CODE.minutes * 60 * 1000;

export function isPendingSignInValid(startedAt: number, now: number) {
  return now - startedAt < PENDING_SIGN_IN_MS;
}

// A passkey prompt must be answered within 5 minutes
export const PASSKEY_CHALLENGE_MS = 5 * 60 * 1000;

export class SignInExpiredError extends Error {
  constructor() {
    super("Your sign-in timed out. Enter your email and password again.");
    this.name = "SignInExpiredError";
  }
}
