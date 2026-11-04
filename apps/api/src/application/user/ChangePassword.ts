import type { UserRepository } from "../../domain/user/UserRepository.js";
import {
  NotLoggedInError,
  WrongPasswordError,
} from "../../domain/user/errors.js";
import type { AccountEmails } from "../ports/AccountEmails.js";
import type { Clock } from "../ports/Clock.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import type { SessionStore } from "../ports/SessionStore.js";

export interface ChangePasswordInput {
  userId: string;
  // This browser stays signed in; every other device is signed out
  sessionId: string;
  currentPassword: string;
  newPassword: string;
}

export class ChangePassword {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionStore,
    private readonly clock: Clock,
    private readonly emails: AccountEmails | null,
  ) {}

  async execute(input: ChangePasswordInput) {
    const user = await this.users.findById(input.userId);
    if (!user) throw new NotLoggedInError();
    if (
      !(await this.passwords.compare(input.currentPassword, user.passwordHash))
    ) {
      throw new WrongPasswordError("currentPassword");
    }

    const now = this.clock.now();
    await this.users.updatePassword(
      user.id,
      await this.passwords.hash(input.newPassword),
      now,
    );
    await this.sessions.deleteAllSessions(user.id, input.sessionId);
    await this.emails?.sendPasswordChanged(
      { email: user.email, firstName: user.firstName },
      now,
    );
  }
}
