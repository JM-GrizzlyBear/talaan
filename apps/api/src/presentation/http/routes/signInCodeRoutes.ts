import { signInCodeSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { Clock } from "../../../application/ports/Clock.js";
import type { SendSignInCode } from "../../../application/twoStep/SendSignInCode.js";
import type { TrustedBrowsers } from "../../../application/twoStep/TrustedBrowsers.js";
import type { VerifySignInCode } from "../../../application/twoStep/VerifySignInCode.js";
import type { GetCurrentUser } from "../../../application/user/GetCurrentUser.js";
import { EmailNotSetUpError } from "../../../domain/emailCode/errors.js";
import { userJson } from "../json/account.js";
import { pendingSignIn, startSession } from "../session.js";
import { setTrustCookie } from "../trustCookie.js";
import { browserLabel } from "../userAgent.js";

// Two-step sign-in: the code from the email finishes signing in, and can
// remember this browser for 30 days
export function signInCodeRoutes(deps: {
  verifySignInCode: VerifySignInCode;
  // null when the server can't send email
  sendSignInCode: SendSignInCode | null;
  getCurrentUser: GetCurrentUser;
  // A suspended account comes back when its owner signs in
  welcomeBack: (userId: string) => Promise<boolean>;
  trustedBrowsers: TrustedBrowsers;
  clock: Clock;
  secureCookie: boolean;
  limit: RequestHandler;
  // New sign-in codes, per person waiting for one
  resendLimit: RequestHandler;
}) {
  const router = Router();
  const now = () => deps.clock.now().getTime();

  router.post("/auth/login/code", deps.limit, async (req, res) => {
    const input = signInCodeSchema.parse(req.body);
    const userId = pendingSignIn(req, now());
    const user = await deps.verifySignInCode.execute(userId, input.code);
    await startSession(req, user, now());
    const welcomeBack = await deps.welcomeBack(user.id);
    if (input.rememberBrowser) {
      const trust = await deps.trustedBrowsers.remember(
        user.id,
        browserLabel(req.get("user-agent")),
      );
      setTrustCookie(res, trust.cookie, trust.expiresAt, deps.secureCookie);
    }
    res.json({ user: userJson(user), welcomeBack });
  });

  router.post("/auth/login/resend", deps.resendLimit, async (req, res) => {
    const userId = pendingSignIn(req, now());
    if (!deps.sendSignInCode) throw new EmailNotSetUpError();
    const user = await deps.getCurrentUser.execute(userId);
    await deps.sendSignInCode.execute(user);
    res.status(204).end();
  });

  return router;
}
