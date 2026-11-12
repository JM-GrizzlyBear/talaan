import { DEFAULT_APPEARANCE } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import {
  isCodeUsable,
  codeExpiry,
  triesLeft,
} from "../../src/domain/emailCode/rules.js";
import { toSafeUser } from "../../src/domain/user/User.js";
import { isLockDue, normalizeEmail } from "../../src/domain/user/rules.js";
import { HmacSecretCodes } from "../../src/infrastructure/security/HmacSecretCodes.js";

const NOW = new Date("2026-11-04T12:00:00Z");
const minutes = (n: number) => n * 60 * 1000;

describe("user rules", () => {
  it("compares emails without capitals or spaces", () => {
    expect(normalizeEmail("  Maria@Example.COM ")).toBe("maria@example.com");
  });

  it("locks once the chosen minutes have passed", () => {
    const last = NOW.getTime();
    expect(isLockDue(last, last + minutes(14), 15)).toBe(false);
    expect(isLockDue(last, last + minutes(15), 15)).toBe(true);
  });

  it("never exposes the password hash", () => {
    const safe = toSafeUser({
      id: "u1",
      firstName: "Maria",
      middleName: null,
      lastName: "Santos",
      email: "maria@example.com",
      passwordHash: "secret-hash",
      lockAfterMinutes: 15,
      twoStepEnabled: true,
      passkeyCount: 0,
      appearance: DEFAULT_APPEARANCE,
      privacyConsentAt: NOW,
      passwordChangedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(safe).not.toHaveProperty("passwordHash");
  });
});

describe("reset code rules", () => {
  it("works for 15 minutes and 3 tries", () => {
    const expiresAt = codeExpiry(NOW);
    expect(expiresAt.getTime() - NOW.getTime()).toBe(minutes(15));
    expect(isCodeUsable({ expiresAt, tries: 2 }, NOW)).toBe(true);
    expect(isCodeUsable({ expiresAt, tries: 3 }, NOW)).toBe(false);
    expect(isCodeUsable({ expiresAt, tries: 0 }, expiresAt)).toBe(false);
    expect(triesLeft(1)).toBe(2);
    expect(triesLeft(9)).toBe(0);
  });
});

describe("secret codes", () => {
  const codes = new HmacSecretCodes(
    "a-key-that-is-at-least-32-characters-long",
  );

  it("makes 6-digit codes, keeping leading zeros", () => {
    for (let i = 0; i < 200; i++) expect(codes.newCode()).toMatch(/^\d{6}$/);
  });

  it("hashes per account, and matches only the right code", () => {
    const hash = codes.hash("012345", "user-1");
    expect(hash).not.toContain("012345");
    expect(codes.hash("012345", "user-2")).not.toBe(hash);
    expect(codes.matches("012345", "user-1", hash)).toBe(true);
    expect(codes.matches("012346", "user-1", hash)).toBe(false);
    expect(codes.matches("012345", "user-2", hash)).toBe(false);
  });
});
