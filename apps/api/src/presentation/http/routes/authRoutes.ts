import {
  loginSchema,
  maskEmail,
  registerSchema,
  unlockSchema,
} from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { Clock } from "../../../application/ports/Clock.js";
import type { GetCurrentUser } from "../../../application/user/GetCurrentUser.js";
import type { LogInUser } from "../../../application/user/LogInUser.js";
import type { RegisterUser } from "../../../application/user/RegisterUser.js";
import type { UnlockSession } from "../../../application/user/UnlockSession.js";
import { NotLoggedInError } from "../../../domain/user/errors.js";
import { userJson } from "../json/account.js";
import { currentUserId, requireAuth } from "../middleware/requireAuth.js";
import {
  SESSION_COOKIE,
  checkIdleLock,
  endSession,
  markActive,
  startPendingSignIn,
  startSession,
  unlockSession,
} from "../session.js";
import { readTrustCookie } from "../trustCookie.js";

// Signing up, signing in with a password, the idle lock, and signing out.
// The emailed code is signInCodeRoutes; passkeys are passkeyAuthRoutes.
export function authRoutes(deps: {
  registerUser: RegisterUser;
  logInUser: LogInUser;
  getCurrentUser: GetCurrentUser;
  // A suspended account comes back when its owner signs in
  welcomeBack: (userId: string) => Promise<boolean>;
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

  // Signed in (200), or two-step: a code was emailed (202) and
  // POST /auth/login/code finishes signing in
  router.post("/auth/login", deps.limit, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await deps.logInUser.execute({
      ...input,
      trustCookie: readTrustCookie(req),
    });
    if (result.kind === "signedIn") {
      await startSession(req, result.user, now());
      const welcomeBack = await deps.welcomeBack(result.user.id);
      res.json({ twoStep: false, user: userJson(result.user), welcomeBack });
      return;
    }
    await startPendingSignIn(req, result.user.id, now());
    res
      .status(202)
      .json({ twoStep: true, email: maskEmail(result.user.email) });
  });

  // Who is signed in, and whether the website is locked. Answers even when
  // locked, so the lock screen can show who is signed in.
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
    unlockSession(req, user, now());
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
