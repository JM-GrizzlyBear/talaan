import {
  loginSchema,
  passwordResetCodeSchema,
  registerSchema,
  securitySettingsSchema,
} from "@talaan/shared";
import { describe, expect, it } from "vitest";

describe("shared form rules (used by the API and the website)", () => {
  it("sign up: trims, lowercases the email, and needs the consent", () => {
    expect(
      registerSchema.parse({
        name: "  Juan dela Cruz ",
        email: " Juan@X.COM ",
        password: "1234567890",
        consent: true,
      }),
    ).toEqual({
      name: "Juan dela Cruz",
      email: "juan@x.com",
      password: "1234567890",
      consent: true,
    });
    const noConsent = registerSchema.safeParse({
      name: "Juan",
      email: "juan@x.com",
      password: "1234567890",
      consent: false,
    });
    expect(noConsent.success).toBe(false);
  });

  it("sign up: passwords need at least 10 characters", () => {
    expect(
      registerSchema.safeParse({
        name: "Juan",
        email: "juan@x.com",
        password: "123456789",
        consent: true,
      }).success,
    ).toBe(false);
  });

  it("sign in: needs both fields", () => {
    expect(loginSchema.safeParse({ email: "", password: "x" }).success).toBe(
      false,
    );
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });

  it("reset code: exactly 6 digits", () => {
    const check = (code: string) =>
      passwordResetCodeSchema.safeParse({ email: "a@b.co", code }).success;
    expect(check("123456")).toBe(true);
    expect(check(" 123456 ")).toBe(true);
    expect(check("12345")).toBe(false);
    expect(check("12345a")).toBe(false);
  });

  it("lock after: only the offered choices", () => {
    expect(
      securitySettingsSchema.safeParse({ lockAfterMinutes: 30 }).success,
    ).toBe(true);
    expect(
      securitySettingsSchema.safeParse({ lockAfterMinutes: 10 }).success,
    ).toBe(false);
  });
});
