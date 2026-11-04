import { codeExpiry } from "../../domain/emailCode/rules.js";
import { EmailNotSetUpError } from "../../domain/emailCode/errors.js";
import type { EmailCodeRepository } from "../../domain/emailCode/EmailCodeRepository.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { normalizeEmail } from "../../domain/user/rules.js";
import type { AccountEmails } from "../ports/AccountEmails.js";
import type { Clock } from "../ports/Clock.js";
import type { SecretCodes } from "../ports/SecretCodes.js";

// Step 1 of "forgot password": email a 6-digit code. It answers the same way
// whether or not the email has an account, so nobody can use it to find accounts.
export class RequestPasswordReset {
  constructor(
    private readonly users: UserRepository,
    private readonly codes: EmailCodeRepository,
    private readonly secrets: SecretCodes,
    private readonly clock: Clock,
    private readonly emails: AccountEmails | null,
  ) {}

  async execute(email: string) {
    // Checked first, so the answer never depends on whether the account exists
    if (!this.emails) throw new EmailNotSetUpError();

    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user) return;

    const code = this.secrets.newCode();
    await this.codes.replace({
      userId: user.id,
      codeHash: this.secrets.hash(code, user.id),
      expiresAt: codeExpiry(this.clock.now()),
    });
    await this.emails.sendPasswordResetCode(
      { email: user.email, firstName: user.firstName },
      code,
    );
  }
}
