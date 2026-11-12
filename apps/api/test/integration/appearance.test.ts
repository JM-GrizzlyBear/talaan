import { describe, expect, it } from "vitest";
import { useTestApp } from "./support/testApp.js";

const t = useTestApp();

describe("appearance", () => {
  it("starts light, in the usual colors, at normal size", async () => {
    const maria = await t.as("maria");
    const me = await maria.get("/api/auth/me");
    expect(me.body.user.appearance).toEqual({
      palette: "talaan",
      colors: [],
      mode: "light",
      textSize: "normal",
    });
  });

  it("is saved with the account, so every device matches", async () => {
    const maria = await t.as("maria");
    const saved = await maria.put("/api/account/appearance").send({
      palette: "custom",
      colors: ["#222831", "#393E46", "#00ADB5", "#EEEEEE"],
      mode: "system",
      textSize: "larger",
    });
    expect(saved.status).toBe(200);
    expect(saved.body.user.appearance).toEqual({
      palette: "custom",
      colors: ["#222831", "#393e46", "#00adb5", "#eeeeee"],
      mode: "system",
      textSize: "larger",
    });
    // Another browser signing in gets the same
    const laptop = await t.as("maria");
    expect((await laptop.get("/api/auth/me")).body.user.appearance.mode).toBe(
      "system",
    );
  });

  it("checks what's sent", async () => {
    const maria = await t.as("maria");
    const bad = await maria
      .put("/api/account/appearance")
      .send({ palette: "custom", colors: ["#123456"] });
    expect(bad.status).toBe(400);
    expect(
      (await maria.put("/api/account/appearance").send({ palette: "nope" }))
        .status,
    ).toBe(400);
    expect((await t.api().put("/api/account/appearance").send({})).status).toBe(
      401,
    );
  });
});
