import { describe, expect, it } from "vitest";
import { CheckResetCode } from "../../src/application/passwordReset/CheckResetCode.js";
import { RequestPasswordReset } from "../../src/application/passwordReset/RequestPasswordReset.js";
import type { PasswordHasher } from "../../src/application/ports/PasswordHasher.js";
import { LogInUser } from "../../src/application/user/LogInUser.js";
import { RegisterUser } from "../../src/application/user/RegisterUser.js";
import type { ResetCode } from "../../src/domain/passwordReset/ResetCode.js";
import type { ResetCodeRepository } from "../../src/domain/passwordReset/ResetCodeRepository.js";
import {
  EmailNotSetUpError,
  ResetCodeError,
} from "../../src/domain/passwordReset/errors.js";
import type { User } from "../../src/domain/user/User.js";
import type {
  NewUser,
  UserRepository,
} from "../../src/domain/user/UserRepository.js";
import {
  EmailTakenError,
  InvalidCredentialsError,
} from "../../src/domain/user/errors.js";
import { FakeClock } from "../fixtures/clock.js";
import { FakeEmails, FixedSecretCodes } from "../fixtures/fakes.js";

// Fakes: use cases only know the interfaces, so tests can swap in simple in-memory versions
const plainHasher: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  compare: async (password, hash) => hash === `hashed:${password}`,
};

function fakeUsers(existing: User[] = []): UserRepository & { all: User[] } {
  const all = [...existing];
  return {
    all,
    findById: async (id) => all.find((u) => u.id === id) ?? null,
    findByEmail: async (email) => all.find((u) => u.email === email) ?? null,
    create: async (user: NewUser) => {
      const created: User = {
        ...user,
        id: `u${all.length + 1}`,
        lockAfterMinutes: 15,
        passwordChangedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      all.push(created);
      return created;
    },
    updatePassword: async () => {},
    updateLockAfter: async (id) => all.find((u) => u.id === id)!,
  };
}

function fakeCodes(): ResetCodeRepository & { all: Map<string, ResetCode> } {
  const all = new Map<string, ResetCode>();
  return {
    all,
    replace: async (code) => void all.set(code.userId, { ...code, tries: 0 }),
    find: async (userId) => all.get(userId) ?? null,
    addTry: async (userId) => {
      const code = all.get(userId)!;
      code.tries += 1;
      return code.tries;
    },
    remove: async (userId) => void all.delete(userId),
  };
}

const maria: User = {
  id: "u1",
  name: "Maria",
  email: "maria@example.com",
  passwordHash: "hashed:password1234",
  lockAfterMinutes: 15,
  privacyConsentAt: new Date(),
  passwordChangedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("RegisterUser", () => {
  it("hashes the password, stores a lowercase email and the consent time", async () => {
    const users = fakeUsers();
    const clock = new FakeClock();
    await new RegisterUser(users, plainHasher, clock).execute({
      name: " Ben ",
      email: "Ben@X.com",
      password: "pw-1234567",
    });
    expect(users.all[0]).toMatchObject({
      name: "Ben",
      email: "ben@x.com",
      passwordHash: "hashed:pw-1234567",
      privacyConsentAt: clock.now(),
    });
  });

  it("refuses a taken email", async () => {
    const register = new RegisterUser(
      fakeUsers([maria]),
      plainHasher,
      new FakeClock(),
    );
    await expect(
      register.execute({
        name: "M",
        email: "MARIA@example.com",
        password: "pw-1234567",
      }),
    ).rejects.toThrow(EmailTakenError);
  });
});

describe("LogInUser", () => {
  it("accepts the right password and refuses the rest the same way", async () => {
    const logIn = new LogInUser(fakeUsers([maria]), plainHasher);
    expect(
      (
        await logIn.execute({
          email: "Maria@example.com",
          password: "password1234",
        })
      ).id,
    ).toBe("u1");
    await expect(
      logIn.execute({ email: maria.email, password: "nope" }),
    ).rejects.toThrow(InvalidCredentialsError);
    await expect(
      logIn.execute({ email: "ghost@example.com", password: "nope" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});

describe("RequestPasswordReset", () => {
  it("emails a code to an account, and does nothing for unknown emails", async () => {
    const codes = fakeCodes();
    const emails = new FakeEmails();
    const request = new RequestPasswordReset(
      fakeUsers([maria]),
      codes,
      new FixedSecretCodes(),
      new FakeClock(),
      emails,
    );
    await request.execute("ghost@example.com");
    expect(emails.codes).toHaveLength(0);
    await request.execute("MARIA@example.com");
    expect(emails.codes[0].code).toBe("123456");
    expect(codes.all.get("u1")?.codeHash).not.toBe("123456");
  });

  it("refuses when there's no email service", async () => {
    const request = new RequestPasswordReset(
      fakeUsers([maria]),
      fakeCodes(),
      new FixedSecretCodes(),
      new FakeClock(),
      null,
    );
    await expect(request.execute(maria.email)).rejects.toThrow(
      EmailNotSetUpError,
    );
  });
});

describe("CheckResetCode", () => {
  it("counts down the tries on wrong codes", async () => {
    const users = fakeUsers([maria]);
    const codes = fakeCodes();
    const secrets = new FixedSecretCodes();
    const clock = new FakeClock();
    await new RequestPasswordReset(
      users,
      codes,
      secrets,
      clock,
      new FakeEmails(),
    ).execute(maria.email);
    const check = new CheckResetCode(users, codes, secrets, clock);

    await expect(
      check.execute({ email: maria.email, code: "999999" }),
    ).rejects.toThrow("4 tries left");
    expect(
      (await check.execute({ email: maria.email, code: "123456" })).id,
    ).toBe("u1");
    await expect(
      check.execute({ email: "ghost@example.com", code: "123456" }),
    ).rejects.toThrow(ResetCodeError);
  });
});
