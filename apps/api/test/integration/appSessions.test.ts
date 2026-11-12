import { describe, expect, it } from "vitest";
import { PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();

// The phone app signs in like the website, but keeps the session as a token
async function appSignIn() {
  await t.as("maria"); // makes sure Maria exists
  const response = await t
    .api()
    .post("/api/auth/login")
    .set("X-Talaan-App", "1")
    .send({ email: USERS.maria.email, password: PASSWORD });
  expect(response.status).toBe(200);
  const token = response.headers["x-session-token"] as string;
  expect(token).toMatch(/^s:[\w-]+\.[\w+/]+$/);
  // A fresh client each time, with no cookies: only the token
  const app = () => {
    const agent = t.api();
    return {
      get: (url: string) =>
        agent.get(url).set("Authorization", `Bearer ${token}`),
      post: (url: string) =>
        agent
          .post(url)
          .set("Authorization", `Bearer ${token}`)
          .set("X-Talaan-App", "1"),
    };
  };
  return { token, app };
}

describe("the phone app's sessions", () => {
  it("works with a bearer token instead of a cookie", async () => {
    const { app } = await appSignIn();
    const me = await app().get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(USERS.maria.email);
    expect((await app().get("/api/records")).status).toBe(200);
    // A made-up token is nobody
    const fake = await t
      .api()
      .get("/api/auth/me")
      .set("Authorization", "Bearer s:nope.nope");
    expect(fake.status).toBe(401);
  });

  it("gives the token only to the app", async () => {
    await t.as("maria");
    const browser = await t
      .api()
      .post("/api/auth/login")
      .send({ email: USERS.maria.email, password: PASSWORD });
    expect(browser.headers["x-session-token"]).toBeUndefined();
  });

  it("unlocks with the phone's Face ID / fingerprint key", async () => {
    const { app } = await appSignIn();
    const made = await app().post("/api/auth/device-key");
    expect(made.status).toBe(201);
    const key = made.body.deviceKey as string;
    expect(key.length).toBeGreaterThanOrEqual(40);

    await app().post("/api/auth/lock");
    expect((await app().get("/api/records")).status).toBe(423);

    const wrong = await app()
      .post("/api/auth/unlock/device")
      .send({ deviceKey: "x".repeat(43) });
    expect(wrong.status).toBe(400);
    const right = await app()
      .post("/api/auth/unlock/device")
      .send({ deviceKey: key });
    expect(right.status).toBe(200);
    expect((await app().get("/api/records")).status).toBe(200);

    // Signed out: the token and the key stop working
    await app().post("/api/auth/logout");
    expect((await app().get("/api/auth/me")).status).toBe(401);
    expect(
      (await app().post("/api/auth/unlock/device").send({ deviceKey: key }))
        .status,
    ).toBe(401);
  });

  it("only makes a key for an unlocked session", async () => {
    const { app } = await appSignIn();
    await app().post("/api/auth/lock");
    expect((await app().post("/api/auth/device-key")).status).toBe(423);
  });
});
