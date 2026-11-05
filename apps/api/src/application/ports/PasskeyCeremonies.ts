// The passkey "ceremonies" (WebAuthn): the server makes a random challenge, the
// device signs it, the server checks the signature. The use cases don't know
// which library does the cryptography.

export interface CredentialRef {
  id: string;
  transports: string[];
}

export interface PasskeyPrompt {
  // Sent as-is to the browser (@simplewebauthn/browser)
  options: unknown;
  // Kept in the session until the browser answers
  challenge: string;
}

export interface VerifiedRegistration {
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
}

export interface PasskeyCeremonies {
  registrationOptions(input: {
    userId: string;
    userName: string;
    displayName: string;
    // Passkeys this person already has, so a device isn't added twice
    exclude: CredentialRef[];
  }): Promise<PasskeyPrompt>;
  // Throws PasskeyError when the answer doesn't check out
  verifyRegistration(
    response: unknown,
    expectedChallenge: string,
  ): Promise<VerifiedRegistration>;
  // Without allow: any passkey for Talaan on the device (sign-in without typing an email)
  authenticationOptions(allow?: CredentialRef[]): Promise<PasskeyPrompt>;
  // Which passkey answered, before checking it
  credentialIdOf(response: unknown): string | null;
  // Returns the key's new counter. Throws PasskeyError when it doesn't check out.
  verifyAuthentication(
    response: unknown,
    expectedChallenge: string,
    passkey: CredentialRef & { publicKey: Uint8Array; counter: number },
  ): Promise<{ newCounter: number }>;
}
