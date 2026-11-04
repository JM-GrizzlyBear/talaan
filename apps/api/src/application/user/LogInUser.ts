import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { InvalidCredentialsError } from "../../domain/user/errors.js";
import { normalizeEmail } from "../../domain/user/rules.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";

export interface LogInUserInput {
  email: string;
  password: string;
}

export class LogInUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async execute(input: LogInUserInput) {
    const user = await this.users.findByEmail(normalizeEmail(input.email));

    // Same error either way: don't reveal which emails have an account
    if (
      !user ||
      !(await this.passwords.compare(input.password, user.passwordHash))
    ) {
      throw new InvalidCredentialsError();
    }
    return toSafeUser(user);
  }
}
