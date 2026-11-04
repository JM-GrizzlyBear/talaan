import { describe, expect, it } from "vitest";
import { NEW_USER, PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();

describe("sign up", () => {
  it("creates the account and signs the new person in", async () => {
    const browser = t.api();
    const response = await browser.post("/api/auth/register").send(NEW_USER);
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      name: "Ben dela Cruz",
      email: "ben@example.com",
      lockAfterMinutes: 15,
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");

    const me = await browser.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      user: { name: "Ben dela Cruz" },
      locked: false,
    });
  });

  it("records when the privacy consent was given", async () => {
    await t.api().post("/api/auth/register").send(NEW_USER);
    const row = await t.pool.query(
      "select privacy_consent_at from users where email = $1",
      [NEW_USER.email],
    );
    expect(row.rows[0].privacy_consent_at).toEqual(t.clock.now());
  });

  it("refuses to sign up without the privacy consent", async () => {
    const response = await t
      .api()
      .post("/api/auth/register")
      .send({ ...NEW_USER, consent: false });
    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("consent");
  });

  it("stores emails in lowercase and refuses a taken email", async () => {
    const first = await t
      .api()
      .post("/api/auth/register")
      .send({ ...NEW_USER, email: "BEN@Example.com" });
    expect(first.body.user.email).toBe("ben@example.com");

    const taken = await t
      .api()
      .post("/api/auth/register")
      .send({ ...NEW_USER, email: USERS.ana.email.toUpperCase() });
    expect(taken.status).toBe(409);
    expect(taken.body.errors).toHaveProperty("email");
  });

  it("checks every field", async () => {
    const response = await t
      .api()
      .post("/api/auth/register")
      .send({ name: " ", email: "nope", password: "short" });
    expect(response.status).toBe(400);
    expect(Object.keys(response.body.errors).sort()).toEqual([
      "consent",
      "email",
      "name",
      "password",
    ]);
  });
});

describe("sign in and out", () => {
  it("signs in with an email, ignoring capitals and spaces", async () => {
    const response = await t
      .api()
      .post("/api/auth/login")
      .send({ email: "  MARIA@example.com ", password: PASSWORD });
    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(USERS.maria.id);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const wrong = await t
      .api()
      .post("/api/auth/login")
      .send({ email: USERS.maria.email, password: "wrong-password" });
    const unknown = await t
      .api()
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong-password" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it("signing out ends the session", async () => {
    const maria = await t.as("maria");
    expect((await maria.get("/api/auth/me")).status).toBe(200);
    expect((await maria.post("/api/auth/logout")).status).toBe(204);
    expect((await maria.get("/api/auth/me")).status).toBe(401);
  });

  it("sends security headers", async () => {
    const response = await t.api().get("/api/health");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["content-security-policy"]).toContain(
      "default-src 'self'",
    );
    expect(response.headers).not.toHaveProperty("x-powered-by");
  });
});
