import { describe, expect, it } from "vitest";
import { USERS } from "../fixtures/users.js";
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
