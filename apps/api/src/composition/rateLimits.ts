import type { Request } from "express";
import {
  emailKey,
  rateLimit,
  userKey,
} from "../presentation/http/middleware/rateLimit.js";
import type { BuildAppOptions } from "./options.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

// Each action gets its own counter, so signing in, unlocking and resetting a
// password don't use up each other's tries. A family at home shares one IP address.
export function createRateLimits(options: BuildAppOptions) {
  const { clock } = options;
  const tries = (key?: (req: Request) => string | undefined) =>
    rateLimit({
      windowMs: FIFTEEN_MINUTES,
      max: options.authLimit ?? 20,
      clock,
      key,
      message: "Too many tries. Please wait a few minutes.",
    });

  return {
    // Per visitor (IP address): signing in, signing up, the invitation link
    tries,
    // Forgot-password codes per email address
    resetEmail: rateLimit({
      windowMs: FIFTEEN_MINUTES,
      max: options.resetEmailLimit ?? 3,
      clock,
      key: emailKey,
      message:
        "We already sent a few codes to that email. Please wait a few minutes, then check your inbox and spam folder.",
    }),
    // New two-step codes per person waiting for one
    signInCodeResend: rateLimit({
      windowMs: FIFTEEN_MINUTES,
      max: options.signInCodeLimit ?? 3,
      clock,
      key: (req) =>
        req.session?.pendingUserId
          ? `pending:${req.session.pendingUserId}`
          : undefined,
      message:
        "We already sent a few codes. Please wait a few minutes, then check your inbox and spam folder.",
    }),
    // Family invitations to one email address a day
    inviteEmail: rateLimit({
      windowMs: ONE_DAY,
      max: options.invitationEmailLimit ?? 3,
      clock,
      key: (req) => {
        const key = emailKey(req);
        return key && `invite:${key}`;
      },
      message:
        "That email already got a few invitations today. Please try again tomorrow.",
    }),
    // Emails for one invitation a day
    invitationResend: rateLimit({
      windowMs: ONE_DAY,
      max: options.invitationEmailLimit ?? 3,
      clock,
      key: (req) =>
        typeof req.params.id === "string"
          ? `resend:${req.params.id}`
          : undefined,
      message:
        "That invitation was already sent a few times today. Please try again tomorrow.",
    }),
    // Adding a family's old records (and their photos) takes many saves in a row
    records: rateLimit({
      windowMs: FIFTEEN_MINUTES,
      max: options.recordsLimit ?? 300,
      clock,
      key: userKey,
      message: "That's a lot of changes at once. Please wait a few minutes.",
    }),
    userKey,
  };
}

export type RateLimits = ReturnType<typeof createRateLimits>;
