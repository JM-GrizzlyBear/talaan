import type {
  CredentialRef,
  PasskeyCeremonies,
} from "../../src/application/ports/PasskeyCeremonies.js";
import { PasskeyError } from "../../src/domain/passkey/errors.js";

// A stand-in for the WebAuthn library, so tests can "use a device" without one.
// A real device signs the challenge; here the answer just repeats it, and
// says "sig:<credential id>" where a real signature would be.
// (The browser check uses Chrome's virtual authenticator with the real library.)
export class FakePasskeyCeremonies implements PasskeyCeremonies {
  private made = 0;
  // What the last prompt offered, so tests can check it
  lastExclude: CredentialRef[] = [];
  lastAllow: CredentialRef[] | undefined;

  private nextChallenge() {
    this.made += 1;
    return `challenge-${this.made}`;
  }

  async registrationOptions(input: {
    userId: string;
    userName: string;
    displayName: string;
    exclude: CredentialRef[];
  }) {
    this.lastExclude = input.exclude;
    const challenge = this.nextChallenge();
    return {
      options: { challenge, user: { name: input.userName } },
      challenge,
    };
  }

  async verifyRegistration(response: unknown, expectedChallenge: string) {
    const answer = response as FakeAnswer;
    if (answer.response.challenge !== expectedChallenge) {
      throw PasskeyError.didNotWork();
    }
    return {
      credentialId: answer.id,
      publicKey: new TextEncoder().encode(`public-key-of-${answer.id}`),
      counter: 0,
      transports: ["internal"],
      deviceType: "multiDevice",
      backedUp: true,
    };
  }

  async authenticationOptions(allow?: CredentialRef[]) {
    this.lastAllow = allow;
    const challenge = this.nextChallenge();
    return { options: { challenge, allowCredentials: allow ?? [] }, challenge };
  }

  credentialIdOf(response: unknown) {
    return (response as FakeAnswer | null)?.id ?? null;
  }

  async verifyAuthentication(
    response: unknown,
    expectedChallenge: string,
    passkey: CredentialRef & { publicKey: Uint8Array; counter: number },
  ) {
    const answer = response as FakeAnswer;
    const counter = answer.response.counter ?? passkey.counter + 1;
    if (
      answer.response.challenge !== expectedChallenge ||
      answer.response.signature !== `sig:${passkey.id}` ||
      // A copied key would repeat an old counter
      counter <= passkey.counter
    ) {
      throw PasskeyError.didNotWork();
    }
    return { newCounter: counter };
  }
}

interface FakeAnswer {
  id: string;
  rawId: string;
  type: "public-key";
  response: { challenge: string; signature?: string; counter?: number };
}

// What the "device" sends back for a prompt
export function deviceAnswer(
  credentialId: string,
  challenge: string,
  extra: { signature?: string; counter?: number } = {},
): FakeAnswer {
  return {
    id: credentialId,
    rawId: credentialId,
    type: "public-key",
    response: { challenge, signature: `sig:${credentialId}`, ...extra },
  };
}
