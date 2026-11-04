import { toSafeUser, type SafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { InvalidCredentialsError } from "../../domain/user/errors.js";
import { normalizeEmail } from "../../domain/user/rules.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import type { SendSignInCode } from "../twoStep/SendSignInCode.js";
import type { TrustedBrowsers } from "../twoStep/TrustedBrowsers.js";

export interface LogInUserInput {
  email: string;
  password: string;
  // The remembered-browser cookie, when this browser has one
  trustCookie?: string;
}

export type LogInResult =
  | { kind: "signedIn"; user: SafeUser }
  // Two-step: a code was emailed, and signing in finishes with it
  | { kind: "needsCode"; user: SafeUser };

export class LogInUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly trustedBrowsers: TrustedBrowsers,
    // null when the server can't send email: then two-step can't work, so it's skipped
    private readonly sendSignInCode: SendSignInCode | null,
  ) {}

  async execute(input: LogInUserInput): Promise<LogInResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));

    // Same error either way: don't reveal which emails have an account
    if (
      !user ||
      !(await this.passwords.compare(input.password, user.passwordHash))
    ) {
      throw new InvalidCredentialsError();
    }
    const safe = toSafeUser(user);

    if (!user.twoStepEnabled || !this.sendSignInCode) {
      return { kind: "signedIn", user: safe };
    }
    if (await this.trustedBrowsers.check(user.id, input.trustCookie)) {
      return { kind: "signedIn", user: safe };
    }
    await this.sendSignInCode.execute(user);
    return { kind: "needsCode", user: safe };
  }
}
