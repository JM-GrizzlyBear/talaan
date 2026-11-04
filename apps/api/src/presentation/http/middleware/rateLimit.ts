import type { Request, RequestHandler } from "express";
import type { Clock } from "../../../application/ports/Clock.js";

interface Window {
  startedAt: number;
  count: number;
}

// At most `max` requests per key every `windowMs`. The key is the visitor's IP
// address unless another one is given (for example the email in the form).
// Kept in memory: enough for one small server, and it resets on restart.
export function rateLimit(options: {
  windowMs: number;
  max: number;
  clock: Clock;
  message: string;
  key?: (req: Request) => string | undefined;
}): RequestHandler {
  const windows = new Map<string, Window>();

  return (req, res, next) => {
    const key = options.key ? options.key(req) : (req.ip ?? "unknown");
    if (key === undefined) return next();

    const now = options.clock.now().getTime();
    let window = windows.get(key);
    if (!window || now - window.startedAt >= options.windowMs) {
      window = { startedAt: now, count: 0 };
      windows.set(key, window);
    }
    window.count += 1;

    // Forget old keys so the map doesn't grow forever
    if (windows.size > 5000) {
      for (const [k, w] of windows) {
        if (now - w.startedAt >= options.windowMs) windows.delete(k);
      }
    }

    if (window.count > options.max) {
      const retryAfter = Math.ceil(
        (window.startedAt + options.windowMs - now) / 1000,
      );
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ message: options.message });
      return;
    }
    next();
  };
}

// The email typed into a form, in the same form the database keeps it
export function emailKey(req: Request) {
  const email: unknown = req.body?.email;
  return typeof email === "string" && email.trim()
    ? `email:${email.trim().toLowerCase()}`
    : undefined;
}

// The signed-in person, for limits on things only they can do (unlock, change password)
export function userKey(req: Request) {
  const userId = req.session?.userId;
  return userId ? `user:${userId}` : undefined;
}
