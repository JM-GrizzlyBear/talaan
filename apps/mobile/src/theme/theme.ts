import {
  type Appearance,
  buildTheme,
  DEFAULT_APPEARANCE,
  darkSurface,
  paletteOf,
  TEXT_SIZE_PERCENT,
} from "@talaan/shared";

// The website's colors and text size, for the app: the same choice, saved
// with the account, so the phone matches the laptop
export interface Theme {
  dark: boolean;
  scale: number;
  brand: string;
  brandSoft: string;
  deep: string;
  page: string;
  card: string;
  edge: string;
  ink: string;
  muted: string;
  // Text on a brand-colored button
  onBrand: string;
  danger: string;
  dangerSoft: string;
  warn: string;
  warnSoft: string;
  warnEdge: string;
}

export function themeFor(
  appearance: Appearance | undefined,
  deviceIsDark: boolean,
): Theme {
  const a = appearance ?? DEFAULT_APPEARANCE;
  const { colors, brand } = paletteOf(a);
  const theme = buildTheme(colors, brand);
  const dark = a.mode === "dark" || (a.mode === "system" && deviceIsDark);
  const scale = TEXT_SIZE_PERCENT[a.textSize] / 100;
  if (!dark) {
    const t = theme.light;
    return {
      dark,
      scale,
      brand: t.brand,
      brandSoft: t["brand-soft"],
      deep: t.deep,
      page: t.page,
      card: "#ffffff",
      edge: t.edge,
      ink: t.ink,
      muted: t.muted,
      onBrand: "#ffffff",
      danger: "#b42318",
      dangerSoft: "#fef3f2",
      warn: "#8a4b07",
      warnSoft: "#fff8eb",
      warnEdge: "#e5a33a",
    };
  }
  const t = theme.dark;
  const card = darkSurface(theme);
  return {
    dark,
    scale,
    brand: t.brand,
    brandSoft: t["brand-soft"],
    deep: t.deep,
    page: t.page,
    card,
    edge: t.edge,
    ink: t.ink,
    muted: t.muted,
    onBrand: card,
    danger: "#f38b82",
    dangerSoft: "#3a1a1a",
    warn: "#f5c27a",
    warnSoft: "#33270f",
    warnEdge: "#b37a1c",
  };
}
