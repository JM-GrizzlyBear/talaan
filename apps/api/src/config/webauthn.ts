import type { WebAuthnSettings } from "../infrastructure/webauthn/SimpleWebAuthnCeremonies.js";

// Passkeys belong to one website address. By default that's APP_URL (the
// address people open). WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN override it.
export function readWebAuthn(env: {
  appUrl: string;
  rpId?: string;
  origin?: string;
}): WebAuthnSettings {
  let url: URL;
  try {
    url = new URL(env.appUrl);
  } catch {
    throw new Error(
      "APP_URL must be a full address, like https://talaan.netlify.app",
    );
  }
  return {
    rpId: env.rpId ?? url.hostname,
    origin: (env.origin ?? url.origin).replace(/\/+$/, ""),
  };
}
