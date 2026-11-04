import {
  fullName,
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
        firstName: "  Juan ",
        middleName: " Santos ",
        lastName: " dela Cruz ",
        email: " Juan@X.COM ",
        password: "1234567890",
        consent: true,
      }),
    ).toEqual({
      firstName: "Juan",
      middleName: "Santos",
      lastName: "dela Cruz",
      email: "juan@x.com",
      password: "1234567890",
      consent: true,
    });
    const noConsent = registerSchema.safeParse({
      firstName: "Juan",
      lastName: "dela Cruz",
      email: "juan@x.com",
      password: "1234567890",
      consent: false,
    });
    expect(noConsent.success).toBe(false);
  });

  it("sign up: passwords need at least 10 characters", () => {
    expect(
      registerSchema.safeParse({
        firstName: "Juan",
        lastName: "dela Cruz",
        email: "juan@x.com",
        password: "123456789",
        consent: true,
      }).success,
    ).toBe(false);
  });

  it("sign up: first and last name are needed, the middle name isn't", () => {
    const base = { email: "juan@x.com", password: "1234567890", consent: true };
    expect(
      registerSchema.safeParse({
        ...base,
        firstName: "Juan",
        lastName: "dela Cruz",
      }).data?.middleName,
    ).toBe("");
    expect(
      registerSchema.safeParse({ ...base, firstName: "Juan", lastName: " " })
        .success,
    ).toBe(false);
  });

  it("full name: joins the parts and skips a missing middle name", () => {
    expect(
      fullName({
        firstName: "Juan",
        middleName: "Santos",
        lastName: "dela Cruz",
      }),
    ).toBe("Juan Santos dela Cruz");
    expect(
      fullName({ firstName: "Ana", middleName: null, lastName: "Reyes" }),
    ).toBe("Ana Reyes");
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
