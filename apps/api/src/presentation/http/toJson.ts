import type {
  PasskeyInfo,
  PublicUser,
  TrustedBrowserInfo,
} from "@talaan/shared";
import type { Passkey } from "../../domain/passkey/Passkey.js";
import type { TrustedBrowser } from "../../domain/trustedBrowser/TrustedBrowser.js";
import type { SafeUser } from "../../domain/user/User.js";

// Domain objects → what the browser receives (dates as ISO strings, no internal fields)

export function userJson(user: SafeUser): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    email: user.email,
    lockAfterMinutes: user.lockAfterMinutes,
    twoStepEnabled: user.twoStepEnabled,
    passkeyCount: user.passkeyCount,
    createdAt: user.createdAt.toISOString(),
  };
}

// No key material: the browser only needs a name and dates
export function passkeyJson(passkey: Passkey): PasskeyInfo {
  return {
    id: passkey.id,
    name: passkey.name,
    synced: passkey.deviceType === "multiDevice",
    createdAt: passkey.createdAt.toISOString(),
    lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
  };
}

export function browserJson(
  browser: TrustedBrowser,
  currentId: string | null,
): TrustedBrowserInfo {
  return {
    id: browser.id,
    label: browser.label,
    current: browser.id === currentId,
    createdAt: browser.createdAt.toISOString(),
    lastUsedAt: browser.lastUsedAt.toISOString(),
    expiresAt: browser.expiresAt.toISOString(),
  };
}
