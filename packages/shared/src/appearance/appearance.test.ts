import { describe, expect, it } from "vitest";
import {
  appearanceSchema,
  buildTheme,
  contrast,
  darkSurface,
  luminance,
  mix,
  PALETTES,
  parsePaletteText,
} from "./index.js";

describe("colors", () => {
  it("mixes and measures contrast like WCAG", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("reads Color Hunt links and hex codes", () => {
    const four = ["#222831", "#393e46", "#00adb5", "#eeeeee"];
    expect(
      parsePaletteText("https://colorhunt.co/palette/222831393e4600adb5eeeeee"),
    ).toEqual(four);
    expect(parsePaletteText("#222831 #393E46, #00ADB5 #EEEEEE")).toEqual(four);
    expect(parsePaletteText("222831-393e46-00adb5-eeeeee")).toEqual(four);
    expect(parsePaletteText("#222831")).toBeNull();
    expect(parsePaletteText("hello")).toBeNull();
  });
});

describe("themes", () => {
  it("keeps the usual teal as it was", () => {
    const { light, adjusted } = buildTheme(PALETTES[0].colors);
    expect(light.brand).toBe("#0e7c6b");
    expect(light.deep).toBe("#0e3b36");
    expect(light["brand-soft"]).toBe("#e3f2ef");
    expect(light.page).toBe("#f5f6f3");
    expect(adjusted).toBe(false);
  });

  // Every set, and odd ones people might paste, stays readable
  const sets = [
    ...PALETTES.map((p) => p.colors),
    ["#ffff00", "#ffffcc"],
    ["#000000", "#111111", "#222222"],
    ["#ff00ff", "#00ff00", "#0000ff", "#ff0000"],
  ];
  it.each(sets.map((s) => [s.join(" "), s]))(
    "is readable in light and dark: %s",
    (_, colors) => {
      const preset = PALETTES.find((p) => p.colors === colors);
      const theme = buildTheme(colors as string[], preset?.brand);
      const { light, dark } = theme;
      // Buttons (white text) and links
      expect(contrast(light.brand, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(light.deep, light["brand-soft"])).toBeGreaterThanOrEqual(
        7,
      );
      expect(contrast(light.ink, light.page)).toBeGreaterThanOrEqual(12);
      expect(contrast(light.muted, light.page)).toBeGreaterThanOrEqual(4.5);
      const surface = darkSurface(theme);
      expect(contrast(dark.brand, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(dark.deep, dark["brand-soft"])).toBeGreaterThanOrEqual(7);
      expect(contrast(dark.ink, dark.page)).toBeGreaterThanOrEqual(12);
      expect(contrast(dark.muted, surface)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("picks a color dark enough for white text for buttons", () => {
    // Sunset: the pink-red, not the orange made brown
    expect(
      buildTheme(["#6a2c70", "#b83b5e", "#f08a5d", "#f9ed69"]).light.brand,
    ).toBe("#b83b5e");
    expect(
      buildTheme(["#112d4e", "#3f72af", "#dbe2ef", "#f9f7f7"]).light.brand,
    ).toBe("#3f72af");
  });

  it("keeps the page a light tint", () => {
    const { light } = buildTheme(["#6a2c70", "#b83b5e", "#f08a5d", "#f9ed69"]);
    expect(luminance(light.page)).toBeGreaterThanOrEqual(0.86);
  });

  it("says when it had to change colors", () => {
    expect(buildTheme(["#ffff00", "#ffffcc"]).adjusted).toBe(true);
  });

  it("checks a saved appearance", () => {
    expect(appearanceSchema.parse({})).toEqual({
      palette: "talaan",
      colors: [],
      mode: "light",
      textSize: "normal",
    });
    expect(
      appearanceSchema.safeParse({ palette: "custom", colors: ["#123456"] })
        .success,
    ).toBe(false);
    expect(
      appearanceSchema.parse({ palette: "custom", colors: ["#ABCDEF", "#123"] })
        .colors,
    ).toEqual(["#abcdef", "#123"]);
  });
});
