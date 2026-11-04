import type { Request, RequestHandler } from "express";
import { NotLoggedInError } from "../../../domain/user/errors.js";

// Lets the request through only when someone is logged in
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.session.userId) throw new NotLoggedInError();
  next();
};

// The logged-in user's id, for routes behind requireAuth
export function currentUserId(req: Request) {
  const userId = req.session.userId;
  if (!userId) throw new NotLoggedInError();
  return userId;
}
