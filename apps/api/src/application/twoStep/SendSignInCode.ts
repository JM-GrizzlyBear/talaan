import { EmailNotSetUpError } from "../../domain/emailCode/errors.js";
import type { EmailCodeRepository } from "../../domain/emailCode/EmailCodeRepository.js";
import { codeExpiry } from "../../domain/emailCode/rules.js";
import type { User } from "../../domain/user/User.js";
import type { AccountEmails } from "../ports/AccountEmails.js";
import type { Clock } from "../ports/Clock.js";
import type { SecretCodes } from "../ports/SecretCodes.js";

// Two-step sign-in: the password was right, so email a code to finish with.
// Asking again replaces the older code.
export class SendSignInCode {
  constructor(
    private readonly codes: EmailCodeRepository,
    private readonly secrets: SecretCodes,
    private readonly clock: Clock,
    private readonly emails: AccountEmails | null,
  ) {}

  async execute(user: Pick<User, "id" | "email" | "firstName">) {
    if (!this.emails) throw new EmailNotSetUpError();
    const code = this.secrets.newCode();
    await this.codes.replace({
      userId: user.id,
      codeHash: this.secrets.hash(code, user.id),
      expiresAt: codeExpiry(this.clock.now()),
    });
    await this.emails.sendSignInCode(
      { email: user.email, firstName: user.firstName },
      code,
    );
  }
}
