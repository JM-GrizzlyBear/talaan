import { describe, expect, it } from "vitest";
import { toSafeUser } from "../../src/domain/user/User.js";
import { isEmail, normalizeLogin } from "../../src/domain/user/rules.js";

describe("user rules", () => {
  it("tells a username from an email", () => {
    expect(isEmail("maria@example.com")).toBe(true);
    expect(isEmail("maria")).toBe(false);
  });

  it("compares logins without capitals or spaces", () => {
    expect(normalizeLogin("  Maria@Example.COM ")).toBe("maria@example.com");
  });

  it("never exposes the password hash", () => {
    const safe = toSafeUser({
      id: "u1",
      username: "maria",
      email: "maria@example.com",
      passwordHash: "secret-hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(safe).not.toHaveProperty("passwordHash");
  });
});
