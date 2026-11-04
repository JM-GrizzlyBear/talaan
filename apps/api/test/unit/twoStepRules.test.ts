import { maskEmail } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import {
  isTrustStillValid,
  parseTrustCookie,
  trustedUntil,
} from "../../src/domain/trustedBrowser/rules.js";
import { isPendingSignInValid } from "../../src/domain/user/signIn.js";
import { HmacSecretCodes } from "../../src/infrastructure/security/HmacSecretCodes.js";
import { browserLabel } from "../../src/presentation/http/userAgent.js";

const NOW = new Date("2026-11-05T12:00:00Z");
const days = (n: number) => n * 24 * 60 * 60 * 1000;

describe("remembered browsers", () => {
  it("trusts a browser for 30 days", () => {
    const expiresAt = trustedUntil(NOW);
    expect(expiresAt.getTime() - NOW.getTime()).toBe(days(30));
    expect(
      isTrustStillValid({ expiresAt }, new Date(NOW.getTime() + days(29))),
    ).toBe(true);
    expect(
      isTrustStillValid({ expiresAt }, new Date(NOW.getTime() + days(30))),
    ).toBe(false);
  });

  it("reads only well-formed cookies", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(parseTrustCookie(`${id}.abc`)).toEqual({ id, token: "abc" });
    expect(parseTrustCookie(undefined)).toBeNull();
    expect(parseTrustCookie("abc")).toBeNull();
    expect(parseTrustCookie(`not-a-uuid.abc`)).toBeNull();
    expect(parseTrustCookie(`${id}.`)).toBeNull();
  });

  it("makes long random tokens and checks them by hash", () => {
    const secrets = new HmacSecretCodes(
      "a-key-that-is-at-least-32-characters-long",
    );
    const token = secrets.newToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(secrets.newToken()).not.toBe(token);
    const hash = secrets.hashToken(token);
    expect(hash).not.toContain(token);
    expect(secrets.tokenMatches(token, hash)).toBe(true);
    expect(secrets.tokenMatches(`${token}x`, hash)).toBe(false);
  });
});

describe("two-step sign-in", () => {
  it("waits 15 minutes for the code", () => {
    const start = NOW.getTime();
    expect(isPendingSignInValid(start, start + 14 * 60 * 1000)).toBe(true);
    expect(isPendingSignInValid(start, start + 15 * 60 * 1000)).toBe(false);
  });

  it("hides most of the email address", () => {
    expect(maskEmail("maria@example.com")).toBe("m•••a@example.com");
    expect(maskEmail("jo@example.com")).toBe("j@example.com");
  });
});

describe("browser labels", () => {
  it("names common browsers and devices", () => {
    expect(
      browserLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome on Windows");
    expect(
      browserLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iPhone");
    expect(
      browserLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
      ),
    ).toBe("Edge on Windows");
    expect(browserLabel(undefined)).toBe("A browser");
  });
});
