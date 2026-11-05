import { describe, expect, it } from "vitest";
import { NEW_USER, PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
const maria = { email: USERS.maria.email, password: PASSWORD };

async function turnOnTwoStep() {
  await t.pool.query("update users set two_step_enabled = true where id = $1", [
    USERS.maria.id,
  ]);
}

// Signs in with the password and then the emailed code
async function signInWithCode(
  browser: ReturnType<typeof t.api>,
  rememberBrowser: boolean,
) {
  const first = await browser.post("/api/auth/login").send(maria);
  expect(first.status).toBe(202);
  return await browser
    .post("/api/auth/login/code")
    .send({ code: t.emails.signInCodes.at(-1)!.code, rememberBrowser });
}

function trustCookieOf(response: { headers: Record<string, unknown> }) {
  const cookies =
    (response.headers["set-cookie"] as string[] | undefined) ?? [];
  return cookies.find((c) => c.startsWith("talaan.tb="));
}

describe("two-step sign-in", () => {
  it("is on for new accounts", async () => {
    const response = await t.api().post("/api/auth/register").send(NEW_USER);
    expect(response.body.user).toMatchObject({
      twoStepEnabled: true,
      passkeyCount: 0,
    });
  });

  it("emails a code after the right password, and only the code finishes signing in", async () => {
    await turnOnTwoStep();
    const browser = t.api();
    const first = await browser.post("/api/auth/login").send(maria);
    expect(first.status).toBe(202);
    expect(first.body).toEqual({ twoStep: true, email: "m•••a@example.com" });
    expect(t.emails.signInCodes).toEqual([
      { to: { email: USERS.maria.email, firstName: "Maria" }, code: "123456" },
    ]);

    // Not signed in yet
    expect((await browser.get("/api/auth/me")).status).toBe(401);
    expect((await browser.get("/api/account/passkeys")).status).toBe(401);

    const second = await browser
      .post("/api/auth/login/code")
      .send({ code: "123456", rememberBrowser: false });
    expect(second.status).toBe(200);
    expect(second.body.user.email).toBe(USERS.maria.email);
    expect(trustCookieOf(second)).toBeUndefined();
    expect((await browser.get("/api/auth/me")).status).toBe(200);
  });

  it("counts down wrong codes and stops after 3", async () => {
    await turnOnTwoStep();
    const browser = t.api();
    await browser.post("/api/auth/login").send(maria);
    const wrong = () =>
      browser.post("/api/auth/login/code").send({ code: "000000" });

    expect((await wrong()).body.message).toContain("2 tries left");
    expect((await wrong()).body.message).toContain("1 try left");
    expect((await wrong()).body.message).toContain("stopped working");
    const right = await browser
      .post("/api/auth/login/code")
      .send({ code: "123456" });
    expect(right.status).toBe(400);
    expect(right.body.errors.code[0]).toContain("Ask for a new code");
  });

  it("works once: the same code can't sign in twice", async () => {
    await turnOnTwoStep();
    const browser = t.api();
    expect((await signInWithCode(browser, false)).status).toBe(200);
    const again = await browser
      .post("/api/auth/login/code")
      .send({ code: "123456" });
    expect(again.status).toBe(400);
    expect(again.body.signInExpired).toBe(true);
  });

  it("refuses a code with no password step, or after 15 minutes", async () => {
    const none = await t
      .api()
      .post("/api/auth/login/code")
      .send({ code: "123456" });
    expect(none.status).toBe(400);
    expect(none.body.signInExpired).toBe(true);

    await turnOnTwoStep();
    const browser = t.api();
    await browser.post("/api/auth/login").send(maria);
    t.clock.advance(15 * 60 * 1000);
    const late = await browser
      .post("/api/auth/login/code")
      .send({ code: "123456" });
    expect(late.status).toBe(400);
    expect(late.body.signInExpired).toBe(true);
  });

  it("sends a new code on request, and the old one stops working", async () => {
    await turnOnTwoStep();
    const browser = t.api();
    await browser.post("/api/auth/login").send(maria);
    expect((await browser.post("/api/auth/login/resend")).status).toBe(204);
    expect(t.emails.signInCodes).toHaveLength(2);
    // No pending sign-in: nothing to resend
    expect((await t.api().post("/api/auth/login/resend")).status).toBe(400);
  });

  it("remembers this browser for 30 days when asked", async () => {
    await turnOnTwoStep();
    const browser = t.api();
    const signedIn = await signInWithCode(browser, true);
    const cookie = trustCookieOf(signedIn)!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api;/);
    expect(cookie).toMatch(/SameSite=Lax/i);

    await browser.post("/api/auth/logout");
    t.emails.clear();
    const again = await browser.post("/api/auth/login").send(maria);
    expect(again.status).toBe(200);
    expect(t.emails.signInCodes).toHaveLength(0);

    // Another browser is still asked
    expect((await t.api().post("/api/auth/login").send(maria)).status).toBe(
      202,
    );

    // After 30 days, this one is asked again
    await browser.post("/api/auth/logout");
    t.clock.advance(30 * 24 * 60 * 60 * 1000);
    expect((await browser.post("/api/auth/login").send(maria)).status).toBe(
      202,
    );
  });

  it("lists remembered browsers and can forget them", async () => {
    await turnOnTwoStep();
    const browser = t.api();
    await signInWithCode(browser, true);

    const list = await browser
      .get("/api/account/browsers")
      .set("User-Agent", "irrelevant");
    expect(list.body.browsers).toHaveLength(1);
    expect(list.body.browsers[0]).toMatchObject({ current: true });
    const id = list.body.browsers[0].id;

    const forget = await browser.delete(`/api/account/browsers/${id}`);
    expect(forget.status).toBe(204);
    expect((await browser.delete(`/api/account/browsers/${id}`)).status).toBe(
      404,
    );
    expect((await browser.delete("/api/account/browsers/nope")).status).toBe(
      404,
    );

    await browser.post("/api/auth/logout");
    expect((await browser.post("/api/auth/login").send(maria)).status).toBe(
      202,
    );
  });

  it("can't forget someone else's browser", async () => {
    await turnOnTwoStep();
    await signInWithCode(t.api(), true);
    const row = await t.pool.query("select id from trusted_browsers");
    const ana = await t.as("ana");
    expect(
      (await ana.delete(`/api/account/browsers/${row.rows[0].id}`)).status,
    ).toBe(404);
  });

  it("forgets every remembered browser when the password changes", async () => {
    await turnOnTwoStep();
    const browser = t.api();
    await signInWithCode(browser, true);
    await browser
      .put("/api/account/password")
      .send({ currentPassword: PASSWORD, newPassword: "a-new-password-1" });
    const rows = await t.pool.query(
      "select count(*)::int as n from trusted_browsers",
    );
    expect(rows.rows[0].n).toBe(0);
  });

  it("needs the password to be turned off", async () => {
    await turnOnTwoStep();
    const browser = t.api();
    await signInWithCode(browser, false);

    const without = await browser
      .put("/api/account/security")
      .send({ twoStepEnabled: false });
    expect(without.status).toBe(400);
    expect(without.body.errors).toHaveProperty("currentPassword");

    const withPassword = await browser
      .put("/api/account/security")
      .send({ twoStepEnabled: false, currentPassword: PASSWORD });
    expect(withPassword.status).toBe(200);
    expect(withPassword.body.user.twoStepEnabled).toBe(false);

    expect((await t.api().post("/api/auth/login").send(maria)).status).toBe(
      200,
    );
  });

  it("turns on without the password", async () => {
    const browser = await t.as("maria");
    const response = await browser
      .put("/api/account/security")
      .send({ twoStepEnabled: true });
    expect(response.status).toBe(200);
    expect(response.body.user.twoStepEnabled).toBe(true);
    // The lock time stays the same
    expect(response.body.user.lockAfterMinutes).toBe(15);
  });

  it("refuses an empty settings change", async () => {
    const browser = await t.as("maria");
    expect((await browser.put("/api/account/security").send({})).status).toBe(
      400,
    );
  });
});

describe("signing out other browsers", () => {
  it("keeps this browser signed in and signs out the rest", async () => {
    const here = await t.as("maria");
    const there = await t.as("maria");
    const ana = await t.as("ana");
    expect((await here.post("/api/account/sign-out-others")).status).toBe(204);
    expect((await here.get("/api/auth/me")).status).toBe(200);
    expect((await there.get("/api/auth/me")).status).toBe(401);
    expect((await ana.get("/api/auth/me")).status).toBe(200);
  });
});
