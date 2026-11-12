import {
  chroma,
  contrast,
  luminance,
  mix,
  saturation,
  withContrast,
} from "./color.js";

// The colors the website is painted with (CSS variables --color-<name>)
export interface ThemeTokens {
  brand: string;
  "brand-hover": string;
  "brand-soft": string;
  deep: string;
  page: string;
  edge: string;
  ink: string;
  muted: string;
}

export interface Theme {
  light: ThemeTokens;
  dark: ThemeTokens;
  // Colors that had to be changed so text stays readable
  adjusted: boolean;
}

const WHITE = "#ffffff";
// The dark theme's cards (what "white" becomes)
const NIGHT = "#12181b";

// Which palette color does what: the darkest for deep text, the lightest for
// the page, the most colorful for buttons and links, and one for soft boxes
function roles(colors: string[], prefer?: string) {
  const byLight = [...colors].sort((a, b) => luminance(a) - luminance(b));
  const darkest = byLight[0];
  const lightest = byLight[byLight.length - 1];
  const deep = luminance(darkest) <= 0.1 ? darkest : null;
  const page = luminance(lightest) >= 0.75 ? lightest : null;
  const rest = colors.filter((c) => c !== deep && c !== page);
  const pool = rest.length > 0 ? rest : colors;
  // Colorful, and dark enough for white text without much change
  const score = (c: string) =>
    saturation(c) * Math.min(1, contrast(c, WHITE) / 4.5) ** 2;
  const brand =
    prefer && colors.includes(prefer)
      ? prefer
      : [...pool].sort((a, b) => score(b) - score(a))[0];
  const soft =
    pool.find((c) => c !== brand) ??
    colors.find((c) => c !== brand && c !== deep) ??
    brand;
  return { brand, deep, page, soft };
}

export function buildTheme(colors: string[], brand?: string): Theme {
  const r = roles(colors, brand);
  let adjusted = false;
  const fix = (color: string, background: string, ratio: number) => {
    const fixed = withContrast(color, background, ratio);
    if (fixed !== color) adjusted = true;
    return fixed;
  };

  // Light
  const button = fix(r.brand, WHITE, 4.5);
  const deep = r.deep
    ? withContrast(r.deep, WHITE, 10)
    : withContrast(button, WHITE, 10);
  // The page stays a light tint, however bright the palette's lightest color
  let page = r.page ?? mix(button, WHITE, 0.95);
  for (
    let i = 1;
    (luminance(page) < 0.86 || chroma(page) > 30) && i <= 20;
    i++
  ) {
    page = mix(r.page ?? button, WHITE, i / 20);
  }
  const softBase = luminance(r.soft) >= 0.7 ? r.soft : mix(r.soft, WHITE, 0.82);
  let brandSoft = softBase;
  for (let i = 1; contrast(deep, brandSoft) < 7 && i <= 10; i++) {
    brandSoft = mix(softBase, WHITE, i / 10);
  }
  const light: ThemeTokens = {
    brand: button,
    "brand-hover": withContrast(mix(button, "#000000", 0.15), WHITE, 5.5),
    "brand-soft": brandSoft,
    deep,
    page,
    edge: mix(deep, page, 0.84),
    ink: withContrast(mix(deep, "#0b1520", 0.6), page, 12),
    muted: withContrast("#5a6672", page, 4.6),
  };

  // Dark: cards a little lighter than the page, colors lifted to read on them
  const surface = mix(light.deep, NIGHT, 0.82);
  const darkPage = mix(surface, "#000000", 0.35);
  const darkBrand = withContrast(r.brand, surface, 4.8);
  const darkSoft = mix(darkBrand, surface, 0.78);
  const dark: ThemeTokens = {
    brand: darkBrand,
    "brand-hover": withContrast(mix(darkBrand, WHITE, 0.15), surface, 6),
    "brand-soft": darkSoft,
    deep: withContrast(r.page ?? mix(darkBrand, WHITE, 0.8), darkSoft, 8),
    page: darkPage,
    edge: mix(WHITE, surface, 0.82),
    ink: "#e8eef0",
    muted: withContrast("#a3b1b8", surface, 5),
  };
  return { light, dark, adjusted };
}

// The dark theme's card color for a palette (what "white" becomes)
export const darkSurface = (theme: Theme) => mix(theme.light.deep, NIGHT, 0.82);
