import { describe, expect, it } from "vitest";
import { PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
const NEW_PASSWORD = "another-good-password";

describe("changing the password", () => {
  it("needs the current password", async () => {
    const maria = await t.as("maria");
    const response = await maria
      .put("/api/account/password")
      .send({ currentPassword: "wrong", newPassword: NEW_PASSWORD });
    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("currentPassword");
  });

  it("keeps this browser signed in and signs out the others", async () => {
    const phone = await t.as("maria");
    const laptop = await t.as("maria");
    const response = await laptop
      .put("/api/account/password")
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    expect(response.status).toBe(204);

    expect((await laptop.get("/api/auth/me")).status).toBe(200);
    expect((await phone.get("/api/auth/me")).status).toBe(401);
    expect(t.emails.changed[0].to.email).toBe(USERS.maria.email);

    const signIn = await t
      .api()
      .post("/api/auth/login")
      .send({ email: USERS.maria.email, password: NEW_PASSWORD });
    expect(signIn.status).toBe(200);
  });
});

describe("security settings", () => {
  it("only offers 5, 15, 30 or 60 minutes", async () => {
    const maria = await t.as("maria");
    const response = await maria
      .put("/api/account/security")
      .send({ lockAfterMinutes: 7 });
    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("lockAfterMinutes");
  });

  it("needs a sign-in", async () => {
    const response = await t
      .api()
      .put("/api/account/security")
      .send({ lockAfterMinutes: 30 });
    expect(response.status).toBe(401);
  });
});
