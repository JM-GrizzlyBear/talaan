import type { ApiErrorBody } from "@talaan/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import {
  EmailNotSetUpError,
  CodeError,
} from "../../domain/emailCode/errors.js";
import { ForbiddenError, NotFoundError } from "../../domain/errors.js";
import { FamilyError } from "../../domain/family/errors.js";
import { FileError, FilesNotSetUpError } from "../../domain/file/errors.js";
import { PasskeyError } from "../../domain/passkey/errors.js";
import {
  PushNotSetUpError,
  ReminderError,
} from "../../domain/reminder/errors.js";
import { ShareError, ShareFormError } from "../../domain/share/errors.js";
import { SignInExpiredError } from "../../domain/user/signIn.js";
import {
  EmailTakenError,
  InvalidCredentialsError,
  NotLoggedInError,
  SessionLockedError,
  WrongPasswordError,
  DeviceKeyError,
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
    // Keyed by the full path, like "email" or "details.results.0.value",
    // so a form can put each message next to the right box
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.map(String).join(".");
      if (!key) continue;
      (errors[key] ??= []).push(issue.message);
    }
    send(res, 400, { message: "Please check the form", errors });
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
  // 423 Locked: the website shows its lock screen
  if (error instanceof SessionLockedError) {
    send(res, 423, { message: error.message, locked: true });
    return;
  }
  if (error instanceof WrongPasswordError) {
    send(res, 400, {
      message: error.message,
      errors: { [error.field]: [error.message] },
    });
    return;
  }
  if (error instanceof CodeError) {
    send(res, 400, {
      message: error.message,
      errors: { code: [error.message] },
    });
    return;
  }
  // The website goes back to the email and password step
  if (error instanceof SignInExpiredError) {
    send(res, 400, { message: error.message, signInExpired: true });
    return;
  }
  if (error instanceof FamilyError) {
    send(res, 400, {
      message: error.message,
      errors: error.field ? { [error.field]: [error.message] } : undefined,
    });
    return;
  }
  if (error instanceof ReminderError) {
    send(res, 400, {
      message: error.message,
      errors: error.field ? { [error.field]: [error.message] } : undefined,
    });
    return;
  }
  if (error instanceof DeviceKeyError) {
    send(res, 400, { message: error.message });
    return;
  }
  if (error instanceof ShareFormError) {
    send(res, 400, {
      message: error.message,
      errors: error.field ? { [error.field]: [error.message] } : undefined,
    });
    return;
  }
  // The doctor's page: a wrong PIN (400), too many (429), opened enough (410)
  if (error instanceof ShareError) {
    const status = { pin: 400, wait: 429, used: 410 }[error.kind];
    send(res, status, {
      message: error.message,
      errors: error.kind === "pin" ? { pin: [error.message] } : undefined,
    });
    return;
  }
  if (error instanceof PushNotSetUpError) {
    send(res, 503, { message: error.message });
    return;
  }
  if (error instanceof FileError) {
    send(res, 400, { message: error.message });
    return;
  }
  if (error instanceof FilesNotSetUpError) {
    send(res, 503, { message: error.message });
    return;
  }
  // express.raw(): an upload bigger than allowed
  if (
    error?.type === "entity.too.large" &&
    req.path.startsWith("/api/uploads")
  ) {
    send(res, 413, { message: FileError.tooBig().message });
    return;
  }
  if (error instanceof PasskeyError) {
    send(res, 400, { message: error.message });
    return;
  }
  if (error instanceof ForbiddenError) {
    send(res, 403, { message: error.message });
    return;
  }
  if (error instanceof NotFoundError) {
    send(res, 404, { message: error.message });
    return;
  }
  if (error instanceof EmailNotSetUpError) {
    send(res, 503, { message: error.message });
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
