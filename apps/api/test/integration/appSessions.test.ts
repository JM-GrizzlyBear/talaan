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

  it("asks for the emailed code once per phone, not every sign-in", async () => {
    await t.as("maria");
    await t.pool.query(
      "update users set two_step_enabled = true where id = $1",
      [USERS.maria.id],
    );
    const login = (trust?: string) => {
      const request = t
        .api()
        .post("/api/auth/login")
        .set("X-Talaan-App", "1")
        .set("X-Talaan-Device", "Maria's iPhone <script>");
      if (trust) request.set("X-Talaan-Trust", trust);
      return request.send({ email: USERS.maria.email, password: PASSWORD });
    };

    const first = await login();
    expect(first.status).toBe(202);
    const pending = first.headers["x-session-token"] as string;
    const code = await t
      .api()
      .post("/api/auth/login/code")
      .set("X-Talaan-App", "1")
      .set("X-Talaan-Device", "Maria's iPhone <script>")
      .set("Authorization", `Bearer ${pending}`)
      .send({ code: t.emails.signInCodes.at(-1)!.code, rememberBrowser: true });
    expect(code.status).toBe(200);
    // The app gets the remembered-phone token in a header, never a cookie
    const trust = code.headers["x-talaan-trust"] as string;
    expect(trust).toMatch(/^[0-9a-f-]{36}\./);
    expect(code.headers["set-cookie"] ?? []).not.toEqual(
      expect.arrayContaining([expect.stringContaining("talaan.tb")]),
    );

    // Next time on this phone: signed in at once
    const again = await login(trust);
    expect(again.status).toBe(200);
    expect(again.body.twoStep).toBe(false);
    // Listed by the phone's name on the Security page
    const session = again.headers["x-session-token"] as string;
    const security = await t
      .api()
      .get("/api/account/browsers")
      .set("Authorization", `Bearer ${session}`)
      .set("X-Talaan-Trust", trust);
    const names = (security.body.browsers ?? []).map(
      (b: { label: string }) => b.label,
    );
    expect(names).toContain("Talaan app on Maria's iPhone script");
    expect(security.body.browsers[0].current).toBe(true);

    // A made-up token still needs the code
    expect((await login(`${trust.split(".")[0]}.wrong`)).status).toBe(202);
  });
});
