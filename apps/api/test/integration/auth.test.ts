import { describe, expect, it } from "vitest";
import { NEW_USER, PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();

describe("register", () => {
  it("creates the account and logs the new user in", async () => {
    const browser = t.api();
    const response = await browser.post("/api/auth/register").send(NEW_USER);
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      username: "ben",
      email: "ben@example.com",
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");

    const me = await browser.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe("ben");
  });

  it("stores usernames and emails in lowercase", async () => {
    const response = await t
      .api()
      .post("/api/auth/register")
      .send({ ...NEW_USER, username: "Ben", email: "BEN@Example.com" });
    expect(response.body.user).toMatchObject({
      username: "ben",
      email: "ben@example.com",
    });
  });

  it("refuses a taken username or email, naming the field", async () => {
    const username = await t
      .api()
      .post("/api/auth/register")
      .send({ ...NEW_USER, username: "MARIA" });
    expect(username.status).toBe(409);
    expect(username.body.errors).toHaveProperty("username");

    const email = await t
      .api()
      .post("/api/auth/register")
      .send({ ...NEW_USER, email: USERS.ana.email });
    expect(email.status).toBe(409);
    expect(email.body.errors).toHaveProperty("email");
  });

  it("checks every field", async () => {
    const response = await t
      .api()
      .post("/api/auth/register")
      .send({ username: "a!", email: "nope", password: "short" });
    expect(response.status).toBe(400);
    expect(Object.keys(response.body.errors).sort()).toEqual([
      "email",
      "password",
      "username",
    ]);
  });
});

describe("log in and out", () => {
  it("logs in with a username or an email, ignoring capitals", async () => {
    for (const login of ["maria", "MARIA@example.com"]) {
      const response = await t
        .api()
        .post("/api/auth/login")
        .send({ login, password: PASSWORD });
      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(USERS.maria.id);
    }
  });

  it("gives the same answer for a wrong password and an unknown user", async () => {
    const wrong = await t
      .api()
      .post("/api/auth/login")
      .send({ login: "maria", password: "wrong-password" });
    const unknown = await t
      .api()
      .post("/api/auth/login")
      .send({ login: "nobody", password: "wrong-password" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it("logging out ends the session", async () => {
    const maria = await t.as("maria");
    expect((await maria.get("/api/auth/me")).status).toBe(200);
    expect((await maria.post("/api/auth/logout")).status).toBe(204);
    expect((await maria.get("/api/auth/me")).status).toBe(401);
  });
});
