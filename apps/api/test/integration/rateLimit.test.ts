import { describe, expect, it } from "vitest";
import { useTestApp } from "./support/testApp.js";

// A separate app with a tiny limit: 3 tries
const t = useTestApp({ authLimit: 3 });

describe("password guessing", () => {
  it("is stopped after too many tries", async () => {
    const browser = t.api();
    for (let i = 0; i < 3; i++) {
      const attempt = await browser
        .post("/api/auth/login")
        .send({ login: "maria", password: "guess" });
      expect(attempt.status).toBe(401);
    }
    const blocked = await browser
      .post("/api/auth/login")
      .send({ login: "maria", password: "guess" });
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });
});
