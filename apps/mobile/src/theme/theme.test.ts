import { contrast } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { themeFor } from "./theme";

describe("the app's colors", () => {
  it("are the website's, light by default", () => {
    const t = themeFor(undefined, true);
    expect(t.dark).toBe(false);
    expect(t.brand).toBe("#0e7c6b");
    expect(t.scale).toBe(1);
  });

  it("follow the phone when set to, and stay readable", () => {
    const appearance = {
      palette: "dagat",
      colors: [],
      mode: "system" as const,
      textSize: "larger" as const,
    };
    const t = themeFor(appearance, true);
    expect(t.dark).toBe(true);
    expect(t.scale).toBe(1.25);
    expect(contrast(t.onBrand, t.brand)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.ink, t.page)).toBeGreaterThanOrEqual(12);
    expect(themeFor(appearance, false).dark).toBe(false);
  });
});
