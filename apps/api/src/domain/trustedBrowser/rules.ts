import { TRUSTED_BROWSER_DAYS } from "@talaan/shared";
import type { TrustedBrowser } from "./TrustedBrowser.js";

export function trustedUntil(now: Date) {
  return new Date(now.getTime() + TRUSTED_BROWSER_DAYS * 24 * 60 * 60 * 1000);
}

export function isTrustStillValid(
  browser: Pick<TrustedBrowser, "expiresAt">,
  now: Date,
) {
  return now.getTime() < browser.expiresAt.getTime();
}

// The cookie holds "<id>.<token>": the id finds the row, the token proves it
export function parseTrustCookie(value: string | undefined) {
  if (!value) return null;
  const [id, token] = value.split(".");
  if (!id || !token || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return { id, token };
}
