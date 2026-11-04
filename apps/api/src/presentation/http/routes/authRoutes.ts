import {
  loginSchema,
  maskEmail,
  passkeySignInSchema,
  registerSchema,
  signInCodeSchema,
  unlockSchema,
} from "@talaan/shared";
import { Router, type Request, type RequestHandler } from "express";
import type { PasskeySignIn } from "../../../application/passkey/PasskeySignIn.js";
import type { Clock } from "../../../application/ports/Clock.js";
import type { SendSignInCode } from "../../../application/twoStep/SendSignInCode.js";
import type { TrustedBrowsers } from "../../../application/twoStep/TrustedBrowsers.js";
import type { VerifySignInCode } from "../../../application/twoStep/VerifySignInCode.js";
import type { GetCurrentUser } from "../../../application/user/GetCurrentUser.js";
import type { LogInUser } from "../../../application/user/LogInUser.js";
import type { RegisterUser } from "../../../application/user/RegisterUser.js";
import type { UnlockSession } from "../../../application/user/UnlockSession.js";
import { EmailNotSetUpError } from "../../../domain/emailCode/errors.js";
import type { SafeUser } from "../../../domain/user/User.js";
import { NotLoggedInError } from "../../../domain/user/errors.js";
import { currentUserId, requireAuth } from "../middleware/requireAuth.js";
import {
  SESSION_COOKIE,
  checkIdleLock,
  endSession,
  markActive,
  pendingSignIn,
  savePasskeyChallenge,
  startPendingSignIn,
  startSession,
  takePasskeyChallenge,
} from "../session.js";
import { readTrustCookie, setTrustCookie } from "../trustCookie.js";
import { userJson } from "../toJson.js";
import { browserLabel } from "../userAgent.js";

export function authRoutes(deps: {
  registerUser: RegisterUser;
  logInUser: LogInUser;
  verifySignInCode: VerifySignInCode;
  sendSignInCode: SendSignInCode | null;
  trustedBrowsers: TrustedBrowsers;
  getCurrentUser: GetCurrentUser;
  unlockSession: UnlockSession;
  passkeySignIn: PasskeySignIn;
  clock: Clock;
  secureCookie: boolean;
  // Slows down password guessing (per visitor)
  limit: RequestHandler;
  // Per signed-in person
  unlockLimit: RequestHandler;
  // New sign-in codes, per person waiting for one
  resendLimit: RequestHandler;
}) {
  const router = Router();
  const now = () => deps.clock.now().getTime();

  function unlock(req: Request, user: SafeUser) {
    req.session.locked = false;
    req.session.lastSeenAt = now();
    req.session.lockAfterMinutes = user.lockAfterMinutes;
  }

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
      res.json({ twoStep: false, user: userJson(result.user) });
      return;
    }
    await startPendingSignIn(req, result.user.id, now());
    res
      .status(202)
      .json({ twoStep: true, email: maskEmail(result.user.email) });
  });

  router.post("/auth/login/code", deps.limit, async (req, res) => {
    const input = signInCodeSchema.parse(req.body);
    const userId = pendingSignIn(req, now());
    const user = await deps.verifySignInCode.execute(userId, input.code);
    await startSession(req, user, now());
    if (input.rememberBrowser) {
      const trust = await deps.trustedBrowsers.remember(
        user.id,
        browserLabel(req.get("user-agent")),
      );
      setTrustCookie(res, trust.cookie, trust.expiresAt, deps.secureCookie);
    }
    res.json({ user: userJson(user) });
  });

  router.post("/auth/login/resend", deps.resendLimit, async (req, res) => {
    const userId = pendingSignIn(req, now());
    if (!deps.sendSignInCode) throw new EmailNotSetUpError();
    const user = await deps.getCurrentUser.execute(userId);
    await deps.sendSignInCode.execute(user);
    res.status(204).end();
  });

  // Sign in with a passkey: no email, no password, no code
  router.post("/auth/passkey/options", deps.limit, async (req, res) => {
    const prompt = await deps.passkeySignIn.start();
    savePasskeyChallenge(req, "signIn", prompt.challenge, now());
    res.json(prompt.options);
  });

  router.post("/auth/passkey/verify", deps.limit, async (req, res) => {
    const input = passkeySignInSchema.parse(req.body);
    const expectedChallenge = takePasskeyChallenge(req, "signIn", now());
    const user = await deps.passkeySignIn.finish({
      response: input.response,
      expectedChallenge,
    });
    await startSession(req, user, now());
    res.json({ user: userJson(user) });
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
    unlock(req, user);
    res.json({ user: userJson(user) });
  });

  // Unlock with Face ID, a fingerprint or the device PIN instead of the password
  router.post(
    "/auth/unlock/passkey/options",
    deps.unlockLimit,
    async (req, res) => {
      const prompt = await deps.passkeySignIn.start(currentUserId(req));
      savePasskeyChallenge(req, "unlock", prompt.challenge, now());
      res.json(prompt.options);
    },
  );

  router.post("/auth/unlock/passkey", deps.unlockLimit, async (req, res) => {
    const input = passkeySignInSchema.parse(req.body);
    const userId = currentUserId(req);
    const expectedChallenge = takePasskeyChallenge(req, "unlock", now());
    const user = await deps.passkeySignIn.finish({
      response: input.response,
      expectedChallenge,
      expectedUserId: userId,
    });
    unlock(req, user);
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
