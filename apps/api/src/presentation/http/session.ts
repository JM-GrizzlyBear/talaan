import connectPgSimple from "connect-pg-simple";
import type { Request } from "express";
import session from "express-session";
import type { Pool } from "pg";

// What's stored in a session: only who is logged in
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export const SESSION_COOKIE = "app.sid";

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

// A brand-new session id at login, so an id planted before login is useless (session fixation)
export async function startSession(req: Request, userId: string) {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
  req.session.userId = userId;
}

// Deletes the session from Postgres, so the old cookie stops working
export async function endSession(req: Request) {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}
