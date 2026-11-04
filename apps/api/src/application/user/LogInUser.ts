import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { InvalidCredentialsError } from "../../domain/user/errors.js";
import { isEmail, normalizeLogin } from "../../domain/user/rules.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";

export interface LogInUserInput {
  // A username or an email address
  login: string;
  password: string;
}

export class LogInUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async execute(input: LogInUserInput) {
    const login = normalizeLogin(input.login);
    const user = isEmail(login)
      ? await this.users.findByEmail(login)
      : await this.users.findByUsername(login);

    // Same error either way: don't reveal which usernames exist
    if (
      !user ||
      !(await this.passwords.compare(input.password, user.passwordHash))
    ) {
      throw new InvalidCredentialsError();
    }
    return toSafeUser(user);
  }
}
