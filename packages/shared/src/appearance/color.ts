// Small color math for themes: hex, mixing, and WCAG contrast

export type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb | null {
  const h = hex.trim().replace(/^#/, "").toLowerCase();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-f]{6}$/.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

export const toHex = (rgb: Rgb) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const rgbOf = (hex: string): Rgb => {
  const rgb = parseHex(hex);
  if (!rgb) throw new Error(`Not a color: ${hex}`);
  return rgb;
};

// 0 (black) to 1 (white), as WCAG defines it
export function luminance(hex: string) {
  const [r, g, b] = rgbOf(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// 1 to 21; body text needs 4.5
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// `amount` of `b` into `a` (0: a, 1: b)
export function mix(a: string, b: string, amount: number) {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * amount) as Rgb);
}

// How colorful (0 grey to 1 vivid)
export function saturation(hex: string) {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function fromHsl(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

// How different the brightest and dullest channel are (0 grey, 255 vivid)
export function chroma(hex: string) {
  const rgb = rgbOf(hex);
  return Math.max(...rgb) - Math.min(...rgb);
}

// The color made darker or lighter (same hue, a calmer saturation) just
// enough to reach `ratio` against `background`
export function withContrast(color: string, background: string, ratio: number) {
  if (contrast(color, background) >= ratio) return color;
  const darker = luminance(background) > 0.5;
  const [h, s0, l0] = toHsl(color);
  const s = Math.min(s0, 0.75);
  for (let step = 1; step <= 40; step++) {
    const l = darker ? l0 * (1 - step / 40) : l0 + (1 - l0) * (step / 40);
    const next = fromHsl(h, s, l);
    if (contrast(next, background) >= ratio) return next;
  }
  return darker ? "#000000" : "#ffffff";
}
