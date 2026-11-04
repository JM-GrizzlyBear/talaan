import { RESET_REQUESTED_MESSAGE } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
const email = USERS.maria.email;
const NEW_PASSWORD = "a-brand-new-password";

async function requestCode(address: string = email) {
  return await t
    .api()
    .post("/api/auth/password-reset/request")
    .send({ email: address });
}

describe("forgot password: asking for a code", () => {
  it("emails a 6-digit code, and says the same for unknown emails", async () => {
    const known = await requestCode();
    const unknown = await requestCode("nobody@example.com");
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body.message).toBe(RESET_REQUESTED_MESSAGE);
    expect(unknown.body.message).toBe(RESET_REQUESTED_MESSAGE);

    expect(t.emails.codes).toHaveLength(1);
    expect(t.emails.codes[0]).toMatchObject({
      to: { email, firstName: "Maria" },
      code: "123456",
    });
  });

  it("needs an email address", async () => {
    const response = await t
      .api()
      .post("/api/auth/password-reset/request")
      .send({ email: "" });
    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("email");
  });

  it("never stores the code itself", async () => {
    await requestCode();
    const row = await t.pool.query(
      "select code_hash from password_reset_codes",
    );
    expect(row.rows[0].code_hash).not.toContain("123456");
  });
});

describe("forgot password: checking the code", () => {
  it("accepts the right code", async () => {
    await requestCode();
    const response = await t
      .api()
      .post("/api/auth/password-reset/check")
      .send({ email, code: "123456" });
    expect(response.status).toBe(204);
  });

  it("counts wrong codes, and stops after 3", async () => {
    await requestCode();
    const check = (code: string) =>
      t.api().post("/api/auth/password-reset/check").send({ email, code });

    const first = await check("000000");
    expect(first.status).toBe(400);
    expect(first.body.errors.code[0]).toBe(
      "That code isn't right. 2 tries left.",
    );
    await check("000000");
    const third = await check("000000");
    expect(third.body.message).toMatch(/stopped working/);

    const right = await check("123456");
    expect(right.status).toBe(400);
    expect(right.body.message).toMatch(/Ask for a new code/);
  });

  it("expires after 15 minutes", async () => {
    await requestCode();
    t.clock.advance(16 * 60 * 1000);
    const response = await t
      .api()
      .post("/api/auth/password-reset/check")
      .send({ email, code: "123456" });
    expect(response.status).toBe(400);
  });

  it("asking again replaces the old code and its tries", async () => {
    await requestCode();
    for (let i = 0; i < 3; i++) {
      await t
        .api()
        .post("/api/auth/password-reset/check")
        .send({ email, code: "000000" });
    }
    await requestCode();
    const response = await t
      .api()
      .post("/api/auth/password-reset/check")
      .send({ email, code: "123456" });
    expect(response.status).toBe(204);
  });
});

describe("forgot password: choosing the new password", () => {
  it("changes the password, signs out every device and sends a heads-up", async () => {
    const otherDevice = await t.as("maria");
    await requestCode();
    const done = await t
      .api()
      .post("/api/auth/password-reset/complete")
      .send({ email, code: "123456", password: NEW_PASSWORD });
    expect(done.status).toBe(204);

    expect((await otherDevice.get("/api/auth/me")).status).toBe(401);
    const oldPassword = await t
      .api()
      .post("/api/auth/login")
      .send({ email, password: PASSWORD });
    expect(oldPassword.status).toBe(401);
    const newPassword = await t
      .api()
      .post("/api/auth/login")
      .send({ email, password: NEW_PASSWORD });
    expect(newPassword.status).toBe(200);
    expect(t.emails.changed).toHaveLength(1);
  });

  it("works only once", async () => {
    await requestCode();
    const body = { email, code: "123456", password: NEW_PASSWORD };
    expect(
      (await t.api().post("/api/auth/password-reset/complete").send(body))
        .status,
    ).toBe(204);
    expect(
      (await t.api().post("/api/auth/password-reset/complete").send(body))
        .status,
    ).toBe(400);
  });

  it("still checks the new password", async () => {
    await requestCode();
    const response = await t
      .api()
      .post("/api/auth/password-reset/complete")
      .send({ email, code: "123456", password: "short" });
    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("password");
  });

  it("doesn't touch other people's accounts", async () => {
    await requestCode();
    await t
      .api()
      .post("/api/auth/password-reset/complete")
      .send({ email, code: "123456", password: NEW_PASSWORD });
    const ana = await t
      .api()
      .post("/api/auth/login")
      .send({ email: USERS.ana.email, password: PASSWORD });
    expect(ana.status).toBe(200);
  });
});
