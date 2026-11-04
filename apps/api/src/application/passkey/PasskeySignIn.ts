import type { PasskeyRepository } from "../../domain/passkey/PasskeyRepository.js";
import { PasskeyError } from "../../domain/passkey/errors.js";
import { toSafeUser } from "../../domain/user/User.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import type { Clock } from "../ports/Clock.js";
import type { PasskeyCeremonies } from "../ports/PasskeyCeremonies.js";

// Signing in (or unlocking) with a passkey. A passkey is already two things at
// once, the device and the face/fingerprint/PIN, so it skips two-step sign-in.
export class PasskeySignIn {
  constructor(
    private readonly users: UserRepository,
    private readonly passkeys: PasskeyRepository,
    private readonly ceremonies: PasskeyCeremonies,
    private readonly clock: Clock,
  ) {}

  // userId: unlocking, so only that person's passkeys are offered.
  // Without it: signing in, and the device lists its Talaan passkeys.
  async start(userId?: string) {
    if (!userId) return await this.ceremonies.authenticationOptions();
    const passkeys = await this.passkeys.listForUser(userId);
    if (passkeys.length === 0) {
      throw new PasskeyError("You haven't added a passkey yet.");
    }
    return await this.ceremonies.authenticationOptions(
      passkeys.map((p) => ({ id: p.credentialId, transports: p.transports })),
    );
  }

  async finish(input: {
    response: unknown;
    expectedChallenge: string;
    // Unlocking: the passkey must belong to whoever is signed in
    expectedUserId?: string;
  }) {
    const credentialId = this.ceremonies.credentialIdOf(input.response);
    const passkey = credentialId
      ? await this.passkeys.findByCredentialId(credentialId)
      : null;
    if (!passkey) throw PasskeyError.unknown();
    if (input.expectedUserId && passkey.userId !== input.expectedUserId) {
      throw PasskeyError.didNotWork();
    }

    const { newCounter } = await this.ceremonies.verifyAuthentication(
      input.response,
      input.expectedChallenge,
      {
        id: passkey.credentialId,
        transports: passkey.transports,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
      },
    );
    await this.passkeys.recordUse(passkey.id, newCounter, this.clock.now());

    const user = await this.users.findById(passkey.userId);
    if (!user) throw PasskeyError.unknown();
    return toSafeUser(user);
  }
}
