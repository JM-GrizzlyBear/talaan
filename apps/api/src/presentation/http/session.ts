import { DEFAULT_LOCK_AFTER_MINUTES } from "@talaan/shared";
import connectPgSimple from "connect-pg-simple";
import type { Request } from "express";
import session from "express-session";
import type { Pool } from "pg";
import type { SafeUser } from "../../domain/user/User.js";
import { isLockDue } from "../../domain/user/rules.js";

// What's stored in a session: who is signed in, and what the idle lock needs
declare module "express-session" {
  interface SessionData {
    userId: string;
    // When this browser last used the API (milliseconds)
    lastSeenAt: number;
    // Signed in, but the password is needed again
    locked: boolean;
    lockAfterMinutes: number;
  }
}

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

// A brand-new session id at sign-in, so an id planted before sign-in is useless (session fixation)
export async function startSession(req: Request, user: SafeUser, now: number) {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
  req.session.userId = user.id;
  req.session.lastSeenAt = now;
  req.session.locked = false;
  req.session.lockAfterMinutes = user.lockAfterMinutes;
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

// Counts this request as activity. Saved at most once a minute, so the session
// row isn't rewritten on every single request.
export function markActive(req: Request, now: number) {
  if (now - (req.session.lastSeenAt ?? 0) >= 60 * 1000) {
    req.session.lastSeenAt = now;
  }
}
