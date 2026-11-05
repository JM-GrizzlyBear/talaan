import { describe, expect, it } from "vitest";
import { PASSWORD, USERS } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

// A server with no email service set up
const t = useTestApp({ withoutEmail: true });

describe("forgot password without an email service", () => {
  it("says it isn't set up, the same way for every email", async () => {
    for (const email of [USERS.maria.email, "nobody@example.com"]) {
      const response = await t
        .api()
        .post("/api/auth/password-reset/request")
        .send({ email });
      expect(response.status).toBe(503);
      expect(response.body.message).toMatch(/isn't set up/);
    }
  });
});

describe("two-step sign-in without email", () => {
  it("is skipped, so nobody gets locked out", async () => {
    await t.pool.query("update users set two_step_enabled = true");
    const response = await t
      .api()
      .post("/api/auth/login")
      .send({ email: USERS.maria.email, password: PASSWORD });
    expect(response.status).toBe(200);
    expect(response.body.twoStep).toBe(false);
  });
});

describe("family invitations without email", () => {
  it("say email isn't set up", async () => {
    const maria = await t.as("maria");
    const response = await maria.post("/api/family/invitations").send({
      email: "lolo@example.com",
      relationship: "Lolo",
      access: "view",
    });
    expect(response.status).toBe(503);
    expect(response.body.message).toContain("Invitations by email");
  });
});
