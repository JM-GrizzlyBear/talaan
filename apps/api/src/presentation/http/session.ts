import { DEFAULT_LOCK_AFTER_MINUTES } from "@talaan/shared";
import connectPgSimple from "connect-pg-simple";
import type { Request } from "express";
import session from "express-session";
import type { Pool } from "pg";
import { PasskeyError } from "../../domain/passkey/errors.js";
import type { SafeUser } from "../../domain/user/User.js";
import { isLockDue } from "../../domain/user/rules.js";
import {
  PASSKEY_CHALLENGE_MS,
  SignInExpiredError,
  isPendingSignInValid,
} from "../../domain/user/signIn.js";

// What's stored in a session: who is signed in, and what the idle lock needs
declare module "express-session" {
  interface SessionData {
    userId: string;
    // When this browser last used the API (milliseconds)
    lastSeenAt: number;
    // Signed in, but the password is needed again
    locked: boolean;
    lockAfterMinutes: number;
    // Two-step sign-in: the password was right, waiting for the emailed code
    pendingUserId: string;
    pendingAt: number;
    // A passkey prompt waiting for the browser's answer, and what it's for
    passkeyChallenge: string;
    passkeyPurpose: PasskeyPurpose;
    passkeyChallengeAt: number;
  }
}

export type PasskeyPurpose = "signIn" | "unlock" | "register";

export const SESSION_COOKIE = "talaan.sid";

export function createSessionMiddleware(options: {
  pool: Pool;
  secret: string;
  secureCookie: boolean;
}) {
  const PgStore = connectPgSimple(session);
  return session({
    store: new PgStore({ pool: options.pool, tableName: "session" }),
    name: SESSION_COOKIE,
    secret: options.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JavaScript in the page can't read it
      sameSite: "lax",
      secure: options.secureCookie, // HTTPS only in production
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  });
}

async function regenerate(req: Request) {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

// A brand-new session id at sign-in, so an id planted before sign-in is useless (session fixation)
export async function startSession(req: Request, user: SafeUser, now: number) {
  await regenerate(req);
  req.session.userId = user.id;
  req.session.lastSeenAt = now;
  req.session.locked = false;
  req.session.lockAfterMinutes = user.lockAfterMinutes;
}

// Two-step: the password was right. Nobody is signed in until the code is entered.
export async function startPendingSignIn(
  req: Request,
  userId: string,
  now: number,
) {
  await regenerate(req);
  req.session.pendingUserId = userId;
  req.session.pendingAt = now;
}

// Whose code is being waited for. Throws when there's none, or it took too long.
export function pendingSignIn(req: Request, now: number) {
  const { pendingUserId, pendingAt } = req.session;
  if (!pendingUserId || !pendingAt || !isPendingSignInValid(pendingAt, now)) {
    throw new SignInExpiredError();
  }
  return pendingUserId;
}

export function savePasskeyChallenge(
  req: Request,
  purpose: PasskeyPurpose,
  challenge: string,
  now: number,
) {
  req.session.passkeyChallenge = challenge;
  req.session.passkeyPurpose = purpose;
  req.session.passkeyChallengeAt = now;
}

// Each challenge works once, for what it was made for, within 5 minutes
export function takePasskeyChallenge(
  req: Request,
  purpose: PasskeyPurpose,
  now: number,
) {
  const s = req.session;
  const challenge = s.passkeyChallenge;
  const valid =
    challenge &&
    s.passkeyPurpose === purpose &&
    now - (s.passkeyChallengeAt ?? 0) < PASSKEY_CHALLENGE_MS;
  delete s.passkeyChallenge;
  delete s.passkeyPurpose;
  delete s.passkeyChallengeAt;
  if (!valid) throw PasskeyError.expired();
  return challenge;
}

// Deletes the session from Postgres, so the old cookie stops working
export async function endSession(req: Request) {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

// Locks the session when nobody used it for too long. Returns true when it's locked.
export function checkIdleLock(req: Request, now: number) {
  const s = req.session;
  if (s.locked) return true;
  const lockAfter = s.lockAfterMinutes ?? DEFAULT_LOCK_AFTER_MINUTES;
  if (isLockDue(s.lastSeenAt ?? now, now, lockAfter)) {
    s.locked = true;
    return true;
  }
  return false;
}

// Unlocked again (password or passkey): the idle timer starts over
export function unlockSession(req: Request, user: SafeUser, now: number) {
  req.session.locked = false;
  req.session.lastSeenAt = now;
  req.session.lockAfterMinutes = user.lockAfterMinutes;
}

// Counts this request as activity. Saved at most once a minute, so the session
// row isn't rewritten on every single request.
export function markActive(req: Request, now: number) {
  if (now - (req.session.lastSeenAt ?? 0) >= 60 * 1000) {
    req.session.lastSeenAt = now;
  }
}
