import type { RequestHandler } from "express";
import type { Clock } from "../../../application/ports/Clock.js";

interface Window {
  startedAt: number;
  count: number;
}

// At most `max` requests per visitor (IP address) every `windowMs`.
// Kept in memory: enough for one small server, and it resets on restart.
export function rateLimit(options: {
  windowMs: number;
  max: number;
  clock: Clock;
  message: string;
}): RequestHandler {
  const windows = new Map<string, Window>();

  return (req, res, next) => {
    const now = options.clock.now().getTime();
    const key = req.ip ?? "unknown";
    let window = windows.get(key);
    if (!window || now - window.startedAt >= options.windowMs) {
      window = { startedAt: now, count: 0 };
      windows.set(key, window);
    }
    window.count += 1;

    // Forget old visitors so the map doesn't grow forever
    if (windows.size > 5000) {
      for (const [ip, w] of windows) {
        if (now - w.startedAt >= options.windowMs) windows.delete(ip);
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
