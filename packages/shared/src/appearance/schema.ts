import { z } from "zod";
import { parseHex } from "./color.js";
import { DEFAULT_PALETTE, PALETTES } from "./palettes.js";

export const COLOR_MODES = ["light", "dark", "system"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];
export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "Same as this phone or computer",
};

export const TEXT_SIZES = ["normal", "large", "larger"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  normal: "Normal",
  large: "Large",
  larger: "Larger",
};
// The base size, percent of the browser's own
export const TEXT_SIZE_PERCENT: Record<TextSize, number> = {
  normal: 100,
  large: 112.5,
  larger: 125,
};

const hex = z
  .string()
  .refine((v) => parseHex(v) !== null, { error: "Use a color like #3f72af" })
  .transform((v) => v.toLowerCase());

// How the website looks for someone, saved with their account
export const appearanceSchema = z
  .object({
    // A ready-made set, or "custom" with its own 2 to 4 colors
    palette: z
      .union([
        z.enum(PALETTES.map((p) => p.key) as [string, ...string[]]),
        z.literal("custom"),
      ])
      .default(DEFAULT_PALETTE),
    colors: z.array(hex).max(4).default([]),
    mode: z.enum(COLOR_MODES).default("light"),
    textSize: z.enum(TEXT_SIZES).default("normal"),
  })
  .refine(
    (a) =>
      a.palette !== "custom" || (a.colors.length >= 2 && a.colors.length <= 4),
    { error: "Choose 2 to 4 colors", path: ["colors"] },
  );
export type Appearance = z.infer<typeof appearanceSchema>;

export const DEFAULT_APPEARANCE: Appearance = {
  palette: DEFAULT_PALETTE,
  colors: [],
  mode: "light",
  textSize: "normal",
};

// The colors an appearance uses, and (for some sets) which one leads
export function paletteOf(a: Appearance): { colors: string[]; brand?: string } {
  if (a.palette === "custom" && a.colors.length >= 2)
    return { colors: a.colors };
  const p = PALETTES.find((x) => x.key === a.palette) ?? PALETTES[0];
  return { colors: p.colors, brand: p.brand };
}
