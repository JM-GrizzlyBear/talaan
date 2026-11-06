import { passkeySignInSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { PasskeySignIn } from "../../../application/passkey/PasskeySignIn.js";
import type { Clock } from "../../../application/ports/Clock.js";
import { userJson } from "../json/account.js";
import { currentUserId } from "../middleware/requireAuth.js";
import {
  savePasskeyChallenge,
  startSession,
  takePasskeyChallenge,
  unlockSession,
} from "../session.js";

// Signing in and unlocking with a passkey (Face ID, a fingerprint, the
// device PIN). Adding and removing passkeys is in accountRoutes.
export function passkeyAuthRoutes(deps: {
  passkeySignIn: PasskeySignIn;
  clock: Clock;
  // Per visitor
  limit: RequestHandler;
  // Per signed-in person
  unlockLimit: RequestHandler;
}) {
  const router = Router();
  const now = () => deps.clock.now().getTime();

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

  // Unlock with a passkey instead of the password
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
    unlockSession(req, user, now());
    res.json({ user: userJson(user) });
  });

  return router;
}
