export const AUTH_LIMITS = {
  nameMax: 50,
  emailMax: 255,
  passwordMin: 10,
  passwordMax: 72, // bcrypt only uses the first 72 bytes
} as const;

// A 6-digit code sent by email, for Forgot password and for two-step sign-in
export const EMAIL_CODE = {
  length: 6,
  minutes: 15,
  maxTries: 3,
} as const;
export const RESET_CODE = EMAIL_CODE;

// Two-step sign-in: a browser can be remembered so it isn't asked every time
export const TRUSTED_BROWSER_DAYS = 30;

// How long the website waits, with nobody using it, before it locks
export const LOCK_AFTER_MINUTES = [5, 15, 30, 60] as const;
export type LockAfterMinutes = (typeof LOCK_AFTER_MINUTES)[number];
export const DEFAULT_LOCK_AFTER_MINUTES: LockAfterMinutes = 15;

// A passkey's name, like "Maria's iPhone"
export const PASSKEY_NAME_MAX = 60;

// The same answer whether or not the email has an account
export const RESET_REQUESTED_MESSAGE =
  "If that email has a Talaan account, we sent a 6-digit code to it.";

export const SIGN_IN_CODE_SENT_MESSAGE =
  "We sent a 6-digit code to your email. Enter it to finish signing in.";
