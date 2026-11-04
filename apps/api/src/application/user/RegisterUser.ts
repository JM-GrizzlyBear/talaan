import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { EmailTakenError } from "../../domain/user/errors.js";
import { normalizeEmail } from "../../domain/user/rules.js";
import type { Clock } from "../ports/Clock.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";

export interface RegisterUserInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
}

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  // The form already required the privacy consent box; this records when it was given
  async execute(input: RegisterUserInput) {
    const email = normalizeEmail(input.email);
    if (await this.users.findByEmail(email)) throw new EmailTakenError();

    const user = await this.users.create({
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() || null,
      lastName: input.lastName.trim(),
      email,
      passwordHash: await this.passwords.hash(input.password),
      privacyConsentAt: this.clock.now(),
    });
    return toSafeUser(user);
  }
}
