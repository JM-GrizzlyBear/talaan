import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Pool } from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { buildApp } from "../../../src/buildApp.js";
import { createPool } from "../../../src/infrastructure/database/pool.js";
import { LocalFileStorage } from "../../../src/infrastructure/storage/LocalFileStorage.js";
import { BcryptPasswordHasher } from "../../../src/infrastructure/security/BcryptPasswordHasher.js";
import { FakeClock } from "../../fixtures/clock.js";
import { FakeEmails, FixedSecretCodes } from "../../fixtures/fakes.js";
import { FakePasskeyCeremonies } from "../../fixtures/passkeys.js";
import { PASSWORD, USERS, type SeededUser } from "../../fixtures/users.js";
import { resetDatabase } from "./seed.js";
import { testDatabaseUrl } from "./testDatabase.js";

export interface TestContext {
  pool: Pool;
  app: ReturnType<typeof buildApp>;
  clock: FakeClock;
  // Every email the app "sent"
  emails: FakeEmails;
  passkeys: FakePasskeyCeremonies;
  // Where uploaded files land (a fresh temporary folder)
  uploadsDir: string;
  // A fresh browser with no sign-in
  api: () => ReturnType<typeof request.agent>;
  // A browser signed in as a seeded user (it keeps their cookie)
  as: (user: SeededUser) => Promise<ReturnType<typeof request.agent>>;
}

// Call once at the top of a test file: the real app on the test database,
// reset to the seed data before every test
export function useTestApp(
  options: {
    authLimit?: number;
    resetEmailLimit?: number;
    signInCodeLimit?: number;
    invitationEmailLimit?: number;
    recordsLimit?: number;
    withoutStorage?: boolean;
    withoutEmail?: boolean;
  } = {},
): TestContext {
  const context = {} as TestContext;

  beforeAll(() => {
    context.pool = createPool(testDatabaseUrl());
    context.clock = new FakeClock();
    context.emails = new FakeEmails();
    context.passkeys = new FakePasskeyCeremonies();
    context.uploadsDir = mkdtempSync(path.join(os.tmpdir(), "talaan-uploads-"));
    context.app = buildApp({
      pool: context.pool,
      sessionSecret: "test-secret-that-is-at-least-32-characters-long",
      passwordHasher: new BcryptPasswordHasher(4),
      secretCodes: new FixedSecretCodes(),
      emails: options.withoutEmail ? null : context.emails,
      passkeyCeremonies: context.passkeys,
      fileStorage: options.withoutStorage
        ? null
        : new LocalFileStorage(
            context.uploadsDir,
            "test-secret-that-is-at-least-32-characters-long",
          ),
      clock: context.clock,
      secureCookie: false,
      trustProxy: 0,
      authLimit: options.authLimit ?? 1000,
      resetEmailLimit: options.resetEmailLimit ?? 1000,
      signInCodeLimit: options.signInCodeLimit ?? 1000,
      invitationEmailLimit: options.invitationEmailLimit ?? 1000,
      recordsLimit: options.recordsLimit ?? 1000,
    });
    context.api = () => request.agent(context.app);
    context.as = async (user) => {
      const agent = request.agent(context.app);
      const response = await agent
        .post("/api/auth/login")
        .send({ email: USERS[user].email, password: PASSWORD });
      if (response.status !== 200)
        throw new Error(`Couldn't sign in as ${user}: ${response.status}`);
      return agent;
    };
  });

  beforeEach(async () => {
    await resetDatabase(context.pool);
    // Uploaded files start empty too
    rmSync(context.uploadsDir, { recursive: true, force: true });
    mkdirSync(context.uploadsDir, { recursive: true });
    context.emails.clear();
  });

  afterAll(async () => {
    rmSync(context.uploadsDir, { recursive: true, force: true });
    await context.pool.end();
  });

  return context;
}
