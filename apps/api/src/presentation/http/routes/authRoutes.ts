import { loginSchema, registerSchema, unlockSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { Clock } from "../../../application/ports/Clock.js";
import type { GetCurrentUser } from "../../../application/user/GetCurrentUser.js";
import type { LogInUser } from "../../../application/user/LogInUser.js";
import type { RegisterUser } from "../../../application/user/RegisterUser.js";
import type { UnlockSession } from "../../../application/user/UnlockSession.js";
import { NotLoggedInError } from "../../../domain/user/errors.js";
import { currentUserId, requireAuth } from "../middleware/requireAuth.js";
import {
  SESSION_COOKIE,
  checkIdleLock,
  endSession,
  markActive,
  startSession,
} from "../session.js";
import { userJson } from "../toJson.js";

export function authRoutes(deps: {
  registerUser: RegisterUser;
  logInUser: LogInUser;
  getCurrentUser: GetCurrentUser;
  unlockSession: UnlockSession;
  clock: Clock;
  // Slows down password guessing (per visitor)
  limit: RequestHandler;
  // Per signed-in person
  unlockLimit: RequestHandler;
}) {
  const router = Router();
  const now = () => deps.clock.now().getTime();

  // Creates the account and signs the new user in
  router.post("/auth/register", deps.limit, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await deps.registerUser.execute(input);
    await startSession(req, user, now());
    res.status(201).json({ user: userJson(user) });
  });

  router.post("/auth/login", deps.limit, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await deps.logInUser.execute(input);
    await startSession(req, user, now());
    res.json({ user: userJson(user) });
  });

  // Who is signed in, and whether the website is locked. Answers even when
  // locked, so the lock screen can greet the person by name.
  router.get("/auth/me", async (req, res) => {
    if (!req.session.userId) throw new NotLoggedInError();
    const user = await deps.getCurrentUser.execute(req.session.userId);
    req.session.lockAfterMinutes = user.lockAfterMinutes;
    const locked = checkIdleLock(req, now());
    if (!locked) markActive(req, now());
    res.json({ user: userJson(user), locked });
  });

  // The website reports that someone is still using it (typing, scrolling, reading)
  router.post("/auth/activity", requireAuth(deps.clock), (_req, res) => {
    res.status(204).end();
  });

  // "Lock now", or the website noticed nobody used it for a while
  router.post("/auth/lock", (req, res) => {
    if (!req.session.userId) throw new NotLoggedInError();
    req.session.locked = true;
    res.status(204).end();
  });

  router.post("/auth/unlock", deps.unlockLimit, async (req, res) => {
    const input = unlockSchema.parse(req.body);
    const user = await deps.unlockSession.execute(
      currentUserId(req),
      input.password,
    );
    req.session.locked = false;
    req.session.lastSeenAt = now();
    req.session.lockAfterMinutes = user.lockAfterMinutes;
    res.json({ user: userJson(user) });
  });

  // Works when locked too ("Not you? Sign out")
  router.post("/auth/logout", async (req, res) => {
    await endSession(req);
    res.clearCookie(SESSION_COOKIE);
    res.status(204).end();
  });

  return router;
}
