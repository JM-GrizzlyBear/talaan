import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import {
  EmailTakenError,
  UsernameTakenError,
} from "../../domain/user/errors.js";
import { normalizeLogin } from "../../domain/user/rules.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";

export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
}

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async execute(input: RegisterUserInput) {
    const username = normalizeLogin(input.username);
    const email = normalizeLogin(input.email);

    if (await this.users.findByUsername(username))
      throw new UsernameTakenError();
    if (await this.users.findByEmail(email)) throw new EmailTakenError();

    const user = await this.users.create({
      username,
      email,
      passwordHash: await this.passwords.hash(input.password),
    });
    return toSafeUser(user);
  }
}
