import { describe, expect, it } from "vitest";
import { PASSWORD } from "../fixtures/users.js";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();
const minutes = (n: number) => n * 60 * 1000;

describe("locking after nobody uses the website", () => {
  it("locks after the chosen time, but still says who is signed in", async () => {
    const maria = await t.as("maria");
    t.clock.advance(minutes(16));

    const me = await maria.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      locked: true,
      user: { firstName: "Maria", lastName: "Santos" },
    });

    const activity = await maria.post("/api/auth/activity");
    expect(activity.status).toBe(423);
    expect(activity.body.locked).toBe(true);
  });

  it("stays unlocked while the website is being used", async () => {
    const maria = await t.as("maria");
    for (let i = 0; i < 4; i++) {
      t.clock.advance(minutes(10));
      expect((await maria.post("/api/auth/activity")).status).toBe(204);
    }
    expect((await maria.get("/api/auth/me")).body.locked).toBe(false);
  });

  it("unlocks only with the right password", async () => {
    const maria = await t.as("maria");
    await maria.post("/api/auth/lock");
    expect((await maria.get("/api/auth/me")).body.locked).toBe(true);

    const wrong = await maria
      .post("/api/auth/unlock")
      .send({ password: "nope" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.errors).toHaveProperty("password");

    const right = await maria
      .post("/api/auth/unlock")
      .send({ password: PASSWORD });
    expect(right.status).toBe(200);
    expect((await maria.get("/api/auth/me")).body.locked).toBe(false);
    expect((await maria.post("/api/auth/activity")).status).toBe(204);
  });

  it("follows each person's own setting", async () => {
    const maria = await t.as("maria");
    const saved = await maria
      .put("/api/account/security")
      .send({ lockAfterMinutes: 5 });
    expect(saved.body.user.lockAfterMinutes).toBe(5);

    t.clock.advance(minutes(6));
    expect((await maria.get("/api/auth/me")).body.locked).toBe(true);
  });

  it("can still sign out while locked", async () => {
    const maria = await t.as("maria");
    await maria.post("/api/auth/lock");
    expect((await maria.post("/api/auth/logout")).status).toBe(204);
    expect((await maria.get("/api/auth/me")).status).toBe(401);
  });
});
