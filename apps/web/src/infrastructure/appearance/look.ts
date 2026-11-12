import {
  type Appearance,
  buildTheme,
  darkSurface,
  paletteOf,
  type ThemeTokens,
} from "@talaan/shared";

// Everything needed to paint the page, worked out once from an appearance.
// Kept in this browser too, so the next visit starts in the right colors
// (public/theme-boot.js reads it before the app loads).
export interface Look {
  mode: Appearance["mode"];
  textSize: Appearance["textSize"];
  light: ThemeTokens;
  dark: ThemeTokens & { white: string };
}

const STORAGE_KEY = "talaan.look";

export function lookFor(appearance: Appearance): Look {
  const { colors, brand } = paletteOf(appearance);
  const theme = buildTheme(colors, brand);
  return {
    mode: appearance.mode,
    textSize: appearance.textSize,
    light: theme.light,
    dark: { ...theme.dark, white: darkSurface(theme) },
  };
}

export const prefersDark = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

// Paints the page: CSS variables, light or dark, text size, the phone's bar
export function applyLook(look: Look) {
  const root = document.documentElement;
  const dark =
    look.mode === "dark" || (look.mode === "system" && prefersDark());
  const tokens = Object.entries(dark ? look.dark : look.light);
  for (const [name, value] of tokens) {
    root.style.setProperty(`--color-${name}`, value);
  }
  if (!dark) root.style.removeProperty("--color-white");
  // Paper (print, label and card previews) always uses the light colors
  for (const [name, value] of Object.entries(look.light)) {
    root.style.setProperty(`--paper-${name}`, value);
  }
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.text = look.textSize;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? look.dark.page : look.light.brand);
}

export function rememberLook(look: Look) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(look));
  } catch {
    // Private windows may not keep it: the colors still apply now
  }
}

export function rememberedLook(): Look | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Look) : null;
  } catch {
    return null;
  }
}
