import {
  RESET_REQUESTED_MESSAGE,
  passwordResetCodeSchema,
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
} from "@talaan/shared";
import { Router, type RequestHandler } from "express";
import type { CheckResetCode } from "../../../application/passwordReset/CheckResetCode.js";
import type { RequestPasswordReset } from "../../../application/passwordReset/RequestPasswordReset.js";
import type { ResetPassword } from "../../../application/passwordReset/ResetPassword.js";

// Forgot password, in 3 steps: email a code → check the code → choose a new password
export function passwordResetRoutes(deps: {
  requestPasswordReset: RequestPasswordReset;
  checkResetCode: CheckResetCode;
  resetPassword: ResetPassword;
  // Per visitor (IP address)
  limit: RequestHandler;
  // Per email address, so one inbox can't be flooded with codes
  emailLimit: RequestHandler;
}) {
  const router = Router();

  router.post(
    "/auth/password-reset/request",
    deps.limit,
    deps.emailLimit,
    async (req, res) => {
      const input = passwordResetRequestSchema.parse(req.body);
      await deps.requestPasswordReset.execute(input.email);
      res.status(202).json({ message: RESET_REQUESTED_MESSAGE });
    },
  );

  router.post("/auth/password-reset/check", deps.limit, async (req, res) => {
    const input = passwordResetCodeSchema.parse(req.body);
    await deps.checkResetCode.execute(input);
    res.status(204).end();
  });

  router.post("/auth/password-reset/complete", deps.limit, async (req, res) => {
    const input = passwordResetCompleteSchema.parse(req.body);
    await deps.resetPassword.execute(input);
    res.status(204).end();
  });

  return router;
}
