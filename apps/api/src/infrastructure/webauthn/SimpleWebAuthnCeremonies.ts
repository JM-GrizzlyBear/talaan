import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransport,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type {
  CredentialRef,
  PasskeyCeremonies,
} from "../../application/ports/PasskeyCeremonies.js";
import { PasskeyError } from "../../domain/passkey/errors.js";

export interface WebAuthnSettings {
  // The website's domain, like "talaan.netlify.app" (no https://, no port)
  rpId: string;
  // The website's address exactly as the browser shows it, like "https://talaan.netlify.app"
  origin: string;
}

const TIMEOUT_MS = 5 * 60 * 1000;

const asTransports = (transports: string[]) =>
  transports as AuthenticatorTransport[];

// Passkeys through @simplewebauthn/server. Talaan always asks the device to check
// it's really the owner (Face ID, fingerprint, PIN): userVerification "required".
export class SimpleWebAuthnCeremonies implements PasskeyCeremonies {
  constructor(private readonly settings: WebAuthnSettings) {}

  async registrationOptions(input: {
    userId: string;
    userName: string;
    displayName: string;
    exclude: CredentialRef[];
  }) {
    const options = await generateRegistrationOptions({
      rpName: "Talaan",
      rpID: this.settings.rpId,
      userID: new TextEncoder().encode(input.userId),
      userName: input.userName,
      userDisplayName: input.displayName,
      timeout: TIMEOUT_MS,
      attestationType: "none",
      excludeCredentials: input.exclude.map((c) => ({
        id: c.id,
        transports: asTransports(c.transports),
      })),
      // A discoverable passkey, so signing in needs no email
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });
    return { options, challenge: options.challenge };
  }

  async verifyRegistration(response: unknown, expectedChallenge: string) {
    try {
      const result = await verifyRegistrationResponse({
        response: response as RegistrationResponseJSON,
        expectedChallenge,
        expectedOrigin: this.settings.origin,
        expectedRPID: this.settings.rpId,
        requireUserVerification: true,
      });
      if (!result.verified) throw PasskeyError.didNotWork();
      const info = result.registrationInfo;
      return {
        credentialId: info.credential.id,
        publicKey: info.credential.publicKey,
        counter: info.credential.counter,
        transports: info.credential.transports ?? [],
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
      };
    } catch (error) {
      if (error instanceof PasskeyError) throw error;
      // The library explains what was wrong; that's for the log, not the person
      console.warn(
        "Passkey registration didn't verify:",
        (error as Error).message,
      );
      throw PasskeyError.didNotWork();
    }
  }

  async authenticationOptions(allow?: CredentialRef[]) {
    const options = await generateAuthenticationOptions({
      rpID: this.settings.rpId,
      timeout: TIMEOUT_MS,
      userVerification: "required",
      allowCredentials: allow?.map((c) => ({
        id: c.id,
        transports: asTransports(c.transports),
      })),
    });
    return { options, challenge: options.challenge };
  }

  credentialIdOf(response: unknown) {
    const id = (response as { id?: unknown } | null)?.id;
    return typeof id === "string" && id.length > 0 ? id : null;
  }

  async verifyAuthentication(
    response: unknown,
    expectedChallenge: string,
    passkey: CredentialRef & { publicKey: Uint8Array; counter: number },
  ) {
    try {
      const result = await verifyAuthenticationResponse({
        response: response as AuthenticationResponseJSON,
        expectedChallenge,
        expectedOrigin: this.settings.origin,
        expectedRPID: this.settings.rpId,
        credential: {
          id: passkey.id,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: passkey.counter,
          transports: asTransports(passkey.transports),
        },
        requireUserVerification: true,
      });
      if (!result.verified) throw PasskeyError.didNotWork();
      return { newCounter: result.authenticationInfo.newCounter };
    } catch (error) {
      if (error instanceof PasskeyError) throw error;
      console.warn("Passkey sign-in didn't verify:", (error as Error).message);
      throw PasskeyError.didNotWork();
    }
  }
}
