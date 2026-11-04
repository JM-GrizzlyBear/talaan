import { describe, expect, it } from "vitest";
import { PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

// A separate app with tiny limits: 3 tries, 2 codes per email
const t = useTestApp({ authLimit: 3, resetEmailLimit: 2 });

describe("rate limits", () => {
  it("stop password guessing after too many tries", async () => {
    const browser = t.api();
    for (let i = 0; i < 3; i++) {
      const attempt = await browser
        .post("/api/auth/login")
        .send({ email: USERS.maria.email, password: "guess" });
      expect(attempt.status).toBe(401);
    }
    const blocked = await browser
      .post("/api/auth/login")
      .send({ email: USERS.maria.email, password: "guess" });
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("stop one inbox from being flooded with codes", async () => {
    t.clock.advance(16 * 60 * 1000);
    const send = () =>
      t
        .api()
        .post("/api/auth/password-reset/request")
        .send({ email: "ANA@example.com" });
    expect((await send()).status).toBe(202);
    expect((await send()).status).toBe(202);
    expect((await send()).status).toBe(429);
    expect(t.emails.codes).toHaveLength(2);
  });
});

describe("separate counters", () => {
  it("unlocking doesn't use up the sign-in tries", async () => {
    t.clock.advance(16 * 60 * 1000);
    // Sign-in try 1 of 3
    const maria = await t.as("maria");
    await maria.post("/api/auth/lock");
    for (let i = 0; i < 3; i++) {
      const wrong = await maria
        .post("/api/auth/unlock")
        .send({ password: "wrong-password" });
      expect(wrong.status).toBe(400);
    }
    // Unlock tries are used up, but sign-in tries 2 and 3 still work
    expect(
      (await maria.post("/api/auth/unlock").send({ password: "x" })).status,
    ).toBe(429);
    for (let i = 0; i < 2; i++) {
      const signIn = await t
        .api()
        .post("/api/auth/login")
        .send({ email: USERS.ana.email, password: PASSWORD });
      expect(signIn.status).toBe(200);
    }
  });
});
