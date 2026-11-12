import { DEFAULT_APPEARANCE } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { CheckResetCode } from "../../src/application/passwordReset/CheckResetCode.js";
import { RequestPasswordReset } from "../../src/application/passwordReset/RequestPasswordReset.js";
import type { PasswordHasher } from "../../src/application/ports/PasswordHasher.js";
import { LogInUser } from "../../src/application/user/LogInUser.js";
import { SendSignInCode } from "../../src/application/twoStep/SendSignInCode.js";
import { TrustedBrowsers } from "../../src/application/twoStep/TrustedBrowsers.js";
import { RegisterUser } from "../../src/application/user/RegisterUser.js";
import { UpdateSecuritySettings } from "../../src/application/user/UpdateSecuritySettings.js";
import type { EmailCode } from "../../src/domain/emailCode/EmailCode.js";
import type { EmailCodeRepository } from "../../src/domain/emailCode/EmailCodeRepository.js";
import {
  EmailNotSetUpError,
  CodeError,
} from "../../src/domain/emailCode/errors.js";
import type { TrustedBrowser } from "../../src/domain/trustedBrowser/TrustedBrowser.js";
import type { TrustedBrowserRepository } from "../../src/domain/trustedBrowser/TrustedBrowserRepository.js";
import type { User } from "../../src/domain/user/User.js";
import type {
  NewUser,
  UserRepository,
} from "../../src/domain/user/UserRepository.js";
import {
  EmailTakenError,
  InvalidCredentialsError,
  WrongPasswordError,
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
        twoStepEnabled: true,
        passkeyCount: 0,
        appearance: DEFAULT_APPEARANCE,
        passwordChangedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      all.push(created);
      return created;
    },
    updatePassword: async () => {},
    updateAppearance: async (id, appearance) => {
      const user = all.find((u) => u.id === id)!;
      user.appearance = appearance;
      return user;
    },
    updateSecurity: async (id, settings) => {
      const user = all.find((u) => u.id === id)!;
      if (settings.lockAfterMinutes !== undefined)
        user.lockAfterMinutes = settings.lockAfterMinutes;
      if (settings.twoStepEnabled !== undefined)
        user.twoStepEnabled = settings.twoStepEnabled;
      return user;
    },
  };
}

function fakeCodes(): EmailCodeRepository & { all: Map<string, EmailCode> } {
  const all = new Map<string, EmailCode>();
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
  firstName: "Maria",
  middleName: null,
  lastName: "Santos",
  email: "maria@example.com",
  passwordHash: "hashed:password1234",
  lockAfterMinutes: 15,
  twoStepEnabled: false,
  passkeyCount: 0,
  appearance: DEFAULT_APPEARANCE,
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
      firstName: " Ben ",
      middleName: "  ",
      lastName: " dela Cruz ",
      email: "Ben@X.com",
      password: "pw-1234567",
    });
    expect(users.all[0]).toMatchObject({
      firstName: "Ben",
      middleName: null,
      lastName: "dela Cruz",
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
        firstName: "M",
        lastName: "S",
        email: "MARIA@example.com",
        password: "pw-1234567",
      }),
    ).rejects.toThrow(EmailTakenError);
  });
});

function fakeTrusted(): TrustedBrowserRepository & { all: TrustedBrowser[] } {
  const all: TrustedBrowser[] = [];
  return {
    all,
    create: async (b) => {
      const created: TrustedBrowser = {
        ...b,
        id: `00000000-0000-4000-8000-00000000000${all.length + 1}`,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };
      all.push(created);
      return created;
    },
    find: async (id) => all.find((b) => b.id === id) ?? null,
    touch: async () => {},
    listActive: async (userId) => all.filter((b) => b.userId === userId),
    remove: async () => true,
    removeAll: async (userId) => {
      for (let i = all.length - 1; i >= 0; i--)
        if (all[i].userId === userId) all.splice(i, 1);
    },
  };
}

function logInSetup(user: User) {
  const clock = new FakeClock();
  const secrets = new FixedSecretCodes();
  const emails = new FakeEmails();
  const codes = fakeCodes();
  const trusted = new TrustedBrowsers(fakeTrusted(), secrets, clock);
  const logIn = new LogInUser(
    fakeUsers([user]),
    plainHasher,
    trusted,
    new SendSignInCode(codes, secrets, clock, emails),
  );
  return { logIn, trusted, emails, codes, clock };
}

describe("LogInUser", () => {
  it("accepts the right password and refuses the rest the same way", async () => {
    const { logIn } = logInSetup(maria);
    const result = await logIn.execute({
      email: "Maria@example.com",
      password: "password1234",
    });
    expect(result).toMatchObject({ kind: "signedIn", user: { id: "u1" } });
    await expect(
      logIn.execute({ email: maria.email, password: "nope" }),
    ).rejects.toThrow(InvalidCredentialsError);
    await expect(
      logIn.execute({ email: "ghost@example.com", password: "nope" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("with two-step on, emails a code instead of signing in", async () => {
    const { logIn, emails } = logInSetup({ ...maria, twoStepEnabled: true });
    const result = await logIn.execute({
      email: maria.email,
      password: "password1234",
    });
    expect(result.kind).toBe("needsCode");
    expect(emails.signInCodes).toHaveLength(1);
  });

  it("doesn't ask a remembered browser for a code, but asks another person's", async () => {
    const { logIn, trusted, emails } = logInSetup({
      ...maria,
      twoStepEnabled: true,
    });
    const { cookie } = await trusted.remember("u1", "Chrome on Windows");
    const signIn = (trustCookie: string) =>
      logIn.execute({
        email: maria.email,
        password: "password1234",
        trustCookie,
      });

    expect((await signIn(cookie)).kind).toBe("signedIn");
    expect(emails.signInCodes).toHaveLength(0);
    // Right id, wrong token
    expect((await signIn(`${cookie.split(".")[0]}.not-the-token`)).kind).toBe(
      "needsCode",
    );
    const other = await trusted.remember("u2", "Safari on iPhone");
    expect((await signIn(other.cookie)).kind).toBe("needsCode");
  });

  it("asks a remembered browser again after 30 days", async () => {
    const { logIn, trusted, clock } = logInSetup({
      ...maria,
      twoStepEnabled: true,
    });
    const { cookie } = await trusted.remember("u1", "Chrome on Windows");
    clock.advance(31 * 24 * 60 * 60 * 1000);
    const result = await logIn.execute({
      email: maria.email,
      password: "password1234",
      trustCookie: cookie,
    });
    expect(result.kind).toBe("needsCode");
  });

  it("skips two-step when the server can't send email", async () => {
    const clock = new FakeClock();
    const logIn = new LogInUser(
      fakeUsers([{ ...maria, twoStepEnabled: true }]),
      plainHasher,
      new TrustedBrowsers(fakeTrusted(), new FixedSecretCodes(), clock),
      null,
    );
    const result = await logIn.execute({
      email: maria.email,
      password: "password1234",
    });
    expect(result.kind).toBe("signedIn");
  });
});

describe("UpdateSecuritySettings", () => {
  it("needs the password to turn two-step off, but not to turn it on", async () => {
    const users = fakeUsers([{ ...maria, twoStepEnabled: true }]);
    const update = new UpdateSecuritySettings(users, plainHasher);
    await expect(
      update.execute("u1", { twoStepEnabled: false }),
    ).rejects.toThrow(WrongPasswordError);
    await expect(
      update.execute("u1", { twoStepEnabled: false, currentPassword: "nope" }),
    ).rejects.toThrow(WrongPasswordError);
    expect(
      (
        await update.execute("u1", {
          twoStepEnabled: false,
          currentPassword: "password1234",
        })
      ).twoStepEnabled,
    ).toBe(false);
    expect(
      (await update.execute("u1", { twoStepEnabled: true })).twoStepEnabled,
    ).toBe(true);
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
    ).rejects.toThrow("2 tries left");
    expect(
      (await check.execute({ email: maria.email, code: "123456" })).id,
    ).toBe("u1");
    await expect(
      check.execute({ email: "ghost@example.com", code: "123456" }),
    ).rejects.toThrow(CodeError);
  });
});
