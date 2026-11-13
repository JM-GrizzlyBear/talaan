import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { SESSION_COOKIE } from "./session.js";
import { TRUST_COOKIE } from "./trustCookie.js";

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
// (and X-Talaan-Trust for the remembered-phone cookie). Any real cookie is
// ignored then: the app never uses cookies.
export const bearerSession: RequestHandler = (req, _res, next) => {
  const auth = req.headers.authorization;
  const trust = req.get("x-talaan-trust");
  if (auth?.startsWith("Bearer ") || trust) {
    const cookies: string[] = [];
    if (auth?.startsWith("Bearer ")) {
      cookies.push(
        `${SESSION_COOKIE}=${encodeURIComponent(auth.slice(7).trim())}`,
      );
    }
    if (trust) cookies.push(`${TRUST_COOKIE}=${encodeURIComponent(trust)}`);
    req.headers.cookie = cookies.join("; ");
  }
  next();
};

export const isApp = (req: Request) => req.get("x-talaan-app") === "1";

// "Talaan app on Maria's iPhone": the name the app gives its phone, for the
// list of remembered devices
export function appDeviceLabel(req: Request) {
  const name = (req.get("x-talaan-device") ?? "")
    .replace(/[^\p{L}\p{N} '’()._-]/gu, "")
    .trim()
    .slice(0, 60);
  return name ? `Talaan app on ${name}` : "Talaan app";
}

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
