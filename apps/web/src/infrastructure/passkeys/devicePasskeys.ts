import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  WebAuthnError,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

// The device's own passkey prompt (Face ID, fingerprint, Windows Hello, the
// phone's PIN). Only the API knows whether the answer is good.

// Thrown when the person closed the prompt or it timed out: not really an error,
// so the pages show a gentle message instead of a red one
export class PasskeyCancelledError extends Error {
  constructor(
    message = "The passkey prompt was closed. Try again when you're ready.",
  ) {
    super(message);
    this.name = "PasskeyCancelledError";
  }
}

export class PasskeyDeviceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasskeyDeviceError";
  }
}

export function passkeysSupported() {
  return browserSupportsWebAuthn();
}

function explain(error: unknown): Error {
  const name = error instanceof Error ? error.name : "";
  const code = error instanceof WebAuthnError ? error.code : undefined;
  if (name === "NotAllowedError" || name === "AbortError") {
    return new PasskeyCancelledError();
  }
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
    return new PasskeyDeviceError(
      "This device already has a Talaan passkey for you.",
    );
  }
  if (code === "ERROR_INVALID_DOMAIN" || code === "ERROR_INVALID_RP_ID") {
    return new PasskeyDeviceError(
      "Passkeys don't work on this address. Open Talaan from its usual address and try again.",
    );
  }
  return new PasskeyDeviceError(
    "This device couldn't make or use a passkey. Try another device, or use your password.",
  );
}

export async function createPasskeyOnDevice(options: unknown) {
  try {
    return await startRegistration({
      optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
    });
  } catch (error) {
    throw explain(error);
  }
}

export async function signWithPasskeyOnDevice(options: unknown) {
  try {
    return await startAuthentication({
      optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
    });
  } catch (error) {
    throw explain(error);
  }
}
