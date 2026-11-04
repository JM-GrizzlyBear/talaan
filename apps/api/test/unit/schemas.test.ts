import { loginSchema, noteInputSchema, registerSchema } from "@pern/shared";
import { describe, expect, it } from "vitest";

describe("shared form rules (used by the API and the website)", () => {
  it("register: trims and lowercases, checks each field", () => {
    expect(
      registerSchema.parse({
        username: " Maria_1 ",
        email: " M@X.COM ",
        password: "12345678",
      }),
    ).toEqual({
      username: "maria_1",
      email: "m@x.com",
      password: "12345678",
    });
    expect(
      registerSchema.safeParse({
        username: "a b",
        email: "m@x.com",
        password: "12345678",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        username: "maria",
        email: "m@x.com",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("login: needs both fields", () => {
    expect(loginSchema.safeParse({ login: "", password: "x" }).success).toBe(
      false,
    );
  });

  it("note: title required and trimmed, body optional", () => {
    expect(noteInputSchema.parse({ title: "  Hi  " })).toEqual({
      title: "Hi",
      body: "",
    });
    expect(noteInputSchema.safeParse({ title: "   " }).success).toBe(false);
  });
});
