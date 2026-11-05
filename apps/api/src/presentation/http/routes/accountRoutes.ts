import {
  addPasskeySchema,
  changePasswordSchema,
  securitySettingsSchema,
} from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { ManagePasskeys } from "../../../application/passkey/ManagePasskeys.js";
import type { PasskeyRegistration } from "../../../application/passkey/PasskeyRegistration.js";
import type { Clock } from "../../../application/ports/Clock.js";
import type { TrustedBrowsers } from "../../../application/twoStep/TrustedBrowsers.js";
import type { ChangePassword } from "../../../application/user/ChangePassword.js";
import type { SignOutOtherSessions } from "../../../application/user/SignOutOtherSessions.js";
import type { UpdateSecuritySettings } from "../../../application/user/UpdateSecuritySettings.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { savePasskeyChallenge, takePasskeyChallenge } from "../session.js";
import { browserJson, passkeyJson, userJson } from "../json/account.js";
import { clearTrustCookie, readTrustCookie } from "../trustCookie.js";
import { idParam } from "../params.js";

// The signed-in person's own settings
export function accountRoutes(deps: {
  changePassword: ChangePassword;
  updateSecuritySettings: UpdateSecuritySettings;
  passkeyRegistration: PasskeyRegistration;
  managePasskeys: ManagePasskeys;
  trustedBrowsers: TrustedBrowsers;
  signOutOtherSessions: SignOutOtherSessions;
  clock: Clock;
  requireAuth: RequestHandler;
  limit: RequestHandler;
}) {
  const router = Router();
  const now = () => deps.clock.now().getTime();
  router.use("/account", deps.requireAuth);

  // Keeps this browser signed in and signs out every other device
  router.put("/account/password", deps.limit, async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    await deps.changePassword.execute({
      userId: currentUserId(req),
      sessionId: req.sessionID,
      ...input,
    });
    // Remembered browsers were forgotten, this one too
    clearTrustCookie(res);
    res.status(204).end();
  });

  router.put("/account/security", deps.limit, async (req, res) => {
    const input = securitySettingsSchema.parse(req.body);
    const user = await deps.updateSecuritySettings.execute(
      currentUserId(req),
      input,
    );
    req.session.lockAfterMinutes = user.lockAfterMinutes;
    res.json({ user: userJson(user) });
  });

  // Passkeys

  router.get("/account/passkeys", async (req, res) => {
    const passkeys = await deps.managePasskeys.list(currentUserId(req));
    res.json({ passkeys: passkeys.map(passkeyJson) });
  });

  router.post("/account/passkeys/options", deps.limit, async (req, res) => {
    const prompt = await deps.passkeyRegistration.start(currentUserId(req));
    savePasskeyChallenge(req, "register", prompt.challenge, now());
    res.json(prompt.options);
  });

  router.post("/account/passkeys", deps.limit, async (req, res) => {
    const input = addPasskeySchema.parse(req.body);
    const expectedChallenge = takePasskeyChallenge(req, "register", now());
    const passkey = await deps.passkeyRegistration.finish({
      userId: currentUserId(req),
      name: input.name,
      response: input.response,
      expectedChallenge,
    });
    res.status(201).json({ passkey: passkeyJson(passkey) });
  });

  router.delete("/account/passkeys/:id", async (req, res) => {
    await deps.managePasskeys.remove(
      currentUserId(req),
      idParam(req.params.id),
    );
    res.status(204).end();
  });

  // Remembered browsers (two-step sign-in doesn't ask them for a code)

  router.get("/account/browsers", async (req, res) => {
    const browsers = await deps.trustedBrowsers.list(currentUserId(req));
    const currentId = deps.trustedBrowsers.idOf(readTrustCookie(req));
    res.json({ browsers: browsers.map((b) => browserJson(b, currentId)) });
  });

  router.delete("/account/browsers/:id", async (req, res) => {
    const id = idParam(req.params.id);
    await deps.trustedBrowsers.forget(currentUserId(req), id);
    if (deps.trustedBrowsers.idOf(readTrustCookie(req)) === id) {
      clearTrustCookie(res);
    }
    res.status(204).end();
  });

  router.delete("/account/browsers", async (req, res) => {
    await deps.trustedBrowsers.forgetAll(currentUserId(req));
    clearTrustCookie(res);
    res.status(204).end();
  });

  // Signs out every other browser and device; this one stays signed in
  router.post("/account/sign-out-others", deps.limit, async (req, res) => {
    await deps.signOutOtherSessions.execute(currentUserId(req), req.sessionID);
    res.status(204).end();
  });

  return router;
}
