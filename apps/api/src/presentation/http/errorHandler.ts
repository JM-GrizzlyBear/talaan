import type { ApiErrorBody } from "@pern/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError, z } from "zod";
import { NoteNotFoundError } from "../../domain/note/errors.js";
import {
  EmailTakenError,
  InvalidCredentialsError,
  NotLoggedInError,
  UsernameTakenError,
} from "../../domain/user/errors.js";

function send(
  res: Parameters<RequestHandler>[1],
  status: number,
  body: ApiErrorBody,
) {
  res.status(status).json(body);
}

// Unknown /api routes answer in JSON, not with the website's HTML
export const apiNotFound: RequestHandler = (_req, res) => {
  send(res, 404, { message: "Not found" });
};

// The one place that turns errors into HTTP answers.
// Routes just throw; Express 5 forwards errors from async handlers here.
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof ZodError) {
    send(res, 400, {
      message: "Please check the form",
      errors: z.flattenError(error).fieldErrors,
    });
    return;
  }
  if (error instanceof UsernameTakenError) {
    send(res, 409, {
      message: error.message,
      errors: { username: [error.message] },
    });
    return;
  }
  if (error instanceof EmailTakenError) {
    send(res, 409, {
      message: error.message,
      errors: { email: [error.message] },
    });
    return;
  }
  if (
    error instanceof InvalidCredentialsError ||
    error instanceof NotLoggedInError
  ) {
    send(res, 401, { message: error.message });
    return;
  }
  if (error instanceof NoteNotFoundError) {
    send(res, 404, { message: error.message });
    return;
  }
  // express.json(): body isn't valid JSON (400) or is too big (413)
  if (
    typeof error?.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  ) {
    send(res, error.status, { message: "Bad request" });
    return;
  }

  // Details go to the server log only; the browser gets a short message
  console.error(`${req.method} ${req.originalUrl} failed:`, error);
  send(res, 500, { message: "Something went wrong. Please try again." });
};
