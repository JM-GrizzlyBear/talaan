import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import type { Pool } from "pg";
import { CheckResetCode } from "./application/passwordReset/CheckResetCode.js";
import { RequestPasswordReset } from "./application/passwordReset/RequestPasswordReset.js";
import { ResetPassword } from "./application/passwordReset/ResetPassword.js";
import { AuditTrail } from "./application/audit/AuditTrail.js";
import { FamilyInvitations } from "./application/family/FamilyInvitations.js";
import { FamilyMembers } from "./application/family/FamilyMembers.js";
import { FamilyProfiles } from "./application/family/FamilyProfiles.js";
import { Records } from "./application/record/Records.js";
import { ManagePasskeys } from "./application/passkey/ManagePasskeys.js";
import { PasskeyRegistration } from "./application/passkey/PasskeyRegistration.js";
import { PasskeySignIn } from "./application/passkey/PasskeySignIn.js";
import type { AccountEmails } from "./application/ports/AccountEmails.js";
import type { Clock } from "./application/ports/Clock.js";
import type { PasskeyCeremonies } from "./application/ports/PasskeyCeremonies.js";
import type { PasswordHasher } from "./application/ports/PasswordHasher.js";
import type { SecretCodes } from "./application/ports/SecretCodes.js";
import { SendSignInCode } from "./application/twoStep/SendSignInCode.js";
import { TrustedBrowsers } from "./application/twoStep/TrustedBrowsers.js";
import { VerifySignInCode } from "./application/twoStep/VerifySignInCode.js";
import { ChangePassword } from "./application/user/ChangePassword.js";
import { GetCurrentUser } from "./application/user/GetCurrentUser.js";
import { LogInUser } from "./application/user/LogInUser.js";
import { RegisterUser } from "./application/user/RegisterUser.js";
import { SignOutOtherSessions } from "./application/user/SignOutOtherSessions.js";
import { UnlockSession } from "./application/user/UnlockSession.js";
import { UpdateSecuritySettings } from "./application/user/UpdateSecuritySettings.js";
import { PostgresAuditRepository } from "./infrastructure/database/PostgresAuditRepository.js";
import { PostgresEmailCodeRepository } from "./infrastructure/database/PostgresEmailCodeRepository.js";
import { PostgresFamilyAccessRepository } from "./infrastructure/database/PostgresFamilyAccessRepository.js";
import { PostgresFamilyInvitationRepository } from "./infrastructure/database/PostgresFamilyInvitationRepository.js";
import { PostgresFamilyProfileRepository } from "./infrastructure/database/PostgresFamilyProfileRepository.js";
import { PostgresPasskeyRepository } from "./infrastructure/database/PostgresPasskeyRepository.js";
import { PostgresRecordRepository } from "./infrastructure/database/PostgresRecordRepository.js";
import { PostgresSessionStore } from "./infrastructure/database/PostgresSessionStore.js";
import { PostgresTrustedBrowserRepository } from "./infrastructure/database/PostgresTrustedBrowserRepository.js";
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
import { familyRoutes } from "./presentation/http/routes/familyRoutes.js";
import { healthRoutes } from "./presentation/http/routes/healthRoutes.js";
import { recordsRoutes } from "./presentation/http/routes/recordsRoutes.js";
import { passwordResetRoutes } from "./presentation/http/routes/passwordResetRoutes.js";
import { createSessionMiddleware } from "./presentation/http/session.js";

export interface BuildAppOptions {
  pool: Pool;
  sessionSecret: string;
  passwordHasher: PasswordHasher;
  secretCodes: SecretCodes;
  // null: no email service set up, so Forgot password can't send codes
  emails: AccountEmails | null;
  passkeyCeremonies: PasskeyCeremonies;
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
  // New two-step sign-in codes per person every 15 minutes
  signInCodeLimit?: number;
  // Family invitations to one email address (and emails for one invitation) per day
  invitationEmailLimit?: number;
  // Record changes per person every 15 minutes
  recordsLimit?: number;
}

// The composition root: the only place that knows every concrete class.
// main.ts runs it for real; the tests build their own copy.
export function buildApp(options: BuildAppOptions) {
  const { clock, passwordHasher, emails } = options;
  const users = new PostgresUserRepository(options.pool);
  const resetCodes = new PostgresEmailCodeRepository(
    options.pool,
    "password_reset_codes",
  );
  const signInCodes = new PostgresEmailCodeRepository(
    options.pool,
    "sign_in_codes",
  );
  const passkeys = new PostgresPasskeyRepository(options.pool);
  const sessions = new PostgresSessionStore(options.pool);
  const trustedBrowsers = new TrustedBrowsers(
    new PostgresTrustedBrowserRepository(options.pool),
    options.secretCodes,
    clock,
  );
  // Two-step sign-in needs email; without it, signing in takes just the password
  const sendSignInCode = emails
    ? new SendSignInCode(signInCodes, options.secretCodes, clock, emails)
    : null;
  const passkeySignIn = new PasskeySignIn(
    users,
    passkeys,
    options.passkeyCeremonies,
    clock,
  );

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
  const resendLimit = rateLimit({
    windowMs: fifteenMinutes,
    max: options.signInCodeLimit ?? 3,
    clock,
    key: (req) =>
      req.session?.pendingUserId
        ? `pending:${req.session.pendingUserId}`
        : undefined,
    message:
      "We already sent a few codes. Please wait a few minutes, then check your inbox and spam folder.",
  });

  const oneDay = 24 * 60 * 60 * 1000;
  const inviteEmailLimit = rateLimit({
    windowMs: oneDay,
    max: options.invitationEmailLimit ?? 3,
    clock,
    key: (req) => {
      const key = emailKey(req);
      return key && `invite:${key}`;
    },
    message:
      "That email already got a few invitations today. Please try again tomorrow.",
  });
  const invitationResendLimit = rateLimit({
    windowMs: oneDay,
    max: options.invitationEmailLimit ?? 3,
    clock,
    key: (req) =>
      typeof req.params.id === "string" ? `resend:${req.params.id}` : undefined,
    message:
      "That invitation was already sent a few times today. Please try again tomorrow.",
  });

  const familyAccess = new PostgresFamilyAccessRepository(options.pool);
  const familyInvitations = new PostgresFamilyInvitationRepository(
    options.pool,
  );
  const familyProfiles = new PostgresFamilyProfileRepository(options.pool);
  const records = new PostgresRecordRepository(options.pool);
  const auditTrail = new AuditTrail(
    new PostgresAuditRepository(options.pool),
    users,
    clock,
  );
  const familyMembers = new FamilyMembers(
    familyAccess,
    familyInvitations,
    familyProfiles,
    clock,
    auditTrail,
  );

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
      logInUser: new LogInUser(
        users,
        passwordHasher,
        trustedBrowsers,
        sendSignInCode,
      ),
      verifySignInCode: new VerifySignInCode(
        users,
        signInCodes,
        options.secretCodes,
        clock,
      ),
      sendSignInCode,
      trustedBrowsers,
      getCurrentUser: new GetCurrentUser(users),
      unlockSession: new UnlockSession(users, passwordHasher),
      passkeySignIn,
      clock,
      secureCookie: options.secureCookie,
      limit: tries(),
      unlockLimit: tries(userKey),
      resendLimit,
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
        trustedBrowsers,
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
        trustedBrowsers,
        clock,
        emails,
      ),
      updateSecuritySettings: new UpdateSecuritySettings(users, passwordHasher),
      passkeyRegistration: new PasskeyRegistration(
        users,
        passkeys,
        options.passkeyCeremonies,
      ),
      managePasskeys: new ManagePasskeys(passkeys),
      trustedBrowsers,
      signOutOtherSessions: new SignOutOtherSessions(sessions),
      clock,
      requireAuth: requireAuth(clock),
      limit: tries(userKey),
    }),
  );
  app.use(
    "/api",
    familyRoutes({
      invitations: new FamilyInvitations(
        users,
        familyInvitations,
        familyAccess,
        options.secretCodes,
        clock,
        emails,
        auditTrail,
      ),
      members: familyMembers,
      profiles: new FamilyProfiles(familyProfiles, records, auditTrail),
      requireAuth: requireAuth(clock),
      limit: tries(),
      userLimit: tries(userKey),
      inviteEmailLimit,
      resendLimit: invitationResendLimit,
    }),
  );
  const recordsUseCases = new Records(
    records,
    familyProfiles,
    users,
    familyAccess,
    familyMembers,
    auditTrail,
    clock,
  );
  app.use(
    "/api",
    recordsRoutes({
      records: recordsUseCases,
      requireAuth: requireAuth(clock),
      // Adding a family's old records takes many saves in a row
      limit: rateLimit({
        windowMs: fifteenMinutes,
        max: options.recordsLimit ?? 300,
        clock,
        key: userKey,
        message: "That's a lot of changes at once. Please wait a few minutes.",
      }),
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
  // main.ts runs this every hour: records 30 days in the Trash are deleted for good
  return Object.assign(app, {
    purgeExpiredTrash: () => recordsUseCases.purgeExpired(),
  });
}
