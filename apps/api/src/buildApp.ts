import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import type { Pool } from "pg";
import { CheckResetCode } from "./application/passwordReset/CheckResetCode.js";
import { RequestPasswordReset } from "./application/passwordReset/RequestPasswordReset.js";
import { ResetPassword } from "./application/passwordReset/ResetPassword.js";
import type { AccountEmails } from "./application/ports/AccountEmails.js";
import type { Clock } from "./application/ports/Clock.js";
import type { PasswordHasher } from "./application/ports/PasswordHasher.js";
import type { SecretCodes } from "./application/ports/SecretCodes.js";
import { ChangePassword } from "./application/user/ChangePassword.js";
import { GetCurrentUser } from "./application/user/GetCurrentUser.js";
import { LogInUser } from "./application/user/LogInUser.js";
import { RegisterUser } from "./application/user/RegisterUser.js";
import { UnlockSession } from "./application/user/UnlockSession.js";
import { UpdateSecuritySettings } from "./application/user/UpdateSecuritySettings.js";
import { PostgresResetCodeRepository } from "./infrastructure/database/PostgresResetCodeRepository.js";
import { PostgresSessionStore } from "./infrastructure/database/PostgresSessionStore.js";
import { PostgresUserRepository } from "./infrastructure/database/PostgresUserRepository.js";
import { apiNotFound, errorHandler } from "./presentation/http/errorHandler.js";
import {
  emailKey,
  rateLimit,
  userKey,
} from "./presentation/http/middleware/rateLimit.js";
import { requireAuth } from "./presentation/http/middleware/requireAuth.js";
import { accountRoutes } from "./presentation/http/routes/accountRoutes.js";
import { authRoutes } from "./presentation/http/routes/authRoutes.js";
import { healthRoutes } from "./presentation/http/routes/healthRoutes.js";
import { passwordResetRoutes } from "./presentation/http/routes/passwordResetRoutes.js";
import { createSessionMiddleware } from "./presentation/http/session.js";

export interface BuildAppOptions {
  pool: Pool;
  sessionSecret: string;
  passwordHasher: PasswordHasher;
  secretCodes: SecretCodes;
  // null: no email service set up, so Forgot password can't send codes
  emails: AccountEmails | null;
  clock: Clock;
  // HTTPS-only cookies (production)
  secureCookie: boolean;
  // How many proxies sit in front (0: none). Lets rate limits see real IP addresses.
  trustProxy: number;
  // The built website (apps/web/dist). When set, the API serves it too: one server, one address.
  webDistDir?: string;
  // Sign-in, sign-up and unlock tries per visitor every 15 minutes
  authLimit?: number;
  // Forgot-password codes per email address every 15 minutes
  resetEmailLimit?: number;
}

// The composition root: the only place that knows every concrete class.
// main.ts runs it for real; the tests build their own copy.
export function buildApp(options: BuildAppOptions) {
  const { clock, passwordHasher, emails } = options;
  const users = new PostgresUserRepository(options.pool);
  const resetCodes = new PostgresResetCodeRepository(options.pool);
  const sessions = new PostgresSessionStore(options.pool);

  // Each action gets its own counter, so signing in, unlocking and resetting a
  // password don't use up each other's tries. A family at home shares one IP address.
  const fifteenMinutes = 15 * 60 * 1000;
  const tries = (key?: (req: express.Request) => string | undefined) =>
    rateLimit({
      windowMs: fifteenMinutes,
      max: options.authLimit ?? 20,
      clock,
      key,
      message: "Too many tries. Please wait a few minutes.",
    });
  const emailLimit = rateLimit({
    windowMs: fifteenMinutes,
    max: options.resetEmailLimit ?? 3,
    clock,
    key: emailKey,
    message:
      "We already sent a few codes to that email. Please wait a few minutes, then check your inbox and spam folder.",
  });

  const app = express();
  app.disable("x-powered-by");
  if (options.trustProxy > 0) app.set("trust proxy", options.trustProxy);

  // Security headers: no framing, no MIME sniffing, a strict content security policy, …
  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));
  app.use(
    createSessionMiddleware({
      pool: options.pool,
      secret: options.sessionSecret,
      secureCookie: options.secureCookie,
    }),
  );

  const checkResetCode = new CheckResetCode(
    users,
    resetCodes,
    options.secretCodes,
    clock,
  );

  app.use("/api", healthRoutes(options.pool));
  app.use(
    "/api",
    authRoutes({
      registerUser: new RegisterUser(users, passwordHasher, clock),
      logInUser: new LogInUser(users, passwordHasher),
      getCurrentUser: new GetCurrentUser(users),
      unlockSession: new UnlockSession(users, passwordHasher),
      clock,
      limit: tries(),
      unlockLimit: tries(userKey),
    }),
  );
  app.use(
    "/api",
    passwordResetRoutes({
      requestPasswordReset: new RequestPasswordReset(
        users,
        resetCodes,
        options.secretCodes,
        clock,
        emails,
      ),
      checkResetCode,
      resetPassword: new ResetPassword(
        checkResetCode,
        users,
        resetCodes,
        passwordHasher,
        sessions,
        clock,
        emails,
      ),
      limit: tries(),
      emailLimit,
    }),
  );
  app.use(
    "/api",
    accountRoutes({
      changePassword: new ChangePassword(
        users,
        passwordHasher,
        sessions,
        clock,
        emails,
      ),
      updateSecuritySettings: new UpdateSecuritySettings(users),
      requireAuth: requireAuth(clock),
      limit: tries(userKey),
    }),
  );
  app.use("/api", apiNotFound);

  // Production: serve the website, and send every other page to index.html (React Router)
  if (options.webDistDir && existsSync(options.webDistDir)) {
    const indexHtml = path.join(options.webDistDir, "index.html");
    app.use(express.static(options.webDistDir, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}
