import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { SESSION_COOKIE } from "./session.js";

// The phone app has no browser cookies. It sends the session as
// "Authorization: Bearer <token>" instead, and gets the token back in the
// X-Session-Token header whenever it signs in (or the session changes).

// The same signed value express-session puts in the cookie ("s:<id>.<sig>")
export function sessionToken(sessionId: string, secret: string) {
  const signature = createHmac("sha256", secret)
    .update(sessionId)
    .digest("base64")
    .replace(/=+$/, "");
  return `s:${sessionId}.${signature}`;
}

// Before the session middleware: a bearer token stands in for the cookie
export const bearerSession: RequestHandler = (req, _res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    req.headers.cookie = `${SESSION_COOKIE}=${encodeURIComponent(auth.slice(7).trim())}`;
  }
  next();
};

// After it: the app (X-Talaan-App: 1) is told the token of a signed-in or
// half-signed-in (waiting for the emailed code) session
export function exposeSessionToken(secret: string): RequestHandler {
  return (req, res, next) => {
    if (req.get("x-talaan-app") !== "1") {
      next();
      return;
    }
    const json = res.json.bind(res);
    const end = res.end.bind(res) as (...args: unknown[]) => typeof res;
    const addToken = () => {
      const s = req.session;
      if (!res.headersSent && s && (s.userId || s.pendingUserId)) {
        res.setHeader("X-Session-Token", sessionToken(req.sessionID, secret));
      }
    };
    res.json = (body) => {
      addToken();
      return json(body);
    };
    res.end = ((...args: unknown[]) => {
      addToken();
      return end(...args);
    }) as typeof res.end;
    next();
  };
}

// A phone's key for unlocking with Face ID or a fingerprint: only its hash
// is kept, in the session it was made for
export const hashDeviceKey = (key: string) =>
  createHash("sha256").update(key).digest("hex");

export function deviceKeyMatches(key: string, hash: string | undefined) {
  if (!hash) return false;
  const a = Buffer.from(hashDeviceKey(key), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
