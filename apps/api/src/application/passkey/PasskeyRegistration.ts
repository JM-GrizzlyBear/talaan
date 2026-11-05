import { fullName } from "@talaan/shared";
import type { PasskeyRepository } from "../../domain/passkey/PasskeyRepository.js";
import { PasskeyError } from "../../domain/passkey/errors.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import { NotLoggedInError } from "../../domain/user/errors.js";
import type { PasskeyCeremonies } from "../ports/PasskeyCeremonies.js";

// Adding a passkey on the Security page: the device makes a key pair and
// Talaan keeps the public half
export class PasskeyRegistration {
  constructor(
    private readonly users: UserRepository,
    private readonly passkeys: PasskeyRepository,
    private readonly ceremonies: PasskeyCeremonies,
  ) {}

  async start(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotLoggedInError();
    const existing = await this.passkeys.listForUser(userId);
    return await this.ceremonies.registrationOptions({
      userId: user.id,
      userName: user.email,
      displayName: fullName(user),
      exclude: existing.map((p) => ({
        id: p.credentialId,
        transports: p.transports,
      })),
    });
  }

  async finish(input: {
    userId: string;
    name: string;
    response: unknown;
    expectedChallenge: string;
  }) {
    const verified = await this.ceremonies.verifyRegistration(
      input.response,
      input.expectedChallenge,
    );
    if (await this.passkeys.findByCredentialId(verified.credentialId)) {
      throw new PasskeyError("That passkey is already added.");
    }
    return await this.passkeys.create({
      userId: input.userId,
      name: input.name,
      ...verified,
    });
  }
}
