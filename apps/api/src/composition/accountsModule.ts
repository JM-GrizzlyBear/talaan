import { ManagePasskeys } from "../application/passkey/ManagePasskeys.js";
import { PasskeyRegistration } from "../application/passkey/PasskeyRegistration.js";
import { PasskeySignIn } from "../application/passkey/PasskeySignIn.js";
import { CheckResetCode } from "../application/passwordReset/CheckResetCode.js";
import { RequestPasswordReset } from "../application/passwordReset/RequestPasswordReset.js";
import { ResetPassword } from "../application/passwordReset/ResetPassword.js";
import { SendSignInCode } from "../application/twoStep/SendSignInCode.js";
import { TrustedBrowsers } from "../application/twoStep/TrustedBrowsers.js";
import { VerifySignInCode } from "../application/twoStep/VerifySignInCode.js";
import { ChangePassword } from "../application/user/ChangePassword.js";
import { GetCurrentUser } from "../application/user/GetCurrentUser.js";
import { LogInUser } from "../application/user/LogInUser.js";
import { RegisterUser } from "../application/user/RegisterUser.js";
import { SignOutOtherSessions } from "../application/user/SignOutOtherSessions.js";
import { UnlockSession } from "../application/user/UnlockSession.js";
import { UpdateSecuritySettings } from "../application/user/UpdateSecuritySettings.js";
import { accountRoutes } from "../presentation/http/routes/accountRoutes.js";
import { authRoutes } from "../presentation/http/routes/authRoutes.js";
import { passkeyAuthRoutes } from "../presentation/http/routes/passkeyAuthRoutes.js";
import { passwordResetRoutes } from "../presentation/http/routes/passwordResetRoutes.js";
import { signInCodeRoutes } from "../presentation/http/routes/signInCodeRoutes.js";
import type { AppContext } from "./context.js";

// Accounts: signing up and in (password, emailed code, passkeys), the idle
// lock, Forgot password, and the Security page
export function accountsModule({
  options,
  repos,
  limits,
  requireAuth,
}: AppContext) {
  const { clock, passwordHasher, emails, secretCodes } = options;
  const { users, sessions } = repos;
  const trustedBrowsers = new TrustedBrowsers(
    repos.trustedBrowsers,
    secretCodes,
    clock,
  );
  // Two-step sign-in needs email; without it, signing in takes just the password
  const sendSignInCode = emails
    ? new SendSignInCode(repos.signInCodes, secretCodes, clock, emails)
    : null;
  const getCurrentUser = new GetCurrentUser(users);
  const checkResetCode = new CheckResetCode(
    users,
    repos.resetCodes,
    secretCodes,
    clock,
  );

  return [
    authRoutes({
      registerUser: new RegisterUser(users, passwordHasher, clock),
      logInUser: new LogInUser(
        users,
        passwordHasher,
        trustedBrowsers,
        sendSignInCode,
      ),
      getCurrentUser,
      unlockSession: new UnlockSession(users, passwordHasher),
      clock,
      limit: limits.tries(),
      unlockLimit: limits.tries(limits.userKey),
    }),
    signInCodeRoutes({
      verifySignInCode: new VerifySignInCode(
        users,
        repos.signInCodes,
        secretCodes,
        clock,
      ),
      sendSignInCode,
      getCurrentUser,
      trustedBrowsers,
      clock,
      secureCookie: options.secureCookie,
      limit: limits.tries(),
      resendLimit: limits.signInCodeResend,
    }),
    passkeyAuthRoutes({
      passkeySignIn: new PasskeySignIn(
        users,
        repos.passkeys,
        options.passkeyCeremonies,
        clock,
      ),
      clock,
      limit: limits.tries(),
      unlockLimit: limits.tries(limits.userKey),
    }),
    passwordResetRoutes({
      requestPasswordReset: new RequestPasswordReset(
        users,
        repos.resetCodes,
        secretCodes,
        clock,
        emails,
      ),
      checkResetCode,
      resetPassword: new ResetPassword(
        checkResetCode,
        users,
        repos.resetCodes,
        passwordHasher,
        sessions,
        trustedBrowsers,
        clock,
        emails,
      ),
      limit: limits.tries(),
      emailLimit: limits.resetEmail,
    }),
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
        repos.passkeys,
        options.passkeyCeremonies,
      ),
      managePasskeys: new ManagePasskeys(repos.passkeys),
      trustedBrowsers,
      signOutOtherSessions: new SignOutOtherSessions(sessions),
      clock,
      requireAuth,
      limit: limits.tries(limits.userKey),
    }),
  ];
}
