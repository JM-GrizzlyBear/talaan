import { changePasswordSchema, securitySettingsSchema } from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { ChangePassword } from "../../../application/user/ChangePassword.js";
import type { UpdateSecuritySettings } from "../../../application/user/UpdateSecuritySettings.js";
import { currentUserId } from "../middleware/requireAuth.js";
import { userJson } from "../toJson.js";

// The signed-in person's own settings
export function accountRoutes(deps: {
  changePassword: ChangePassword;
  updateSecuritySettings: UpdateSecuritySettings;
  requireAuth: RequestHandler;
  limit: RequestHandler;
}) {
  const router = Router();

  // Keeps this browser signed in and signs out every other device
  router.put(
    "/account/password",
    deps.requireAuth,
    deps.limit,
    async (req, res) => {
      const input = changePasswordSchema.parse(req.body);
      await deps.changePassword.execute({
        userId: currentUserId(req),
        sessionId: req.sessionID,
        ...input,
      });
      res.status(204).end();
    },
  );

  router.put("/account/security", deps.requireAuth, async (req, res) => {
    const input = securitySettingsSchema.parse(req.body);
    const user = await deps.updateSecuritySettings.execute(
      currentUserId(req),
      input,
    );
    req.session.lockAfterMinutes = user.lockAfterMinutes;
    res.json({ user: userJson(user) });
  });

  return router;
}
