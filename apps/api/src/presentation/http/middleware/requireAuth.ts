import type { Request, RequestHandler } from "express";
import type { Clock } from "../../../application/ports/Clock.js";
import {
  NotLoggedInError,
  SessionLockedError,
} from "../../../domain/user/errors.js";
import { checkIdleLock, markActive } from "../session.js";

// Lets the request through only when someone is signed in and the website isn't locked
export function requireAuth(clock: Clock): RequestHandler {
  return (req, _res, next) => {
    if (!req.session.userId) throw new NotLoggedInError();
    const now = clock.now().getTime();
    if (checkIdleLock(req, now)) throw new SessionLockedError();
    markActive(req, now);
    next();
  };
}

// The signed-in user's id, for routes behind requireAuth
export function currentUserId(req: Request) {
  const userId = req.session.userId;
  if (!userId) throw new NotLoggedInError();
  return userId;
}
