import type { Pool } from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { buildApp } from "../../../src/buildApp.js";
import { createPool } from "../../../src/infrastructure/database/pool.js";
import { BcryptPasswordHasher } from "../../../src/infrastructure/security/BcryptPasswordHasher.js";
import { FakeClock } from "../../fixtures/clock.js";
import { PASSWORD, type SeededUsername } from "../../fixtures/users.js";
import { resetDatabase } from "./seed.js";
import { testDatabaseUrl } from "./testDatabase.js";

export interface TestContext {
  pool: Pool;
  app: ReturnType<typeof buildApp>;
  // A fresh browser with no login
  api: () => ReturnType<typeof request.agent>;
  // A browser logged in as a seeded user (it keeps their cookie)
  as: (username: SeededUsername) => Promise<ReturnType<typeof request.agent>>;
}

// Call once at the top of a test file: the real app on the test database,
// reset to the seed data before every test
export function useTestApp(options: { authLimit?: number } = {}): TestContext {
  const context = {} as TestContext;

  beforeAll(() => {
    context.pool = createPool(testDatabaseUrl());
    context.app = buildApp({
      pool: context.pool,
      sessionSecret: "test-secret-that-is-at-least-32-characters-long",
      passwordHasher: new BcryptPasswordHasher(4),
      clock: new FakeClock(),
      secureCookie: false,
      trustProxy: false,
      authLimit: options.authLimit ?? 1000,
    });
    context.api = () => request.agent(context.app);
    context.as = async (username) => {
      const agent = request.agent(context.app);
      const response = await agent
        .post("/api/auth/login")
        .send({ login: username, password: PASSWORD });
      if (response.status !== 200)
        throw new Error(`Couldn't log in as ${username}: ${response.status}`);
      return agent;
    };
  });

  beforeEach(async () => {
    await resetDatabase(context.pool);
  });

  afterAll(async () => {
    await context.pool.end();
  });

  return context;
}
