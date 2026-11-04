import { loginSchema, registerSchema } from "@pern/shared";
import { Router, type RequestHandler } from "express";
import type { GetCurrentUser } from "../../../application/user/GetCurrentUser.js";
import type { LogInUser } from "../../../application/user/LogInUser.js";
import type { RegisterUser } from "../../../application/user/RegisterUser.js";
import { currentUserId, requireAuth } from "../middleware/requireAuth.js";
import { SESSION_COOKIE, endSession, startSession } from "../session.js";
import { userJson } from "../toJson.js";

export function authRoutes(deps: {
  registerUser: RegisterUser;
  logInUser: LogInUser;
  getCurrentUser: GetCurrentUser;
  // Slows down password guessing
  limit: RequestHandler;
}) {
  const router = Router();

  // Creates the account and logs the new user in
  router.post("/auth/register", deps.limit, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await deps.registerUser.execute(input);
    await startSession(req, user.id);
    res.status(201).json({ user: userJson(user) });
  });

  router.post("/auth/login", deps.limit, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await deps.logInUser.execute(input);
    await startSession(req, user.id);
    res.json({ user: userJson(user) });
  });

  router.get("/auth/me", requireAuth, async (req, res) => {
    const user = await deps.getCurrentUser.execute(currentUserId(req));
    res.json({ user: userJson(user) });
  });

  router.post("/auth/logout", async (req, res) => {
    await endSession(req);
    res.clearCookie(SESSION_COOKIE);
    res.status(204).end();
  });

  return router;
}
