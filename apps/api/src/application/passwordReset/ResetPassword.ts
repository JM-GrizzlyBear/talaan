import type { ResetCodeRepository } from "../../domain/passwordReset/ResetCodeRepository.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import type { AccountEmails } from "../ports/AccountEmails.js";
import type { Clock } from "../ports/Clock.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import type { SessionStore } from "../ports/SessionStore.js";
import type { CheckResetCode } from "./CheckResetCode.js";

// Step 3: the code is right, so save the new password and sign out every device,
// because whoever knew the old password shouldn't stay signed in
export class ResetPassword {
  constructor(
    private readonly checkCode: CheckResetCode,
    private readonly users: UserRepository,
    private readonly codes: ResetCodeRepository,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionStore,
    private readonly clock: Clock,
    private readonly emails: AccountEmails | null,
  ) {}

  async execute(input: { email: string; code: string; password: string }) {
    const user = await this.checkCode.execute(input);
    const now = this.clock.now();

    await this.users.updatePassword(
      user.id,
      await this.passwords.hash(input.password),
      now,
    );
    await this.codes.remove(user.id);
    await this.sessions.deleteAllSessions(user.id);
    await this.emails?.sendPasswordChanged(
      { email: user.email, firstName: user.firstName },
      now,
    );
  }
}
