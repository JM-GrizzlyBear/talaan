import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import {
  NotLoggedInError,
  WrongPasswordError,
} from "../../domain/user/errors.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";

// The website locked after a while: the signed-in person types their password again
export class UnlockSession {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async execute(userId: string, password: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotLoggedInError();
    if (!(await this.passwords.compare(password, user.passwordHash))) {
      throw new WrongPasswordError("password");
    }
    return toSafeUser(user);
  }
}
